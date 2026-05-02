"""
gyms/plan_views.py
==================
Dedicated Plans CRUD — scoped to the gym owner's gym.
Staff can view plans (needed for member creation form).
Super admin can view all.
"""
from rest_framework import viewsets, status
from rest_framework.response import Response

from core.permissions import IsGymOwner, IsOwnerOrStaff, IsGymOwnerOrSuperAdmin
from core.config import ROLE_SUPER_ADMIN
from gyms.models import Plan
from gyms.serializers import PlanSerializer


class PlanViewSet(viewsets.ModelViewSet):
    """
    GET    /api/plans/           — list plans (owner/staff see their gym's)
    POST   /api/plans/           — create plan (owner only)
    PATCH  /api/plans/{id}/      — update plan (owner only)
    DELETE /api/plans/{id}/      — delete plan (owner only)
    """
    serializer_class = PlanSerializer

    def get_permissions(self):
        if self.action in ["list", "retrieve"]:
            return [IsOwnerOrStaff()]
        return [IsGymOwner()]

    def get_queryset(self):
        user = self.request.user
        if user.role == ROLE_SUPER_ADMIN:
            return Plan.all_objects.all().order_by("gym", "duration_days")
        if user.gym:
            return Plan.all_objects.filter(gym=user.gym).order_by("duration_days")
        return Plan.all_objects.none()

    def perform_create(self, serializer):
        serializer.save(gym=self.request.user.gym)

    def perform_update(self, serializer):
        # Prevent switching gym on update
        serializer.save(gym=self.instance.gym if hasattr(self, "instance") else self.request.user.gym)
