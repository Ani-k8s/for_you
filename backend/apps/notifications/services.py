from __future__ import annotations

from notifications.models import Notification


def create_notification(*, gym, title: str, message: str, type_value: str, member=None) -> Notification:
    return Notification.all_objects.create(
        gym=gym,
        member=member,
        title=title,
        message=message,
        type=type_value,
    )

