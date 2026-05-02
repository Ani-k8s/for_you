"""
services/whatsapp/twilio.py
===========================
Twilio WhatsApp provider.

Configuration (all global — NOT per-tenant):
    TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
    TWILIO_AUTH_TOKEN=your_auth_token
    TWILIO_WHATSAPP_FROM=whatsapp:+14155238886

NOTE ON PER-TENANT "FROM" NUMBERS:
    Twilio does not natively support multiple "from" WhatsApp numbers on a single
    account unless you purchase a separate WhatsApp Business API number per tenant,
    which requires separate Twilio sub-accounts and billing setups.
    For this platform, the "from" number is platform-level.
    Per-tenant control is done ONLY via GymFeatureConfig.enable_whatsapp toggle.

Features:
- Retry with exponential backoff (max 3 attempts)
- Structured logging with Twilio SID
- Never raises to callers
"""

from __future__ import annotations

import logging
import time
from typing import TYPE_CHECKING

from django.conf import settings

from services.whatsapp.base import WhatsAppMessage, WhatsAppResult, WhatsAppServiceBase

if TYPE_CHECKING:
    pass

logger = logging.getLogger(__name__)

MAX_RETRIES = 3
RETRY_BACKOFF_BASE = 2.0  # seconds: 2, 4, 8


class TwilioWhatsAppService(WhatsAppServiceBase):
    """
    Production WhatsApp provider using Twilio Messaging API.
    Requires: pip install twilio
    """

    def __init__(self) -> None:
        self._account_sid: str = getattr(settings, "TWILIO_ACCOUNT_SID", "")
        self._auth_token: str = getattr(settings, "TWILIO_AUTH_TOKEN", "")
        self._from_number: str = getattr(settings, "TWILIO_WHATSAPP_FROM", "")

        if not all([self._account_sid, self._auth_token, self._from_number]):
            raise ValueError(
                "Twilio credentials incomplete. Set TWILIO_ACCOUNT_SID, "
                "TWILIO_AUTH_TOKEN, and TWILIO_WHATSAPP_FROM in your environment."
            )

    @property
    def provider_name(self) -> str:
        return "twilio"

    def _get_client(self):
        """Lazy-import Twilio client — avoids import error if package not installed."""
        try:
            from twilio.rest import Client
            return Client(self._account_sid, self._auth_token)
        except ImportError as exc:
            raise RuntimeError(
                "twilio package is required for WhatsApp. "
                "Install with: pip install twilio"
            ) from exc

    def send(self, message: WhatsAppMessage) -> WhatsAppResult:
        body = self.format_message(message.template_name, message.variables)
        to_number = f"whatsapp:{message.to_number}" if not message.to_number.startswith("whatsapp:") else message.to_number

        last_error: str | None = None
        for attempt in range(1, MAX_RETRIES + 1):
            try:
                client = self._get_client()
                twilio_msg = client.messages.create(
                    body=body,
                    from_=self._from_number,
                    to=to_number,
                )

                logger.info(
                    "[Twilio] WhatsApp sent | to=%s | template=%s | sid=%s | attempt=%d",
                    message.to_number, message.template_name, twilio_msg.sid, attempt,
                )
                return WhatsAppResult(
                    success=True,
                    provider=self.provider_name,
                    to_number=message.to_number,
                    template_name=message.template_name,
                    message_sid=twilio_msg.sid,
                )

            except Exception as exc:
                last_error = str(exc)
                wait = RETRY_BACKOFF_BASE ** attempt
                logger.warning(
                    "[Twilio] Send failed | to=%s | attempt=%d/%d | wait=%.1fs | error=%s",
                    message.to_number, attempt, MAX_RETRIES, wait, exc,
                )
                if attempt < MAX_RETRIES:
                    time.sleep(wait)

        logger.error(
            "[Twilio] All retries failed | to=%s | template=%s | error=%s",
            message.to_number, message.template_name, last_error,
        )
        return WhatsAppResult(
            success=False,
            provider=self.provider_name,
            to_number=message.to_number,
            template_name=message.template_name,
            error=last_error,
        )
