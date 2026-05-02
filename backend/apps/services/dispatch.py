"""
services/dispatch.py
====================
NotificationDispatcher — Central notification orchestration layer.

ARCHITECTURE:
    Business logic (views, serializers, management commands)
        → calls dispatcher.dispatch_*()
        → dispatcher checks feature flags (GymFeatureConfig)
        → dispatcher checks idempotency (NotificationLog)
        → dispatcher calls email/whatsapp services
        → dispatcher writes NotificationLog
        → returns result (never raises)

DESIGN DECISIONS:
    1. SYNCHRONOUS — no Celery. Max 3 retries via provider.
       To add async: wrap calls with @shared_task — zero business logic change.

    2. IDEMPOTENT — SHA-256 key prevents duplicate sends on retries/re-runs.

    3. NEVER RAISES — all exceptions caught. Failed sends are logged, not re-raised.
       A notification failure must NEVER break a primary business flow (member creation,
       attendance, etc.).

    4. FEATURE-FLAG AWARE — checks GymFeatureConfig.enable_email / enable_whatsapp
       before sending. Respects per-tenant choices.

    5. NO CIRCULAR IMPORTS — imports models inside methods, not at module level.
"""

from __future__ import annotations

import hashlib
import logging
from datetime import date
from typing import TYPE_CHECKING, Any

from django.conf import settings
from django.utils import timezone

from services.events import NotificationChannel, NotificationEvent, NotificationStatus
from services.email.base import EmailMessage
from services.email.factory import get_email_service
from services.whatsapp.base import WhatsAppMessage
from services.whatsapp.factory import get_whatsapp_service

if TYPE_CHECKING:
    from gyms.models import Gym, GymFeatureConfig
    from members.models import Member

logger = logging.getLogger(__name__)

# Rate-limit safety net for admin broadcasts (soft limit — not a hard throttle)
_MAX_BROADCAST_BATCH_SIZE = 100


class NotificationDispatcher:
    """
    Central dispatcher for all outbound notifications.
    Instantiate once per request or command run.
    """

    # -----------------------------------------------------------------------
    # Public dispatch methods
    # -----------------------------------------------------------------------

    def dispatch_welcome_member(
        self,
        *,
        member: "Member",
        gym: "Gym",
        password: str,
    ) -> None:
        """Send welcome credentials to a new member via enabled channels."""
        config = self._get_config(gym)
        if config is None:
            return

        context = {
            "gym_name": gym.name,
            "gym_url": self._gym_url(gym),
            "member_name": member.user.first_name or member.user.email,
            "email": member.user.email,
            "password": password,
            "primary_color": gym.primary_color or "#22c55e",
            "logo_url": self._logo_url(gym),
        }
        variables = {
            "gym_name": gym.name,
            "gym_url": self._gym_url(gym),
            "member_name": member.user.first_name or member.user.email,
            "email": member.user.email,
            "password": password,
        }

        self._send_email_if_enabled(
            config=config,
            gym=gym,
            member=member,
            event=NotificationEvent.MEMBER_WELCOME,
            subject=f"Welcome to {gym.name} — Your Login Details",
            template="emails/member_welcome.html",
            context=context,
            recipient=member.user.email,
        )

        phone = getattr(member.user, "phone", None)
        if phone:
            self._send_whatsapp_if_enabled(
                config=config,
                gym=gym,
                member=member,
                event=NotificationEvent.MEMBER_WELCOME,
                template_name="member_welcome",
                variables=variables,
                to_number=phone,
            )

    def dispatch_gym_owner_welcome(
        self,
        *,
        owner,    # User instance
        gym: "Gym",
        password: str,
    ) -> None:
        """Send welcome credentials to a new gym owner."""
        config = self._get_config(gym)
        if config is None:
            # Always send owner welcome even without config (new gym)
            # Use platform defaults
            context = {
                "gym_name": gym.name,
                "gym_url": self._gym_url(gym),
                "owner_name": owner.first_name or owner.email,
                "email": owner.email,
                "password": password,
                "primary_color": "#22c55e",
                "logo_url": None,
            }
            self._fire_email(
                gym=gym,
                member=None,
                event=NotificationEvent.OWNER_WELCOME,
                subject=f"🎉 Your gym '{gym.name}' is ready on ForYou Gym SaaS",
                template="emails/owner_welcome.html",
                context=context,
                recipient=owner.email,
            )
            return

        context = {
            "gym_name": gym.name,
            "gym_url": self._gym_url(gym),
            "owner_name": owner.first_name or owner.email,
            "email": owner.email,
            "password": password,
            "primary_color": gym.primary_color or "#22c55e",
            "logo_url": self._logo_url(gym),
        }

        self._send_email_if_enabled(
            config=config,
            gym=gym,
            member=None,
            event=NotificationEvent.OWNER_WELCOME,
            subject=f"🎉 Your gym '{gym.name}' is ready on ForYou Gym SaaS",
            template="emails/owner_welcome.html",
            context=context,
            recipient=owner.email,
        )

    def dispatch_expiry_reminder(
        self,
        *,
        member: "Member",
        gym: "Gym",
        days_left: int,
    ) -> None:
        """Send membership expiry reminder via enabled channels."""
        config = self._get_config(gym)
        if config is None:
            return

        end_date = member.end_date or "N/A"
        urgency = "critical" if days_left <= 1 else "warning" if days_left <= 3 else "info"
        urgency_color = "#dc2626" if days_left <= 1 else "#f97316" if days_left <= 3 else "#eab308"

        context = {
            "gym_name": gym.name,
            "gym_url": self._gym_url(gym),
            "member_name": member.user.first_name or "Valued Member",
            "days_left": days_left,
            "end_date": end_date,
            "urgency": urgency,
            "urgency_color": urgency_color,
            "primary_color": gym.primary_color or "#22c55e",
            "logo_url": self._logo_url(gym),
        }
        variables = {
            "gym_name": gym.name,
            "gym_url": self._gym_url(gym),
            "member_name": member.user.first_name or "Valued Member",
            "days_left": days_left,
            "end_date": str(end_date),
        }

        self._send_email_if_enabled(
            config=config,
            gym=gym,
            member=member,
            event=NotificationEvent.EXPIRY_REMINDER,
            subject=f"⚠️ Your {gym.name} membership expires in {days_left} day(s)",
            template="emails/expiry_reminder.html",
            context=context,
            recipient=member.user.email,
        )

        phone = getattr(member.user, "phone", None)
        if phone:
            self._send_whatsapp_if_enabled(
                config=config,
                gym=gym,
                member=member,
                event=NotificationEvent.EXPIRY_REMINDER,
                template_name="expiry_reminder",
                variables=variables,
                to_number=phone,
            )

    def dispatch_attendance_confirmation(
        self,
        *,
        member: "Member",
        gym: "Gym",
    ) -> None:
        """Send check-in confirmation via WhatsApp (if enabled)."""
        config = self._get_config(gym)
        if config is None:
            return

        # Attendance confirmation is WhatsApp-only (not email — too spammy)
        phone = getattr(member.user, "phone", None)
        if not phone:
            return

        check_in_time = timezone.localtime(timezone.now()).strftime("%H:%M")
        variables = {
            "gym_name": gym.name,
            "member_name": member.user.first_name or member.user.email,
            "check_in_time": check_in_time,
        }

        self._send_whatsapp_if_enabled(
            config=config,
            gym=gym,
            member=member,
            event=NotificationEvent.ATTENDANCE_CONFIRMATION,
            template_name="attendance_confirmation",
            variables=variables,
            to_number=phone,
        )

    def dispatch_admin_broadcast(
        self,
        *,
        members: list["Member"],
        gym: "Gym",
        subject: str,
        message: str,
    ) -> dict[str, int]:
        """
        Broadcast a message to a list of members.
        Returns summary: {'sent': N, 'failed': M, 'skipped': K}
        
        Rate safety: processes in batches of _MAX_BROADCAST_BATCH_SIZE.
        """
        config = self._get_config(gym)
        if config is None:
            return {"sent": 0, "failed": 0, "skipped": len(members)}

        summary = {"sent": 0, "failed": 0, "skipped": 0}

        for i, member in enumerate(members):
            if i > 0 and i % _MAX_BROADCAST_BATCH_SIZE == 0:
                logger.info(
                    "[Dispatch] Broadcast batch checkpoint | gym=%s | processed=%d",
                    gym.subdomain, i,
                )

            context = {
                "gym_name": gym.name,
                "gym_url": self._gym_url(gym),
                "member_name": member.user.first_name or member.user.email,
                "subject": subject,
                "message": message,
                "primary_color": gym.primary_color or "#22c55e",
                "logo_url": self._logo_url(gym),
            }
            variables = {"gym_name": gym.name, "message": message}

            email_attempted = False
            email_sent = False
            if config.enable_email:
                email_attempted = True
                email_sent = self._fire_email(
                    gym=gym,
                    member=member,
                    event=NotificationEvent.ADMIN_BROADCAST,
                    subject=subject,
                    template="emails/generic_notification.html",
                    context=context,
                    recipient=member.user.email,
                )

            phone = getattr(member.user, "phone", None)
            wa_attempted = False
            wa_sent = False
            if config.enable_whatsapp and phone:
                wa_attempted = True
                wa_sent = self._fire_whatsapp(
                    gym=gym,
                    member=member,
                    event=NotificationEvent.ADMIN_BROADCAST,
                    template_name="admin_broadcast",
                    variables=variables,
                    to_number=phone,
                )

            if not email_attempted and not wa_attempted:
                # Both channels disabled for this gym
                summary["skipped"] += 1
            elif email_sent or wa_sent:
                summary["sent"] += 1
            else:
                summary["failed"] += 1

        return summary

    # -----------------------------------------------------------------------
    # Internal helpers
    # -----------------------------------------------------------------------

    def _get_config(self, gym: "Gym") -> "GymFeatureConfig | None":
        """Safely fetch gym feature config. Returns None on any error."""
        try:
            from gyms.utils import get_gym_config
            return get_gym_config(gym)
        except ValueError:
            logger.debug(
                "[Dispatch] No feature config for gym=%s. Skipping notification.", gym.subdomain
            )
            return None
        except Exception as exc:
            logger.warning(
                "[Dispatch] Config fetch error for gym=%s: %s", gym.subdomain, exc
            )
            return None

    def _gym_url(self, gym: "Gym") -> str:
        frontend_url = getattr(settings, "FRONTEND_URL", "http://localhost:5173")
        if gym.full_url:
            return gym.full_url
        return f"http://{gym.subdomain}.localhost:5173"

    def _logo_url(self, gym: "Gym") -> str | None:
        try:
            if gym.logo:
                return gym.logo.url
        except Exception:
            pass
        return None

    def _idempotency_key(
        self,
        gym: "Gym",
        channel: str,
        event: str,
        member: "Member | None",
        reference_date: date | None = None,
    ) -> str:
        """
        Deterministic SHA-256 key for deduplication.
        Same inputs → same key → only one send per day per event per member per channel.
        """
        ref_date = reference_date or timezone.localdate()
        raw = f"{gym.id}:{channel}:{event}:{getattr(member, 'id', 'none')}:{ref_date}"
        return hashlib.sha256(raw.encode()).hexdigest()

    def _is_duplicate(self, idempotency_key: str) -> bool:
        """Check if a notification with this key was already successfully sent today."""
        try:
            from notifications.models import NotificationLog
            return NotificationLog.all_objects.filter(
                idempotency_key=idempotency_key,
                status=NotificationStatus.SENT,
            ).exists()
        except Exception:
            return False

    def _write_log(
        self,
        *,
        gym: "Gym",
        member: "Member | None",
        channel: str,
        event: str,
        recipient: str,
        idempotency_key: str,
        success: bool,
        error: str | None = None,
        provider: str = "",
    ) -> None:
        """Write a structured audit log entry for the notification attempt."""
        try:
            from notifications.models import NotificationLog
            status = NotificationStatus.SENT if success else NotificationStatus.FAILED
            NotificationLog.all_objects.update_or_create(
                idempotency_key=idempotency_key,
                defaults={
                    "gym": gym,
                    "member": member,
                    "channel": channel,
                    "event_type": event,
                    "recipient": recipient,
                    "status": status,
                    "provider": provider,
                    "error_message": error or "",
                },
            )
        except Exception as exc:
            logger.warning("[Dispatch] Failed to write NotificationLog: %s", exc)

    def _send_email_if_enabled(
        self,
        *,
        config: "GymFeatureConfig",
        gym: "Gym",
        member: "Member | None",
        event: str,
        subject: str,
        template: str,
        context: dict[str, Any],
        recipient: str,
    ) -> bool:
        if not config.enable_email:
            logger.debug(
                "[Dispatch] Email disabled for gym=%s. Skipping %s.", gym.subdomain, event
            )
            return False
        return self._fire_email(
            gym=gym, member=member, event=event, subject=subject,
            template=template, context=context, recipient=recipient,
        )

    def _fire_email(
        self,
        *,
        gym: "Gym",
        member: "Member | None",
        event: str,
        subject: str,
        template: str,
        context: dict[str, Any],
        recipient: str,
    ) -> bool:
        ikey = self._idempotency_key(gym, NotificationChannel.EMAIL, event, member)
        if self._is_duplicate(ikey):
            logger.debug(
                "[Dispatch] Duplicate email skipped | gym=%s | event=%s | to=%s",
                gym.subdomain, event, recipient,
            )
            return False

        try:
            service = get_email_service()
        except Exception as exc:
            logger.error("[Dispatch] Email service factory failed: %s", exc)
            self._write_log(
                gym=gym, member=member,
                channel=NotificationChannel.EMAIL,
                event=event,
                recipient=recipient,
                idempotency_key=ikey,
                success=False,
                error=f"Factory error: {exc}",
                provider="unknown",
            )
            return False

        msg = EmailMessage(
            subject=subject,
            template_name=template,
            context=context,
            to_email=recipient,
        )
        result = service.send(msg)
        self._write_log(
            gym=gym, member=member,
            channel=NotificationChannel.EMAIL,
            event=event,
            recipient=recipient,
            idempotency_key=ikey,
            success=result.success,
            error=result.error,
            provider=result.provider,
        )
        return result.success

    def _send_whatsapp_if_enabled(
        self,
        *,
        config: "GymFeatureConfig",
        gym: "Gym",
        member: "Member | None",
        event: str,
        template_name: str,
        variables: dict[str, Any],
        to_number: str,
    ) -> bool:
        if not config.enable_whatsapp:
            return False
        return self._fire_whatsapp(
            gym=gym, member=member, event=event,
            template_name=template_name, variables=variables, to_number=to_number,
        )

    def _fire_whatsapp(
        self,
        *,
        gym: "Gym",
        member: "Member | None",
        event: str,
        template_name: str,
        variables: dict[str, Any],
        to_number: str,
    ) -> bool:
        ikey = self._idempotency_key(gym, NotificationChannel.WHATSAPP, event, member)
        if self._is_duplicate(ikey):
            logger.debug(
                "[Dispatch] Duplicate WhatsApp skipped | gym=%s | event=%s | to=%s",
                gym.subdomain, event, to_number,
            )
            return False

        try:
            service = get_whatsapp_service()
        except Exception as exc:
            logger.error("[Dispatch] WhatsApp service factory failed: %s", exc)
            self._write_log(
                gym=gym, member=member,
                channel=NotificationChannel.WHATSAPP,
                event=event,
                recipient=to_number,
                idempotency_key=ikey,
                success=False,
                error=f"Factory error: {exc}",
                provider="unknown",
            )
            return False

        msg = WhatsAppMessage(
            to_number=to_number,
            template_name=template_name,
            variables=variables,
            gym_name=gym.name,
        )
        result = service.send(msg)
        self._write_log(
            gym=gym, member=member,
            channel=NotificationChannel.WHATSAPP,
            event=event,
            recipient=to_number,
            idempotency_key=ikey,
            success=result.success,
            error=result.error,
            provider=result.provider,
        )
        return result.success
