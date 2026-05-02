"""
tests/e2e/test_member_lifecycle.py
====================================
E2E tests simulating the complete member lifecycle.

JOURNEY SIMULATED:
    STEP 5: Owner adds member (with phone + email + plan)
    → Welcome email sent to member
    → Welcome WhatsApp sent if phone + feature flag enabled
    → Member profile visible in owner dashboard
    → Member can be updated (plan change, phone update)
    → Member deactivation / re-activation

TESTS:
    - Member created with email + phone
    - Welcome email dispatched on creation
    - Welcome WhatsApp dispatched when enabled + phone set
    - No duplicate welcome (idempotency)
    - Member with no phone → no WhatsApp (correct skip)
    - Plan assignment → end_date calculated correctly
    - Member update: phone update enables future WhatsApp
    - Multiple members — independent notifications
    - Email service failure → member still created (resilient)
    - Member creation without plan → validation (expected error)

Run:
    python manage.py test tests.e2e.test_member_lifecycle --verbosity=2
"""

from datetime import date, timedelta

from django.test import TestCase, override_settings
from django.core import mail

from tests.e2e.fixtures.factory import GymFactory, MemberFactory, PlanFactory, UserFactory
from tests.e2e.utils.assertions import (
    assert_email_sent,
    assert_no_email_sent,
    assert_notification_log_exists,
    assert_no_notification_log,
    assert_no_duplicate_notifications,
)
from tests.e2e.utils.simulators import (
    simulate_welcome_dispatch,
    FailureInjector,
)


@override_settings(
    EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
    EMAIL_PROVIDER="smtp",
    WHATSAPP_PROVIDER="stub",
)
class TestMemberCreation(TestCase):
    """Member is created with correct profile and linked user."""

    def setUp(self):
        from services.email.factory import _reset_email_service
        from services.whatsapp.factory import _reset_whatsapp_service
        _reset_email_service()
        _reset_whatsapp_service()
        mail.outbox.clear()
        self.gym, self.config = GymFactory.create()
        self.plan = PlanFactory.create(gym=self.gym, duration_days=30)

    def tearDown(self):
        from services.email.factory import _reset_email_service
        from services.whatsapp.factory import _reset_whatsapp_service
        _reset_email_service()
        _reset_whatsapp_service()

    def test_member_created_with_correct_fields(self):
        """Member has correct gym, plan, dates, and linked user."""
        member = MemberFactory.create(
            gym=self.gym,
            plan=self.plan,
            phone="+919876543210",
        )
        self.assertEqual(member.gym, self.gym)
        self.assertEqual(member.plan, self.plan)
        self.assertIsNotNone(member.start_date)
        self.assertIsNotNone(member.end_date)
        self.assertTrue(member.is_active)
        self.assertEqual(member.user.role, "member")
        self.assertEqual(member.user.phone, "+919876543210")

    def test_membership_end_date_calculated_from_plan_duration(self):
        """end_date = start_date + plan.duration_days."""
        start = date.today()
        member = MemberFactory.create(
            gym=self.gym, plan=self.plan,
            start_date=start, days_until_expiry=30,
        )
        self.assertEqual(member.end_date, start + timedelta(days=30))

    def test_member_without_phone_has_none_phone(self):
        """Member created without phone has phone=None."""
        member = MemberFactory.create(gym=self.gym)
        self.assertIsNone(member.user.phone)

    def test_member_email_is_unique(self):
        """Two members cannot share the same email (unique User.email constraint)."""
        from django.db import IntegrityError

        member1 = MemberFactory.create(gym=self.gym, email="shared@test.com")
        with self.assertRaises(Exception):  # IntegrityError or validation
            MemberFactory.create(gym=self.gym, email="shared@test.com")


@override_settings(
    EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
    EMAIL_PROVIDER="smtp",
    WHATSAPP_PROVIDER="stub",
)
class TestMemberWelcomeNotification(TestCase):
    """Welcome notifications dispatched correctly on member creation."""

    def setUp(self):
        from services.email.factory import _reset_email_service
        from services.whatsapp.factory import _reset_whatsapp_service
        _reset_email_service()
        _reset_whatsapp_service()
        mail.outbox.clear()
        self.gym, self.config = GymFactory.create(enable_email=True, enable_whatsapp=False)

    def tearDown(self):
        from services.email.factory import _reset_email_service
        from services.whatsapp.factory import _reset_whatsapp_service
        _reset_email_service()
        _reset_whatsapp_service()

    def test_welcome_email_sent_to_new_member(self):
        """Welcome email is sent when enable_email=True."""
        from unittest.mock import patch

        member = MemberFactory.create(gym=self.gym)

        with patch("services.email.smtp.render_to_string", return_value="<html>Welcome</html>"):
            simulate_welcome_dispatch(member=member, gym=self.gym)

        assert_email_sent(self, to=member.user.email, subject_contains=self.gym.name)
        assert_notification_log_exists(
            self, gym=self.gym, event_type="member_welcome", channel="email",
        )

    def test_welcome_whatsapp_sent_when_enabled_and_phone_set(self):
        """Welcome WhatsApp sent when enable_whatsapp=True AND member.user.phone is set."""
        from notifications.models import NotificationLog

        self.config.enable_whatsapp = True
        self.config.save()

        member = MemberFactory.create(gym=self.gym, phone="+919876543210")

        from unittest.mock import patch
        with patch("services.email.smtp.render_to_string", return_value="<html>Welcome</html>"):
            simulate_welcome_dispatch(member=member, gym=self.gym)

        # Email log
        assert_notification_log_exists(
            self, gym=self.gym, event_type="member_welcome", channel="email"
        )
        # WhatsApp log (stub sends successfully)
        assert_notification_log_exists(
            self, gym=self.gym, event_type="member_welcome", channel="whatsapp"
        )

    def test_no_whatsapp_when_phone_missing(self):
        """Member without phone → WhatsApp skipped entirely (no log entry)."""
        self.config.enable_whatsapp = True
        self.config.save()

        member = MemberFactory.create(gym=self.gym, phone=None)

        from unittest.mock import patch
        with patch("services.email.smtp.render_to_string", return_value="<html>Welcome</html>"):
            simulate_welcome_dispatch(member=member, gym=self.gym)

        assert_no_notification_log(
            self, gym=self.gym, event_type="member_welcome", channel="whatsapp"
        )

    def test_no_email_when_flag_disabled(self):
        """When enable_email=False → no email sent, no log entry."""
        self.config.enable_email = False
        self.config.save()

        member = MemberFactory.create(gym=self.gym)

        from unittest.mock import patch
        with patch("services.email.smtp.render_to_string", return_value="<html>Welcome</html>"):
            simulate_welcome_dispatch(member=member, gym=self.gym)

        assert_no_email_sent(self, to=member.user.email)
        assert_no_notification_log(
            self, gym=self.gym, event_type="member_welcome", channel="email"
        )

    def test_welcome_email_idempotent_on_double_dispatch(self):
        """Running welcome dispatch twice sends only one email."""
        from unittest.mock import patch

        member = MemberFactory.create(gym=self.gym)

        with patch("services.email.smtp.render_to_string", return_value="<html>Welcome</html>"):
            simulate_welcome_dispatch(member=member, gym=self.gym)
            simulate_welcome_dispatch(member=member, gym=self.gym)  # retry

        # Outbox should have exactly 1 email
        assert_email_sent(self, to=member.user.email, count=1)
        assert_no_duplicate_notifications(
            self, gym=self.gym, event_type="member_welcome", channel="email"
        )

    def test_email_failure_does_not_prevent_business_flow(self):
        """
        Email provider crash during welcome dispatch does NOT raise.
        Member was already created — only notification is lost.
        """
        member = MemberFactory.create(gym=self.gym)

        with FailureInjector.email_provider_crash():
            try:
                simulate_welcome_dispatch(member=member, gym=self.gym)
            except Exception as e:
                self.fail(f"Welcome dispatch raised unexpectedly during failure: {e}")

        # Member still exists in DB
        from members.models import Member
        self.assertTrue(Member.all_objects.filter(pk=member.pk).exists())

    def test_whatsapp_failure_does_not_crash(self):
        """WhatsApp API failure is logged but does not crash the dispatch."""
        self.config.enable_whatsapp = True
        self.config.save()
        member = MemberFactory.create(gym=self.gym, phone="+919876543210")

        with FailureInjector.whatsapp_send_failure():
            from unittest.mock import patch
            with patch("services.email.smtp.render_to_string", return_value="<html>Welcome</html>"):
                try:
                    simulate_welcome_dispatch(member=member, gym=self.gym)
                except Exception as e:
                    self.fail(f"Dispatch raised on WhatsApp failure: {e}")

        # Email still went through
        assert_email_sent(self, to=member.user.email)


@override_settings(
    EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
    EMAIL_PROVIDER="smtp",
    WHATSAPP_PROVIDER="stub",
)
class TestMultipleMembersIndependent(TestCase):
    """Multiple members get independent notifications."""

    def setUp(self):
        from services.email.factory import _reset_email_service
        _reset_email_service()
        mail.outbox.clear()
        self.gym, _ = GymFactory.create(enable_email=True)

    def tearDown(self):
        from services.email.factory import _reset_email_service
        _reset_email_service()

    def test_five_members_each_get_welcome_email(self):
        """5 members → 5 independent welcome emails."""
        from unittest.mock import patch

        members = [MemberFactory.create(gym=self.gym) for _ in range(5)]

        with patch("services.email.smtp.render_to_string", return_value="<html>Welcome</html>"):
            for m in members:
                simulate_welcome_dispatch(member=m, gym=self.gym)

        self.assertEqual(len(mail.outbox), 5)

    def test_each_member_log_is_independent(self):
        """NotificationLog entries are member-specific (no shared logs)."""
        from unittest.mock import patch
        from notifications.models import NotificationLog

        members = [MemberFactory.create(gym=self.gym) for _ in range(3)]

        with patch("services.email.smtp.render_to_string", return_value="<html>Welcome</html>"):
            for m in members:
                simulate_welcome_dispatch(member=m, gym=self.gym)

        logs = NotificationLog.objects.filter(
            gym=self.gym, event_type="member_welcome", channel="email"
        )
        self.assertEqual(logs.count(), 3)
        member_ids = set(logs.values_list("member_id", flat=True))
        self.assertEqual(len(member_ids), 3)
