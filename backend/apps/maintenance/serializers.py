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

    def validate(self, attrs):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return attrs
        user = request.user
        role = getattr(user, 'role', None)

        if role == 'taskforce':
            attrs.pop('technician', None)
            if self.instance:
                if self.instance.status == MaintenanceLog.Status.COMPLETED:
                    raise serializers.ValidationError('Không được sửa log đã hoàn thành.')
                forbidden = set(attrs.keys()) - {'notes', 'scheduled_at', 'status'}
                if forbidden:
                    raise serializers.ValidationError(
                        {k: 'Không được chỉnh sửa trường này.' for k in forbidden}
                    )
            else:
                status_val = attrs.get('status', MaintenanceLog.Status.SCHEDULED)
                if status_val == MaintenanceLog.Status.COMPLETED:
                    raise serializers.ValidationError({
                        'status': 'Tạo log với trạng thái khác, sau đó cập nhật hoàn thành.',
                    })
                rep = attrs.get('report')
                if rep is not None and not rep.tasks.filter(assigned_to=user).exists():
                    raise serializers.ValidationError({
                        'report': 'Báo cáo không gắn nhiệm vụ được phân công cho bạn.',
                    })
        return attrs
