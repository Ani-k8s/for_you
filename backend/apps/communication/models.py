from django.db import models
from core.models import TenantModel
from gyms.models import Gym
from users.models import User

class ChatMessage(TenantModel):
    gym = models.ForeignKey(Gym, on_delete=models.CASCADE, related_name="messages")
    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name="sent_messages")
    recipient = models.ForeignKey(User, on_delete=models.CASCADE, related_name="received_messages")
    content = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self) -> str:
        return f"From {self.sender.email} to {self.recipient.email}"
