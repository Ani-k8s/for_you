from django.db import models

from core.models import TenantModel, BaseModel


class Notification(TenantModel):
    class Type(models.TextChoices):
        NEW_MEMBER = "new_member", "New Member"
        PAYMENT_SUCCESS = "payment_success", "Payment Success"
        EXPIRY_REMINDER = "expiry_reminder", "Expiry Reminder"

    gym = models.ForeignKey("gyms.Gym", on_delete=models.CASCADE, related_name="notifications")
    member = models.ForeignKey("members.Member", on_delete=models.CASCADE, null=True, blank=True, related_name="notifications")
    title = models.CharField(max_length=255)
    message = models.TextField()
    type = models.CharField(max_length=30, choices=Type.choices)
    is_read = models.BooleanField(default=False)

    class Meta:
        ordering = ["id"]

    def __str__(self) -> str:
        return f"{self.title} ({self.gym.subdomain})"


class NotificationLog(BaseModel):
    """
    Audit log for every outbound notification (email / WhatsApp).

    Purpose:
    - Idempotency: the idempotency_key prevents duplicate sends.
    - Audit: every send attempt is recorded with status and error details.
    - Debugging: ops team can query failed sends and re-trigger.

    Idempotency key: SHA-256 of (gym_id:channel:event_type:member_id:date).
    Unique constraint ensures only one send per event per member per channel per day.

    NOTE: Inherits BaseModel.is_active which is unused here. It defaults to True
    and can be used to soft-delete log entries if needed.
    """

    class Channel(models.TextChoices):
        EMAIL = "email", "Email"
        WHATSAPP = "whatsapp", "WhatsApp"

    class EventType(models.TextChoices):
        MEMBER_WELCOME = "member_welcome", "Member Welcome"
        MEMBER_DEACTIVATED = "member_deactivated", "Member Deactivated"
        OWNER_WELCOME = "owner_welcome", "Owner Welcome"
        EXPIRY_REMINDER = "expiry_reminder", "Expiry Reminder"
        MEMBERSHIP_RENEWED = "membership_renewed", "Membership Renewed"
        ATTENDANCE_CONFIRMATION = "attendance_confirmation", "Attendance Confirmation"
        ADMIN_BROADCAST = "admin_broadcast", "Admin Broadcast"

    class Status(models.TextChoices):
        SENT = "sent", "Sent"
        FAILED = "failed", "Failed"
        SKIPPED = "skipped", "Skipped (Duplicate/Disabled)"

    # Tenant link — not TenantModel to avoid automatic scoping issues
    gym = models.ForeignKey(
        "gyms.Gym",
        on_delete=models.CASCADE,
        related_name="notification_logs",
    )
    member = models.ForeignKey(
        "members.Member",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="notification_logs",
    )

    # What was sent
    channel = models.CharField(max_length=20, choices=Channel.choices)
    event_type = models.CharField(max_length=50, choices=EventType.choices)
    recipient = models.CharField(max_length=255, help_text="Email address or phone number")

    # Status
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.FAILED)
    provider = models.CharField(max_length=50, blank=True, help_text="smtp / twilio / stub")
    error_message = models.TextField(blank=True)

    # Deduplication — SHA-256 hex digest is always 64 chars
    idempotency_key = models.CharField(
        max_length=64,
        db_index=True,
        unique=True,
        help_text="SHA-256(gym_id:channel:event_type:member_id:date)",
    )

    # FIX: Both managers must be declared as separate Manager() instances.
    # Assigning `objects = all_objects` at class scope is invalid Django pattern
    # because descriptors haven't been bound yet during class body execution.
    all_objects = models.Manager()
    objects = models.Manager()   # Default manager (same as all_objects — no tenant filter)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["gym", "event_type", "status"]),
            models.Index(fields=["gym", "channel", "created_at"]),
        ]

    def __str__(self) -> str:
        return f"[{self.channel}] {self.event_type} → {self.recipient} ({self.status})"
