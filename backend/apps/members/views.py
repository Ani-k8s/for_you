from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from core.permissions import IsOwnerOrStaff, IsGymOwner
from members.models import Member
from members.serializers import MemberSerializer, MemberDetailSerializer


class MemberViewSet(viewsets.ModelViewSet):
    """
    Member CRUD with RBAC + tenant scoping.

    - GET   (list/retrieve): Owner and Staff
    - POST  (create):        Owner only          [enforced in serializer]
    - PATCH (update):        Owner and Staff     [enforced in serializer]
    - DELETE:                Owner only          [enforced below]
    """
    serializer_class = MemberSerializer
    permission_classes = [IsOwnerOrStaff]
    queryset = Member.objects.all()
    search_fields = ["user__email", "user__first_name", "user__last_name"]
    ordering_fields = ["created_at", "end_date"]
    filterset_fields = ["plan", "is_active"]

    def get_serializer_class(self):
        if self.action == "retrieve":
            return MemberDetailSerializer
        return MemberSerializer

    def get_permissions(self):
        """Only owners can delete members."""
        if self.action == "destroy":
            return [IsGymOwner()]
        return [IsOwnerOrStaff()]

    def get_queryset(self):
        return Member.objects.for_user(self.request.user)

    def get_serializer_context(self):
        """
        FIXED: Inject the resolved tenant gym into serializer context
        so MemberSerializer.validate() can enforce gym isolation.
        """
        ctx = super().get_serializer_context()
        user = self.request.user
        # Prefer the subdomain-resolved tenant; fall back to the user's own gym.
        tenant = getattr(self.request, "tenant", None)
        ctx["gym"] = tenant or getattr(user, "gym", None)
        return ctx

    def perform_create(self, serializer):
        """
        Gym is resolved through serializer context (see get_serializer_context).
        The serializer handles user creation + plan assignment.
        """
        gym = self.get_serializer_context().get("gym")
        serializer.save(gym=gym)

    @action(detail=True, methods=["post"], permission_classes=[IsGymOwner],
            url_path="deactivate")
    def deactivate(self, request, pk=None):
        """Soft-deactivate a member without deleting them."""
        member = self.get_object()
        member.is_active = False
        member.save(update_fields=["is_active", "updated_at"])
        return Response({"message": "Member deactivated successfully", "id": str(member.id)})

    @action(detail=True, methods=["post"], permission_classes=[IsGymOwner],
            url_path="reactivate")
    def reactivate(self, request, pk=None):
        """Re-activate a previously deactivated member."""
        member = self.get_object()
        member.is_active = True
        member.save(update_fields=["is_active", "updated_at"])
        return Response({"message": "Member reactivated successfully", "id": str(member.id)})
