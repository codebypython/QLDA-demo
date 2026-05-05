from rest_framework import serializers
from .models import ActivityLog


class ActivityLogSerializer(serializers.ModelSerializer):
    actor_email = serializers.CharField(source='actor.email', read_only=True, default='')
    actor_name = serializers.CharField(source='actor.full_name', read_only=True, default='')
    actor_role = serializers.CharField(source='actor.role', read_only=True, default='')

    class Meta:
        model = ActivityLog
        fields = [
            'id', 'actor', 'actor_email', 'actor_name', 'actor_role',
            'verb', 'target_type', 'target_id', 'details', 'created_at',
        ]
        read_only_fields = fields
