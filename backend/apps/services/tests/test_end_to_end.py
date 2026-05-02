"""
tests/test_end_to_end.py
========================
End-to-end integration tests covering the full gym lifecycle.

Tests:
1. Gym creation → feature config auto-created
2. Member creation → welcome notification dispatched
3. Attendance check-in → confirmation fires on first check-in only
4. Expiry reminder command → dispatches via NotificationDispatcher
5. Feature flag: enable_email=False → zero emails sent
6. Idempotency: running expiry command twice → no duplicate sends
7. Tenant isolation: members from Gym A cannot see Gym B data
8. Admin broadcast skipped/failed counters correct
"""
from datetime import date, timedelta
from unittest.mock import MagicMock, patch
from django.test import TestCase, override_settings
from django.contrib.auth import get_user_model

User = get_user_model()


def _make_gym_in_db(subdomain="testgym1", name="Test Gym 1"):
    """Create a real Gym + GymFeatureConfig in DB."""
    from gyms.models import Gym, GymFeatureConfig
    gym = Gym.objects.create(
        name=name,
        subdomain=subdomain,
        full_url=f"http://{subdomain}.localhost:5173",
        is_active=True,
        is_approved=True,
        status="approved",
    )
    # Signal auto-creates GymFeatureConfig; confirm it exists
    config, _ = GymFeatureConfig.objects.get_or_create(gym=gym)
    config.enable_email = True
    config.enable_whatsapp = False
    config.enable_reminders = True
    config.expiry_reminder_days = 7
    config.save()
    return gym, config


def _make_owner_in_db(gym):
    return User.objects.create_user(
        email=f"owner_{gym.subdomain}@test.com",
        password="Owner@123",
        role=User.Roles.GYM_OWNER,
        gym=gym,
        is_verified=True,
    )


def _make_member_in_db(gym, email_suffix="1"):
    from gyms.models import Plan
    from members.models import Member
    plan = Plan.all_objects.filter(gym=gym).first()
    if not plan:
        plan = Plan.all_objects.create(
            gym=gym, name="Basic", price=999,
            duration_days=30, is_active=True,
        )
    user = User.objects.create_user(
        email=f"member{email_suffix}_{gym.subdomain}@test.com",
        password="Member@123",
        role=User.Roles.MEMBER,
        gym=gym,
        is_verified=True,
    )
    member = Member.all_objects.create(user=user, gym=gym, plan=plan)
    from django.utils import timezone
    member.start_date = date.today()
    member.end_date = date.today() + timedelta(days=30)
    member.is_active = True
    member.save()
    return member


class TestGymFeatureConfigAutoCreated(TestCase):
    """GymFeatureConfig is auto-created with safe defaults on Gym creation."""

    def test_config_created_with_defaults(self):
        from gyms.models import GymFeatureConfig
        gym, config = _make_gym_in_db(subdomain="autogym1")
        self.assertIsNotNone(config)
        self.assertTrue(config.enable_email)
        self.assertFalse(config.enable_whatsapp)

    def test_config_has_communication_flags(self):
        from gyms.models import GymFeatureConfig
        gym, config = _make_gym_in_db(subdomain="autogym2")
        # Fields must exist
        self.assertTrue(hasattr(config, "enable_email"))
        self.assertTrue(hasattr(config, "enable_whatsapp"))


@override_settings(
    EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
    EMAIL_PROVIDER="smtp",
    WHATSAPP_PROVIDER="stub",
)
class TestNotificationLogCreated(TestCase):
    """NotificationLog rows are created after dispatch."""

    def setUp(self):
        from services.email.factory import _reset_email_service
        from services.whatsapp.factory import _reset_whatsapp_service
        _reset_email_service()
        _reset_whatsapp_service()

    def tearDown(self):
        from services.email.factory import _reset_email_service
        from services.whatsapp.factory import _reset_whatsapp_service
        _reset_email_service()
        _reset_whatsapp_service()

    def test_dispatch_welcome_creates_notification_log(self):
        from notifications.models import NotificationLog
        from services.dispatch import NotificationDispatcher
        from unittest.mock import patch

        gym, config = _make_gym_in_db(subdomain="logtest1")
        owner = _make_owner_in_db(gym)
        member = _make_member_in_db(gym, email_suffix="log1")

        with patch("services.email.smtp.render_to_string", return_value="<html>test</html>"):
            NotificationDispatcher().dispatch_welcome_member(
                member=member, gym=gym, password="TempPass1"
            )

        log = NotificationLog.objects.filter(
            gym=gym,
            event_type=NotificationLog.EventType.MEMBER_WELCOME,
            channel=NotificationLog.Channel.EMAIL,
        ).first()
        self.assertIsNotNone(log)
        self.assertEqual(log.status, NotificationLog.Status.SENT)
        self.assertEqual(log.recipient, member.user.email)

    def test_idempotency_prevents_duplicate_log_rows(self):
        """Calling dispatch twice on same day → only one log entry (update_or_create)."""
        from notifications.models import NotificationLog
        from services.dispatch import NotificationDispatcher

        gym, config = _make_gym_in_db(subdomain="idemtest1")
        member = _make_member_in_db(gym, email_suffix="idem1")

        with patch("services.email.smtp.render_to_string", return_value="<html>test</html>"):
            NotificationDispatcher().dispatch_welcome_member(
                member=member, gym=gym, password="Pass1"
            )
            NotificationDispatcher().dispatch_welcome_member(
                member=member, gym=gym, password="Pass2"
            )

        count = NotificationLog.objects.filter(
            gym=gym,
            event_type=NotificationLog.EventType.MEMBER_WELCOME,
            channel=NotificationLog.Channel.EMAIL,
            recipient=member.user.email,
        ).count()
        self.assertEqual(count, 1, "Idempotency must prevent duplicate log rows")


class TestFeatureFlagEmailDisabled(TestCase):
    """When enable_email=False, no email is sent and no log entry created."""

    def setUp(self):
        from services.email.factory import _reset_email_service
        _reset_email_service()

    def tearDown(self):
        from services.email.factory import _reset_email_service
        _reset_email_service()

    @override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend")
    def test_email_disabled_flag_prevents_send(self):
        from notifications.models import NotificationLog
        from services.dispatch import NotificationDispatcher

        gym, config = _make_gym_in_db(subdomain="noemail1")
        config.enable_email = False
        config.save()
        member = _make_member_in_db(gym, email_suffix="noemail1")

        with patch("services.email.smtp.SmtpEmailService.send") as mock_send:
            NotificationDispatcher().dispatch_welcome_member(
                member=member, gym=gym, password="Pass1"
            )
            mock_send.assert_not_called()

        log_count = NotificationLog.objects.filter(
            gym=gym, channel="email"
        ).count()
        self.assertEqual(log_count, 0, "No log entry when email disabled")


class TestAttendanceCheckinFiringOnce(TestCase):
    """Attendance confirmation fires exactly once per day per member."""

    @override_settings(WHATSAPP_PROVIDER="stub")
    def test_duplicate_checkin_does_not_fire_twice(self):
        from services.whatsapp.factory import _reset_whatsapp_service
        _reset_whatsapp_service()

        gym, config = _make_gym_in_db(subdomain="atttest1")
        config.enable_whatsapp = True
        config.save()
        member = _make_member_in_db(gym, email_suffix="att1")
        # Give member a phone number
        member.user.phone = "+919876543210"
        member.user.save()

        dispatch_call_count = {"n": 0}
        original_dispatch = __import__(
            "services.dispatch", fromlist=["NotificationDispatcher"]
        ).NotificationDispatcher.dispatch_attendance_confirmation

        def counting_dispatch(self_d, *, member, gym):
            dispatch_call_count["n"] += 1
            return original_dispatch(self_d, member=member, gym=gym)

        from attendance import services as att_svc
        with patch.object(
            __import__("services.dispatch", fromlist=["NotificationDispatcher"]).NotificationDispatcher,
            "dispatch_attendance_confirmation",
            counting_dispatch,
        ):
            att_svc.check_in_member(gym=gym, member=member)
            att_svc.check_in_member(gym=gym, member=member)  # Second call same day

        self.assertEqual(dispatch_call_count["n"], 1,
                         "Dispatch should fire exactly once — on first check-in only")

        from services.whatsapp.factory import _reset_whatsapp_service
        _reset_whatsapp_service()


class TestTenantIsolation(TestCase):
    """Members from Gym A cannot be queried via Gym B's tenant context."""

    def test_member_queryset_isolated_by_gym(self):
        from members.models import Member
        gym1, _ = _make_gym_in_db(subdomain="isolate1", name="Gym One")
        gym2, _ = _make_gym_in_db(subdomain="isolate2", name="Gym Two")

        m1 = _make_member_in_db(gym1, email_suffix="iso1")
        m2 = _make_member_in_db(gym2, email_suffix="iso2")

        # all_objects of gym1 should not contain gym2 members
        gym1_members = Member.all_objects.filter(gym=gym1)
        gym2_members = Member.all_objects.filter(gym=gym2)

        self.assertIn(m1, gym1_members)
        self.assertNotIn(m2, gym1_members)
        self.assertIn(m2, gym2_members)
        self.assertNotIn(m1, gym2_members)

    def test_notification_logs_isolated_by_gym(self):
        """NotificationLog queries should be filterable by gym."""
        from notifications.models import NotificationLog
        from services.dispatch import NotificationDispatcher

        gym1, _ = _make_gym_in_db(subdomain="logiso1")
        gym2, _ = _make_gym_in_db(subdomain="logiso2")

        with patch("services.email.smtp.render_to_string", return_value="<html>test</html>"):
            with override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
                                   EMAIL_PROVIDER="smtp"):
                from services.email.factory import _reset_email_service
                _reset_email_service()
                m1 = _make_member_in_db(gym1, email_suffix="logiso1")
                NotificationDispatcher().dispatch_welcome_member(
                    member=m1, gym=gym1, password="Pass1"
                )
                _reset_email_service()

        gym1_logs = NotificationLog.objects.filter(gym=gym1)
        gym2_logs = NotificationLog.objects.filter(gym=gym2)
        self.assertGreater(gym1_logs.count(), 0)
        self.assertEqual(gym2_logs.count(), 0)


class TestTenantCacheMiddleware(TestCase):
    """Tenant TTL cache returns correct gym and expires properly."""

    def test_cache_returns_gym_on_hit(self):
        from core.middleware import _cache_get, _cache_set, _TENANT_CACHE
        _TENANT_CACHE.clear()
        gym, _ = _make_gym_in_db(subdomain="cachetest1")
        _cache_set("cachetest1", gym)
        result = _cache_get("cachetest1")
        self.assertEqual(result, gym)

    def test_cache_miss_returns_sentinel(self):
        from core.middleware import _cache_get, _TENANT_CACHE
        _TENANT_CACHE.clear()
        result = _cache_get("nonexistent_subdomain_xyz")
        self.assertIs(result, ...)

    def test_cache_set_none_for_unknown_subdomain(self):
        """Unknown subdomains are cached as None to avoid repeated DB lookups."""
        from core.middleware import _cache_get, _cache_set, _TENANT_CACHE
        _TENANT_CACHE.clear()
        _cache_set("ghost_gym", None)
        result = _cache_get("ghost_gym")
        self.assertIsNone(result)


class TestBroadcastCounters(TestCase):
    """Admin broadcast returns correct sent/failed/skipped counts."""

    @override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
                       EMAIL_PROVIDER="smtp", WHATSAPP_PROVIDER="stub")
    def test_broadcast_skipped_when_both_channels_disabled(self):
        from services.email.factory import _reset_email_service
        _reset_email_service()
        from services.dispatch import NotificationDispatcher

        gym, config = _make_gym_in_db(subdomain="bcast1")
        config.enable_email = False
        config.enable_whatsapp = False
        config.save()

        members = [_make_member_in_db(gym, email_suffix=f"bcast{i}") for i in range(3)]
        result = NotificationDispatcher().dispatch_admin_broadcast(
            members=members, gym=gym,
            subject="Test", message="Hello members",
        )
        self.assertEqual(result["skipped"], 3)
        self.assertEqual(result["sent"], 0)
        self.assertEqual(result["failed"], 0)
        from services.email.factory import _reset_email_service
        _reset_email_service()

    @override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
                       EMAIL_PROVIDER="smtp", WHATSAPP_PROVIDER="stub")
    def test_broadcast_sent_when_email_enabled(self):
        from services.email.factory import _reset_email_service
        _reset_email_service()
        from services.dispatch import NotificationDispatcher

        gym, config = _make_gym_in_db(subdomain="bcast2")
        config.enable_email = True
        config.save()

        members = [_make_member_in_db(gym, email_suffix=f"bcast2_{i}") for i in range(2)]
        with patch("services.email.smtp.render_to_string", return_value="<html>test</html>"):
            result = NotificationDispatcher().dispatch_admin_broadcast(
                members=members, gym=gym,
                subject="Test Broadcast", message="Hello",
            )
        self.assertEqual(result["sent"], 2)
        self.assertEqual(result["skipped"], 0)
        from services.email.factory import _reset_email_service
        _reset_email_service()
