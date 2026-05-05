from rest_framework import permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from .models import SystemSetting, DEFAULT_SETTINGS
from apps.users.permissions import IsAdmin


class SettingsView(APIView):
    """GET: any authenticated user gets effective settings.
    PATCH: admin only — partial update of arbitrary keys.
    """
    def get_permissions(self):
        if self.request.method == 'GET':
            return [permissions.IsAuthenticated()]
        return [IsAdmin()]

    def get(self, request):
        merged = dict(DEFAULT_SETTINGS)
        for s in SystemSetting.objects.all():
            merged[s.key] = s.value if isinstance(s.value, dict) else s.value
        return Response(merged)

    def patch(self, request):
        if not isinstance(request.data, dict):
            return Response({'error': 'Body must be an object'}, status=status.HTTP_400_BAD_REQUEST)
        for key, value in request.data.items():
            SystemSetting.set(key, value)
        return self.get(request)
