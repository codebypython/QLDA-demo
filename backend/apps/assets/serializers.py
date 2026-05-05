from rest_framework import serializers
from .models import Asset


class AssetSerializer(serializers.ModelSerializer):
    asset_type_display = serializers.CharField(source='get_asset_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    latitude = serializers.FloatField(read_only=True)
    longitude = serializers.FloatField(read_only=True)

    class Meta:
        model = Asset
        fields = [
            'id', 'name', 'asset_type', 'asset_type_display',
            'status', 'status_display', 'latitude', 'longitude',
            'installed_at', 'last_maintained_at', 'metadata',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class AssetCreateSerializer(serializers.ModelSerializer):
    latitude = serializers.FloatField(write_only=True)
    longitude = serializers.FloatField(write_only=True)

    class Meta:
        model = Asset
        fields = [
            'name', 'asset_type', 'status', 'latitude', 'longitude',
            'installed_at', 'metadata',
        ]

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
        return super().create(validated_data)
