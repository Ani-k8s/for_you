from __future__ import annotations

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response

from core.permissions import IsGymOwnerOrSuperAdmin, IsOwnerOrStaff, IsTenantAuthenticated
from notifications.models import Notification
from notifications.serializers import NotificationSerializer
from core.config import ROLE_SUPER_ADMIN, ROLE_GYM_OWNER, ROLE_STAFF, ROLE_MEMBER


class NotificationViewSet(viewsets.ModelViewSet):
    """
    Notification CRUD — tenant-scoped.

    - Owner/Staff: full CRUD on their gym's notifications
    - Members: read-only (their gym's notifications)
    - Super Admin: no gym-level notifications (managed globally)
    """
    serializer_class = NotificationSerializer
    queryset = Notification.all_objects.select_related("gym").all()
    search_fields = ["title", "message"]
    ordering_fields = ["created_at", "updated_at"]
    filterset_fields = ["type", "is_read"]

    def get_permissions(self):
        # Members can only read; owners/staff can create and mark read
        if self.action in ["list", "retrieve"]:
            return [IsTenantAuthenticated()]
        return [IsOwnerOrStaff()]

    def _effective_gym(self):
        tenant = getattr(self.request, "tenant", None)
        if tenant is not None:
            return tenant
        return getattr(self.request.user, "gym", None)

    def get_queryset(self):
        user = self.request.user
        role = getattr(user, "role", None)
        gym = self._effective_gym()

        # Super admin has no gym-level notifications
        if role == ROLE_SUPER_ADMIN or gym is None:
            return Notification.all_objects.none()

        # FIXED: was checking "owner" — correct role is "gym_owner"
        if role in {ROLE_GYM_OWNER, ROLE_STAFF}:
            return Notification.all_objects.filter(gym_id=gym.id).order_by("-created_at")
        
        if role == ROLE_MEMBER:
            from django.db.models import Q
            # Members see:
            # 1. Notifications explicitly for them
            # 2. Notifications for the whole gym (member=None)
            qs = Notification.all_objects.filter(
                gym_id=gym.id
            ).filter(
                Q(member__user=user) | Q(member__isnull=True)
            ).filter(is_read=False)
            return qs.order_by("-created_at")

        return Notification.all_objects.none()

    def perform_create(self, serializer):
        gym = self._effective_gym()
        serializer.save(gym=gym)

    @action(detail=False, methods=["post"], url_path="send-to-all")
    def send_to_all(self, request):
        """
        POST /api/notifications/send-to-all/
        Owner/Staff can broadcast a notification to all members of the gym.
        """
        gym = self._effective_gym()
        title = request.data.get("title")
        message = request.data.get("message")
        
        if not title or not message:
            return Response({"detail": "Title and message are required."}, status=400)
            
        notification = Notification.all_objects.create(
            gym=gym,
            title=title,
            message=message,
            type=Notification.Type.NEW_MEMBER, # General broadcast
            member=None # Gym-wide
        )
        return Response(NotificationSerializer(notification).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="mark-read")
    def mark_read(self, request, pk=None):
        """Mark a single notification as read."""
        notification = self.get_object()
        notification.is_read = True
        notification.save(update_fields=["is_read", "updated_at"])
        return Response({"detail": "Marked as read."})

    @action(detail=False, methods=["post"], url_path="mark-all-read")
    def mark_all_read(self, request):
        """Mark all gym notifications as read."""
        gym = self._effective_gym()
        if not gym:
            return Response({"detail": "No gym."}, status=400)
        Notification.all_objects.filter(gym_id=gym.id, is_read=False).update(is_read=True)
        return Response({"detail": "All notifications marked as read."})

    @action(detail=False, methods=["get"], url_path="unread-count")
    def unread_count(self, request):
        """Returns the count of unread notifications for the gym."""
        gym = self._effective_gym()
        if not gym:
            return Response({"count": 0})
        count = Notification.all_objects.filter(gym_id=gym.id, is_read=False).count()
        return Response({"count": count})
