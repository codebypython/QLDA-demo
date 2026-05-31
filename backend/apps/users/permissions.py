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


class ReadOnlyAuthenticatedOrAdminWrite(BasePermission):
    """All authenticated users may read; only admin may POST/PATCH/DELETE."""
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.method in SAFE_METHODS:
            return True
        return _role(request.user) == 'admin'


class ReportPermission(BasePermission):
    """
    Reports:
    - Anyone authenticated may create.
    - Citizen: own reports; may PATCH/DELETE own only while status is pending.
    - Operator/admin: full access including update_status.
    - Taskforce: read on reports linked to their tasks; no report body CUD.
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
                      'export', 'comments', 'comment_detail'):
            return True
        if action == 'update_status':
            return role in ('operator', 'admin')
        if action in ('update', 'partial_update', 'destroy'):
            return role in ('operator', 'admin', 'citizen')
        return True

    def has_object_permission(self, request, view, obj):
        from apps.reports.models import IncidentReport
        role = _role(request.user)
        action = getattr(view, 'action', None)
        if role in ('operator', 'admin'):
            return True
        if role == 'citizen':
            if obj.reporter_id != request.user.id:
                return False
            if action in ('partial_update', 'update', 'destroy'):
                return obj.status == IncidentReport.Status.PENDING
            return True
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
        if action == 'export':
            return role in ('operator', 'admin')
        if action in ('list', 'retrieve'):
            return role in ('operator', 'admin', 'taskforce')
        if action in ('create', 'destroy'):
            return role in ('operator', 'admin')
        if action in ('update', 'partial_update'):
            return role in ('operator', 'admin', 'taskforce')
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
    """
    Citizen: no access.
    Authenticated reads: operator, admin, taskforce.
    Writes: operator, admin full; taskforce create + patch own technician logs.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        role = _role(request.user)
        if role == 'citizen':
            return False
        action = getattr(view, 'action', None)
        if action == 'export':
            return role in ('operator', 'admin')
        if request.method in SAFE_METHODS:
            return role in ('operator', 'admin', 'taskforce')
        if action == 'create':
            return role in ('operator', 'admin', 'taskforce')
        if action == 'destroy':
            return role in ('operator', 'admin')
        if action in ('update', 'partial_update'):
            return role in ('operator', 'admin', 'taskforce')
        return True

    def has_object_permission(self, request, view, obj):
        role = _role(request.user)
        if role in ('operator', 'admin'):
            return True
        if role == 'taskforce':
            technician_id = getattr(obj, 'technician_id', None)
            return technician_id == request.user.id
        return False
