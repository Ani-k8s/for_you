"""
tests/e2e/fixtures/factory.py
==============================
Central DB object factory for all E2E tests.

Design principles:
- Every factory function is pure (no side effects beyond DB writes)
- Unique suffixes via UUIDs to support parallel test isolation
- Sane defaults everywhere — override only what you need
- No dependency on middleware or request context

Usage:
    from tests.e2e.fixtures.factory import GymFactory, MemberFactory

    gym = GymFactory.create(subdomain="mygym")
    member = MemberFactory.create(gym=gym, phone="+919876543210")
"""

from __future__ import annotations

import uuid
from datetime import date, timedelta

from django.contrib.auth import get_user_model
from django.utils import timezone

User = get_user_model()

# ─────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────

def _uid(n: int = 6) -> str:
    """Short unique hex suffix for test object naming."""
    return uuid.uuid4().hex[:n]


# ─────────────────────────────────────────────────────────────
# GymFactory
# ─────────────────────────────────────────────────────────────

class GymFactory:
    """
    Creates Gym + GymFeatureConfig pairs for testing.
    The post_save signal auto-creates GymFeatureConfig — we then configure it.
    """

    @staticmethod
    def create(
        *,
        subdomain: str | None = None,
        name: str | None = None,
        is_active: bool = True,
        is_approved: bool = True,
        enable_email: bool = True,
        enable_whatsapp: bool = False,
        enable_reminders: bool = True,
        expiry_reminder_days: int = 7,
    ):
        """
        Create a Gym with a fully configured GymFeatureConfig.
        Returns: (gym, config)
        """
        from gyms.models import Gym, GymFeatureConfig

        uid = _uid()
        subdomain = subdomain or f"testgym{uid}"
        name = name or f"Test Gym {uid}"

        gym = Gym.objects.create(
            name=name,
            subdomain=subdomain,
            is_active=is_active,
            is_approved=is_approved,
            status="approved" if is_approved else "pending",
            full_url=f"http://{subdomain}.localhost:5173",
            primary_color="#22c55e",
        )

        # Signal creates config; fetch and configure it
        config, _ = GymFeatureConfig.objects.get_or_create(gym=gym)
        config.enable_email = enable_email
        config.enable_whatsapp = enable_whatsapp
        config.enable_reminders = enable_reminders
        config.expiry_reminder_days = expiry_reminder_days
        config.enable_email_login = True
        config.save()

        return gym, config


# ─────────────────────────────────────────────────────────────
# UserFactory
# ─────────────────────────────────────────────────────────────

class UserFactory:
    """Creates User objects with specific roles."""

    @staticmethod
    def create_super_admin(*, email: str | None = None):
        uid = _uid()
        return User.objects.create_superuser(
            email=email or f"superadmin{uid}@test.com",
            password="SuperAdmin@123",
        )

    @staticmethod
    def create_owner(*, gym, email: str | None = None, phone: str | None = None):
        uid = _uid()
        user = User.objects.create_user(
            email=email or f"owner{uid}@test.com",
            password="Owner@123",
            role=User.Roles.GYM_OWNER,
            gym=gym,
            is_verified=True,
            first_name="Gym",
            last_name="Owner",
            phone=phone,
        )
        # Link as gym owner
        gym.owner = user
        gym.save(update_fields=["owner"])
        return user

    @staticmethod
    def create_staff(*, gym, email: str | None = None, phone: str | None = None):
        uid = _uid()
        return User.objects.create_user(
            email=email or f"staff{uid}@test.com",
            password="Staff@123",
            role=User.Roles.STAFF,
            gym=gym,
            is_verified=True,
            first_name="Gym",
            last_name="Staff",
            phone=phone,
        )

    @staticmethod
    def create_member_user(*, gym, email: str | None = None, phone: str | None = None):
        uid = _uid()
        return User.objects.create_user(
            email=email or f"member{uid}@test.com",
            password="Member@123",
            role=User.Roles.MEMBER,
            gym=gym,
            is_verified=True,
            first_name="Test",
            last_name="Member",
            phone=phone,
        )


# ─────────────────────────────────────────────────────────────
# PlanFactory
# ─────────────────────────────────────────────────────────────

class PlanFactory:
    """Creates membership Plan objects."""

    @staticmethod
    def create(
        *,
        gym,
        name: str | None = None,
        price: float = 999.00,
        duration_days: int = 30,
    ):
        from gyms.models import Plan

        uid = _uid()
        plan, _ = Plan.all_objects.get_or_create(
            gym=gym,
            name=name or f"Basic Plan {uid}",
            defaults={
                "price": price,
                "duration_days": duration_days,
            },
        )
        return plan


# ─────────────────────────────────────────────────────────────
# MemberFactory
# ─────────────────────────────────────────────────────────────

class MemberFactory:
    """Creates Member + linked User in one call."""

    @staticmethod
    def create(
        *,
        gym,
        plan=None,
        email: str | None = None,
        phone: str | None = None,
        start_date: date | None = None,
        days_until_expiry: int = 30,
        is_active: bool = True,
    ):
        """
        Create a fully activated Member.

        Args:
            gym: Gym instance
            plan: Plan instance (auto-created if None)
            email: Member email (auto-generated if None)
            phone: E.164 phone for WhatsApp (e.g. "+919876543210")
            start_date: Membership start (defaults to today)
            days_until_expiry: How many days until membership expires
            is_active: Whether membership is active

        Returns: Member instance
        """
        from members.models import Member

        if plan is None:
            plan = PlanFactory.create(gym=gym, duration_days=days_until_expiry)

        user = UserFactory.create_member_user(gym=gym, email=email, phone=phone)

        start = start_date or date.today()
        member = Member.all_objects.create(
            user=user,
            gym=gym,
            plan=plan,
            start_date=start,
            end_date=start + timedelta(days=days_until_expiry),
            is_active=is_active,
        )
        return member

    @staticmethod
    def create_expiring_soon(*, gym, days_left: int = 3, **kwargs):
        """Create a member whose membership expires in exactly `days_left` days."""
        start = date.today() - timedelta(days=30 - days_left)
        return MemberFactory.create(
            gym=gym,
            start_date=start,
            days_until_expiry=30 - (30 - days_left),
            **kwargs,
        )


# ─────────────────────────────────────────────────────────────
# GymRequestFactory
# ─────────────────────────────────────────────────────────────

class GymRequestFactory:
    """Creates GymRequest objects (public gym registration form)."""

    @staticmethod
    def create(
        *,
        subdomain: str | None = None,
        name: str | None = None,
        owner_email: str | None = None,
        status: str = "pending",
    ):
        from gyms.models import GymRequest

        uid = _uid()
        return GymRequest.objects.create(
            name=name or f"Pending Gym {uid}",
            subdomain=subdomain or f"pending{uid}",
            owner_name="Request Owner",
            owner_email=owner_email or f"reqowner{uid}@test.com",
            phone="+919876543210",
            message="Please approve my gym.",
            status=status,
        )


# ─────────────────────────────────────────────────────────────
# AttendanceFactory
# ─────────────────────────────────────────────────────────────

class AttendanceFactory:
    """Creates Attendance records directly (bypasses services layer)."""

    @staticmethod
    def check_in(*, gym, member, check_in_time=None, attendance_date: date | None = None):
        """Create or return today's attendance record with check_in set."""
        from attendance.models import Attendance

        record, _ = Attendance.all_objects.get_or_create(
            gym=gym,
            member=member,
            date=attendance_date or date.today(),
            defaults={"check_in": check_in_time or timezone.now()},
        )
        if record.check_in is None:
            record.check_in = check_in_time or timezone.now()
            record.save(update_fields=["check_in", "updated_at"])
        return record
