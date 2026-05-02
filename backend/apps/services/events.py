"""
services/events.py
==================
Structured event type definitions for the notification dispatch system.

Using Python enums ensures event types are never free-text strings,
preventing typos, enabling IDE autocompletion, and making migrations safe.

Adding a new event:
    1. Add a new constant here.
    2. Add dispatch method in dispatch.py.
    3. Done — no migrations needed (stored as CharField).
"""

from __future__ import annotations


class NotificationEvent:
    """
    Enumeration of all notification events in the platform.
    Used in NotificationLog.event_type and dispatcher methods.
    Not a Django model — a plain class for zero-overhead constants.
    """

    # Member lifecycle
    MEMBER_WELCOME = "member_welcome"
    MEMBER_DEACTIVATED = "member_deactivated"

    # Gym onboarding
    OWNER_WELCOME = "owner_welcome"

    # Membership lifecycle
    EXPIRY_REMINDER = "expiry_reminder"
    MEMBERSHIP_RENEWED = "membership_renewed"

    # Operational
    ATTENDANCE_CONFIRMATION = "attendance_confirmation"

    # Admin
    ADMIN_BROADCAST = "admin_broadcast"

    # All event names — used for validation
    ALL = [
        MEMBER_WELCOME,
        MEMBER_DEACTIVATED,
        OWNER_WELCOME,
        EXPIRY_REMINDER,
        MEMBERSHIP_RENEWED,
        ATTENDANCE_CONFIRMATION,
        ADMIN_BROADCAST,
    ]


class NotificationChannel:
    """Transport channel constants."""
    EMAIL = "email"
    WHATSAPP = "whatsapp"

    ALL = [EMAIL, WHATSAPP]


class NotificationStatus:
    """Dispatch status constants."""
    SENT = "sent"
    FAILED = "failed"
    SKIPPED = "skipped"   # Feature flag disabled or already sent (idempotency)

    ALL = [SENT, FAILED, SKIPPED]
