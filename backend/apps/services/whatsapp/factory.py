"""
services/whatsapp/factory.py
============================
WhatsApp service factory.

Selection logic:
1. WHATSAPP_PROVIDER env var = "twilio" → TwilioWhatsAppService
2. WHATSAPP_PROVIDER env var = "stub"   → StubWhatsAppService
3. Twilio credentials missing           → StubWhatsAppService (with warning)
4. Default (no env var)                 → StubWhatsAppService

Adding a new provider (e.g., Meta Cloud API):
    1. Create services/whatsapp/meta.py
    2. Subclass WhatsAppServiceBase
    3. Add elif block below
    4. Done
"""

from __future__ import annotations

import logging

from django.conf import settings

from services.whatsapp.base import WhatsAppServiceBase

logger = logging.getLogger(__name__)

_service_instance: WhatsAppServiceBase | None = None


def get_whatsapp_service() -> WhatsAppServiceBase:
    """
    Return the configured WhatsApp service instance (singleton).
    Falls back to StubWhatsAppService if provider is not configured.
    """
    global _service_instance
    if _service_instance is not None:
        return _service_instance

    provider = getattr(settings, "WHATSAPP_PROVIDER", "stub").lower().strip()

    if provider == "twilio":
        try:
            from services.whatsapp.twilio import TwilioWhatsAppService
            instance = TwilioWhatsAppService()
            logger.info("[WhatsAppFactory] Using Twilio provider")
        except (ValueError, RuntimeError) as exc:
            logger.warning(
                "[WhatsAppFactory] Twilio init failed (%s). Falling back to stub.", exc
            )
            from services.whatsapp.stub import StubWhatsAppService
            instance = StubWhatsAppService()

    # Future providers — add elif blocks here
    # elif provider == "meta":
    #     from services.whatsapp.meta import MetaWhatsAppService
    #     instance = MetaWhatsAppService()

    else:
        if provider != "stub":
            logger.warning(
                "[WhatsAppFactory] Unknown WHATSAPP_PROVIDER='%s'. Using stub.", provider
            )
        from services.whatsapp.stub import StubWhatsAppService
        instance = StubWhatsAppService()

    _service_instance = instance
    return _service_instance


def _reset_whatsapp_service() -> None:
    """Test utility: reset cached singleton."""
    global _service_instance
    _service_instance = None
