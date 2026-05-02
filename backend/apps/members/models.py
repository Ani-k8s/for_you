from django.db import models

from core.models import TenantModel
from users.models import User


class Member(TenantModel):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="member")
    gym = models.ForeignKey("gyms.Gym", on_delete=models.CASCADE, related_name="members")
    plan = models.ForeignKey("gyms.Plan", on_delete=models.SET_NULL, null=True, blank=True, related_name="members")
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)

    def __str__(self) -> str:
        return f"{self.user.email} @ {self.gym.subdomain}"
