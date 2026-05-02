"""
services/email/base.py
======================
Abstract base class for all email service providers.

Design principles:
- All providers implement the same interface.
- Business logic (dispatch.py) calls only this interface.
- Swapping providers (SMTP → SendGrid → SES) requires zero changes to business logic.

Adding a new provider:
    1. Create services/email/your_provider.py
    2. Subclass EmailServiceBase
    3. Implement send()
    4. Register in factory.py
"""

from __future__ import annotations

import logging
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any

logger = logging.getLogger(__name__)


@dataclass
class EmailMessage:
    """
    Value object representing an outgoing email.
    Immutable after construction.
    """
    subject: str
    template_name: str                    # e.g. "emails/member_welcome.html"
    context: dict[str, Any]              # Template rendering context
    to_email: str
    from_email: str | None = None        # Falls back to settings.DEFAULT_FROM_EMAIL
    reply_to: str | None = None
    tags: list[str] = field(default_factory=list)   # For future provider tagging (SendGrid categories etc.)


@dataclass
class EmailResult:
    """
    Value object returned by send().
    Never raises — callers must check success flag.
    """
    success: bool
    provider: str
    to_email: str
    subject: str
    error: str | None = None
    message_id: str | None = None        # Provider-specific message ID for tracking


class EmailServiceBase(ABC):
    """
    Abstract email service interface.
    All concrete providers must implement send().
    """

    @property
    @abstractmethod
    def provider_name(self) -> str:
        """Human-readable provider name for logging."""
        ...

    @abstractmethod
    def send(self, message: EmailMessage) -> EmailResult:
        """
        Send a single email.

        Must:
        - Never raise an exception to the caller.
        - Always return an EmailResult.
        - Log errors internally.
        - Implement retry if appropriate.
        """
        ...

    def send_bulk(self, messages: list[EmailMessage]) -> list[EmailResult]:
        """
        Send multiple emails.
        Default implementation: sequential. Override for batch provider support.
        """
        return [self.send(msg) for msg in messages]
