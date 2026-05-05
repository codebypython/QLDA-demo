import uuid
import os
from django.db import models
from django.conf import settings

USE_POSTGIS = os.environ.get('USE_POSTGIS', 'false').lower() == 'true'


class IncidentReport(models.Model):
    class IncidentType(models.TextChoices):
        LITTERING = 'littering', 'Xả rác'
        POTHOLE = 'pothole', 'Ổ gà'
        BROKEN_LAMP = 'broken_lamp', 'Đèn hỏng'
        VANDALISM = 'vandalism', 'Phá hoại'
        FLOODING = 'flooding', 'Ngập nước'
        CROWD = 'crowd', 'Tụ tập đông'
        OTHER = 'other', 'Khác'

    class Severity(models.TextChoices):
        LOW = 'low', 'Thấp'
        MEDIUM = 'medium', 'Trung bình'
        HIGH = 'high', 'Cao'
        CRITICAL = 'critical', 'Nghiêm trọng'

    class Status(models.TextChoices):
        PENDING = 'pending', 'Chờ xử lý'
        ASSIGNED = 'assigned', 'Đã phân công'
        IN_PROGRESS = 'in_progress', 'Đang xử lý'
        RESOLVED = 'resolved', 'Đã giải quyết'
        REJECTED = 'rejected', 'Từ chối'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    reporter = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='reports')
    _latitude = models.FloatField(default=0, db_column='latitude')
    _longitude = models.FloatField(default=0, db_column='longitude')
    image = models.ImageField(upload_to='reports/%Y/%m/%d/', null=True, blank=True)
    description = models.TextField(blank=True)
    incident_type = models.CharField(max_length=50, choices=IncidentType.choices, default=IncidentType.OTHER)
    severity = models.CharField(max_length=20, choices=Severity.choices, default=Severity.MEDIUM)
    ai_confidence = models.FloatField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'incident_reports'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status', '-created_at']),
            models.Index(fields=['incident_type']),
        ]

    def __str__(self):
        return f"Report #{str(self.id)[:8]} - {self.get_incident_type_display()} ({self.get_status_display()})"

    @property
    def latitude(self):
        if USE_POSTGIS and hasattr(self, 'location') and self.location:
            return self.location.y
        return self._latitude

    @property
    def longitude(self):
        if USE_POSTGIS and hasattr(self, 'location') and self.location:
            return self.location.x
        return self._longitude


if USE_POSTGIS:
    from django.contrib.gis.db import models as gis_models
    IncidentReport.add_to_class('location', gis_models.PointField(srid=4326, null=True, blank=True))
