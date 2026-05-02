from django.db import models

from core.models import TenantModel


class Attendance(TenantModel):
    gym = models.ForeignKey("gyms.Gym", on_delete=models.CASCADE, related_name="attendance_records")
    member = models.ForeignKey("members.Member", on_delete=models.CASCADE, related_name="attendance_records")
    date = models.DateField()
    check_in = models.DateTimeField(null=True, blank=True)
    check_out = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = [("gym", "member", "date")]
        ordering = ["-date", "-created_at"]
