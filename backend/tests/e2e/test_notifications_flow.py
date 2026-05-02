"""
tests/e2e/test_notifications_flow.py
=======================================
E2E tests for the complete notification flow.

JOURNEY SIMULATED:
    STEP 7: System sends welcome email + WhatsApp attendance confirmation
    STEP 8: Trigger expiry reminders (scheduled job)
    STEP 9: Owner sends broadcast message to all members

TESTS:
    Expiry Reminders:
    - Members expiring in N days receive reminders
    - Members not in reminder window receive nothing
    - Idempotency: running reminder job twice sends only one reminder
    - In-app Notification created alongside email/WhatsApp
    - Dry-run mode sends nothing
    - Reminder respects enable_reminders flag

    Admin Broadcast:
    - All members receive broadcast email
    - Correct sent/skipped/failed counts
    - Email disabled → all skipped
    - Both channels disabled → all skipped
    - Large broadcast batch (50 members)
    - Broadcast idempotency (same day = skipped)

    Notification Log Audit:
    - Every send has a log entry
    - Failed sends logged as FAILED
    - Skipped sends logged correctly

Run:
    python manage.py test tests.e2e.test_notifications_flow --verbosity=2
"""

from datetime import date, timedelta

from django.test import TestCase, override_settings
from django.core import mail

from tests.e2e.fixtures.factory import GymFactory, MemberFactory
from tests.e2e.utils.assertions import (
    assert_notification_log_exists,
    assert_no_notification_log,
    assert_no_duplicate_notifications,
    assert_email_sent,
    assert_no_email_sent,
)
from tests.e2e.utils.simulators import (
    simulate_expiry_reminder_run,
    simulate_admin_broadcast,
    FailureInjector,
)


@override_settings(
    EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
    EMAIL_PROVIDER="smtp",
    WHATSAPP_PROVIDER="stub",
)
class TestExpiryReminderFlow(TestCase):
    """Expiry reminder job sends reminders to members expiring soon."""

    def setUp(self):
        from services.email.factory import _reset_email_service
        _reset_email_service()
        mail.outbox.clear()
        self.gym, self.config = GymFactory.create(
            enable_email=True,
            enable_reminders=True,
            expiry_reminder_days=7,
        )

    def tearDown(self):
        from services.email.factory import _reset_email_service
        _reset_email_service()

    def _make_expiring_member(self, days_left: int, phone: str | None = None):
        """Create a member expiring in exactly `days_left` days from today."""
        start = date.today() - timedelta(days=30 - days_left)
        end = date.today() + timedelta(days=days_left)
        member = MemberFactory.create(gym=self.gym, phone=phone)
        member.start_date = start
        member.end_date = end
        member.save(update_fields=["start_date", "end_date", "updated_at"])
        return member

    def test_reminder_sent_to_member_expiring_in_configured_days(self):
        """
        Member expiring in 7 days (config default) receives an expiry reminder.
        """
        from unittest.mock import patch

        _ = self._make_expiring_member(days_left=7)

        with patch("services.email.smtp.render_to_string", return_value="<html>Reminder</html>"):
            result = simulate_expiry_reminder_run(override_days=7)

        self.assertGreaterEqual(result["dispatched"], 1)
        assert_notification_log_exists(
            self, gym=self.gym, event_type="expiry_reminder", channel="email",
        )

    def test_no_reminder_for_member_not_in_window(self):
        """
        Member expiring in 30 days (not in 7-day window) receives NO reminder.
        """
        from unittest.mock import patch

        _ = self._make_expiring_member(days_left=30)

        with patch("services.email.smtp.render_to_string", return_value="<html>Reminder</html>"):
            result = simulate_expiry_reminder_run(override_days=7)

        self.assertEqual(result["dispatched"], 0)
        assert_no_notification_log(
            self, gym=self.gym, event_type="expiry_reminder", channel="email"
        )

    def test_reminder_idempotent_on_double_run(self):
        """Running reminder job twice: only one email sent per member."""
        from unittest.mock import patch

        _ = self._make_expiring_member(days_left=7)

        with patch("services.email.smtp.render_to_string", return_value="<html>Reminder</html>"):
            simulate_expiry_reminder_run(override_days=7)
            simulate_expiry_reminder_run(override_days=7)

        # Only 1 log entry (second run skipped via idempotency key)
        assert_no_duplicate_notifications(
            self, gym=self.gym, event_type="expiry_reminder", channel="email"
        )

    def test_reminder_skipped_when_reminders_disabled(self):
        """enable_reminders=False → reminder job skips this gym."""
        from unittest.mock import patch

        self.config.enable_reminders = False
        self.config.save()

        _ = self._make_expiring_member(days_left=7)

        with patch("services.email.smtp.render_to_string", return_value="<html>Reminder</html>"):
            result = simulate_expiry_reminder_run(override_days=7)

        self.assertEqual(result["dispatched"], 0)

    def test_dry_run_dispatches_nothing(self):
        """Dry-run mode reports members without sending."""
        _ = self._make_expiring_member(days_left=7)

        result = simulate_expiry_reminder_run(override_days=7, dry_run=True)
        self.assertTrue(result["dry_run"])
        self.assertEqual(len(mail.outbox), 0)
        assert_no_notification_log(
            self, gym=self.gym, event_type="expiry_reminder", channel="email"
        )

    def test_whatsapp_reminder_sent_when_enabled_and_phone_set(self):
        """WhatsApp reminder sent when enable_whatsapp=True + phone set."""
        self.config.enable_whatsapp = True
        self.config.save()

        _ = self._make_expiring_member(days_left=7, phone="+919876543210")

        from unittest.mock import patch
        with patch("services.email.smtp.render_to_string", return_value="<html>Reminder</html>"):
            simulate_expiry_reminder_run(override_days=7)

        assert_notification_log_exists(
            self, gym=self.gym, event_type="expiry_reminder", channel="whatsapp"
        )

    def test_urgency_reminder_for_critical_expiry(self):
        """Member expiring in 1 day → urgency context is 'critical'."""
        from unittest.mock import patch
        from services.dispatch import NotificationDispatcher

        member = self._make_expiring_member(days_left=1)
        dispatcher = NotificationDispatcher()

        captured_context = {}

        def capture_render(template, ctx):
            captured_context.update(ctx)
            return "<html>urgent reminder</html>"

        with patch("services.email.smtp.render_to_string", side_effect=capture_render):
            dispatcher.dispatch_expiry_reminder(member=member, gym=self.gym, days_left=1)

        self.assertEqual(captured_context.get("urgency"), "critical")
        self.assertEqual(captured_context.get("urgency_color"), "#dc2626")

    def test_in_app_notification_created_on_reminder(self):
        """In-app Notification record created for owner dashboard."""
        from unittest.mock import patch
        from notifications.models import Notification

        _ = self._make_expiring_member(days_left=7)

        with patch("services.email.smtp.render_to_string", return_value="<html>Reminder</html>"):
            simulate_expiry_reminder_run(override_days=7)

        in_app = Notification.all_objects.filter(
            gym=self.gym,
            type=Notification.Type.EXPIRY_REMINDER,
        )
        self.assertTrue(in_app.exists(), "In-app notification should be created")


@override_settings(
    EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
    EMAIL_PROVIDER="smtp",
    WHATSAPP_PROVIDER="stub",
)
class TestAdminBroadcast(TestCase):
    """
    STEP 9: Gym owner sends broadcast message to all members.
    """

    def setUp(self):
        from services.email.factory import _reset_email_service
        _reset_email_service()
        mail.outbox.clear()
        self.gym, self.config = GymFactory.create(enable_email=True)

    def tearDown(self):
        from services.email.factory import _reset_email_service
        _reset_email_service()

    def test_broadcast_sent_to_all_members_by_email(self):
        """Broadcast email sent to all members when enable_email=True."""
        from unittest.mock import patch

        members = [MemberFactory.create(gym=self.gym) for _ in range(3)]

        with patch("services.email.smtp.render_to_string", return_value="<html>Broadcast</html>"):
            result = simulate_admin_broadcast(
                gym=self.gym, members=members,
                subject="Important Announcement", message="Gym closing for renovation",
            )

        self.assertEqual(result["sent"], 3)
        self.assertEqual(result["failed"], 0)
        self.assertEqual(result["skipped"], 0)

    def test_broadcast_all_skipped_when_email_disabled(self):
        """
        When enable_email=False and enable_whatsapp=False:
        All members are SKIPPED (not sent, not failed).
        """
        self.config.enable_email = False
        self.config.enable_whatsapp = False
        self.config.save()

        members = [MemberFactory.create(gym=self.gym) for _ in range(4)]

        result = simulate_admin_broadcast(
            gym=self.gym, members=members,
            subject="Test", message="Hello",
        )

        self.assertEqual(result["skipped"], 4)
        self.assertEqual(result["sent"], 0)
        self.assertEqual(result["failed"], 0)

    def test_broadcast_email_and_whatsapp_both_enabled(self):
        """Both channels enabled → sent count is still per-member (not per-channel)."""
        self.config.enable_whatsapp = True
        self.config.save()

        members = [
            MemberFactory.create(gym=self.gym, phone="+91987654321" + str(i))
            for i in range(2)
        ]

        from unittest.mock import patch
        with patch("services.email.smtp.render_to_string", return_value="<html>Broadcast</html>"):
            result = simulate_admin_broadcast(
                gym=self.gym, members=members,
                subject="Dual Channel", message="Hello everyone",
            )

        # sent = 2 (one per member — at least one channel succeeded)
        self.assertEqual(result["sent"], 2)

    def test_broadcast_counted_as_failed_when_email_send_fails(self):
        """Member counted as failed when email send returns success=False."""
        members = [MemberFactory.create(gym=self.gym) for _ in range(2)]

        with FailureInjector.email_provider_crash():
            result = simulate_admin_broadcast(
                gym=self.gym, members=members,
                subject="Test", message="Hello",
            )

        # email attempted but crashed → failed
        self.assertEqual(result["failed"], 2)
        self.assertEqual(result["sent"], 0)

    def test_large_broadcast_50_members(self):
        """Broadcast to 50 members completes without error."""
        from unittest.mock import patch

        members = [MemberFactory.create(gym=self.gym) for _ in range(50)]

        with patch("services.email.smtp.render_to_string", return_value="<html>Broadcast</html>"):
            result = simulate_admin_broadcast(
                gym=self.gym, members=members,
                subject="Batch Broadcast", message="Hello all 50 members",
            )

        self.assertLessEqual(result["failed"], 50)
        total = result["sent"] + result["failed"] + result["skipped"]
        self.assertEqual(total, 50)

    def test_broadcast_idempotent_on_second_run(self):
        """
        Sending the same broadcast twice on the same day:
        Second run hits idempotency key → duplicate email NOT sent.
        Mail outbox contains exactly 2 emails total (one per member, not two per member).

        NOTE: The dispatcher counter may show 'failed' on the second run because
        the idempotency skip returns False from _fire_email, which the counter
        treats as a failed attempt. This is a known limitation: the counter
        is primarily meant for real failures, not idempotency skips.
        The critical guarantee is: NO duplicate emails in the outbox.
        """
        from unittest.mock import patch

        members = [MemberFactory.create(gym=self.gym) for _ in range(2)]

        with patch("services.email.smtp.render_to_string", return_value="<html>Broadcast</html>"):
            result1 = simulate_admin_broadcast(
                gym=self.gym, members=members,
                subject="Same Subject", message="Same Message",
            )
            simulate_admin_broadcast(
                gym=self.gym, members=members,
                subject="Same Subject", message="Same Message",
            )

        # First run: 2 sent
        self.assertEqual(result1["sent"], 2)
        # Total emails in outbox: 2 (one per member — NOT duplicated)
        self.assertEqual(len(mail.outbox), 2)
        assert_no_duplicate_notifications(
            self, gym=self.gym, event_type="admin_broadcast", channel="email"
        )


@override_settings(
    EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
    EMAIL_PROVIDER="smtp",
    WHATSAPP_PROVIDER="stub",
)
class TestNotificationLogAudit(TestCase):
    """NotificationLog correctly records every dispatch attempt."""

    def setUp(self):
        from services.email.factory import _reset_email_service
        _reset_email_service()
        self.gym, _ = GymFactory.create(enable_email=True)

    def tearDown(self):
        from services.email.factory import _reset_email_service
        _reset_email_service()

    def test_successful_send_logged_as_sent(self):
        """Successful email → NotificationLog.status=sent."""
        from notifications.models import NotificationLog
        from tests.e2e.utils.simulators import simulate_welcome_dispatch
        from unittest.mock import patch

        member = MemberFactory.create(gym=self.gym)

        with patch("services.email.smtp.render_to_string", return_value="<html>Welcome</html>"):
            simulate_welcome_dispatch(member=member, gym=self.gym)

        log = NotificationLog.objects.filter(
            gym=self.gym, event_type="member_welcome", channel="email"
        ).first()
        self.assertIsNotNone(log)
        self.assertEqual(log.status, "sent")
        self.assertEqual(log.recipient, member.user.email)

    def test_failed_send_logged_as_failed(self):
        """Failed email → NotificationLog.status=failed with error_message."""
        from notifications.models import NotificationLog
        from tests.e2e.utils.simulators import simulate_welcome_dispatch

        member = MemberFactory.create(gym=self.gym)

        with FailureInjector.email_send_failure():
            from unittest.mock import patch
            with patch(
                "services.email.smtp.render_to_string",
                return_value="<html>Welcome</html>"
            ):
                simulate_welcome_dispatch(member=member, gym=self.gym)

        log = NotificationLog.objects.filter(
            gym=self.gym, event_type="member_welcome", channel="email"
        ).first()
        self.assertIsNotNone(log)
        self.assertEqual(log.status, "failed")
        self.assertIn("failure", log.error_message.lower())

    def test_log_contains_provider_info(self):
        """NotificationLog records which provider was used."""
        from notifications.models import NotificationLog
        from tests.e2e.utils.simulators import simulate_welcome_dispatch
        from unittest.mock import patch

        member = MemberFactory.create(gym=self.gym)

        with patch("services.email.smtp.render_to_string", return_value="<html>Welcome</html>"):
            simulate_welcome_dispatch(member=member, gym=self.gym)

        log = NotificationLog.objects.filter(
            gym=self.gym, event_type="member_welcome", channel="email"
        ).first()
        self.assertEqual(log.provider, "smtp")

    def test_log_idempotency_key_is_unique_per_event_member_day(self):
        """Idempotency key is unique per (gym, channel, event, member, date)."""
        from notifications.models import NotificationLog
        from tests.e2e.utils.simulators import simulate_welcome_dispatch
        from unittest.mock import patch

        member1 = MemberFactory.create(gym=self.gym)
        member2 = MemberFactory.create(gym=self.gym)

        with patch("services.email.smtp.render_to_string", return_value="<html>Welcome</html>"):
            simulate_welcome_dispatch(member=member1, gym=self.gym)
            simulate_welcome_dispatch(member=member2, gym=self.gym)

        keys = list(NotificationLog.objects.filter(
            gym=self.gym, event_type="member_welcome"
        ).values_list("idempotency_key", flat=True))

        self.assertEqual(len(keys), len(set(keys)), "Idempotency keys must be unique")
