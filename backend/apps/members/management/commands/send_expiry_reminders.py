"""
DEPRECATED: This command was renamed to avoid a management command name collision.

The reminders app has its own send_expiry_reminders command that uses
NotificationDispatcher (email + WhatsApp + idempotency).

Use instead:
    python manage.py send_expiry_notifications  <- in-app notifications only (this file's old logic)
    python manage.py send_expiry_reminders      <- full dispatch (email + WhatsApp)
"""
from __future__ import annotations

from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = "[DEPRECATED] Renamed. Use send_expiry_notifications or send_expiry_reminders."

    def handle(self, *args, **options):
        raise CommandError(
            "This command is deprecated and has been replaced.\n"
            "  In-app notifications only: python manage.py send_expiry_notifications\n"
            "  Full email+WhatsApp dispatch: python manage.py send_expiry_reminders\n"
            "  (The full dispatch command is in the 'reminders' app.)"
        )
