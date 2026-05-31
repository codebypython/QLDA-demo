from rest_framework import serializers
from .models import IncidentReport


class ReportSerializer(serializers.ModelSerializer):
    reporter_name = serializers.CharField(source='reporter.full_name', read_only=True, default='')
    incident_type_display = serializers.CharField(source='get_incident_type_display', read_only=True)
    severity_display = serializers.CharField(source='get_severity_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    latitude = serializers.FloatField(read_only=True)
    longitude = serializers.FloatField(read_only=True)
    tasks = serializers.SerializerMethodField()

    class Meta:
        model = IncidentReport
        fields = [
            'id', 'reporter', 'reporter_name', 'latitude', 'longitude',
            'image', 'description', 'incident_type', 'incident_type_display',
            'severity', 'severity_display', 'ai_confidence',
            'status', 'status_display', 'tasks',
            'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'reporter', 'ai_confidence', 'status',
            'tasks', 'created_at', 'updated_at',
        ]

    def get_tasks(self, obj):
        return [
            {
                'id': str(t.id),
                'status': t.status,
                'completion_image': t.completion_image.url if t.completion_image else None,
                'completion_notes': t.completion_notes,
                'assigned_to_name': t.assigned_to.full_name if t.assigned_to else '',
            }
            for t in obj.tasks.all()
        ]


class ReportCreateSerializer(serializers.ModelSerializer):
    latitude = serializers.FloatField(write_only=True)
    longitude = serializers.FloatField(write_only=True)
    ai_confidence = serializers.FloatField(write_only=True, required=False, allow_null=True)

    class Meta:
        model = IncidentReport
        fields = ['latitude', 'longitude', 'image', 'description', 'incident_type', 'severity', 'ai_confidence']

    def create(self, validated_data):
        import os
        lat = validated_data.pop('latitude')
        lng = validated_data.pop('longitude')
        if os.environ.get('USE_POSTGIS', 'false').lower() == 'true':
            from django.contrib.gis.geos import Point
            validated_data['location'] = Point(lng, lat, srid=4326)
        else:
            validated_data['_latitude'] = lat
            validated_data['_longitude'] = lng
        validated_data['reporter'] = self.context['request'].user
        return super().create(validated_data)


class ReportCitizenUpdateSerializer(serializers.ModelSerializer):
    """Citizen-only: edit own pending report fields (location fixed at create time)."""

    class Meta:
        model = IncidentReport
        fields = ['description', 'incident_type', 'severity', 'image']


class ReportOperatorUpdateSerializer(serializers.ModelSerializer):
    """Operator/admin: body + image updates; workflow status stays on update_status action."""

    class Meta:
        model = IncidentReport
        fields = ['description', 'incident_type', 'severity', 'image']
