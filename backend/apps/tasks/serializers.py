from rest_framework import serializers
from .models import Task


class TaskSerializer(serializers.ModelSerializer):
    assigned_to_name = serializers.CharField(source='assigned_to.full_name', read_only=True, default='')
    created_by_name = serializers.CharField(source='created_by.full_name', read_only=True, default='')
    report_summary = serializers.SerializerMethodField()

    class Meta:
        model = Task
        fields = [
            'id', 'title', 'description', 'report', 'report_summary',
            'assigned_to', 'assigned_to_name', 'created_by', 'created_by_name',
            'priority', 'status', 'due_date', 'completed_at',
            'completion_notes', 'completion_image', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_by', 'created_at', 'updated_at']

    def get_report_summary(self, obj):
        if not obj.report_id:
            return None
        r = obj.report
        return {
            'id': str(r.id),
            'incident_type': r.incident_type,
            'incident_type_display': r.get_incident_type_display(),
            'latitude': r.latitude,
            'longitude': r.longitude,
            'description': (r.description or '')[:120],
        }
