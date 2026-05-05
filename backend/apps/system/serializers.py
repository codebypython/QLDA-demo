from rest_framework import serializers
from .models import SystemSetting


class SystemSettingSerializer(serializers.ModelSerializer):
    class Meta:
        model = SystemSetting
        fields = ['key', 'value', 'updated_at']
        read_only_fields = ['updated_at']
