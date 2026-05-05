from rest_framework import serializers
from .models import Area


class AreaSerializer(serializers.ModelSerializer):
    bbox = serializers.SerializerMethodField()
    manager_name = serializers.CharField(source='manager.full_name', read_only=True, default='')

    class Meta:
        model = Area
        fields = [
            'id', 'name', 'code',
            'bbox_min_lng', 'bbox_min_lat', 'bbox_max_lng', 'bbox_max_lat',
            'bbox', 'manager', 'manager_name', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']

    def get_bbox(self, obj):
        return obj.bbox
