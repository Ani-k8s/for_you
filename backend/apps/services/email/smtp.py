"""
services/email/smtp.py
======================
SMTP email provider using Django's built-in mail backend.

Features:
- Template-based rendering (no inline HTML)
- Retry with exponential backoff (max 3 attempts)
- Structured logging (provider, subject, recipient, attempt)
- Never raises — returns EmailResult with error details

The Django EMAIL_* settings control the SMTP transport.
Switch to console backend in development:
    EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend
"""

from __future__ import annotations

import logging
import time
from typing import TYPE_CHECKING

from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.utils.html import strip_tags

from services.email.base import EmailMessage, EmailResult, EmailServiceBase

if TYPE_CHECKING:
    pass

logger = logging.getLogger(__name__)

# Retry configuration — no Celery needed.
MAX_RETRIES = 3
RETRY_BACKOFF_BASE = 1.5   # seconds: 1.5, 2.25, 3.375


class SmtpEmailService(EmailServiceBase):
    """
    Production SMTP email provider.
    Reads configuration from Django settings (EMAIL_HOST, EMAIL_PORT, etc.)
    """

    @property
    def provider_name(self) -> str:
        return "smtp"

    def send(self, message: EmailMessage) -> EmailResult:
        from_email = message.from_email or settings.DEFAULT_FROM_EMAIL

        # Step 1: Render template to HTML + plain text
        try:
            html_body = render_to_string(message.template_name, message.context)
            text_body = strip_tags(html_body)
        except Exception as exc:
            logger.error(
                "[SMTP] Template rendering failed | template=%s | error=%s",
                message.template_name, exc,
            )
            return EmailResult(
                success=False,
                provider=self.provider_name,
                to_email=message.to_email,
                subject=message.subject,
                error=f"Template error: {exc}",
            )

        # Step 2: Attempt send with retry
        last_error: str | None = None
        for attempt in range(1, MAX_RETRIES + 1):
            try:
                msg = EmailMultiAlternatives(
                    subject=message.subject,
                    body=text_body,
                    from_email=from_email,
                    to=[message.to_email],
                    reply_to=[message.reply_to] if message.reply_to else None,
                )
                msg.attach_alternative(html_body, "text/html")
                msg.send(fail_silently=False)

                logger.info(
                    "[SMTP] Email sent | to=%s | subject=%s | attempt=%d",
                    message.to_email, message.subject, attempt,
                )
                return EmailResult(
                    success=True,
                    provider=self.provider_name,
                    to_email=message.to_email,
                    subject=message.subject,
                )

            except Exception as exc:
                last_error = str(exc)
                wait = RETRY_BACKOFF_BASE ** attempt
                logger.warning(
                    "[SMTP] Send failed | to=%s | attempt=%d/%d | wait=%.1fs | error=%s",
                    message.to_email, attempt, MAX_RETRIES, wait, exc,
                )
                if attempt < MAX_RETRIES:
                    time.sleep(wait)

        # All retries exhausted
        logger.error(
            "[SMTP] All retries failed | to=%s | subject=%s | error=%s",
            message.to_email, message.subject, last_error,
        )
        return EmailResult(
            success=False,
            provider=self.provider_name,
            to_email=message.to_email,
            subject=message.subject,
            error=last_error,
        )
