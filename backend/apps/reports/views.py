import os
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Count, Avg
from django.utils import timezone
from .models import IncidentReport
from .serializers import (
    ReportSerializer,
    ReportCreateSerializer,
    ReportCitizenUpdateSerializer,
    ReportOperatorUpdateSerializer,
)
from apps.users.permissions import ReportPermission
from apps.audit.models import ActivityLog

USE_POSTGIS = os.environ.get('USE_POSTGIS', 'false').lower() == 'true'
import math
from apps.assets.models import Asset

def find_nearest_asset(lat, lng):
    assets = Asset.objects.all()
    nearest = None
    min_dist = float('inf')
    for a in assets:
        a_lat = a.latitude
        a_lng = a.longitude
        if a_lat is None or a_lng is None:
            continue
        dist = math.sqrt((a_lat - lat)**2 + (a_lng - lng)**2)
        if dist < min_dist:
            min_dist = dist
            nearest = a
    # Roughly within 1.2km
    if min_dist < 0.012:
        return nearest
    return None


class ReportViewSet(viewsets.ModelViewSet):
    permission_classes = [ReportPermission]
    ordering = ['-created_at']

    def get_queryset(self):
        qs = IncidentReport.objects.select_related('reporter')
        user = self.request.user
        role = getattr(user, 'role', None)
        # RBAC: citizen sees only own reports; taskforce sees only reports linked to their tasks
        if role == 'citizen':
            qs = qs.filter(reporter=user)
        elif role == 'taskforce':
            qs = qs.filter(tasks__assigned_to=user).distinct()

        report_status = self.request.query_params.get('status')
        if report_status:
            qs = qs.filter(status=report_status)

        bbox = self.request.query_params.get('bbox')
        if bbox:
            parts = [float(c) for c in bbox.split(',')]
            if USE_POSTGIS:
                from django.contrib.gis.geos import Polygon
                polygon = Polygon.from_bbox(parts)
                qs = qs.filter(location__within=polygon)
            else:
                qs = qs.filter(
                    _longitude__gte=parts[0], _latitude__gte=parts[1],
                    _longitude__lte=parts[2], _latitude__lte=parts[3],
                )
        return qs

    def get_serializer_class(self):
        if self.action == 'create':
            return ReportCreateSerializer
        if self.action in ('partial_update', 'update'):
            role = getattr(self.request.user, 'role', None)
            if role == 'citizen':
                return ReportCitizenUpdateSerializer
            return ReportOperatorUpdateSerializer
        return ReportSerializer

    def perform_destroy(self, instance):
        rid = instance.id
        reporter = instance.reporter_id
        ActivityLog.log(
            self.request.user, 'report.deleted', 'report', rid,
            details={'reporter_id': str(reporter) if reporter else None, 'status': instance.status},
        )
        instance.delete()

    @action(detail=True, methods=['patch'])
    def update_status(self, request, pk=None):
        from apps.tasks.models import Task
        from apps.maintenance.models import MaintenanceLog
        from apps.notifications.models import Notification

        report = self.get_object()
        new_status = request.data.get('status')
        if new_status not in dict(IncidentReport.Status.choices):
            return Response({'error': 'Invalid status'}, status=status.HTTP_400_BAD_REQUEST)

        old_status = report.status
        report.status = new_status
        report.save(update_fields=['status', 'updated_at'])

        ActivityLog.log(
            request.user, 'report.status_changed', 'report', report.id,
            details={'from': old_status, 'to': new_status, 'reason': request.data.get('reason', '')},
        )

        reason = request.data.get('reason', '')
        assigned_user_id = request.data.get('assigned_to')
        priority_map = {'low': 'low', 'medium': 'medium', 'high': 'high', 'critical': 'urgent'}

        # Auto pipeline
        if old_status == 'pending' and new_status == 'assigned':
            assigned_user = None
            if assigned_user_id:
                from apps.users.models import User
                assigned_user = User.objects.filter(id=assigned_user_id, role='taskforce').first()
            
            # Link asset (from request or search nearest)
            related_asset_id = request.data.get('asset')
            asset = None
            if related_asset_id:
                asset = Asset.objects.filter(id=related_asset_id).first()
            elif report.latitude is not None and report.longitude is not None:
                asset = find_nearest_asset(report.latitude, report.longitude)
                
            task = Task.objects.create(
                title=f"Xử lý: {report.get_incident_type_display()}",
                description=report.description or '',
                report=report,
                related_asset=asset,
                assigned_to=assigned_user,
                created_by=request.user,
                priority=priority_map.get(report.severity, 'medium'),
                status='assigned' if assigned_user else 'open',
            )
            
            # Update asset status & image dynamically (Citizen reports damage)
            if asset and report.image:
                if not asset.metadata:
                    asset.metadata = {}
                asset.metadata['status_image'] = report.image.url
                asset.status = 'damaged'
                asset.save(update_fields=['metadata', 'status'])
                
            if assigned_user:
                Notification.notify(
                    recipient=assigned_user,
                    type='task_assigned',
                    title='Bạn được phân công task mới',
                    message=f'Task "{task.title}" tại ({report.latitude:.4f}, {report.longitude:.4f})',
                    link=f'/tasks',
                )

        if new_status == 'resolved':
            # Auto MaintenanceLog if asset linked through related task
            related_asset_id = request.data.get('asset')
            asset = None
            technician = request.user
            
            # Retrieve linked task to get asset and assigned technician
            task = report.tasks.filter(related_asset__isnull=False).first()
            if related_asset_id:
                from apps.assets.models import Asset
                asset = Asset.objects.filter(id=related_asset_id).first()
            elif task:
                asset = task.related_asset
                
            if task and task.assigned_to:
                technician = task.assigned_to

            if asset:
                MaintenanceLog.objects.create(
                    asset=asset,
                    report=report,
                    technician=technician,
                    status='completed',
                    completed_at=timezone.now(),
                    notes=f'Tự động tạo từ report #{str(report.id)[:8]}',
                )
                asset.last_maintained_at = timezone.now().date()
                if not asset.metadata:
                    asset.metadata = {}
                
                # Fetch task completion image (Taskforce repairs asset)
                comp_task = report.tasks.filter(related_asset=asset, completion_image__isnull=False).first()
                if comp_task and comp_task.completion_image:
                    asset.metadata['status_image'] = comp_task.completion_image.url
                
                if asset.status in ('damaged', 'maintenance'):
                    asset.status = 'active'
                asset.save(update_fields=['last_maintained_at', 'status', 'metadata'])
            if report.reporter:
                Notification.notify(
                    recipient=report.reporter,
                    type='report_resolved',
                    title='Báo cáo của bạn đã được xử lý',
                    message=f'#{str(report.id)[:8]} ({report.get_incident_type_display()}) đã hoàn thành',
                    link=f'/reports/{report.id}',
                )

        if new_status == 'rejected' and report.reporter:
            Notification.notify(
                recipient=report.reporter,
                type='report_rejected',
                title='Báo cáo của bạn đã bị từ chối',
                message=reason or 'Báo cáo không đủ điều kiện xử lý',
                link=f'/reports/{report.id}',
            )

        return Response(ReportSerializer(report).data)

    @action(detail=False, methods=['get'])
    def stats(self, request):
        qs = self.get_queryset()
        total = qs.count()
        by_type = list(
            qs.values('incident_type')
            .annotate(count=Count('id'))
            .order_by('-count')
        )
        by_status = list(
            qs.values('status')
            .annotate(count=Count('id'))
        )
        avg_confidence = qs.filter(
            ai_confidence__isnull=False
        ).aggregate(avg=Avg('ai_confidence'))
        return Response({
            'total': total,
            'by_type': by_type,
            'by_status': by_status,
            'avg_ai_confidence': avg_confidence['avg'],
        })

    @action(detail=True, methods=['get', 'post'], url_path='comments')
    def comments(self, request, pk=None):
        from apps.comments.models import Comment
        from apps.comments.serializers import CommentSerializer
        report = self.get_object()
        if request.method == 'GET':
            comments = report.comments.select_related('author').all()
            return Response(CommentSerializer(comments, many=True).data)
        # POST
        serializer = CommentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        comment = serializer.save(report=report, author=request.user)
        return Response(CommentSerializer(comment).data, status=status.HTTP_201_CREATED)

    @action(
        detail=True,
        methods=['patch', 'delete'],
        url_path=r'comments/(?P<comment_id>[0-9a-fA-F-]{36})',
    )
    def comment_detail(self, request, pk=None, comment_id=None):
        from apps.comments.models import Comment
        from apps.comments.serializers import CommentSerializer, CommentPatchSerializer

        report = self.get_object()
        comment = Comment.objects.filter(id=comment_id, report=report).first()
        if not comment:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

        role = getattr(request.user, 'role', None)
        is_mod = role in ('operator', 'admin')
        is_author = comment.author_id == request.user.id

        if request.method == 'DELETE':
            if not is_mod and not is_author:
                return Response({'detail': 'Forbidden.'}, status=status.HTTP_403_FORBIDDEN)
            if is_author and not is_mod:
                if role == 'citizen' and report.reporter_id != request.user.id:
                    return Response({'detail': 'Forbidden.'}, status=status.HTTP_403_FORBIDDEN)
                if role == 'taskforce' and not report.tasks.filter(assigned_to=request.user).exists():
                    return Response({'detail': 'Forbidden.'}, status=status.HTTP_403_FORBIDDEN)
            comment.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)

        # PATCH
        if not is_mod and not is_author:
            return Response({'detail': 'Forbidden.'}, status=status.HTTP_403_FORBIDDEN)
        if is_author and not is_mod:
            if role == 'citizen' and report.reporter_id != request.user.id:
                return Response({'detail': 'Forbidden.'}, status=status.HTTP_403_FORBIDDEN)
            if role == 'taskforce' and not report.tasks.filter(assigned_to=request.user).exists():
                return Response({'detail': 'Forbidden.'}, status=status.HTTP_403_FORBIDDEN)

        ser = CommentPatchSerializer(comment, data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        ser.save()
        return Response(CommentSerializer(comment).data)

    @action(detail=True, methods=['get'])
    def timeline(self, request, pk=None):
        from apps.audit.models import ActivityLog
        from apps.audit.serializers import ActivityLogSerializer
        report = self.get_object()
        logs = ActivityLog.objects.filter(
            target_type='report', target_id=str(report.id)
        ).select_related('actor').order_by('created_at')
        return Response(ActivityLogSerializer(logs, many=True).data)

    # ---------- Analytics ----------
    @action(detail=False, methods=['get'], url_path='analytics/timeline')
    def analytics_timeline(self, request):
        from django.db.models.functions import TruncDay, TruncWeek, TruncMonth
        bucket = request.query_params.get('bucket', 'day')
        trunc = {'day': TruncDay, 'week': TruncWeek, 'month': TruncMonth}.get(bucket, TruncDay)
        qs = self.get_queryset().annotate(_b=trunc('created_at')).values('_b').annotate(count=Count('id')).order_by('_b')
        return Response([{'date': r['_b'].isoformat() if r['_b'] else None, 'count': r['count']} for r in qs])

    @action(detail=False, methods=['get'], url_path='analytics/response_time')
    def analytics_response_time(self, request):
        from django.db.models import F, ExpressionWrapper, DurationField, Avg
        qs = self.get_queryset().filter(status='resolved').annotate(
            duration=ExpressionWrapper(F('updated_at') - F('created_at'), output_field=DurationField()),
        ).values('incident_type').annotate(avg_seconds=Avg('duration'))
        return Response([
            {
                'incident_type': r['incident_type'],
                'avg_seconds': r['avg_seconds'].total_seconds() if r['avg_seconds'] else 0,
            }
            for r in qs
        ])

    @action(detail=False, methods=['get'], url_path='analytics/hour_heatmap')
    def analytics_hour_heatmap(self, request):
        from django.db.models.functions import Extract
        qs = self.get_queryset().annotate(hour=Extract('created_at', 'hour')).values('hour').annotate(count=Count('id')).order_by('hour')
        buckets = {h: 0 for h in range(24)}
        for r in qs:
            if r['hour'] is not None:
                buckets[int(r['hour'])] = r['count']
        return Response([{'hour': h, 'count': c} for h, c in buckets.items()])

    @action(detail=False, methods=['get'], url_path='analytics/top_areas')
    def analytics_top_areas(self, request):
        try:
            from apps.areas.models import Area
        except Exception:
            return Response([])
        result = []
        for area in Area.objects.all():
            count = self.get_queryset().filter(
                _longitude__gte=area.bbox_min_lng, _longitude__lte=area.bbox_max_lng,
                _latitude__gte=area.bbox_min_lat, _latitude__lte=area.bbox_max_lat,
            ).count()
            result.append({'area_code': area.code, 'area_name': area.name, 'count': count})
        result.sort(key=lambda x: -x['count'])
        return Response(result)

    @action(detail=False, methods=['get'], url_path='analytics/ai_accuracy')
    def analytics_ai_accuracy(self, request):
        # Use stored ai_confidence as proxy and report by_type histogram
        qs = self.get_queryset().filter(ai_confidence__isnull=False)
        bins = {'0-50%': 0, '50-70%': 0, '70-85%': 0, '85-100%': 0}
        for r in qs.values_list('ai_confidence', flat=True):
            v = float(r)
            if v < 0.5:
                bins['0-50%'] += 1
            elif v < 0.7:
                bins['50-70%'] += 1
            elif v < 0.85:
                bins['70-85%'] += 1
            else:
                bins['85-100%'] += 1
        return Response([{'bucket': k, 'count': v} for k, v in bins.items()])

    @action(detail=False, methods=['get'], url_path='actions/export-csv')
    def export(self, request):
        import csv
        from io import StringIO
        from django.http import HttpResponse
        fmt = request.query_params.get('format', 'csv')
        qs = self.get_queryset()
        if fmt == 'csv':
            buf = StringIO()
            w = csv.writer(buf)
            w.writerow(['id', 'incident_type', 'severity', 'status', 'latitude', 'longitude', 'reporter', 'description', 'created_at'])
            for r in qs:
                w.writerow([
                    r.id, r.incident_type, r.severity, r.status,
                    r.latitude, r.longitude,
                    r.reporter.email if r.reporter else '',
                    (r.description or '').replace('\n', ' ')[:500],
                    r.created_at.isoformat(),
                ])
            resp = HttpResponse(buf.getvalue(), content_type='text/csv')
            resp['Content-Disposition'] = 'attachment; filename="reports.csv"'
            return resp
        return Response({'error': 'Unsupported format'}, status=status.HTTP_400_BAD_REQUEST)
