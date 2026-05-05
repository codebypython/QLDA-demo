"""Role-based permission classes for InfraWatch."""
from rest_framework.permissions import BasePermission, SAFE_METHODS


def _role(user):
    return getattr(user, 'role', None) if user and user.is_authenticated else None


class IsAdmin(BasePermission):
    def has_permission(self, request, view):
        return _role(request.user) == 'admin'


class IsOperatorOrAdmin(BasePermission):
    """Operator/admin allowed for any method."""
    def has_permission(self, request, view):
        return _role(request.user) in ('operator', 'admin')


class IsTaskForce(BasePermission):
    """TaskForce/admin allowed."""
    def has_permission(self, request, view):
        return _role(request.user) in ('taskforce', 'admin')


class ReadOnlyOrOperator(BasePermission):
    """Anyone authenticated can read; only operator/admin can write."""
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.method in SAFE_METHODS:
            return True
        return _role(request.user) in ('operator', 'admin')


class ReportPermission(BasePermission):
    """
    Reports:
    - Anyone authenticated may create.
    - Citizen sees only their own (filtered in queryset).
    - Operator/admin: full access.
    - Taskforce: read-only on reports linked to their tasks (filtered in queryset).
    - Only operator/admin may update_status, delete.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        action = getattr(view, 'action', None)
        role = _role(request.user)
        if action in ('create',):
            return True
        if action in ('list', 'retrieve', 'stats', 'timeline', 'analytics_timeline',
                      'analytics_response_time', 'analytics_hour_heatmap',
                      'analytics_top_areas', 'analytics_ai_accuracy',
                      'export', 'comments'):
            return True
        if action in ('update', 'partial_update', 'destroy', 'update_status'):
            return role in ('operator', 'admin')
        return True

    def has_object_permission(self, request, view, obj):
        role = _role(request.user)
        if role in ('operator', 'admin'):
            return True
        if role == 'citizen':
            return obj.reporter_id == request.user.id
        if role == 'taskforce':
            return obj.tasks.filter(assigned_to=request.user).exists()
        return False


class TaskPermission(BasePermission):
    """
    Tasks:
    - Operator/admin: full access.
    - Taskforce: list/retrieve own tasks (filtered in queryset), can update own status, complete.
    - Citizen: no access.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        role = _role(request.user)
        if role == 'citizen':
            return False
        action = getattr(view, 'action', None)
        if action in ('list', 'retrieve'):
            return role in ('operator', 'admin', 'taskforce')
        if action in ('create', 'update', 'partial_update', 'destroy'):
            return role in ('operator', 'admin')
        if action in ('complete',):
            return role in ('operator', 'admin', 'taskforce')
        return True

    def has_object_permission(self, request, view, obj):
        role = _role(request.user)
        if role in ('operator', 'admin'):
            return True
        if role == 'taskforce':
            return obj.assigned_to_id == request.user.id
        return False


class MaintenancePermission(BasePermission):
    """Operator/admin full; taskforce read-only."""
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        role = _role(request.user)
        if role == 'citizen':
            return False
        if request.method in SAFE_METHODS:
            return True
        return role in ('operator', 'admin')
