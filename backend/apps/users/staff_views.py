"""
users/staff_views.py
====================
Staff management API — gym owner creates, lists, updates, removes staff.
Staff can see their own profile but cannot manage other staff.
"""
from __future__ import annotations

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError

from django.contrib.auth import get_user_model
from django.db import transaction

from core.permissions import IsGymOwner, IsOwnerOrStaff
from core.config import ROLE_STAFF, ROLE_GYM_OWNER
from core.email import send_member_credentials

User = get_user_model()


class StaffSerializer:
    """Inline serializer — returns clean staff dict."""
    @staticmethod
    def to_dict(user, request=None):
        return {
            "id": str(user.id),
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "role": user.role,
            "is_active": user.is_active,
            "date_joined": user.date_joined,
        }


class StaffViewSet(viewsets.ViewSet):
    """
    /api/staff/

    GET    — list all staff of the gym                   [owner]
    POST   — create a staff account                      [owner]
    GET    /{id}/ — retrieve a staff member              [owner]
    PATCH  /{id}/ — update staff                         [owner]
    DELETE /{id}/ — remove staff (deactivate)            [owner]
    POST   /{id}/reset-password/ — reset staff password  [owner]
    """

    def get_permissions(self):
        return [IsGymOwner()]

    def _gym_staff_qs(self, request):
        return User.objects.filter(gym=request.user.gym, role=ROLE_STAFF)

    # ------------------------------------------------------------------
    # LIST
    # ------------------------------------------------------------------
    def list(self, request):
        qs = self._gym_staff_qs(request).order_by("-date_joined")
        return Response([StaffSerializer.to_dict(u) for u in qs])

    # ------------------------------------------------------------------
    # RETRIEVE
    # ------------------------------------------------------------------
    def retrieve(self, request, pk=None):
        try:
            staff = self._gym_staff_qs(request).get(pk=pk)
        except User.DoesNotExist:
            return Response({"detail": "Staff member not found."}, status=404)
        return Response(StaffSerializer.to_dict(staff))

    # ------------------------------------------------------------------
    # CREATE
    # ------------------------------------------------------------------
    def create(self, request):
        data = request.data
        email = data.get("email", "").strip()
        password = data.get("password", "").strip()
        first_name = data.get("first_name", "").strip()
        last_name = data.get("last_name", "").strip()

        if not email:
            return Response({"detail": "Email is required."}, status=400)
        if not password or len(password) < 6:
            return Response({"detail": "Password must be at least 6 characters."}, status=400)
        if User.objects.filter(email__iexact=email).exists():
            return Response({"detail": "A user with this email already exists."}, status=400)

        gym = request.user.gym

        with transaction.atomic():
            staff = User.objects.create_user(
                email=email,
                password=password,
                first_name=first_name,
                last_name=last_name,
                role=ROLE_STAFF,
                gym=gym,
                is_verified=True,
            )

        # Send login credentials email
        try:
            send_member_credentials(
                to_email=staff.email,
                member_name=f"{first_name} {last_name}".strip() or email,
                gym_name=gym.name,
                gym_url=gym.full_url or f"http://{gym.subdomain}.localhost:5173",
                password=password,
            )
        except Exception:
            pass

        return Response(StaffSerializer.to_dict(staff), status=status.HTTP_201_CREATED)

    # ------------------------------------------------------------------
    # UPDATE (PATCH)
    # ------------------------------------------------------------------
    def partial_update(self, request, pk=None):
        try:
            staff = self._gym_staff_qs(request).get(pk=pk)
        except User.DoesNotExist:
            return Response({"detail": "Staff member not found."}, status=404)

        data = request.data
        if "first_name" in data:
            staff.first_name = data["first_name"]
        if "last_name" in data:
            staff.last_name = data["last_name"]
        if "is_active" in data:
            staff.is_active = bool(data["is_active"])
        staff.save()
        return Response(StaffSerializer.to_dict(staff))

    # ------------------------------------------------------------------
    # DELETE (soft deactivate)
    # ------------------------------------------------------------------
    def destroy(self, request, pk=None):
        try:
            staff = self._gym_staff_qs(request).get(pk=pk)
        except User.DoesNotExist:
            return Response({"detail": "Staff member not found."}, status=404)

        staff.is_active = False
        staff.save(update_fields=["is_active"])
        return Response({"detail": f"Staff {staff.email} deactivated."})

    # ------------------------------------------------------------------
    # RESET PASSWORD
    # ------------------------------------------------------------------
    @action(detail=True, methods=["post"], url_path="reset-password")
    def reset_password(self, request, pk=None):
        try:
            staff = self._gym_staff_qs(request).get(pk=pk)
        except User.DoesNotExist:
            return Response({"detail": "Staff member not found."}, status=404)

        new_password = request.data.get("password", "").strip()
        if not new_password or len(new_password) < 6:
            return Response({"detail": "Password must be at least 6 characters."}, status=400)

        staff.set_password(new_password)
        staff.save()

        # Notify staff by email using the template-based generic notification
        try:
            from core.email import send_generic_notification_email
            send_generic_notification_email(
                to_email=staff.email,
                member_name=staff.first_name or staff.email,
                gym_name=staff.gym.name,
                subject=f"Your password has been reset — {staff.gym.name}",
                message=(
                    f"Your password for {staff.gym.name} has been reset by the gym owner.\n\n"
                    f"New password: {new_password}\n\n"
                    "Please log in and change your password immediately."
                ),
            )
        except Exception:
            pass

        return Response({"detail": "Password reset successfully."})
