import uuid
from django.db import models
from django.conf import settings


class Task(models.Model):
    class Priority(models.TextChoices):
        LOW = 'low', 'Thấp'
        MEDIUM = 'medium', 'Trung bình'
        HIGH = 'high', 'Cao'
        URGENT = 'urgent', 'Khẩn cấp'

    class Status(models.TextChoices):
        OPEN = 'open', 'Mở'
        ASSIGNED = 'assigned', 'Đã phân công'
        IN_PROGRESS = 'in_progress', 'Đang thực hiện'
        COMPLETED = 'completed', 'Hoàn thành'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    report = models.ForeignKey('reports.IncidentReport', on_delete=models.SET_NULL, null=True, blank=True, related_name='tasks')
    assigned_to = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_tasks')
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='created_tasks')
    priority = models.CharField(max_length=20, choices=Priority.choices, default=Priority.MEDIUM)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.OPEN)
    due_date = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    completion_notes = models.TextField(blank=True)
    completion_image = models.ImageField(upload_to='tasks/%Y/%m/%d/', null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'tasks'
        ordering = ['-created_at']

    def __str__(self):
        return f"Task: {self.title} ({self.get_status_display()})"
