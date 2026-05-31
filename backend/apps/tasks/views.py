import csv
from io import StringIO
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.http import HttpResponse
from django.utils import timezone
from .models import Task
from .serializers import TaskSerializer
from apps.users.permissions import TaskPermission
from apps.audit.models import ActivityLog


class TaskViewSet(viewsets.ModelViewSet):
    serializer_class = TaskSerializer
    permission_classes = [TaskPermission]

    def get_queryset(self):
        qs = Task.objects.select_related('assigned_to', 'created_by', 'report', 'related_asset')
        user = self.request.user
        role = getattr(user, 'role', None)
        if role == 'taskforce':
            qs = qs.filter(assigned_to=user)
        if self.request.query_params.get('assigned_to') == 'me':
            qs = qs.filter(assigned_to=user)
        status_filter = self.request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)
        ordering = self.request.query_params.get('order')
        if ordering == 'priority':
            priority_order = ['urgent', 'high', 'medium', 'low']
            from django.db.models import Case, When, IntegerField
            qs = qs.annotate(
                _priority_rank=Case(
                    *[When(priority=p, then=i) for i, p in enumerate(priority_order)],
                    output_field=IntegerField(),
                )
            ).order_by('_priority_rank', '-created_at')
        return qs

    def partial_update(self, request, *args, **kwargs):
        role = getattr(request.user, 'role', None)
        if role == 'taskforce':
            task = self.get_object()
            if task.status == Task.Status.COMPLETED:
                return Response({'detail': 'Task đã hoàn thành.'}, status=status.HTTP_400_BAD_REQUEST)
            extra = set(request.data.keys()) - {'status'}
            if extra:
                return Response(
                    {'detail': 'Chỉ được cập nhật trường status.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            new_status = request.data.get('status', task.status)
            if new_status == Task.Status.COMPLETED:
                return Response(
                    {'detail': 'Dùng hành động complete để hoàn thành kèm ảnh/ghi chú.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if new_status not in dict(Task.Status.choices):
                return Response({'detail': 'status không hợp lệ'}, status=status.HTTP_400_BAD_REQUEST)
            if new_status == task.status:
                return Response(TaskSerializer(task).data)
            valid = {
                (Task.Status.OPEN, Task.Status.ASSIGNED),
                (Task.Status.OPEN, Task.Status.IN_PROGRESS),
                (Task.Status.ASSIGNED, Task.Status.OPEN),
                (Task.Status.ASSIGNED, Task.Status.IN_PROGRESS),
                (Task.Status.IN_PROGRESS, Task.Status.ASSIGNED),
                (Task.Status.IN_PROGRESS, Task.Status.OPEN),
            }
            if (task.status, new_status) not in valid:
                return Response({'detail': 'Chuyển trạng thái không được phép.'}, status=status.HTTP_400_BAD_REQUEST)
            task.status = new_status
            task.save(update_fields=['status', 'updated_at'])
            ActivityLog.log(
                request.user, 'task.updated', 'task', task.id,
                details={'status': task.status},
            )
            return Response(TaskSerializer(task).data)
        return super().partial_update(request, *args, **kwargs)

    def perform_create(self, serializer):
        task = serializer.save(created_by=self.request.user)
        ActivityLog.log(
            self.request.user, 'task.created', 'task', task.id,
            details={'title': task.title, 'priority': task.priority},
        )

    def perform_update(self, serializer):
        task = serializer.save()
        ActivityLog.log(
            self.request.user, 'task.updated', 'task', task.id,
            details={'status': task.status, 'assigned_to': str(task.assigned_to_id) if task.assigned_to_id else None},
        )

    @action(detail=True, methods=['patch'])
    def complete(self, request, pk=None):
        from apps.notifications.models import Notification
        task = self.get_object()
        task.status = Task.Status.COMPLETED
        task.completed_at = timezone.now()
        task.completion_notes = request.data.get('notes', task.completion_notes)
        if 'completion_image' in request.FILES:
            task.completion_image = request.FILES['completion_image']
        task.save()

        ActivityLog.log(
            request.user, 'task.completed', 'task', task.id,
            details={'notes': task.completion_notes[:200] if task.completion_notes else ''},
        )

        # Notify operator that task is done; if linked to report, push report to in_progress for review
        if task.report:
            r = task.report
            if r.status not in ('resolved', 'rejected'):
                r.status = 'in_progress'
                r.save(update_fields=['status', 'updated_at'])
            if task.created_by:
                Notification.notify(
                    recipient=task.created_by,
                    type='task_completed',
                    title='Task đã hoàn thành — chờ xác nhận',
                    message=f'"{task.title}" đã hoàn thành bởi {task.assigned_to.full_name if task.assigned_to else "?"}',
                    link=f'/reports/{r.id}',
                )
        return Response(TaskSerializer(task).data)

    @action(detail=False, methods=['get'], url_path='actions/export-csv')
    def export(self, request):
        fmt = request.query_params.get('format', 'csv')
        qs = self.get_queryset()
        if fmt == 'csv':
            buf = StringIO()
            w = csv.writer(buf)
            w.writerow(['id', 'title', 'priority', 'status', 'assigned_to', 'created_by', 'due_date', 'completed_at', 'created_at'])
            for t in qs:
                w.writerow([
                    t.id, t.title, t.priority, t.status,
                    t.assigned_to.email if t.assigned_to else '',
                    t.created_by.email if t.created_by else '',
                    t.due_date.isoformat() if t.due_date else '',
                    t.completed_at.isoformat() if t.completed_at else '',
                    t.created_at.isoformat(),
                ])
            resp = HttpResponse(buf.getvalue(), content_type='text/csv')
            resp['Content-Disposition'] = 'attachment; filename="tasks.csv"'
            return resp
        return Response({'error': 'Unsupported format'}, status=status.HTTP_400_BAD_REQUEST)
