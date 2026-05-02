"""
tests/e2e/test_member_flow.py
==============================
Alias entry point for member lifecycle tests.

Re-exports all test classes from test_member_lifecycle.py for CI/CD
naming convention compatibility.

Run:
    python manage.py test tests.e2e.test_member_flow --verbosity=2
"""

from tests.e2e.test_member_lifecycle import (
    TestMemberCreation,
    TestMemberWelcomeNotification,
    TestMultipleMembersIndependent,
)

__all__ = [
    "TestMemberCreation",
    "TestMemberWelcomeNotification",
    "TestMultipleMembersIndependent",
]
