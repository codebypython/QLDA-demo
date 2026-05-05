from rest_framework import viewsets, mixins
from .models import ActivityLog
from .serializers import ActivityLogSerializer
from apps.users.permissions import IsAdmin


class ActivityLogViewSet(mixins.ListModelMixin, viewsets.GenericViewSet):
    serializer_class = ActivityLogSerializer
    permission_classes = [IsAdmin]

    def get_queryset(self):
        qs = ActivityLog.objects.select_related('actor')
        actor_id = self.request.query_params.get('actor')
        if actor_id:
            qs = qs.filter(actor_id=actor_id)
        verb = self.request.query_params.get('verb')
        if verb:
            qs = qs.filter(verb=verb)
        target_type = self.request.query_params.get('target_type')
        if target_type:
            qs = qs.filter(target_type=target_type)
        since = self.request.query_params.get('since')
        if since:
            qs = qs.filter(created_at__gte=since)
        return qs
