from __future__ import annotations

from django.utils import timezone

from attendance.models import Attendance


def check_in_member(*, gym, member):
    today = timezone.localdate()
    record, created = Attendance.all_objects.get_or_create(
        gym=gym,
        member=member,
        date=today,
        defaults={"check_in": timezone.now()},
    )
    if record.check_in is None:
        record.check_in = timezone.now()
        record.save(update_fields=["check_in", "updated_at"])

    # Send WhatsApp attendance confirmation ONLY on the first check-in of the day.
    # `created=True` means this is a new attendance record — not a duplicate API call.
    if created:
        try:
            from services.dispatch import NotificationDispatcher
            NotificationDispatcher().dispatch_attendance_confirmation(
                member=member,
                gym=gym,
            )
        except Exception:
            pass  # Notification failure must never block attendance

    return record


def check_out_member(*, gym, member):
    today = timezone.localdate()
    record, _ = Attendance.all_objects.get_or_create(gym=gym, member=member, date=today)
    record.check_out = timezone.now()
    record.save(update_fields=["check_out", "updated_at"])
    return record

