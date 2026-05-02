"""
Management command: send_expiry_reminders
==========================================
Sends membership expiry reminders to all active members whose membership
expires within the configured reminder window for their gym.

Usage:
    python manage.py send_expiry_reminders
    python manage.py send_expiry_reminders --days 3    # Override reminder window
    python manage.py send_expiry_reminders --dry-run   # Preview without sending

Scheduling:
    - Recommended: run daily via cron, GitHub Actions schedule, or APScheduler.
    - Example cron: 0 8 * * * /path/to/venv/bin/python manage.py send_expiry_reminders

Design:
    - Uses NotificationDispatcher (handles email + WhatsApp + idempotency)
    - Each dispatch is idempotent — re-running is safe, no duplicate sends
    - Also creates in-app Notification for the owner's dashboard
    - Failed sends are logged to NotificationLog, never crash the command
"""

from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta

from gyms.models import Gym
from members.models import Member
from notifications.services import create_notification
from notifications.models import Notification
from services.dispatch import NotificationDispatcher


class Command(BaseCommand):
    help = "Send automated expiry reminders to members based on gym configuration."

    def add_arguments(self, parser):
        parser.add_argument(
            "--days",
            type=int,
            default=None,
            help="Override the gym's expiry_reminder_days setting.",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            default=False,
            help="Preview which members would receive reminders without sending.",
        )

    def handle(self, *args, **options):
        today = timezone.now().date()
        override_days = options.get("days")
        dry_run = options.get("dry_run", False)

        if dry_run:
            self.stdout.write(self.style.WARNING("=== DRY RUN MODE — No messages will be sent ==="))

        dispatcher = NotificationDispatcher()
        gyms_processed = 0
        total_sent = 0
        total_skipped = 0
        total_failed = 0

        gyms = Gym.objects.filter(is_active=True).select_related("feature_config")

        for gym in gyms:
            config = getattr(gym, "feature_config", None)
            if not config:
                self.stdout.write(
                    self.style.WARNING(f"  [SKIP] {gym.name}: no feature config")
                )
                continue

            if not config.enable_reminders:
                continue

            reminder_days = override_days if override_days is not None else config.expiry_reminder_days
            target_date = today + timedelta(days=reminder_days)

            members = Member.all_objects.filter(
                gym=gym,
                is_active=True,
                end_date=target_date,
            ).select_related("user", "plan")

            if not members.exists():
                continue

            gyms_processed += 1
            self.stdout.write(
                f"\n[{gym.name}] {members.count()} member(s) expiring in {reminder_days} day(s):"
            )

            for member in members:
                member_label = member.user.email

                if dry_run:
                    self.stdout.write(f"  [DRY-RUN] Would notify: {member_label}")
                    total_sent += 1
                    continue

                # Create in-app notification (owner dashboard)
                title = "Membership Expiring Soon"
                message = (
                    f"Hi {member.user.first_name or member.user.email}, "
                    f"your membership at {gym.name} is set to expire on {member.end_date}. "
                    "Please renew to continue enjoying our services."
                )
                already_notified = Notification.all_objects.filter(
                    gym=gym,
                    member=member,
                    type=Notification.Type.EXPIRY_REMINDER,
                    message__icontains=str(member.end_date),
                ).exists()
                if not already_notified:
                    create_notification(
                        gym=gym,
                        member=member,
                        title=title,
                        message=message,
                        type_value=Notification.Type.EXPIRY_REMINDER,
                    )

                # Dispatch via NotificationDispatcher (handles email + WhatsApp + idempotency)
                dispatcher.dispatch_expiry_reminder(
                    member=member,
                    gym=gym,
                    days_left=reminder_days,
                )

                self.stdout.write(
                    self.style.SUCCESS(f"  ✓ Dispatched reminder → {member_label}")
                )
                total_sent += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"\n{'[DRY-RUN] ' if dry_run else ''}Expiry reminder task complete — "
                f"gyms={gyms_processed}, dispatched={total_sent}"
            )
        )
