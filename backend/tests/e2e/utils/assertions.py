"""
tests/e2e/utils/assertions.py
==============================
Custom assertion helpers for the E2E test suite.

Usage:
    from tests.e2e.utils.assertions import (
        assert_notification_log_exists,
        assert_no_duplicate_notifications,
        assert_email_sent,
        assert_no_email_sent,
    )
"""

from __future__ import annotations

from django.test import TestCase


# ─────────────────────────────────────────────────────────────
# NotificationLog assertions
# ─────────────────────────────────────────────────────────────

def assert_notification_log_exists(
    tc: TestCase,
    *,
    gym,
    event_type: str,
    channel: str,
    status: str = "sent",
    count: int | None = None,
    msg: str = "",
):
    """Assert that a NotificationLog entry exists for the given gym/event/channel."""
    from notifications.models import NotificationLog

    qs = NotificationLog.objects.filter(
        gym=gym,
        event_type=event_type,
        channel=channel,
        status=status,
    )
    if count is not None:
        tc.assertEqual(
            qs.count(), count,
            msg or f"Expected {count} {channel} log(s) for event={event_type}, got {qs.count()}",
        )
    else:
        tc.assertTrue(
            qs.exists(),
            msg or f"Expected NotificationLog entry for gym={gym.subdomain} "
                   f"event={event_type} channel={channel} status={status}",
        )


def assert_no_notification_log(
    tc: TestCase,
    *,
    gym,
    event_type: str,
    channel: str,
    msg: str = "",
):
    """Assert that NO notification log exists (e.g., when feature flag is off)."""
    from notifications.models import NotificationLog

    qs = NotificationLog.objects.filter(
        gym=gym,
        event_type=event_type,
        channel=channel,
    )
    tc.assertEqual(
        qs.count(), 0,
        msg or f"Expected NO NotificationLog for gym={gym.subdomain} "
               f"event={event_type} channel={channel}, but found {qs.count()}",
    )


def assert_no_duplicate_notifications(
    tc: TestCase,
    *,
    gym,
    event_type: str,
    channel: str,
    msg: str = "",
):
    """
    Assert idempotency: only one 'sent' log per event/channel/member/day.
    Detects duplicate send bugs.
    """
    from notifications.models import NotificationLog

    logs = NotificationLog.objects.filter(
        gym=gym,
        event_type=event_type,
        channel=channel,
        status="sent",
    )
    # All idempotency_keys must be unique (enforced by DB, but verify)
    keys = list(logs.values_list("idempotency_key", flat=True))
    tc.assertEqual(
        len(keys), len(set(keys)),
        msg or f"Duplicate idempotency_keys found for event={event_type} channel={channel}",
    )


# ─────────────────────────────────────────────────────────────
# Django mail backend assertions
# ─────────────────────────────────────────────────────────────

def assert_email_sent(tc: TestCase, *, to: str, subject_contains: str = "", count: int = 1):
    """Assert an email was sent to a given address (uses locmem backend)."""
    from django.core import mail

    matching = [
        m for m in mail.outbox
        if to in m.to and (subject_contains in m.subject if subject_contains else True)
    ]
    tc.assertEqual(
        len(matching), count,
        f"Expected {count} email(s) to {to!r} with subject~={subject_contains!r}, "
        f"found {len(matching)}. Outbox: {[m.subject for m in mail.outbox]}",
    )


def assert_no_email_sent(tc: TestCase, *, to: str = ""):
    """Assert no emails were sent (optionally filter by recipient)."""
    from django.core import mail

    if to:
        matching = [m for m in mail.outbox if to in m.to]
        tc.assertEqual(len(matching), 0, f"Expected no emails to {to!r}, found {len(matching)}")
    else:
        tc.assertEqual(len(mail.outbox), 0, f"Expected empty mail outbox, found {len(mail.outbox)}")


# ─────────────────────────────────────────────────────────────
# Attendance assertions
# ─────────────────────────────────────────────────────────────

def assert_attendance_checked_in(tc: TestCase, *, gym, member, attendance_date=None):
    """Assert a check-in record exists for today (or a specific date)."""
    from attendance.models import Attendance
    from datetime import date

    qs = Attendance.all_objects.filter(
        gym=gym,
        member=member,
        date=attendance_date or date.today(),
    )
    tc.assertTrue(qs.exists(), f"No attendance record found for member={member.user.email}")
    record = qs.first()
    tc.assertIsNotNone(record.check_in, "Attendance record exists but check_in is None")
    return record


def assert_attendance_unique_per_day(tc: TestCase, *, gym, member):
    """Assert only one attendance record exists per day per member."""
    from attendance.models import Attendance
    from datetime import date

    count = Attendance.all_objects.filter(
        gym=gym, member=member, date=date.today()
    ).count()
    tc.assertEqual(count, 1, f"Expected 1 attendance record, found {count} for member={member.user.email}")


# ─────────────────────────────────────────────────────────────
# Feature config assertions
# ─────────────────────────────────────────────────────────────

def assert_feature_flags(
    tc: TestCase,
    *,
    gym,
    enable_email: bool | None = None,
    enable_whatsapp: bool | None = None,
    enable_reminders: bool | None = None,
):
    """Assert that GymFeatureConfig has the expected flag values."""
    config = gym.feature_config
    if enable_email is not None:
        tc.assertEqual(
            config.enable_email, enable_email,
            f"enable_email expected={enable_email}, got={config.enable_email}",
        )
    if enable_whatsapp is not None:
        tc.assertEqual(
            config.enable_whatsapp, enable_whatsapp,
            f"enable_whatsapp expected={enable_whatsapp}, got={config.enable_whatsapp}",
        )
    if enable_reminders is not None:
        tc.assertEqual(
            config.enable_reminders, enable_reminders,
            f"enable_reminders expected={enable_reminders}, got={config.enable_reminders}",
        )
