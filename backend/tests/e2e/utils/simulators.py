"""
tests/e2e/utils/simulators.py
==============================
High-level workflow simulation helpers.

Each simulator replicates how a real user or system component
would execute a workflow — calling the same services layer that
production code calls.

Usage:
    from tests.e2e.utils.simulators import (
        simulate_gym_approval,
        simulate_member_checkin,
        simulate_expiry_reminder_run,
        simulate_admin_broadcast,
    )
"""

from __future__ import annotations

import logging
from datetime import date
from unittest.mock import patch

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────
# Gym workflow simulators
# ─────────────────────────────────────────────────────────────

def simulate_gym_approval(gym) -> None:
    """
    Simulate super admin approving a gym.
    Sets is_active=True, is_approved=True, status='approved'.
    Does NOT send the owner welcome email (test controls that separately).
    """
    gym.is_active = True
    gym.is_approved = True
    gym.status = "approved"
    gym.save(update_fields=["is_active", "is_approved", "status", "updated_at"])
    logger.info("[Simulator] Gym approved: %s", gym.subdomain)


def simulate_gym_configure(gym, *, enable_email: bool = True, enable_whatsapp: bool = False) -> None:
    """
    Simulate gym owner configuring feature flags.
    """
    config = gym.feature_config
    config.enable_email = enable_email
    config.enable_whatsapp = enable_whatsapp
    config.save(update_fields=["enable_email", "enable_whatsapp", "updated_at"])
    gym.is_configured = True
    gym.save(update_fields=["is_configured", "updated_at"])
    logger.info(
        "[Simulator] Gym configured: %s | email=%s | whatsapp=%s",
        gym.subdomain, enable_email, enable_whatsapp,
    )


# ─────────────────────────────────────────────────────────────
# Member workflow simulators
# ─────────────────────────────────────────────────────────────

def simulate_member_checkin(*, gym, member) -> object:
    """
    Simulate a member checking in at the gym.
    Calls the real attendance service (same code path as the API).
    Returns the Attendance record.
    """
    from attendance.services import check_in_member

    record = check_in_member(gym=gym, member=member)
    logger.info("[Simulator] Check-in: %s @ %s", member.user.email, gym.subdomain)
    return record


def simulate_member_checkout(*, gym, member) -> object:
    """Simulate a member checking out."""
    from attendance.services import check_out_member

    record = check_out_member(gym=gym, member=member)
    logger.info("[Simulator] Check-out: %s @ %s", member.user.email, gym.subdomain)
    return record


# ─────────────────────────────────────────────────────────────
# Notification workflow simulators
# ─────────────────────────────────────────────────────────────

def simulate_welcome_dispatch(*, member, gym, password: str = "TempPass@123") -> None:
    """
    Simulate dispatching a welcome notification to a new member.
    Calls the real NotificationDispatcher (same as production).
    """
    from services.dispatch import NotificationDispatcher

    NotificationDispatcher().dispatch_welcome_member(
        member=member, gym=gym, password=password,
    )
    logger.info("[Simulator] Welcome dispatched: %s", member.user.email)


def simulate_owner_welcome_dispatch(*, owner, gym, password: str = "TempPass@123") -> None:
    """Simulate dispatching owner welcome notification."""
    from services.dispatch import NotificationDispatcher

    NotificationDispatcher().dispatch_gym_owner_welcome(
        owner=owner, gym=gym, password=password,
    )
    logger.info("[Simulator] Owner welcome dispatched: %s", owner.email)


def simulate_expiry_reminder_run(*, override_days: int | None = None, dry_run: bool = False) -> dict:
    """
    Simulate running the send_expiry_reminders management command.
    Returns a dict with counts: {gyms_processed, dispatched, dry_run}.
    """
    from django.utils import timezone
    from datetime import timedelta
    from gyms.models import Gym
    from members.models import Member
    from notifications.services import create_notification
    from notifications.models import Notification
    from services.dispatch import NotificationDispatcher

    today = timezone.now().date()
    dispatcher = NotificationDispatcher()
    gyms_processed = 0
    total_dispatched = 0

    for gym in Gym.objects.filter(is_active=True).select_related("feature_config"):
        config = getattr(gym, "feature_config", None)
        if not config or not config.enable_reminders:
            continue

        reminder_days = override_days if override_days is not None else config.expiry_reminder_days
        target_date = today + timedelta(days=reminder_days)

        members = Member.all_objects.filter(
            gym=gym, is_active=True, end_date=target_date
        ).select_related("user", "plan")

        if not members.exists():
            continue

        gyms_processed += 1
        for member in members:
            if dry_run:
                total_dispatched += 1
                continue

            already = Notification.all_objects.filter(
                gym=gym, member=member,
                type=Notification.Type.EXPIRY_REMINDER,
                message__icontains=str(member.end_date),
            ).exists()
            if not already:
                create_notification(
                    gym=gym, member=member,
                    title="Membership Expiring Soon",
                    message=(
                        f"Hi {member.user.first_name or member.user.email}, "
                        f"your membership expires on {member.end_date}."
                    ),
                    type_value=Notification.Type.EXPIRY_REMINDER,
                )

            dispatcher.dispatch_expiry_reminder(
                member=member, gym=gym, days_left=reminder_days,
            )
            total_dispatched += 1

    logger.info(
        "[Simulator] Expiry reminder run: gyms=%d dispatched=%d dry_run=%s",
        gyms_processed, total_dispatched, dry_run,
    )
    return {"gyms_processed": gyms_processed, "dispatched": total_dispatched, "dry_run": dry_run}


def simulate_admin_broadcast(*, gym, members: list, subject: str, message: str) -> dict:
    """
    Simulate a gym owner sending an admin broadcast to all members.
    Returns the result dict from dispatch_admin_broadcast.
    """
    from services.dispatch import NotificationDispatcher

    result = NotificationDispatcher().dispatch_admin_broadcast(
        members=members, gym=gym, subject=subject, message=message,
    )
    logger.info(
        "[Simulator] Broadcast to %d member(s) | gym=%s | result=%s",
        len(members), gym.subdomain, result,
    )
    return result


# ─────────────────────────────────────────────────────────────
# Failure injection simulators
# ─────────────────────────────────────────────────────────────

class FailureInjector:
    """
    Context managers that inject failures at the service layer.
    Use these to test that the system degrades gracefully.

    Usage:
        with FailureInjector.email_provider_crash():
            simulate_welcome_dispatch(member=m, gym=g)
        # assert business flow still completed (member was created, etc.)
    """

    @staticmethod
    def email_provider_crash():
        """
        Make the email service factory raise an Exception.

        IMPORTANT: Patch target is services.dispatch.get_email_service, not the
        factory module. dispatch.py does `from services.email.factory import
        get_email_service`, so the name lives in the dispatch module's namespace.
        Per Python mock rules: patch where the name is *used*, not defined.
        """
        return patch(
            "services.dispatch.get_email_service",
            side_effect=Exception("Simulated SMTP provider crash"),
        )

    @staticmethod
    def email_send_failure():
        """
        Make the email service.send() return a failure result.
        Patches the SmtpEmailService.send method directly (class-level patch).
        """
        from services.email.base import EmailResult

        def _fail_send(self_svc, msg):
            return EmailResult(
                success=False,
                provider="smtp",
                to_email=msg.to_email,
                subject=msg.subject,
                error="Simulated SMTP send failure",
            )

        return patch("services.email.smtp.SmtpEmailService.send", new=_fail_send)

    @staticmethod
    def whatsapp_provider_crash():
        """
        Make the WhatsApp service factory raise an Exception.

        IMPORTANT: Patch target is services.dispatch.get_whatsapp_service — same
        reason as email_provider_crash (imported at module level in dispatch.py).
        """
        return patch(
            "services.dispatch.get_whatsapp_service",
            side_effect=Exception("Simulated WhatsApp provider crash"),
        )

    @staticmethod
    def whatsapp_send_failure():
        """Make the WhatsApp service.send() return a failure result."""
        from services.whatsapp.base import WhatsAppResult

        def _fail_send(self_svc, msg):
            return WhatsAppResult(
                success=False,
                provider="stub",
                to_number=msg.to_number,
                template_name=msg.template_name,
                error="Simulated Twilio API failure",
            )

        return patch("services.whatsapp.stub.StubWhatsAppService.send", new=_fail_send)

    @staticmethod
    def db_failure_on_notification_log():
        """Make writing to NotificationLog fail (simulates DB temporary outage)."""
        return patch(
            "services.dispatch.NotificationDispatcher._write_log",
            side_effect=Exception("Simulated DB write failure"),
        )

    @staticmethod
    def cache_failure():
        """Simulate the tenant cache being cleared/unavailable."""
        from core.middleware import _TENANT_CACHE
        # Clear cache to force DB lookups (not a crash, but a performance hit)
        _TENANT_CACHE.clear()

    @staticmethod
    def config_not_found():
        """Simulate missing GymFeatureConfig (gym not fully set up)."""
        return patch(
            "services.dispatch.NotificationDispatcher._get_config",
            return_value=None,
        )
