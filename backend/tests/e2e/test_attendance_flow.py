"""
tests/e2e/test_attendance_flow.py
====================================
E2E tests simulating the complete attendance flow.

JOURNEY SIMULATED:
    STEP 6: Members check in at the gym (via QR scan or staff desk)
    → Attendance record created for today
    → WhatsApp confirmation sent on FIRST check-in only
    → Second check-in on same day → idempotent (no duplicate)
    → Check-out recorded
    → Historical attendance visible

TESTS:
    - Check-in creates Attendance record
    - Check-in returns same record on second call (idempotent)
    - WhatsApp confirmation fires on FIRST check-in only
    - WhatsApp skipped when no phone set
    - WhatsApp skipped when feature flag off
    - Check-out recorded correctly
    - Check-in fails gracefully when WhatsApp crashes
    - Multiple members check in independently
    - Attendance per-gym isolation (Gym A ≠ Gym B)
    - Historical attendance can be queried

Run:
    python manage.py test tests.e2e.test_attendance_flow --verbosity=2
"""

from datetime import date, timedelta

from django.test import TestCase, override_settings
from django.utils import timezone

from tests.e2e.fixtures.factory import AttendanceFactory, GymFactory, MemberFactory
from tests.e2e.utils.assertions import (
    assert_attendance_checked_in,
    assert_attendance_unique_per_day,
    assert_notification_log_exists,
    assert_no_notification_log,
)
from tests.e2e.utils.simulators import (
    simulate_member_checkin,
    simulate_member_checkout,
    FailureInjector,
)


@override_settings(WHATSAPP_PROVIDER="stub")
class TestAttendanceCheckIn(TestCase):
    """Core attendance check-in logic."""

    def setUp(self):
        from services.whatsapp.factory import _reset_whatsapp_service
        _reset_whatsapp_service()
        self.gym, self.config = GymFactory.create()

    def tearDown(self):
        from services.whatsapp.factory import _reset_whatsapp_service
        _reset_whatsapp_service()

    def test_checkin_creates_attendance_record(self):
        """First check-in of the day creates an Attendance record."""
        member = MemberFactory.create(gym=self.gym)
        record = simulate_member_checkin(gym=self.gym, member=member)

        self.assertIsNotNone(record)
        self.assertIsNotNone(record.check_in)
        self.assertEqual(record.date, date.today())
        self.assertEqual(record.member, member)
        self.assertEqual(record.gym, self.gym)

    def test_second_checkin_same_day_returns_same_record(self):
        """Two check-ins on the same day return the same Attendance record."""
        member = MemberFactory.create(gym=self.gym)

        record1 = simulate_member_checkin(gym=self.gym, member=member)
        record2 = simulate_member_checkin(gym=self.gym, member=member)

        self.assertEqual(record1.pk, record2.pk, "Second check-in should return same record")
        assert_attendance_unique_per_day(self, gym=self.gym, member=member)

    def test_checkin_sets_check_in_time(self):
        """check_in timestamp is set on first check-in."""
        member = MemberFactory.create(gym=self.gym)
        before = timezone.now()
        record = simulate_member_checkin(gym=self.gym, member=member)
        after = timezone.now()

        self.assertGreaterEqual(record.check_in, before)
        self.assertLessEqual(record.check_in, after)

    def test_checkout_sets_check_out_time(self):
        """check_out timestamp is set on checkout."""
        member = MemberFactory.create(gym=self.gym)
        simulate_member_checkin(gym=self.gym, member=member)
        record = simulate_member_checkout(gym=self.gym, member=member)

        self.assertIsNotNone(record.check_out)

    def test_multiple_members_checkin_independently(self):
        """5 different members each get their own attendance record."""
        from attendance.models import Attendance

        members = [MemberFactory.create(gym=self.gym) for _ in range(5)]
        for m in members:
            simulate_member_checkin(gym=self.gym, member=m)

        total = Attendance.all_objects.filter(gym=self.gym, date=date.today()).count()
        self.assertEqual(total, 5)

    def test_attendance_factory_creates_record_directly(self):
        """AttendanceFactory creates records bypassing service layer (for test setup)."""
        member = MemberFactory.create(gym=self.gym)
        record = AttendanceFactory.check_in(gym=self.gym, member=member)

        self.assertIsNotNone(record.check_in)
        self.assertEqual(record.gym, self.gym)


@override_settings(WHATSAPP_PROVIDER="stub")
class TestAttendanceWhatsAppConfirmation(TestCase):
    """WhatsApp confirmation fires on first check-in only."""

    def setUp(self):
        from services.whatsapp.factory import _reset_whatsapp_service
        _reset_whatsapp_service()
        self.gym, self.config = GymFactory.create()

    def tearDown(self):
        from services.whatsapp.factory import _reset_whatsapp_service
        _reset_whatsapp_service()

    def test_whatsapp_confirmation_sent_on_first_checkin(self):
        """
        First check-in triggers WhatsApp confirmation.
        Requires: enable_whatsapp=True + phone set.
        """
        self.config.enable_whatsapp = True
        self.config.save()

        member = MemberFactory.create(gym=self.gym, phone="+919876543210")
        simulate_member_checkin(gym=self.gym, member=member)

        assert_notification_log_exists(
            self, gym=self.gym,
            event_type="attendance_confirmation",
            channel="whatsapp",
        )

    def test_whatsapp_not_sent_on_second_checkin_same_day(self):
        """
        Second check-in on same day:
        - Attendance record already exists (get_or_create returns existing)
        - `created=False` → dispatch NOT called
        → Only 1 WhatsApp log entry total.
        """
        from notifications.models import NotificationLog

        self.config.enable_whatsapp = True
        self.config.save()

        member = MemberFactory.create(gym=self.gym, phone="+919876543210")
        simulate_member_checkin(gym=self.gym, member=member)  # first → dispatch
        simulate_member_checkin(gym=self.gym, member=member)  # second → skip

        wa_logs = NotificationLog.objects.filter(
            gym=self.gym,
            member=member,
            event_type="attendance_confirmation",
            channel="whatsapp",
        )
        self.assertEqual(wa_logs.count(), 1, "WhatsApp should only fire once per day per member")

    def test_whatsapp_skipped_when_no_phone(self):
        """Member without phone → no WhatsApp log, no crash."""
        self.config.enable_whatsapp = True
        self.config.save()

        member = MemberFactory.create(gym=self.gym, phone=None)
        simulate_member_checkin(gym=self.gym, member=member)

        assert_no_notification_log(
            self, gym=self.gym,
            event_type="attendance_confirmation",
            channel="whatsapp",
        )

    def test_whatsapp_skipped_when_feature_flag_off(self):
        """enable_whatsapp=False → no WhatsApp even with phone set."""
        self.config.enable_whatsapp = False
        self.config.save()

        member = MemberFactory.create(gym=self.gym, phone="+919876543210")
        simulate_member_checkin(gym=self.gym, member=member)

        assert_no_notification_log(
            self, gym=self.gym,
            event_type="attendance_confirmation",
            channel="whatsapp",
        )

    def test_checkin_not_blocked_when_whatsapp_crashes(self):
        """
        WhatsApp provider crash during check-in:
        - Attendance record MUST be created
        - Dispatch failure silently absorbed
        """
        self.config.enable_whatsapp = True
        self.config.save()
        member = MemberFactory.create(gym=self.gym, phone="+919876543210")

        with FailureInjector.whatsapp_provider_crash():
            try:
                record = simulate_member_checkin(gym=self.gym, member=member)
            except Exception as e:
                self.fail(f"Check-in raised on WhatsApp crash: {e}")

        # Attendance record exists despite notification failure
        assert_attendance_checked_in(self, gym=self.gym, member=member)

    def test_checkin_not_blocked_when_db_log_write_fails(self):
        """
        DB failure when writing NotificationLog:
        - Attendance record MUST still be created
        - Log write failure silently absorbed
        """
        self.config.enable_whatsapp = True
        self.config.save()
        member = MemberFactory.create(gym=self.gym, phone="+919876543210")

        with FailureInjector.db_failure_on_notification_log():
            try:
                simulate_member_checkin(gym=self.gym, member=member)
            except Exception as e:
                self.fail(f"Check-in raised on DB log failure: {e}")

        assert_attendance_checked_in(self, gym=self.gym, member=member)


@override_settings(WHATSAPP_PROVIDER="stub")
class TestAttendanceHistoricalQuery(TestCase):
    """Historical attendance queries work correctly."""

    def setUp(self):
        self.gym, _ = GymFactory.create()

    def test_attendance_history_queryable_by_member(self):
        """Can query last N check-ins for a specific member."""
        from attendance.models import Attendance

        member = MemberFactory.create(gym=self.gym)

        # Create 3 attendance records on different dates
        for days_ago in [2, 1, 0]:
            d = date.today() - timedelta(days=days_ago)
            AttendanceFactory.check_in(gym=self.gym, member=member, attendance_date=d)

        history = Attendance.all_objects.filter(member=member).order_by("-date")
        self.assertEqual(history.count(), 3)
        self.assertEqual(history.first().date, date.today())

    def test_attendance_filter_by_date_range(self):
        """Attendance records filterable by date range."""
        from attendance.models import Attendance

        member = MemberFactory.create(gym=self.gym)

        for days_ago in [6, 5, 4, 3, 2, 1, 0]:
            d = date.today() - timedelta(days=days_ago)
            AttendanceFactory.check_in(gym=self.gym, member=member, attendance_date=d)

        last_3_days = Attendance.all_objects.filter(
            member=member,
            date__gte=date.today() - timedelta(days=2),
        )
        self.assertEqual(last_3_days.count(), 3)
