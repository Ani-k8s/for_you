from django.contrib.auth.base_user import BaseUserManager
from django.contrib.auth.models import AbstractUser
from django.db import models

from core.models import BaseModel


class UserManager(BaseUserManager):
    use_in_migrations = True

    def _create_user(self, email, password, **extra_fields):
        if not email:
            raise ValueError("Email must be set.")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_user(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", False)
        extra_fields.setdefault("is_superuser", False)
        return self._create_user(email, password, **extra_fields)

    def create_superuser(self, email, password, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("role", "super_admin")
        extra_fields.setdefault("is_verified", True)
        return self._create_user(email, password, **extra_fields)


class User(AbstractUser, BaseModel):
    class Roles(models.TextChoices):
        SUPER_ADMIN = "super_admin", "Super Admin"
        GYM_OWNER = "gym_owner", "Gym Owner"
        STAFF = "staff", "Staff"
        MEMBER = "member", "Member"

    username = None
    email = models.EmailField(unique=True)
    role = models.CharField(max_length=20, choices=Roles.choices, default=Roles.MEMBER)
    is_verified = models.BooleanField(default=False)
    phone = models.CharField(
        max_length=20,
        blank=True,
        null=True,
        help_text="E.164 format: +919876543210. Used for WhatsApp notifications.",
    )
    gym = models.ForeignKey(
        "gyms.Gym",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="users",
    )

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []

    objects = UserManager()

    def __str__(self) -> str:
        return f"{self.email} ({self.role})"
