"""
tests/e2e/test_multi_tenant_isolation.py
==========================================
E2E tests for strict multi-tenant isolation.

CRITICAL INVARIANTS:
    1. Members from Gym A NEVER appear in Gym B queries
    2. NotificationLogs are gym-scoped (no cross-tenant leakage)
    3. Plans from Gym A cannot be used for Gym B members
    4. Attendance records are gym-scoped
    5. Feature flags are per-gym (Gym A=email on, Gym B=email off → no bleed)
    6. NotificationDispatcher idempotency keys are gym-scoped
    7. TenantManager returns empty queryset when no tenant set
    8. Tenant cache correctly isolates subdomains

TESTS:
    - Member queryset isolated by gym
    - Notification logs isolated by gym
    - Attendance records isolated by gym
    - Plan assignment only works within same gym
    - Dispatcher actions for Gym A do not affect Gym B logs
    - Feature flag changes in Gym A do not affect Gym B
    - Idempotency keys are scoped by gym_id
    - Tenant cache hit/miss behavior
    - Concurrent tenants: 3 gyms running simultaneously

Run:
    python manage.py test tests.e2e.test_multi_tenant_isolation --verbosity=2
"""

from datetime import date, timedelta

from django.test import TestCase, override_settings

from tests.e2e.fixtures.factory import (
    AttendanceFactory,
    GymFactory,
    MemberFactory,
    PlanFactory,
)
from tests.e2e.utils.assertions import (
    assert_notification_log_exists,
    assert_no_notification_log,
)
from tests.e2e.utils.simulators import (
    simulate_member_checkin,
    simulate_welcome_dispatch,
    simulate_expiry_reminder_run,
    FailureInjector,
)


class TestMemberQueryIsolation(TestCase):
    """Members are strictly isolated by gym."""

    def setUp(self):
        self.gym_a, _ = GymFactory.create(subdomain="gym-a-iso")
        self.gym_b, _ = GymFactory.create(subdomain="gym-b-iso")

    def test_gym_a_members_not_visible_from_gym_b(self):
        """all_objects.filter(gym=gym_a) does not include gym_b members."""
        from members.models import Member

        m_a = MemberFactory.create(gym=self.gym_a)
        m_b = MemberFactory.create(gym=self.gym_b)

        gym_a_members = Member.all_objects.filter(gym=self.gym_a)
        gym_b_members = Member.all_objects.filter(gym=self.gym_b)

        self.assertIn(m_a, gym_a_members)
        self.assertNotIn(m_b, gym_a_members)
        self.assertIn(m_b, gym_b_members)
        self.assertNotIn(m_a, gym_b_members)

    def test_member_count_per_gym_independent(self):
        """Member counts per gym are independent."""
        from members.models import Member

        for _ in range(3):
            MemberFactory.create(gym=self.gym_a)
        for _ in range(5):
            MemberFactory.create(gym=self.gym_b)

        self.assertEqual(Member.all_objects.filter(gym=self.gym_a).count(), 3)
        self.assertEqual(Member.all_objects.filter(gym=self.gym_b).count(), 5)

    def test_plan_from_gym_a_cannot_be_used_in_gym_b(self):
        """
        A plan created for Gym A should not appear in Gym B plan queries.
        Prevents cross-gym plan leakage.
        """
        from gyms.models import Plan

        plan_a = PlanFactory.create(gym=self.gym_a, name="Gym A Plan")
        plan_b = PlanFactory.create(gym=self.gym_b, name="Gym B Plan")

        gym_a_plans = Plan.all_objects.filter(gym=self.gym_a)
        gym_b_plans = Plan.all_objects.filter(gym=self.gym_b)

        self.assertIn(plan_a, gym_a_plans)
        self.assertNotIn(plan_b, gym_a_plans)
        self.assertIn(plan_b, gym_b_plans)
        self.assertNotIn(plan_a, gym_b_plans)


class TestAttendanceIsolation(TestCase):
    """Attendance records are gym-scoped."""

    def setUp(self):
        self.gym_a, _ = GymFactory.create(subdomain="att-iso-a")
        self.gym_b, _ = GymFactory.create(subdomain="att-iso-b")

    def test_gym_a_attendance_not_visible_from_gym_b(self):
        """Attendance records for Gym A are not visible in Gym B queries."""
        from attendance.models import Attendance

        m_a = MemberFactory.create(gym=self.gym_a)
        m_b = MemberFactory.create(gym=self.gym_b)

        r_a = AttendanceFactory.check_in(gym=self.gym_a, member=m_a)
        r_b = AttendanceFactory.check_in(gym=self.gym_b, member=m_b)

        gym_a_att = Attendance.all_objects.filter(gym=self.gym_a)
        gym_b_att = Attendance.all_objects.filter(gym=self.gym_b)

        self.assertIn(r_a, gym_a_att)
        self.assertNotIn(r_b, gym_a_att)
        self.assertIn(r_b, gym_b_att)
        self.assertNotIn(r_a, gym_b_att)


@override_settings(
    EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
    EMAIL_PROVIDER="smtp",
    WHATSAPP_PROVIDER="stub",
)
class TestNotificationLogIsolation(TestCase):
    """NotificationLog entries are gym-scoped — no cross-tenant contamination."""

    def setUp(self):
        from services.email.factory import _reset_email_service
        _reset_email_service()
        from django.core import mail
        mail.outbox.clear()
        self.gym_a, _ = GymFactory.create(subdomain="nl-iso-a", enable_email=True)
        self.gym_b, _ = GymFactory.create(subdomain="nl-iso-b", enable_email=True)

    def tearDown(self):
        from services.email.factory import _reset_email_service
        _reset_email_service()

    def test_gym_a_logs_not_visible_in_gym_b(self):
        """NotificationLog entries for Gym A are NOT returned in Gym B queries."""
        from unittest.mock import patch
        from notifications.models import NotificationLog

        m_a = MemberFactory.create(gym=self.gym_a)

        with patch("services.email.smtp.render_to_string", return_value="<html>W</html>"):
            simulate_welcome_dispatch(member=m_a, gym=self.gym_a)

        gym_a_logs = NotificationLog.objects.filter(gym=self.gym_a)
        gym_b_logs = NotificationLog.objects.filter(gym=self.gym_b)

        self.assertGreater(gym_a_logs.count(), 0)
        self.assertEqual(gym_b_logs.count(), 0)

    def test_both_gyms_get_independent_logs(self):
        """Each gym's logs are independent and non-overlapping."""
        from unittest.mock import patch
        from notifications.models import NotificationLog

        m_a = MemberFactory.create(gym=self.gym_a)
        m_b = MemberFactory.create(gym=self.gym_b)

        with patch("services.email.smtp.render_to_string", return_value="<html>W</html>"):
            simulate_welcome_dispatch(member=m_a, gym=self.gym_a)
            simulate_welcome_dispatch(member=m_b, gym=self.gym_b)

        all_logs = NotificationLog.objects.all()
        gym_a_logs = NotificationLog.objects.filter(gym=self.gym_a)
        gym_b_logs = NotificationLog.objects.filter(gym=self.gym_b)

        self.assertEqual(all_logs.count(), 2)
        self.assertEqual(gym_a_logs.count(), 1)
        self.assertEqual(gym_b_logs.count(), 1)

        # Ensure no cross-gym log reference
        self.assertNotEqual(
            gym_a_logs.first().gym,
            gym_b_logs.first().gym,
        )

    def test_idempotency_keys_scoped_by_gym(self):
        """
        Two different gyms, same event, same member position:
        idempotency keys MUST differ (gym_id is part of the key).
        """
        from unittest.mock import patch
        from notifications.models import NotificationLog
        from services.dispatch import NotificationDispatcher

        m_a = MemberFactory.create(gym=self.gym_a)
        m_b = MemberFactory.create(gym=self.gym_b)

        dispatcher = NotificationDispatcher()

        with patch("services.email.smtp.render_to_string", return_value="<html>W</html>"):
            simulate_welcome_dispatch(member=m_a, gym=self.gym_a)
            simulate_welcome_dispatch(member=m_b, gym=self.gym_b)

        keys = list(NotificationLog.objects.values_list("idempotency_key", flat=True))
        self.assertEqual(len(keys), len(set(keys)), "Idempotency keys must be globally unique")


@override_settings(
    EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
    EMAIL_PROVIDER="smtp",
    WHATSAPP_PROVIDER="stub",
)
class TestFeatureFlagIsolation(TestCase):
    """Feature flags are per-gym — changes in one do not affect the other."""

    def setUp(self):
        from services.email.factory import _reset_email_service
        _reset_email_service()
        from django.core import mail
        mail.outbox.clear()
        self.gym_a, self.config_a = GymFactory.create(
            subdomain="ff-iso-a", enable_email=True
        )
        self.gym_b, self.config_b = GymFactory.create(
            subdomain="ff-iso-b", enable_email=False
        )

    def tearDown(self):
        from services.email.factory import _reset_email_service
        _reset_email_service()

    def test_gym_a_email_on_gym_b_email_off(self):
        """
        Gym A has email enabled; Gym B has email disabled.
        Only Gym A member receives welcome email.
        """
        from unittest.mock import patch

        m_a = MemberFactory.create(gym=self.gym_a)
        m_b = MemberFactory.create(gym=self.gym_b)

        with patch("services.email.smtp.render_to_string", return_value="<html>W</html>"):
            simulate_welcome_dispatch(member=m_a, gym=self.gym_a)
            simulate_welcome_dispatch(member=m_b, gym=self.gym_b)

        assert_notification_log_exists(
            self, gym=self.gym_a, event_type="member_welcome", channel="email"
        )
        assert_no_notification_log(
            self, gym=self.gym_b, event_type="member_welcome", channel="email"
        )

    def test_enabling_email_for_gym_b_does_not_affect_gym_a(self):
        """
        Enabling email for Gym B after the fact doesn't retroactively affect Gym A logs.
        """
        from unittest.mock import patch
        from notifications.models import NotificationLog

        m_a = MemberFactory.create(gym=self.gym_a)

        with patch("services.email.smtp.render_to_string", return_value="<html>W</html>"):
            simulate_welcome_dispatch(member=m_a, gym=self.gym_a)

        # Now enable email for Gym B
        self.config_b.enable_email = True
        self.config_b.save()

        # Gym A logs remain exactly 1
        self.assertEqual(
            NotificationLog.objects.filter(gym=self.gym_a, event_type="member_welcome").count(),
            1,
        )


class TestTenantCacheIsolation(TestCase):
    """Tenant TTL cache correctly isolates subdomains."""

    def test_cache_returns_correct_gym_per_subdomain(self):
        """Two different subdomains return two different gym objects from cache."""
        from core.middleware import _cache_get, _cache_set, _TENANT_CACHE

        _TENANT_CACHE.clear()
        gym_a, _ = GymFactory.create(subdomain="cache-iso-a")
        gym_b, _ = GymFactory.create(subdomain="cache-iso-b")

        _cache_set("cache-iso-a", gym_a)
        _cache_set("cache-iso-b", gym_b)

        result_a = _cache_get("cache-iso-a")
        result_b = _cache_get("cache-iso-b")

        self.assertEqual(result_a, gym_a)
        self.assertEqual(result_b, gym_b)
        self.assertNotEqual(result_a, result_b)

    def test_cache_miss_returns_sentinel(self):
        """Unknown subdomain returns ellipsis sentinel (not None)."""
        from core.middleware import _cache_get, _TENANT_CACHE

        _TENANT_CACHE.clear()
        result = _cache_get("completely-unknown-xyz-abc")
        self.assertIs(result, ...)

    def test_cache_none_for_missing_gym(self):
        """Caching None for unknown subdomains prevents repeated DB hits."""
        from core.middleware import _cache_get, _cache_set, _TENANT_CACHE

        _TENANT_CACHE.clear()
        _cache_set("ghost-gym-999", None)
        result = _cache_get("ghost-gym-999")
        self.assertIsNone(result)  # Not ..., meaning it was found in cache (as None)

    def test_cache_cleared_on_invalidation(self):
        """Cache can be manually cleared (simulates tenant deactivation)."""
        from core.middleware import _cache_get, _cache_set, _TENANT_CACHE

        gym, _ = GymFactory.create(subdomain="cache-clear-test")
        _cache_set("cache-clear-test", gym)

        # Simulate cache invalidation (e.g., gym deactivated)
        _TENANT_CACHE.clear()

        result = _cache_get("cache-clear-test")
        self.assertIs(result, ..., "After clear, should be cache miss (sentinel ...)")


@override_settings(
    EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
    EMAIL_PROVIDER="smtp",
    WHATSAPP_PROVIDER="stub",
)
class TestConcurrentTenants(TestCase):
    """
    3 gyms running simultaneously — simulate concurrent operations.
    All tenant-specific data stays within its tenant boundary.
    """

    def setUp(self):
        from services.email.factory import _reset_email_service
        _reset_email_service()
        from django.core import mail
        mail.outbox.clear()
        self.gym_1, _ = GymFactory.create(subdomain="concurrent-1", enable_email=True)
        self.gym_2, _ = GymFactory.create(subdomain="concurrent-2", enable_email=True)
        self.gym_3, _ = GymFactory.create(subdomain="concurrent-3", enable_email=False)

    def tearDown(self):
        from services.email.factory import _reset_email_service
        _reset_email_service()

    def test_three_gyms_independent_members_and_notifications(self):
        """
        3 gyms, each with 2 members.
        Gym 1 + 2 have email on; Gym 3 has email off.
        Result: 4 emails total, logs properly attributed.
        """
        from unittest.mock import patch
        from notifications.models import NotificationLog
        from members.models import Member

        m1 = [MemberFactory.create(gym=self.gym_1) for _ in range(2)]
        m2 = [MemberFactory.create(gym=self.gym_2) for _ in range(2)]
        m3 = [MemberFactory.create(gym=self.gym_3) for _ in range(2)]

        with patch("services.email.smtp.render_to_string", return_value="<html>W</html>"):
            for m in m1:
                simulate_welcome_dispatch(member=m, gym=self.gym_1)
            for m in m2:
                simulate_welcome_dispatch(member=m, gym=self.gym_2)
            for m in m3:
                simulate_welcome_dispatch(member=m, gym=self.gym_3)  # email disabled → skipped

        # Gym 1 and 2 each have 2 logs
        self.assertEqual(
            NotificationLog.objects.filter(gym=self.gym_1).count(), 2
        )
        self.assertEqual(
            NotificationLog.objects.filter(gym=self.gym_2).count(), 2
        )
        # Gym 3 has 0 logs (email disabled)
        self.assertEqual(
            NotificationLog.objects.filter(gym=self.gym_3).count(), 0
        )

        # Member counts are correct per gym
        self.assertEqual(Member.all_objects.filter(gym=self.gym_1).count(), 2)
        self.assertEqual(Member.all_objects.filter(gym=self.gym_2).count(), 2)
        self.assertEqual(Member.all_objects.filter(gym=self.gym_3).count(), 2)

    def test_expiry_reminder_only_processes_own_gym_members(self):
        """
        Expiry reminder run processes each gym independently.
        Members of Gym 2 expiring in 7 days don't affect Gym 1 or Gym 3 logs.
        """
        from unittest.mock import patch
        from notifications.models import NotificationLog

        # Only Gym 2 members expiring in 7 days
        member = MemberFactory.create(gym=self.gym_2)
        target = date.today() + timedelta(days=7)
        member.end_date = target
        member.save(update_fields=["end_date", "updated_at"])

        # Gym 2 has expiry_reminder_days=7 (default factory)
        with patch("services.email.smtp.render_to_string", return_value="<html>R</html>"):
            result = simulate_expiry_reminder_run(override_days=7)

        # Only Gym 2 should have reminder logs
        self.assertEqual(
            NotificationLog.objects.filter(gym=self.gym_1, event_type="expiry_reminder").count(),
            0,
        )
        self.assertEqual(
            NotificationLog.objects.filter(gym=self.gym_2, event_type="expiry_reminder").count(),
            1,
        )
        self.assertEqual(
            NotificationLog.objects.filter(gym=self.gym_3, event_type="expiry_reminder").count(),
            0,
        )
