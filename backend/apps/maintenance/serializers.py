from rest_framework import serializers
from .models import MaintenanceLog

class MaintenanceSerializer(serializers.ModelSerializer):
    asset_name = serializers.CharField(source='asset.name', read_only=True)
    technician_name = serializers.CharField(source='technician.full_name', read_only=True, default='')

    class Meta:
        model = MaintenanceLog
        fields = ['id', 'asset', 'asset_name', 'report', 'technician', 'technician_name',
                  'status', 'scheduled_at', 'completed_at', 'notes', 'completion_image', 'created_at']
        read_only_fields = ['id', 'created_at']
