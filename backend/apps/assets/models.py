import uuid
import os
from django.db import models

# Conditional PostGIS support
USE_POSTGIS = os.environ.get('USE_POSTGIS', 'false').lower() == 'true'

if USE_POSTGIS:
    from django.contrib.gis.db import models as gis_models
    PointFieldClass = gis_models.PointField
else:
    # Fallback: store lat/lng as separate fields
    PointFieldClass = None


class AssetQuerySet(models.QuerySet):
    def active(self):
        return self.filter(status='active')

    def by_type(self, asset_type):
        return self.filter(asset_type=asset_type)

    def within_bbox(self, bbox_str):
        """Filter assets within bounding box: 'minx,miny,maxx,maxy' (PostGIS only)"""
        if USE_POSTGIS:
            from django.contrib.gis.geos import Polygon
            coords = [float(c) for c in bbox_str.split(',')]
            polygon = Polygon.from_bbox(coords)
            return self.filter(location__within=polygon)
        # Fallback: simple lat/lng range filter
        parts = [float(c) for c in bbox_str.split(',')]
        return self.filter(
            _longitude__gte=parts[0], _latitude__gte=parts[1],
            _longitude__lte=parts[2], _latitude__lte=parts[3],
        )


class Asset(models.Model):
    class AssetType(models.TextChoices):
        BENCH = 'bench', 'Ghế đá'
        TRASH_CAN = 'trash_can', 'Thùng rác'
        LAMP = 'lamp', 'Cột đèn'
        TOILET = 'toilet', 'Nhà vệ sinh'
        TREE = 'tree', 'Cây xanh'
        SIGN = 'sign', 'Biển báo'

    class Status(models.TextChoices):
        ACTIVE = 'active', 'Hoạt động'
        DAMAGED = 'damaged', 'Hư hỏng'
        MAINTENANCE = 'maintenance', 'Đang bảo trì'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    asset_type = models.CharField(max_length=50, choices=AssetType.choices)
    # Fallback lat/lng fields (used when PostGIS is not available)
    _latitude = models.FloatField(default=0, db_column='latitude')
    _longitude = models.FloatField(default=0, db_column='longitude')
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)
    installed_at = models.DateField(null=True, blank=True)
    last_maintained_at = models.DateField(null=True, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = AssetQuerySet.as_manager()

    class Meta:
        db_table = 'assets'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['asset_type', 'status']),
            models.Index(fields=['-created_at']),
        ]

    def __str__(self):
        return f"{self.name} ({self.get_asset_type_display()}) - {self.get_status_display()}"

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


# Add PointField dynamically only when PostGIS is available
if USE_POSTGIS and PointFieldClass:
    Asset.add_to_class('location', PointFieldClass(srid=4326, null=True, blank=True))
