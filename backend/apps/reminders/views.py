from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied
from core.permissions import IsGymOwner
from reminders.models import Reminder
from reminders.serializers import ReminderSerializer
from gyms.utils import get_gym_config

class ReminderViewSet(viewsets.ModelViewSet):
    serializer_class = ReminderSerializer
    permission_classes = [IsGymOwner]

    def initial(self, request, *args, **kwargs):
        super().initial(request, *args, **kwargs)
        if request.user.is_authenticated and hasattr(request.user, 'gym'):
            config = get_gym_config(request.user.gym)
            if not config.enable_reminders:
                raise PermissionDenied("The reminders feature is disabled for this gym.")

    def get_queryset(self):
        user = self.request.user
        return Reminder.objects.filter(gym=user.gym)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response({
            "message": "Reminder created successfully",
            "data": serializer.data
        }, status=status.HTTP_201_CREATED)

    def perform_create(self, serializer):
        user = self.request.user
        serializer.save(gym=user.gym, created_by=user)

    @action(detail=False, methods=['post'], permission_classes=[IsGymOwner])
    def send(self, request):
        """
        Manual send endpoint for a one-off reminder.
        Requires 'message' and 'send_via' in request data.
        """
        message = request.data.get('message')
        send_via = request.data.get('send_via', 'WHATSAPP')
        
        if not message:
            return Response({'detail': 'Message is required.'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Placeholder logic for sending
        if send_via in ['WHATSAPP', 'BOTH']:
            # send_whatsapp(message, phone_numbers) -> mocked
            pass
        if send_via in ['EMAIL', 'BOTH']:
            # django.core.mail.send_mail(...) -> mocked
            pass
            
        return Response({'message': 'Reminder sent successfully.'}, status=status.HTTP_200_OK)
