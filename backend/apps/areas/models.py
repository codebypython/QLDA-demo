import uuid
from django.db import models
from django.conf import settings


class Area(models.Model):
    """Administrative area (district) — bbox-based for simplicity (no PostGIS dep)."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=128)
    code = models.CharField(max_length=64, unique=True)
    # bbox: [minLng, minLat, maxLng, maxLat]
    bbox_min_lng = models.FloatField()
    bbox_min_lat = models.FloatField()
    bbox_max_lng = models.FloatField()
    bbox_max_lat = models.FloatField()
    manager = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='managed_areas',
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'areas'
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.code})"

    @property
    def bbox(self):
        return [self.bbox_min_lng, self.bbox_min_lat, self.bbox_max_lng, self.bbox_max_lat]

    def contains(self, lat, lng):
        return (
            self.bbox_min_lat <= lat <= self.bbox_max_lat
            and self.bbox_min_lng <= lng <= self.bbox_max_lng
        )

    @classmethod
    def find_for(cls, lat, lng):
        for area in cls.objects.all():
            if area.contains(lat, lng):
                return area
        return None
