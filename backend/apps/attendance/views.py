from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError
from attendance.models import Attendance
from attendance.serializers import AttendanceActionSerializer, AttendanceSerializer
from attendance.services import check_in_member, check_out_member
from core.permissions import IsOwnerOrStaff


class AttendanceViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Attendance records — read-only list/retrieve.
    Check-in and check-out via custom actions.

    Access: Gym Owner + Staff (both can mark attendance)
    """
    queryset = Attendance.objects.all()
    serializer_class = AttendanceSerializer
    permission_classes = [IsOwnerOrStaff]   # FIXED: was IsGymOwner only
    filterset_fields = ["member", "date"]
    ordering_fields = ["date", "check_in"]

    def get_queryset(self):
        return Attendance.objects.for_user(self.request.user)

    @action(detail=False, methods=["post"], url_path="check-in")
    def check_in(self, request):
        serializer = AttendanceActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        member = serializer.validated_data["member"]
        gym = request.user.gym
        if not gym or member.gym_id != gym.id:
            raise ValidationError({"detail": "Gym mismatch or not assigned."})
        record = check_in_member(gym=gym, member=member)
        return Response({
            "message": "Check-in successful",
            "data": AttendanceSerializer(record).data
        }, status=status.HTTP_200_OK)

    @action(detail=False, methods=["post"], url_path="check-out")
    def check_out(self, request):
        serializer = AttendanceActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        member = serializer.validated_data["member"]
        gym = request.user.gym
        if not gym or member.gym_id != gym.id:
            raise ValidationError({"detail": "Gym mismatch or not assigned."})
        record = check_out_member(gym=gym, member=member)
        return Response({
            "message": "Check-out successful",
            "data": AttendanceSerializer(record).data
        }, status=status.HTTP_200_OK)
