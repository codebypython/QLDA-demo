from django.db import models


class SystemSetting(models.Model):
    """Singleton-style key-value settings table."""
    key = models.CharField(max_length=128, unique=True)
    value = models.JSONField(default=dict, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'system_settings'
        ordering = ['key']

    def __str__(self):
        return self.key

    @classmethod
    def get(cls, key, default=None):
        try:
            obj = cls.objects.get(key=key)
            return obj.value
        except cls.DoesNotExist:
            return default

    @classmethod
    def set(cls, key, value):
        obj, _ = cls.objects.update_or_create(key=key, defaults={'value': value})
        return obj


DEFAULT_SETTINGS = {
    'system_name': 'InfraWatch — Đà Nẵng',
    'logo_url': '',
    'ai_confidence_threshold': 0.5,
    'default_map_center': {'lat': 16.0678, 'lng': 108.2208, 'zoom': 14},
    'notification_polling_seconds': 30,
}
