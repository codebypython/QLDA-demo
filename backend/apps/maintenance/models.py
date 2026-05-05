import uuid
from django.db import models
from django.conf import settings


class MaintenanceLog(models.Model):
    class Status(models.TextChoices):
        SCHEDULED = 'scheduled', 'Đã lên lịch'
        IN_PROGRESS = 'in_progress', 'Đang thực hiện'
        COMPLETED = 'completed', 'Hoàn thành'
        CANCELLED = 'cancelled', 'Hủy bỏ'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    asset = models.ForeignKey('assets.Asset', on_delete=models.CASCADE, related_name='maintenance_logs')
    report = models.ForeignKey('reports.IncidentReport', on_delete=models.SET_NULL, null=True, blank=True, related_name='maintenance_logs')
    technician = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='maintenance_assignments')
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.SCHEDULED)
    scheduled_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)
    completion_image = models.ImageField(upload_to='maintenance/%Y/%m/%d/', null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'maintenance_logs'
        ordering = ['-created_at']

    def __str__(self):
        return f"Maintenance {str(self.id)[:8]} - {self.asset.name}"
