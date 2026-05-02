"""
services/email/factory.py
=========================
Email service factory — returns the correct provider based on EMAIL_PROVIDER env var.

Usage:
    from services.email.factory import get_email_service
    service = get_email_service()
    result = service.send(EmailMessage(...))

Adding a new provider:
    1. Create services/email/your_provider.py
    2. Add an elif branch here
    3. Done — zero changes to business logic
"""

from __future__ import annotations

import logging
from functools import lru_cache

from django.conf import settings

from services.email.base import EmailServiceBase

logger = logging.getLogger(__name__)

# Sentinel — module-level singleton, reset by tests via _reset_email_service()
_service_instance: EmailServiceBase | None = None


def get_email_service() -> EmailServiceBase:
    """
    Return the configured email service instance.

    Provider selection (priority order):
    1. EMAIL_PROVIDER env var (smtp | sendgrid | ses | console)
    2. If DEBUG=True and no provider set → console (no actual sending)
    3. Default → smtp
    """
    global _service_instance
    if _service_instance is not None:
        return _service_instance

    provider = getattr(settings, "EMAIL_PROVIDER", "smtp").lower().strip()

    if provider == "console" or (getattr(settings, "DEBUG", False) and provider == "smtp" and _is_console_backend()):
        from services.email.smtp import SmtpEmailService
        # Console backend is configured in settings — SmtpEmailService will use it transparently
        instance = SmtpEmailService()
        logger.info("[EmailFactory] Using SMTP provider (console backend active in DEBUG)")

    elif provider == "smtp":
        from services.email.smtp import SmtpEmailService
        instance = SmtpEmailService()
        logger.info("[EmailFactory] Using SMTP provider")

    # Future providers — add elif blocks here without touching any other file
    # elif provider == "sendgrid":
    #     from services.email.sendgrid import SendGridEmailService
    #     instance = SendGridEmailService()

    # elif provider == "ses":
    #     from services.email.ses import SESEmailService
    #     instance = SESEmailService()

    else:
        logger.warning(
            "[EmailFactory] Unknown EMAIL_PROVIDER='%s'. Falling back to SMTP.", provider
        )
        from services.email.smtp import SmtpEmailService
        instance = SmtpEmailService()

    _service_instance = instance
    return _service_instance


def _is_console_backend() -> bool:
    """Check if Django's console email backend is active."""
    backend = getattr(settings, "EMAIL_BACKEND", "")
    return "console" in backend.lower()


def _reset_email_service() -> None:
    """Test utility: reset the cached singleton so tests can inject different providers."""
    global _service_instance
    _service_instance = None
