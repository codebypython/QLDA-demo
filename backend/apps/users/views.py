from rest_framework import generics, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from .models import User
from .serializers import (
    RegisterSerializer, UserSerializer, AdminUserSerializer, ChangePasswordSerializer,
)
from .permissions import IsAdmin


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = [permissions.AllowAny]
    serializer_class = RegisterSerializer


class ProfileView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get(self, request):
        return Response(UserSerializer(request.user).data)

    def patch(self, request):
        serializer = UserSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class ChangePasswordView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = request.user
        if not user.check_password(serializer.validated_data['old_password']):
            return Response({'old_password': 'Mật khẩu hiện tại không đúng'}, status=status.HTTP_400_BAD_REQUEST)
        user.set_password(serializer.validated_data['new_password'])
        user.save()
        return Response({'status': 'ok'})


class UserViewSet(viewsets.ModelViewSet):
    """Admin-only user management."""
    serializer_class = AdminUserSerializer
    permission_classes = [IsAdmin]

    def get_queryset(self):
        qs = User.objects.all().order_by('-date_joined')
        role = self.request.query_params.get('role')
        if role:
            qs = qs.filter(role=role)
        is_active = self.request.query_params.get('is_active')
        if is_active is not None:
            qs = qs.filter(is_active=is_active.lower() == 'true')
        return qs

    @action(detail=True, methods=['patch'])
    def deactivate(self, request, pk=None):
        user = self.get_object()
        user.is_active = False
        user.save(update_fields=['is_active'])
        return Response(AdminUserSerializer(user).data)

    @action(detail=True, methods=['patch'])
    def activate(self, request, pk=None):
        user = self.get_object()
        user.is_active = True
        user.save(update_fields=['is_active'])
        return Response(AdminUserSerializer(user).data)


class TaskforceListView(APIView):
    """Public-ish (auth required) list of taskforce users for assignment dropdowns."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        role = request.query_params.get('role', 'taskforce')
        users = User.objects.filter(role=role, is_active=True).order_by('full_name', 'username')
        return Response([
            {'id': str(u.id), 'email': u.email, 'full_name': u.full_name or u.username, 'role': u.role}
            for u in users
        ])


from django.core.cache import cache
from django.utils import timezone

class ShareLocationView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        latitude = request.data.get('latitude')
        longitude = request.data.get('longitude')
        enabled = request.data.get('enabled', True)

        if enabled and (latitude is None or longitude is None):
            return Response({'error': 'Vĩ độ và kinh độ là bắt buộc'}, status=status.HTTP_400_BAD_REQUEST)

        user_id = str(request.user.id)
        cache_key = f"user_location_{user_id}"

        if enabled:
            cache.set(cache_key, {
                'id': user_id,
                'latitude': float(latitude),
                'longitude': float(longitude),
                'name': request.user.full_name or request.user.username,
                'role': request.user.get_role_display(),
                'updated_at': timezone.now().isoformat(),
            }, timeout=35)
        else:
            cache.delete(cache_key)

        return Response({'status': 'Location updated'})


class ActiveLocationsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        users = User.objects.filter(is_active=True)
        active_locations = []

        for u in users:
            if u.id == request.user.id:
                continue
            cache_key = f"user_location_{str(u.id)}"
            loc = cache.get(cache_key)
            if loc:
                active_locations.append(loc)

        return Response(active_locations)
