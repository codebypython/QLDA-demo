import uuid
from django.db import models
from django.conf import settings


class Notification(models.Model):
    class Type(models.TextChoices):
        REPORT_NEW = 'report_new', 'Báo cáo mới'
        REPORT_RESOLVED = 'report_resolved', 'Báo cáo đã giải quyết'
        REPORT_REJECTED = 'report_rejected', 'Báo cáo bị từ chối'
        TASK_ASSIGNED = 'task_assigned', 'Task được phân công'
        TASK_COMPLETED = 'task_completed', 'Task hoàn thành'
        SYSTEM = 'system', 'Hệ thống'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name='notifications',
    )
    type = models.CharField(max_length=32, choices=Type.choices, default=Type.SYSTEM)
    title = models.CharField(max_length=255)
    message = models.TextField(blank=True)
    link = models.CharField(max_length=255, blank=True, default='')
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'notifications'
        ordering = ['-created_at']
        indexes = [models.Index(fields=['recipient', 'is_read', '-created_at'])]

    def __str__(self):
        return f"{self.recipient} - {self.title}"

    @classmethod
    def notify(cls, recipient, type, title, message='', link=''):
        if recipient is None:
            return None
        return cls.objects.create(
            recipient=recipient, type=type, title=title,
            message=message, link=link,
        )
