from rest_framework import viewsets
from fitness.models import WorkoutPlan, DietPlan, MemberFitnessProfile
from fitness.serializers import WorkoutPlanSerializer, DietPlanSerializer, MemberFitnessProfileSerializer
from core.permissions import IsOwnerOrStaff, IsTenantAuthenticated

class WorkoutPlanViewSet(viewsets.ModelViewSet):
    serializer_class = WorkoutPlanSerializer
    permission_classes = [IsOwnerOrStaff]

    def get_queryset(self):
        return WorkoutPlan.objects.for_user(self.request.user)

    def perform_create(self, serializer):
        serializer.save(gym=self.request.user.gym)


class DietPlanViewSet(viewsets.ModelViewSet):
    serializer_class = DietPlanSerializer
    permission_classes = [IsOwnerOrStaff]

    def get_queryset(self):
        return DietPlan.objects.for_user(self.request.user)

    def perform_create(self, serializer):
        serializer.save(gym=self.request.user.gym)


class MemberFitnessProfileViewSet(viewsets.ModelViewSet):
    serializer_class = MemberFitnessProfileSerializer
    permission_classes = [IsTenantAuthenticated]

    def get_queryset(self):
        return MemberFitnessProfile.objects.for_user(self.request.user)

    def perform_create(self, serializer):
        serializer.save(gym=self.request.user.gym)
