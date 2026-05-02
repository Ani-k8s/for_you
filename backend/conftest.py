"""
backend/conftest.py
====================
Global pytest configuration for the ForYou Gym SaaS backend.

This file is auto-loaded by pytest before any tests run.
It sets up Django settings, configures test-safe email/WhatsApp providers,
and provides shared fixtures available to all test modules.

Usage:
    pytest backend/              — run all tests
    pytest backend/tests/e2e/   — run E2E tests only
    pytest -m e2e                — run tests marked as e2e
    pytest -m "not slow"         — skip slow tests
"""

import django
import os
import pytest

# Ensure Django settings module is set before any Django import
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "project.settings")


# ---------------------------------------------------------------------------
# pytest-django hook: override settings for ALL tests
# ---------------------------------------------------------------------------
@pytest.fixture(scope="session")
def django_db_setup():
    """
    Session-scoped DB setup.
    pytest-django handles this automatically with --reuse-db if configured.
    """
    pass


# ---------------------------------------------------------------------------
# Auto-use fixture: safe test settings
# ---------------------------------------------------------------------------
@pytest.fixture(autouse=True)
def safe_test_settings(settings):
    """
    Applied to every test automatically.
    Forces test-safe email/WhatsApp providers so no real notifications are sent.
    """
    settings.EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"
    settings.EMAIL_PROVIDER = "smtp"
    settings.WHATSAPP_PROVIDER = "stub"
    settings.THROTTLE_USER = "100000/day"
    settings.THROTTLE_ANON = "100000/day"
    settings.THROTTLE_BROADCAST = "10000/hour"


# ---------------------------------------------------------------------------
# Shared fixtures
# ---------------------------------------------------------------------------
@pytest.fixture
def reset_email_service():
    """Reset the email service singleton between tests."""
    from services.email.factory import _reset_email_service
    _reset_email_service()
    yield
    _reset_email_service()


@pytest.fixture
def reset_whatsapp_service():
    """Reset the WhatsApp service singleton between tests."""
    from services.whatsapp.factory import _reset_whatsapp_service
    _reset_whatsapp_service()
    yield
    _reset_whatsapp_service()


@pytest.fixture
def clear_mail_outbox():
    """Clear the in-memory email outbox before each test."""
    from django.core import mail
    mail.outbox.clear()
    yield mail.outbox


@pytest.fixture
def gym(db):
    """Create a test gym with default settings."""
    from tests.e2e.fixtures.factory import GymFactory
    gym, _ = GymFactory.create()
    return gym


@pytest.fixture
def gym_with_config(db):
    """Create a test gym and return (gym, config) tuple."""
    from tests.e2e.fixtures.factory import GymFactory
    return GymFactory.create()


@pytest.fixture
def owner(db, gym):
    """Create a gym owner user."""
    from tests.e2e.fixtures.factory import UserFactory
    return UserFactory.create_owner(gym=gym)


@pytest.fixture
def member(db, gym):
    """Create a test member."""
    from tests.e2e.fixtures.factory import MemberFactory
    return MemberFactory.create(gym=gym)
