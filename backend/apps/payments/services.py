from __future__ import annotations

from django.utils import timezone

from members.services import assign_plan_and_activate
from notifications.models import Notification
from notifications.services import create_notification
from payments.models import Payment


def handle_payment_success(payment: Payment, *, plan=None, create_notification_flag: bool = True) -> Payment:
    payment.status = Payment.Status.SUCCEEDED
    if payment.paid_at is None:
        payment.paid_at = timezone.now()
    payment.is_active = True
    payment.save(update_fields=["status", "paid_at", "is_active", "updated_at"])

    member = payment.member
    if plan is not None:
        member.plan = plan

    if member.plan is not None:
        assign_plan_and_activate(member, member.plan)

    if create_notification_flag:
        create_notification(
            gym=payment.gym,
            title="Payment received",
            message=f"Payment success for member {member.user.email}",
            type_value=Notification.Type.PAYMENT_SUCCESS,
        )
    return payment

