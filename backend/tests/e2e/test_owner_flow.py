"""
tests/e2e/test_owner_flow.py
============================
Alias entry point for gym owner onboarding tests.

This module re-exports all test classes from test_gym_owner_onboarding.py
to satisfy CI/CD naming requirements:
    - GitHub Actions expects: test_owner_flow
    - Jenkinsfile references: test_owner_flow

Run:
    python manage.py test tests.e2e.test_owner_flow --verbosity=2
"""

# Re-export all test classes from the canonical module
from tests.e2e.test_gym_owner_onboarding import (
    TestGymRequestToApproval,
    TestOwnerWelcomeNotification,
    TestGymConfiguration,
)

__all__ = [
    "TestGymRequestToApproval",
    "TestOwnerWelcomeNotification",
    "TestGymConfiguration",
]
