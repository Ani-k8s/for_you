from __future__ import annotations

from django.core.management.base import BaseCommand

from members.services import send_expiry_reminders


class Command(BaseCommand):
    help = "Create IN-APP notifications for memberships expiring soon (no email/WhatsApp). Use send_expiry_reminders for full dispatch."

    def add_arguments(self, parser):
        parser.add_argument(
            "--days-before",
            type=int,
            default=3,
            help="Send reminders for memberships expiring within N days.",
        )

    def handle(self, *args, **options):
        days_before = options["days_before"]
        created = send_expiry_reminders(days_before=days_before)
        self.stdout.write(
            self.style.SUCCESS(
                f"Created {created} in-app expiry reminder notifications.\n"
                "To also send email/WhatsApp: use 'python manage.py send_expiry_reminders'"
            )
        )
