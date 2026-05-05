import csv
from io import StringIO
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.http import HttpResponse
from django.utils import timezone
from .models import MaintenanceLog
from .serializers import MaintenanceSerializer
from apps.users.permissions import MaintenancePermission


class MaintenanceViewSet(viewsets.ModelViewSet):
    serializer_class = MaintenanceSerializer
    permission_classes = [MaintenancePermission]
    ordering = ['-created_at']

    def get_queryset(self):
        qs = MaintenanceLog.objects.select_related('asset', 'technician', 'report')
        asset_id = self.request.query_params.get('asset')
        if asset_id:
            qs = qs.filter(asset_id=asset_id)
        status_filter = self.request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)
        return qs

    def perform_update(self, serializer):
        instance = serializer.save()
        # When marked completed, update asset's last_maintained_at + status
        if instance.status == 'completed':
            instance.completed_at = instance.completed_at or timezone.now()
            asset = instance.asset
            asset.last_maintained_at = timezone.now().date()
            if asset.status in ('damaged', 'maintenance'):
                asset.status = 'active'
            asset.save()
            instance.save(update_fields=['completed_at'])

    @action(detail=False, methods=['get'])
    def export(self, request):
        fmt = request.query_params.get('format', 'csv')
        qs = self.get_queryset()
        if fmt == 'csv':
            buf = StringIO()
            w = csv.writer(buf)
            w.writerow(['id', 'asset', 'asset_name', 'status', 'technician', 'scheduled_at', 'completed_at', 'notes', 'created_at'])
            for m in qs:
                w.writerow([
                    m.id, m.asset_id, m.asset.name if m.asset else '', m.status,
                    m.technician.email if m.technician else '',
                    m.scheduled_at.isoformat() if m.scheduled_at else '',
                    m.completed_at.isoformat() if m.completed_at else '',
                    (m.notes or '').replace('\n', ' ')[:500],
                    m.created_at.isoformat(),
                ])
            resp = HttpResponse(buf.getvalue(), content_type='text/csv')
            resp['Content-Disposition'] = 'attachment; filename="maintenance.csv"'
            return resp
        return Response({'error': 'Unsupported format'}, status=status.HTTP_400_BAD_REQUEST)
