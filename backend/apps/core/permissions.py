from rest_framework import permissions
from core.config import ROLE_SUPER_ADMIN, ROLE_GYM_OWNER, ROLE_STAFF, ROLE_MEMBER

class IsSuperAdmin(permissions.BasePermission):
    """Only platform super admins."""
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == ROLE_SUPER_ADMIN
        )

class IsGymOwner(permissions.BasePermission):
    """Only gym owners (not super admin, not staff)."""
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == ROLE_GYM_OWNER
        )

class IsStaff(permissions.BasePermission):
    """Only gym staff."""
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == ROLE_STAFF
        )

class IsMember(permissions.BasePermission):
    """Only gym members."""
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == ROLE_MEMBER
        )

class IsGymOwnerOrSuperAdmin(permissions.BasePermission):
    """Gym owners or super admins."""
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.role in [ROLE_SUPER_ADMIN, ROLE_GYM_OWNER]

class IsOwnerOrStaff(permissions.BasePermission):
    """
    Gym owners AND staff can access.
    Used for attendance + member management (staff can mark attendance, view members).
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.role in [ROLE_GYM_OWNER, ROLE_STAFF]

class IsOwnerStaffOrMember(permissions.BasePermission):
    """Any authenticated tenant user (owner / staff / member)."""
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.role in [ROLE_GYM_OWNER, ROLE_STAFF, ROLE_MEMBER]

class IsOwnerOrSuperAdmin(permissions.BasePermission):
    """Same as IsGymOwnerOrSuperAdmin — explicit alias."""
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.role in [ROLE_SUPER_ADMIN, ROLE_GYM_OWNER]

class HasResolvedTenant(permissions.BasePermission):
    """
    Enforce tenant resolution.
    - Super admins always allow.
    - Others: request.tenant must NOT be None.
    """
    message = "No gym selected"

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.role == ROLE_SUPER_ADMIN:
            return True
        return bool(getattr(request, "tenant", None))

class IsTenantAuthenticated(permissions.BasePermission):
    """
    Authenticated user that belongs to a gym (all non-super-admin roles).
    Used for endpoints that need tenant scoping.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return bool(request.user.gym_id)
