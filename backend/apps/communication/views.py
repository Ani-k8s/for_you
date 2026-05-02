from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import action
from django.db.models import Q
from communication.models import ChatMessage
from communication.serializers import ChatMessageSerializer

class ChatMessageViewSet(viewsets.ModelViewSet):
    serializer_class = ChatMessageSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        # Filter by gym and (sender or recipient)
        return ChatMessage.objects.filter(gym=user.gym).filter(
            Q(sender=user) | Q(recipient=user)
        ).order_by("-created_at")

    def perform_create(self, serializer):
        user = self.request.user
        tenant = getattr(self.request, "tenant", user.gym)

        # If SuperAdmin is sending, fallback to explicit gym in data
        if not tenant and user.role == "super_admin":
             gym_id = self.request.data.get("gym")
             if gym_id:
                 from gyms.models import Gym
                 tenant = Gym.objects.filter(id=gym_id).first()

        if not tenant:
            from rest_framework.exceptions import ValidationError
            raise ValidationError({"gym": ["No gym resolved for this message."]})

        serializer.save(sender=user, gym=tenant)

    @action(detail=False, methods=["get"])
    def inbox(self, request):
        messages = self.get_queryset().filter(recipient=request.user)
        serializer = self.get_serializer(messages, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["post"])
    def mark_all_read(self, request):
        self.get_queryset().filter(recipient=request.user, is_read=False).update(is_read=True)
        return Response({"status": "read"})
