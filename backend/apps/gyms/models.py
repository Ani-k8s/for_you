from django.db import models
from django.core.files.base import ContentFile
from io import BytesIO
import qrcode

from core.models import BaseModel, TenantModel
from django.db.models.signals import post_save
from django.dispatch import receiver


class Gym(BaseModel):
    name = models.CharField(max_length=255)
    subdomain = models.SlugField(max_length=50, unique=True)
    logo = models.ImageField(upload_to="gyms/logos/", null=True, blank=True)
    # Primary cover image for dashboards / login hero.
    cover_image = models.ImageField(upload_to="gyms/covers/", null=True, blank=True)
    # Optional brand accent color (hex preferred, e.g. #22c55e).
    primary_color = models.CharField(max_length=20, null=True, blank=True)
    background_image = models.ImageField(
        upload_to="gyms/backgrounds/", null=True, blank=True
    )
    branding_image = models.ImageField(
        upload_to="gyms/branding/", null=True, blank=True
    )
    qr_code = models.ImageField(upload_to="gyms/qr/", null=True, blank=True)
    status = models.CharField(
        max_length=20,
        choices=[("pending", "Pending"), ("approved", "Approved"), ("rejected", "Rejected")],
        default="pending"
    )
    is_approved = models.BooleanField(default=False)  # Legacy support
    is_active = models.BooleanField(default=False) # Inactive by default
    is_configured = models.BooleanField(default=False)
    dev_url = models.URLField(max_length=500, null=True, blank=True)
    prod_url = models.URLField(max_length=500, null=True, blank=True)
    full_url = models.URLField(max_length=500, null=True, blank=True)
    owner = models.OneToOneField(
        "users.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="owned_gym",
    )
    # Store theme colors, fonts, and dark mode preferences.
    theme_settings = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.name} ({self.subdomain})"

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        if not self.qr_code:
            qr = qrcode.make(f"https://{self.subdomain}.localhost")
            buffer = BytesIO()
            qr.save(buffer, format="PNG")
            self.qr_code.save(f"{self.subdomain}-qr.png", ContentFile(buffer.getvalue()), save=False)
            super().save(update_fields=["qr_code", "updated_at"])


class Plan(TenantModel):
    gym = models.ForeignKey(Gym, on_delete=models.CASCADE, related_name="plans")
    name = models.CharField(max_length=255)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    duration_days = models.PositiveIntegerField()

    class Meta:
        unique_together = [("gym", "name")]
        ordering = ["duration_days"]

    def __str__(self) -> str:
        return f"{self.name} ({self.gym.subdomain})"


class GymRequest(BaseModel):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"

    name = models.CharField(max_length=255)
    subdomain = models.SlugField(max_length=50, unique=True)
    owner_name = models.CharField(max_length=255, null=True, blank=True)
    owner_email = models.EmailField()
    phone = models.CharField(max_length=20, null=True, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    message = models.TextField(null=True, blank=True)
    approved_by = models.ForeignKey(
        "users.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="approved_requests",
    )
    rejection_reason = models.TextField(null=True, blank=True)

    def __str__(self) -> str:
        return f"{self.name} ({self.status})"

class GymFeatureConfig(BaseModel):
    gym = models.OneToOneField(Gym, on_delete=models.CASCADE, related_name="feature_config")
    # --- Authentication toggles ---
    enable_google_auth = models.BooleanField(default=True)
    enable_whatsapp_otp = models.BooleanField(default=True)
    enable_email_login = models.BooleanField(default=True)
    # --- Operational feature toggles ---
    enable_reminders = models.BooleanField(default=True)
    enable_notifications = models.BooleanField(default=True)
    expiry_reminder_days = models.PositiveIntegerField(default=7, help_text="Days before expiry to send reminder")
    # --- Communication channel toggles (per-tenant control) ---
    enable_email = models.BooleanField(
        default=True,
        help_text="Enable outbound email notifications for this gym (welcome, reminders, broadcasts).",
    )
    enable_whatsapp = models.BooleanField(
        default=False,
        help_text="Enable WhatsApp notifications for this gym. Requires global WHATSAPP_PROVIDER config.",
    )

    class Meta:
        verbose_name = "Gym Feature Config"
        verbose_name_plural = "Gym Feature Configs"

    def __str__(self) -> str:
        return f"Config: {self.gym.name if self.gym else 'GLOBAL'}"

@receiver(post_save, sender=Gym)
def create_gym_config(sender, instance, created, **kwargs):
    if created:
        # Automatically create feature config for the new gym with safe defaults.
        # enable_email=True  → welcome/reminder emails active from day one.
        # enable_whatsapp=False → WhatsApp off by default (requires explicit setup).
        GymFeatureConfig.objects.create(
            gym=instance,
            enable_google_auth=False,
            enable_email_login=True,
            enable_reminders=False,
            enable_email=True,
            enable_whatsapp=False,
        )
        # Update gym initial fields
        instance.is_configured = False
        instance.dev_url = f"http://localhost:5173?gym={instance.subdomain}"
        instance.prod_url = f"https://{instance.subdomain}.yourdomain.com"
        instance.save(update_fields=['is_configured', 'dev_url', 'prod_url'])


class Equipment(TenantModel):
    gym = models.ForeignKey(Gym, on_delete=models.CASCADE, related_name="equipment", null=True, blank=True)
    name = models.CharField(max_length=255)
    category = models.CharField(max_length=100, null=True, blank=True)
    serial_number = models.CharField(max_length=100, null=True, blank=True)
    purchase_date = models.DateField(null=True, blank=True)
    last_maintenance = models.DateField(null=True, blank=True)
    next_maintenance = models.DateField(null=True, blank=True)
    
    class Status(models.TextChoices):
        OPERATIONAL = "operational", "Operational"
        UNDER_MAINTENANCE = "under_maintenance", "Under Maintenance"
        BROKEN = "broken", "Broken"
        RETIRED = "retired", "Retired"
        
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.OPERATIONAL)
    notes = models.TextField(null=True, blank=True)

    class Meta:
        verbose_name_plural = "Equipment"

    def __str__(self) -> str:
        return f"{self.name} ({self.status})"

class Announcement(TenantModel):
    gym = models.ForeignKey(Gym, on_delete=models.CASCADE, related_name="announcements")
    title = models.CharField(max_length=255)
    content = models.TextField()
    image = models.ImageField(upload_to="announcements/", null=True, blank=True)
    
    class Audience(models.TextChoices):
        ALL = "all", "All"
        STAFF = "staff", "Staff Only"
        MEMBERS = "members", "Members Only"
        
    audience = models.CharField(max_length=20, choices=Audience.choices, default=Audience.ALL)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return self.title
