from django.db import models
from gyms.models import Gym
from users.models import User

class Reminder(models.Model):
    class SendVia(models.TextChoices):
        WHATSAPP = 'WHATSAPP', 'WhatsApp'
        EMAIL = 'EMAIL', 'Email'
        BOTH = 'BOTH', 'Both'

    gym = models.ForeignKey(Gym, on_delete=models.CASCADE, related_name='reminders')
    message = models.TextField()
    send_via = models.CharField(max_length=10, choices=SendVia.choices, default=SendVia.WHATSAPP)
    is_automated = models.BooleanField(default=False)
    schedule_time = models.DateTimeField(null=True, blank=True)
    expiry_days_before = models.IntegerField(null=True, blank=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='created_reminders')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Reminder for {self.gym.name} - {self.send_via}"
