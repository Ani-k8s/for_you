from django.db import models
from core.models import TenantModel
from members.models import Member

class WorkoutPlan(TenantModel):
    gym = models.ForeignKey("gyms.Gym", on_delete=models.CASCADE, related_name="workout_plans")
    name = models.CharField(max_length=255)
    description = models.TextField(null=True, blank=True)
    content = models.JSONField(default=list, help_text="List of exercises with sets/reps")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self) -> str:
        return self.name


class DietPlan(TenantModel):
    gym = models.ForeignKey("gyms.Gym", on_delete=models.CASCADE, related_name="diet_plans")
    name = models.CharField(max_length=255)
    description = models.TextField(null=True, blank=True)
    content = models.JSONField(default=dict, help_text="Daily meal plan")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self) -> str:
        return self.name


class MemberFitnessProfile(TenantModel):
    member = models.OneToOneField(Member, on_delete=models.CASCADE, related_name="fitness_profile")
    workout_plan = models.ForeignKey(WorkoutPlan, on_delete=models.SET_NULL, null=True, blank=True)
    diet_plan = models.ForeignKey(DietPlan, on_delete=models.SET_NULL, null=True, blank=True)
    weight = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    height = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    goal = models.CharField(max_length=255, null=True, blank=True)

    def __str__(self) -> str:
        return f"Fitness: {self.member.user.email}"
