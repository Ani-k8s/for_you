from rest_framework import serializers
from fitness.models import WorkoutPlan, DietPlan, MemberFitnessProfile

class WorkoutPlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkoutPlan
        fields = "__all__"
        read_only_fields = ("id", "gym", "created_at", "updated_at")

class DietPlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = DietPlan
        fields = "__all__"
        read_only_fields = ("id", "gym", "created_at", "updated_at")

class MemberFitnessProfileSerializer(serializers.ModelSerializer):
    workout_plan_name = serializers.ReadOnlyField(source="workout_plan.name")
    diet_plan_name = serializers.ReadOnlyField(source="diet_plan.name")

    class Meta:
        model = MemberFitnessProfile
        fields = "__all__"
        read_only_fields = ("id", "gym", "member", "updated_at")
