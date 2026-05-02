"""
tests/e2e/test_notifications.py
================================
Alias entry point for notification flow tests.

Re-exports all test classes from test_notifications_flow.py.

Run:
    python manage.py test tests.e2e.test_notifications --verbosity=2
"""

from tests.e2e.test_notifications_flow import (
    TestExpiryReminderFlow,
    TestAdminBroadcast,
    TestNotificationLogAudit,
)

__all__ = [
    "TestExpiryReminderFlow",
    "TestAdminBroadcast",
    "TestNotificationLogAudit",
]
