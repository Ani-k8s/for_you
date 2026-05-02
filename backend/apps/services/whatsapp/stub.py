"""
services/whatsapp/stub.py
=========================
No-op / console WhatsApp provider.

Used when:
- WHATSAPP_PROVIDER=stub (explicitly)
- Twilio credentials are not configured
- Running tests
- Development environments

Logs to console only — no external calls, no charges.
"""

from __future__ import annotations

import logging

from services.whatsapp.base import WhatsAppMessage, WhatsAppResult, WhatsAppServiceBase

logger = logging.getLogger(__name__)


class StubWhatsAppService(WhatsAppServiceBase):
    """
    Console/no-op WhatsApp provider.
    Prints messages to the logger instead of sending them.
    """

    @property
    def provider_name(self) -> str:
        return "stub"

    def send(self, message: WhatsAppMessage) -> WhatsAppResult:
        body = self.format_message(message.template_name, message.variables)
        logger.info(
            "[WhatsApp:STUB] Would send to %s | template=%s | body=\n%s",
            message.to_number,
            message.template_name,
            body,
        )
        # Return success so dispatch logic doesn't log spurious errors
        return WhatsAppResult(
            success=True,
            provider=self.provider_name,
            to_number=message.to_number,
            template_name=message.template_name,
            message_sid="stub-" + message.to_number[-4:],
        )
