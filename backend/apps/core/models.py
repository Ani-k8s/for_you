from __future__ import annotations

import uuid

from django.db import models

from core.tenant import get_current_tenant


class TenantQuerySet(models.QuerySet):
    def for_current_tenant(self, user=None):
        from core.config import ROLE_SUPER_ADMIN
        if user and user.is_authenticated and user.role == ROLE_SUPER_ADMIN:
            return self
        
        tenant = get_current_tenant()
        if tenant:
            return self.filter(gym=tenant)
        
        # If no tenant is set, check if user has a gym assigned
        if user and user.is_authenticated and user.gym:
            return self.filter(gym=user.gym)
            
        return self.none()


class TenantManager(models.Manager):
    def get_queryset(self):
        # We can't easily pass 'user' here, so we rely on thread-local tenant
        # or manual filtering in views for more complex cases.
        return TenantQuerySet(self.model, using=self._db).for_current_tenant()

    def for_user(self, user):
        return TenantQuerySet(self.model, using=self._db).for_current_tenant(user=user)


class AllObjectsManager(models.Manager):
    pass


class BaseModel(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        abstract = True


class TenantModel(BaseModel):
    objects = TenantManager()
    all_objects = AllObjectsManager()

    class Meta:
        abstract = True


class Documentation(BaseModel):
    """
    Stores admin-editable documentation (versioned).
    """

    title = models.CharField(max_length=255)
    content = models.TextField()
    version = models.PositiveIntegerField()

    class Meta:
        unique_together = [("title", "version")]
        ordering = ["-version", "-updated_at"]

    def __str__(self) -> str:
        return f"{self.title} (v{self.version})"

class UserManual(BaseModel):
    """
    Stores structured JSON documentation for different user roles.
    """
    ROLE_CHOICES = (
        ('super_admin', 'Super Admin'),
        ('owner', 'Gym Owner'),
        ('staff', 'Staff'),
        ('member', 'Member'),
    )
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, unique=True)
    title = models.CharField(max_length=255)
    content = models.JSONField(default=list, help_text="List of section objects: [{'title': '...', 'content': '...'}]")
    file = models.FileField(upload_to="manuals/", null=True, blank=True)

    def __str__(self) -> str:
        return f"{self.title} ({self.get_role_display()})"

class SupportConfig(BaseModel):
    """
    Model for Support Center FAQ system with keyword matching.
    """
    ROLE_CHOICES = (
        ('global', 'Global / All Roles'),
        ('super_admin', 'Super Admin Only'),
        ('owner', 'Gym Owner Only'),
        ('staff', 'Staff Only'),
        ('member', 'Member Only'),
    )
    keyword = models.TextField(help_text="Trigger word/phrase")
    response = models.TextField()
    default_reply = models.TextField(null=True, blank=True, help_text="Default response for all incoming support messages")
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='global', null=True, blank=True)
    is_active = models.BooleanField(default=True)

    def __str__(self) -> str:
        return f"K: {self.keyword} -> {self.response[:50]}..."


class SupportMessage(BaseModel):
    """
    Model to store user support messages.
    """
    text = models.TextField()
    role = models.CharField(max_length=50, help_text="Role of the sender")
    user = models.ForeignKey("users.User", on_delete=models.CASCADE, null=True, blank=True, related_name="support_messages")
    gym = models.ForeignKey("gyms.Gym", on_delete=models.CASCADE, null=True, blank=True, related_name="support_messages")

    def __str__(self) -> str:
        return f"Msg from {self.role}: {self.text[:50]}"

class SupportNode(BaseModel):
    """
    Model for Support Chat Flow nodes.
    """
    message = models.TextField()
    target = models.CharField(max_length=50, help_text="target_role for this node")
    gym = models.ForeignKey("gyms.Gym", on_delete=models.CASCADE, null=True, blank=True, related_name="support_nodes")
    is_active = models.BooleanField(default=True)

    def __str__(self) -> str:
        return f"Node: {self.target} -> {self.message[:50]}..."
