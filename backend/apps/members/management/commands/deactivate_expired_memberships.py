from __future__ import annotations

from django.core.management.base import BaseCommand

from members.services import deactivate_expired_memberships


class Command(BaseCommand):
    help = "Deactivate expired memberships (cron-friendly)."

    def handle(self, *args, **options):
        count = deactivate_expired_memberships()
        self.stdout.write(self.style.SUCCESS(f"Deactivated {count} memberships."))

