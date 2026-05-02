"""
core/email.py
=============
Backward-compatible email helpers — now template-based and service-routed.

All function signatures are UNCHANGED from the original.
Existing callers (gyms/views.py, send_expiry_reminders.py, etc.) work
without any modification.

Internal change: all functions now call get_email_service().send() with
Django HTML templates instead of inline f-string HTML.
This gives tenant-branded emails, maintainable templates, and a
pluggable transport layer.

For NEW code, prefer calling NotificationDispatcher directly — it handles
feature flags, idempotency, and audit logging automatically.
"""

from __future__ import annotations

import logging
from typing import Optional

from services.email.base import EmailMessage
from services.email.factory import get_email_service

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Internal helper — used by all public functions below
# ---------------------------------------------------------------------------

def _send_templated(
    *,
    subject: str,
    template_name: str,
    context: dict,
    to_email: str,
    from_email: str | None = None,
) -> bool:
    """
    Render template and send via the configured email service.
    Returns True on success, False on any error (never raises).
    """
    from django.conf import settings
    ctx = {"primary_color": "#22c55e", "logo_url": None, **context}
    msg = EmailMessage(
        subject=subject,
        template_name=template_name,
        context=ctx,
        to_email=to_email,
        from_email=from_email or getattr(settings, "DEFAULT_FROM_EMAIL", None),
    )
    result = get_email_service().send(msg)
    return result.success


# ---------------------------------------------------------------------------
# Member credential email  (called from members/serializers.py + gyms/views.py)
# ---------------------------------------------------------------------------

def send_member_credentials(
    *,
    to_email: str,
    member_name: str,
    gym_name: str,
    gym_url: str,
    password: str,
) -> bool:
    """
    Sent when an owner/staff creates a new member account.
    Includes login URL, email and temporary password.
    """
    return _send_templated(
        subject=f"Welcome to {gym_name} — Your Login Details",
        template_name="emails/member_welcome.html",
        context={
            "member_name": member_name,
            "gym_name": gym_name,
            "gym_url": gym_url,
            "email": to_email,
            "password": password,
        },
        to_email=to_email,
    )


# ---------------------------------------------------------------------------
# Expiry reminder email  (called from send_expiry_reminders management command)
# ---------------------------------------------------------------------------

def send_expiry_reminder_email(
    *,
    to_email: str,
    member_name: str,
    gym_name: str,
    gym_url: str,
    days_left: int,
    end_date,
) -> bool:
    """
    Sent X days before membership expires. Called from the reminder service.
    """
    urgency = "critical" if days_left <= 1 else "warning" if days_left <= 3 else "info"
    urgency_color = "#dc2626" if days_left <= 1 else "#f97316" if days_left <= 3 else "#eab308"
    return _send_templated(
        subject=f"⚠️ Your {gym_name} membership expires in {days_left} day(s)",
        template_name="emails/expiry_reminder.html",
        context={
            "member_name": member_name,
            "gym_name": gym_name,
            "gym_url": gym_url,
            "days_left": days_left,
            "end_date": end_date,
            "urgency": urgency,
            "urgency_color": urgency_color,
        },
        to_email=to_email,
    )


# ---------------------------------------------------------------------------
# Generic notification email  (manual sends by owner/staff)
# ---------------------------------------------------------------------------

def send_generic_notification_email(
    *,
    to_email: str,
    member_name: str,
    gym_name: str,
    subject: str,
    message: str,
) -> bool:
    """
    Used when an owner/staff sends a manual notification or reminder.
    """
    return _send_templated(
        subject=subject,
        template_name="emails/generic_notification.html",
        context={
            "member_name": member_name,
            "gym_name": gym_name,
            "subject": subject,
            "message": message,
            "gym_url": "",
        },
        to_email=to_email,
    )


# ---------------------------------------------------------------------------
# Gym owner onboarding email  (called from gyms/views.py on gym approval)
# ---------------------------------------------------------------------------

def send_owner_welcome_email(
    *,
    to_email: str,
    owner_name: str,
    gym_name: str,
    gym_url: str,
    password: str,
) -> bool:
    """
    Sent when super admin creates a new gym + owner account.
    """
    return _send_templated(
        subject=f"🎉 Your gym '{gym_name}' is ready on ForYou Gym SaaS",
        template_name="emails/owner_welcome.html",
        context={
            "owner_name": owner_name,
            "gym_name": gym_name,
            "gym_url": gym_url,
            "email": to_email,
            "password": password,
        },
        to_email=to_email,
    )
