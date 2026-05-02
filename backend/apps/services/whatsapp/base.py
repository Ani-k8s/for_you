"""
services/whatsapp/base.py
=========================
Abstract base class for all WhatsApp service providers.

Design:
- Provider config is GLOBAL (env vars) — not per-tenant.
  Reason: Twilio does not support per-tenant "from" numbers without
  creating separate sub-accounts, which adds billing complexity.
- Per-tenant control: enable/disable via GymFeatureConfig.enable_whatsapp.
- Message templates are defined in code — future providers can use
  registered templates (Meta WhatsApp Business API requires pre-approved templates).
"""

from __future__ import annotations

import logging
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any

logger = logging.getLogger(__name__)


@dataclass
class WhatsAppMessage:
    """
    Value object for an outgoing WhatsApp message.
    """
    to_number: str                       # E.164 format: +919876543210
    template_name: str                   # Logical template name (not provider-specific)
    variables: dict[str, Any]           # Template variable substitutions
    gym_name: str = ""                   # For logging/audit


@dataclass
class WhatsAppResult:
    """
    Value object returned by send().
    Never raises — callers must check success flag.
    """
    success: bool
    provider: str
    to_number: str
    template_name: str
    error: str | None = None
    message_sid: str | None = None      # Provider-specific message SID


class WhatsAppServiceBase(ABC):
    """
    Abstract WhatsApp service interface.
    All concrete providers must implement send().
    """

    @property
    @abstractmethod
    def provider_name(self) -> str:
        """Human-readable provider name for logging."""
        ...

    @abstractmethod
    def send(self, message: WhatsAppMessage) -> WhatsAppResult:
        """
        Send a single WhatsApp message.

        Must:
        - Never raise to the caller.
        - Always return a WhatsAppResult.
        - Log errors internally.
        """
        ...

    def format_message(self, template_name: str, variables: dict[str, Any]) -> str:
        """
        Render a message template with provided variables.
        Templates are defined in MESSAGE_TEMPLATES dict below.
        """
        template = MESSAGE_TEMPLATES.get(template_name, "")
        if not template:
            logger.warning(
                "[WhatsApp] Unknown template: %s. Using fallback.", template_name
            )
            template = variables.get("fallback", "")
        try:
            return template.format(**variables)
        except KeyError as exc:
            logger.error(
                "[WhatsApp] Template variable missing: %s | template=%s", exc, template_name
            )
            return template


# ---------------------------------------------------------------------------
# Message templates — all in one place, easy to maintain / translate
# ---------------------------------------------------------------------------

MESSAGE_TEMPLATES: dict[str, str] = {
    "member_welcome": (
        "🏋️ Welcome to {gym_name}, {member_name}!\n\n"
        "Your membership is now active.\n"
        "🌐 Portal: {gym_url}\n"
        "📧 Email: {email}\n"
        "🔑 Password: {password}\n\n"
        "Please change your password after first login. 💪"
    ),
    "owner_welcome": (
        "🎉 Congratulations, {owner_name}!\n\n"
        "Your gym *{gym_name}* is now live on ForYou SaaS.\n"
        "🌐 Portal: {gym_url}\n"
        "📧 Email: {email}\n"
        "🔑 Password: {password}\n\n"
        "Log in and configure your gym features to get started!"
    ),
    "expiry_reminder": (
        "⚠️ Membership Expiry Reminder — *{gym_name}*\n\n"
        "Hi {member_name}, your membership expires on *{end_date}* "
        "({days_left} day(s) remaining).\n\n"
        "Please renew to keep your fitness journey going! 💪\n"
        "🌐 {gym_url}"
    ),
    "attendance_confirmation": (
        "✅ Check-in confirmed at *{gym_name}*!\n"
        "Hi {member_name}, you've been checked in at {check_in_time}.\n"
        "Have a great workout! 🏋️"
    ),
    "admin_broadcast": (
        "📢 *{gym_name}*\n\n"
        "{message}"
    ),
}
