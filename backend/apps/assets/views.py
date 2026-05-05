import csv
from io import StringIO
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Count
from django.http import HttpResponse
from .models import Asset
from .serializers import AssetSerializer, AssetCreateSerializer
from apps.users.permissions import ReadOnlyOrOperator
from apps.audit.models import ActivityLog


class AssetViewSet(viewsets.ModelViewSet):
    permission_classes = [ReadOnlyOrOperator]
    search_fields = ['name']
    ordering_fields = ['created_at', 'name', 'asset_type']
    ordering = ['-created_at']

    def get_queryset(self):
        qs = Asset.objects.all()
        bbox = self.request.query_params.get('bbox')
        if bbox:
            qs = qs.within_bbox(bbox)
        asset_type = self.request.query_params.get('type')
        if asset_type:
            qs = qs.by_type(asset_type)
        asset_status = self.request.query_params.get('status')
        if asset_status:
            qs = qs.filter(status=asset_status)
        area_code = self.request.query_params.get('area')
        if area_code:
            try:
                from apps.areas.models import Area
                area = Area.objects.filter(code=area_code).first()
                if area:
                    bbox_a = area.bbox
                    qs = qs.filter(
                        _longitude__gte=bbox_a[0], _latitude__gte=bbox_a[1],
                        _longitude__lte=bbox_a[2], _latitude__lte=bbox_a[3],
                    )
            except Exception:
                pass
        return qs

    def get_serializer_class(self):
        if self.action == 'create':
            return AssetCreateSerializer
        return AssetSerializer

    def perform_create(self, serializer):
        asset = serializer.save()
        ActivityLog.log(
            self.request.user, 'asset.created', 'asset', asset.id,
            details={'name': asset.name, 'asset_type': asset.asset_type},
        )

    def perform_update(self, serializer):
        asset = serializer.save()
        ActivityLog.log(
            self.request.user, 'asset.updated', 'asset', asset.id,
            details={'name': asset.name, 'status': asset.status},
        )

    def perform_destroy(self, instance):
        aid = instance.id
        name = instance.name
        instance.delete()
        ActivityLog.log(
            self.request.user, 'asset.deleted', 'asset', aid,
            details={'name': name},
        )

    @action(detail=False, methods=['get'])
    def heatmap(self, request):
        """Return asset density data for heatmap visualization."""
        assets = self.get_queryset()
        data = [
            {
                'lat': a.latitude, 'lng': a.longitude,
                'type': a.asset_type, 'status': a.status,
            }
            for a in assets
        ]
        return Response(data)

    @action(detail=False, methods=['get'])
    def stats(self, request):
        total = Asset.objects.count()
        by_type = dict(
            Asset.objects.values_list('asset_type').annotate(count=Count('id')).values_list('asset_type', 'count')
        )
        by_status = dict(
            Asset.objects.values_list('status').annotate(count=Count('id')).values_list('status', 'count')
        )
        return Response({'total': total, 'by_type': by_type, 'by_status': by_status})

    @action(detail=False, methods=['get'])
    def export(self, request):
        fmt = request.query_params.get('format', 'csv')
        qs = self.get_queryset()
        if fmt == 'csv':
            buf = StringIO()
            writer = csv.writer(buf)
            writer.writerow(['id', 'name', 'asset_type', 'status', 'latitude', 'longitude', 'installed_at', 'last_maintained_at', 'created_at'])
            for a in qs:
                writer.writerow([
                    a.id, a.name, a.asset_type, a.status,
                    a.latitude, a.longitude,
                    a.installed_at, a.last_maintained_at, a.created_at.isoformat(),
                ])
            resp = HttpResponse(buf.getvalue(), content_type='text/csv')
            resp['Content-Disposition'] = 'attachment; filename="assets.csv"'
            return resp
        return Response({'error': 'Unsupported format'}, status=status.HTTP_400_BAD_REQUEST)
