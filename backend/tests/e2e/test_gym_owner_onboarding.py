"""
tests/e2e/test_gym_owner_onboarding.py
=======================================
E2E tests simulating the complete gym owner onboarding journey.

JOURNEY SIMULATED:
    STEP 1: Public gym registration (GymRequest)
    STEP 2: Super admin approves gym
    STEP 3: Owner account created + welcome email sent
    STEP 4: Owner logs in (JWT token issued)
    STEP 5: Owner configures gym settings (feature flags)
    STEP 6: Gym is live and ready for members

TESTS:
    - GymRequest → approval → gym becomes active
    - Owner welcome email dispatched on approval
    - GymFeatureConfig auto-created with safe defaults
    - enable_email=True, enable_whatsapp=False defaults
    - Owner can configure feature flags
    - Gym with no config handled gracefully
    - QR code auto-generated on gym creation
    - Gym URLs configured correctly

Run:
    python manage.py test tests.e2e.test_gym_owner_onboarding --verbosity=2
"""

from django.test import TestCase, override_settings
from django.core import mail

from tests.e2e.fixtures.factory import GymFactory, GymRequestFactory, UserFactory
from tests.e2e.utils.assertions import (
    assert_feature_flags,
    assert_email_sent,
    assert_no_email_sent,
    assert_notification_log_exists,
    assert_no_notification_log,
)
from tests.e2e.utils.simulators import (
    simulate_gym_approval,
    simulate_gym_configure,
    simulate_owner_welcome_dispatch,
    FailureInjector,
)


@override_settings(
    EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
    EMAIL_PROVIDER="smtp",
    WHATSAPP_PROVIDER="stub",
)
class TestGymRequestToApproval(TestCase):
    """
    STEP 1 + 2: Public gym registration and super admin approval.
    """

    def test_gym_request_created_with_pending_status(self):
        """A new gym request starts in pending state."""
        req = GymRequestFactory.create()
        self.assertEqual(req.status, "pending")
        self.assertIsNotNone(req.subdomain)
        self.assertIsNotNone(req.owner_email)

    def test_gym_becomes_active_after_approval(self):
        """After approval, gym.is_active=True and status='approved'."""
        gym, _ = GymFactory.create(is_active=False, is_approved=False)
        self.assertFalse(gym.is_active)

        simulate_gym_approval(gym)
        gym.refresh_from_db()

        self.assertTrue(gym.is_active)
        self.assertTrue(gym.is_approved)
        self.assertEqual(gym.status, "approved")

    def test_gym_feature_config_auto_created_on_gym_save(self):
        """
        GymFeatureConfig is auto-created by post_save signal on Gym creation.
        Safe defaults: enable_email=True, enable_whatsapp=False.
        """
        from gyms.models import GymFeatureConfig

        gym, config = GymFactory.create()
        self.assertIsNotNone(config)
        self.assertEqual(config.gym, gym)

    def test_feature_config_safe_defaults(self):
        """Feature config defaults: email=True, whatsapp=False."""
        gym, config = GymFactory.create()
        assert_feature_flags(
            self,
            gym=gym,
            enable_email=True,
            enable_whatsapp=False,
        )

    def test_gym_qr_code_auto_generated(self):
        """QR code is auto-generated on gym creation."""
        gym, _ = GymFactory.create()
        gym.refresh_from_db()
        self.assertTrue(bool(gym.qr_code), "QR code should be auto-generated on Gym.save()")

    def test_gym_urls_configured_on_creation(self):
        """dev_url and prod_url are set via post_save signal."""
        gym, _ = GymFactory.create()
        gym.refresh_from_db()
        self.assertIsNotNone(gym.dev_url)
        self.assertIn(gym.subdomain, gym.dev_url or "")


@override_settings(
    EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
    EMAIL_PROVIDER="smtp",
    WHATSAPP_PROVIDER="stub",
)
class TestOwnerWelcomeNotification(TestCase):
    """
    STEP 3: Owner account created and welcome email dispatched.
    """

    def setUp(self):
        from services.email.factory import _reset_email_service
        _reset_email_service()
        mail.outbox.clear()

    def tearDown(self):
        from services.email.factory import _reset_email_service
        _reset_email_service()

    def test_owner_welcome_email_sent_on_approval(self):
        """
        When a gym is approved and owner welcome is dispatched,
        an email is sent to the owner.
        """
        from unittest.mock import patch

        gym, _ = GymFactory.create()
        owner = UserFactory.create_owner(gym=gym)

        with patch("services.email.smtp.render_to_string", return_value="<html>Welcome</html>"):
            simulate_owner_welcome_dispatch(owner=owner, gym=gym, password="TempPass@123")

        assert_email_sent(self, to=owner.email, subject_contains=gym.name)
        assert_notification_log_exists(
            self, gym=gym, event_type="owner_welcome", channel="email",
        )

    def test_owner_welcome_email_disabled_when_email_flag_off(self):
        """
        When enable_email=False, NO email is sent — even though owner is new.
        Feature flag is respected.
        """
        from unittest.mock import patch

        gym, config = GymFactory.create(enable_email=False)
        owner = UserFactory.create_owner(gym=gym)

        with patch("services.email.smtp.render_to_string", return_value="<html>Welcome</html>"):
            simulate_owner_welcome_dispatch(owner=owner, gym=gym, password="TempPass@123")

        assert_no_email_sent(self, to=owner.email)
        assert_no_notification_log(self, gym=gym, event_type="owner_welcome", channel="email")

    def test_owner_welcome_not_duplicated_on_retry(self):
        """Idempotency: dispatching owner welcome twice only sends one email."""
        from unittest.mock import patch

        gym, _ = GymFactory.create()
        owner = UserFactory.create_owner(gym=gym)

        with patch("services.email.smtp.render_to_string", return_value="<html>Welcome</html>"):
            simulate_owner_welcome_dispatch(owner=owner, gym=gym, password="TempPass@123")
            simulate_owner_welcome_dispatch(owner=owner, gym=gym, password="TempPass@123")

        # Only 1 email sent (second dispatch is idempotency-skipped)
        assert_email_sent(self, to=owner.email, count=1)

    def test_owner_welcome_handles_email_service_crash_gracefully(self):
        """
        When the email provider crashes, the business flow does NOT raise.
        A failed log entry is written instead.
        """
        gym, _ = GymFactory.create()
        owner = UserFactory.create_owner(gym=gym)

        with FailureInjector.email_provider_crash():
            # Should NOT raise — business flow protected
            try:
                simulate_owner_welcome_dispatch(owner=owner, gym=gym, password="TempPass@123")
            except Exception as e:
                self.fail(f"Owner welcome dispatch raised unexpectedly: {e}")

        # No email in outbox
        assert_no_email_sent(self, to=owner.email)


@override_settings(
    EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
    EMAIL_PROVIDER="smtp",
    WHATSAPP_PROVIDER="stub",
)
class TestGymConfiguration(TestCase):
    """
    STEP 4-5: Owner configures gym settings.
    """

    def test_owner_can_enable_whatsapp(self):
        """Owner enables WhatsApp — feature flag persisted correctly."""
        gym, config = GymFactory.create(enable_whatsapp=False)
        self.assertFalse(config.enable_whatsapp)

        simulate_gym_configure(gym, enable_email=True, enable_whatsapp=True)
        config.refresh_from_db()

        self.assertTrue(config.enable_whatsapp)

    def test_owner_can_disable_email(self):
        """Owner disables email — feature flag persisted correctly."""
        gym, config = GymFactory.create(enable_email=True)
        self.assertTrue(config.enable_email)

        simulate_gym_configure(gym, enable_email=False, enable_whatsapp=False)
        config.refresh_from_db()

        self.assertFalse(config.enable_email)

    def test_gym_marked_configured_after_setup(self):
        """Gym is_configured flag set to True after owner completes setup."""
        gym, _ = GymFactory.create()
        self.assertFalse(gym.is_configured)

        simulate_gym_configure(gym)
        gym.refresh_from_db()

        self.assertTrue(gym.is_configured)

    def test_gym_with_no_config_handled_gracefully_in_dispatcher(self):
        """
        If GymFeatureConfig is missing, dispatcher returns without crashing.
        This handles edge case: gym created directly without signal.
        """
        from unittest.mock import patch
        from services.dispatch import NotificationDispatcher
        from tests.e2e.fixtures.factory import MemberFactory

        gym, config = GymFactory.create()
        member = MemberFactory.create(gym=gym)

        # Simulate config not found (corrupted data scenario)
        with FailureInjector.config_not_found():
            try:
                NotificationDispatcher().dispatch_welcome_member(
                    member=member, gym=gym, password="Test@123"
                )
            except Exception as e:
                self.fail(f"Dispatcher should not raise when config is missing: {e}")
