from __future__ import annotations

from datetime import timedelta

from django.utils import timezone
from notifications.models import Notification
from notifications.services import create_notification

from members.models import Member
from payments.models import PaymentLedger, BillingStatus
from django.db import transaction


@transaction.atomic
def assign_plan_and_activate(member: Member, plan) -> Member:
    today = timezone.localdate()
    member.plan = plan
    member.start_date = today
    member.end_date = today + timedelta(days=plan.duration_days)
    member.is_active = True
    member.save(update_fields=["plan", "start_date", "end_date", "is_active", "updated_at"])
    
    # Create a Ledger entry for the new plan
    due_date = today + timedelta(days=7)  # Default 7 days to pay
    PaymentLedger.all_objects.create(
        gym=member.gym,
        member=member,
        plan=plan,
        amount_total=plan.price,
        amount_due=plan.price,
        status=BillingStatus.PENDING,
        due_date=due_date,
        notes=f"Automatic ledger for plan: {plan.name}"
    )
    
    return member


def deactivate_expired_memberships():
    today = timezone.localdate()
    qs = Member.all_objects.filter(end_date__lt=today, is_active=True)
    count = qs.update(is_active=False)
    return count


def send_expiry_reminders(*, days_before: int = 3) -> int:
    """
    Create DB notifications for memberships expiring soon.
    Ready to be run from cron/CI.
    """
    today = timezone.localdate()
    target = today + timedelta(days=days_before)

    qs = (
        Member.all_objects.filter(is_active=True, end_date__gte=today, end_date__lte=target)
        .select_related("gym", "user", "plan")
    )

    created = 0
    for member in qs:
        gym = member.gym
        days_left = (member.end_date - today).days if member.end_date else None
        title = "Membership expiring soon"
        msg = (
            f"Hi {member.user.email}, your membership for {gym.name} expires in {days_left} day(s)."
            if days_left is not None
            else f"Hi {member.user.email}, your membership for {gym.name} is expiring soon."
        )
        # Basic dedupe by type/title/message.
        existing = Notification.all_objects.filter(
            gym=gym,
            type=Notification.Type.EXPIRY_REMINDER,
            title=title,
            message=msg,
        ).exists()
        if existing:
            continue
        create_notification(
            gym=gym,
            title=title,
            message=msg,
            type_value=Notification.Type.EXPIRY_REMINDER,
        )
        created += 1
    return created

