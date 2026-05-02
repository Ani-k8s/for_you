"""
tests/test_whatsapp_service.py
===============================
Unit tests for the WhatsApp service layer.

Tests:
- StubWhatsAppService always returns success=True
- TwilioWhatsAppService.send() with mocked Twilio client
- TwilioWhatsAppService retry logic on failure
- Factory returns stub when provider=stub
- Factory falls back to stub when Twilio credentials missing
- Message template formatting
"""

from unittest.mock import MagicMock, patch
from django.test import TestCase, override_settings

from services.whatsapp.base import WhatsAppMessage, WhatsAppResult, MESSAGE_TEMPLATES
from services.whatsapp.stub import StubWhatsAppService
from services.whatsapp.factory import get_whatsapp_service, _reset_whatsapp_service


SAMPLE_WA_MESSAGE = WhatsAppMessage(
    to_number="+919876543210",
    template_name="member_welcome",
    variables={
        "gym_name": "Test Gym",
        "gym_url": "http://test.localhost",
        "member_name": "Test Member",
        "email": "member@test.com",
        "password": "temp123",
    },
    gym_name="Test Gym",
)


class TestStubWhatsAppService(TestCase):
    """Stub service always succeeds — tests it doesn't raise and returns correct type."""

    def test_stub_send_returns_success_result(self):
        service = StubWhatsAppService()
        result = service.send(SAMPLE_WA_MESSAGE)

        self.assertIsInstance(result, WhatsAppResult)
        self.assertTrue(result.success)
        self.assertEqual(result.provider, "stub")
        self.assertEqual(result.to_number, "+919876543210")

    def test_stub_send_never_raises(self):
        """Even with bad data, stub never raises."""
        service = StubWhatsAppService()
        bad_msg = WhatsAppMessage(
            to_number="",
            template_name="nonexistent_template",
            variables={},
        )
        try:
            result = service.send(bad_msg)
            self.assertIsInstance(result, WhatsAppResult)
        except Exception as e:
            self.fail(f"StubWhatsAppService.send() raised unexpectedly: {e}")


class TestWhatsAppMessageTemplates(TestCase):
    """Test template formatting logic."""

    def test_member_welcome_template_formats_correctly(self):
        service = StubWhatsAppService()
        body = service.format_message("member_welcome", {
            "gym_name": "FitZone",
            "gym_url": "http://fitzone.localhost",
            "member_name": "Ravi",
            "email": "ravi@test.com",
            "password": "temp123",
        })
        self.assertIn("FitZone", body)
        self.assertIn("Ravi", body)
        self.assertIn("http://fitzone.localhost", body)

    def test_expiry_reminder_template_formats_correctly(self):
        service = StubWhatsAppService()
        body = service.format_message("expiry_reminder", {
            "gym_name": "FitZone",
            "gym_url": "http://fitzone.localhost",
            "member_name": "Ravi",
            "days_left": 3,
            "end_date": "2026-05-30",
        })
        self.assertIn("3", body)
        self.assertIn("2026-05-30", body)

    def test_unknown_template_returns_fallback(self):
        """Unknown template name → returns empty string or fallback, no exception."""
        service = StubWhatsAppService()
        body = service.format_message("nonexistent_template", {"fallback": "Default msg"})
        self.assertEqual(body, "Default msg")

    def test_all_required_templates_exist(self):
        """All events in NotificationEvent that use WhatsApp have templates defined."""
        required = [
            "member_welcome",
            "owner_welcome",
            "expiry_reminder",
            "attendance_confirmation",
            "admin_broadcast",
        ]
        for tpl in required:
            self.assertIn(tpl, MESSAGE_TEMPLATES, f"Missing template: {tpl}")


class TestTwilioWhatsAppService(TestCase):
    """Unit tests for Twilio provider with mocked Twilio SDK."""

    def setUp(self):
        _reset_whatsapp_service()

    def tearDown(self):
        _reset_whatsapp_service()

    @override_settings(
        WHATSAPP_PROVIDER="twilio",
        TWILIO_ACCOUNT_SID="ACtest123",
        TWILIO_AUTH_TOKEN="auth_token_test",
        TWILIO_WHATSAPP_FROM="whatsapp:+14155238886",
    )
    @patch("services.whatsapp.twilio.TwilioWhatsAppService._get_client")
    def test_twilio_send_success(self, mock_get_client):
        """TwilioWhatsAppService.send() returns success result with SID."""
        mock_client = MagicMock()
        mock_message = MagicMock()
        mock_message.sid = "SMtest123456"
        mock_client.messages.create.return_value = mock_message
        mock_get_client.return_value = mock_client

        from services.whatsapp.twilio import TwilioWhatsAppService
        service = TwilioWhatsAppService()
        result = service.send(SAMPLE_WA_MESSAGE)

        self.assertTrue(result.success)
        self.assertEqual(result.message_sid, "SMtest123456")
        self.assertEqual(result.provider, "twilio")

    @override_settings(
        WHATSAPP_PROVIDER="twilio",
        TWILIO_ACCOUNT_SID="ACtest123",
        TWILIO_AUTH_TOKEN="auth_token_test",
        TWILIO_WHATSAPP_FROM="whatsapp:+14155238886",
    )
    @patch("services.whatsapp.twilio.TwilioWhatsAppService._get_client")
    @patch("services.whatsapp.twilio.time.sleep")
    def test_twilio_retries_on_failure(self, mock_sleep, mock_get_client):
        """TwilioWhatsAppService retries on transient errors."""
        mock_client = MagicMock()
        mock_client.messages.create.side_effect = Exception("Network error")
        mock_get_client.return_value = mock_client

        from services.whatsapp.twilio import TwilioWhatsAppService
        service = TwilioWhatsAppService()
        result = service.send(SAMPLE_WA_MESSAGE)

        self.assertFalse(result.success)
        self.assertEqual(mock_client.messages.create.call_count, 3)  # MAX_RETRIES
        self.assertEqual(mock_sleep.call_count, 2)

    @override_settings(
        WHATSAPP_PROVIDER="twilio",
        TWILIO_ACCOUNT_SID="",  # Missing credentials
        TWILIO_AUTH_TOKEN="",
        TWILIO_WHATSAPP_FROM="",
    )
    def test_twilio_init_fails_without_credentials(self):
        """TwilioWhatsAppService raises ValueError when credentials are missing."""
        from services.whatsapp.twilio import TwilioWhatsAppService
        with self.assertRaises(ValueError):
            TwilioWhatsAppService()


class TestWhatsAppFactory(TestCase):
    """Tests for WhatsApp service factory behavior."""

    def setUp(self):
        _reset_whatsapp_service()

    def tearDown(self):
        _reset_whatsapp_service()

    @override_settings(WHATSAPP_PROVIDER="stub")
    def test_factory_returns_stub_when_configured(self):
        service = get_whatsapp_service()
        self.assertEqual(service.provider_name, "stub")

    @override_settings(WHATSAPP_PROVIDER="unknown_provider")
    def test_factory_falls_back_to_stub_on_unknown_provider(self):
        service = get_whatsapp_service()
        self.assertEqual(service.provider_name, "stub")

    @override_settings(
        WHATSAPP_PROVIDER="twilio",
        TWILIO_ACCOUNT_SID="",
        TWILIO_AUTH_TOKEN="",
        TWILIO_WHATSAPP_FROM="",
    )
    def test_factory_falls_back_to_stub_when_twilio_misconfigured(self):
        """When Twilio credentials are missing, factory falls back to stub gracefully."""
        service = get_whatsapp_service()
        self.assertEqual(service.provider_name, "stub")
