import uuid
from django.db import models
from django.conf import settings


class ActivityLog(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True,
        related_name='activities',
    )
    verb = models.CharField(max_length=64)
    target_type = models.CharField(max_length=64, blank=True)
    target_id = models.CharField(max_length=64, blank=True)
    details = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'activity_logs'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['target_type', 'target_id']),
            models.Index(fields=['actor', '-created_at']),
        ]

    def __str__(self):
        return f"{self.actor} {self.verb} {self.target_type}#{self.target_id}"

    @classmethod
    def log(cls, actor, verb, target_type='', target_id='', details=None):
        return cls.objects.create(
            actor=actor if actor and actor.is_authenticated else None,
            verb=verb,
            target_type=target_type,
            target_id=str(target_id) if target_id else '',
            details=details or {},
        )
