from __future__ import annotations

from django.contrib.auth import get_user_model
from django.utils.translation import gettext_lazy as _
from rest_framework import serializers

from gyms.models import Gym, Plan
from members.models import Member
from members.services import assign_plan_and_activate
from notifications.models import Notification
from notifications.services import create_notification
from attendance.serializers import AttendanceSerializer
from payments.serializers import PaymentLedgerSerializer

User = get_user_model()


class MemberSerializer(serializers.ModelSerializer):
    """
    Member endpoints manage both:
    - the Member profile record
    - the linked User (username/password/role/gym)
    """

    email = serializers.EmailField(write_only=True, required=True)
    password = serializers.CharField(write_only=True, required=False, allow_blank=False)
    first_name = serializers.CharField(required=False, allow_blank=True)
    last_name = serializers.CharField(required=False, allow_blank=True)
    phone = serializers.CharField(required=False, allow_blank=True, allow_null=True,
                                   help_text="E.164 format: +919876543210 (for WhatsApp notifications)")

    gym = serializers.PrimaryKeyRelatedField(queryset=Gym.objects.all(), required=False)
    # Tenant-scoped models use a custom manager that reads subdomain at request time.
    # To avoid binding an empty queryset at import time, explicitly use `all_objects`.
    plan = serializers.PrimaryKeyRelatedField(
        queryset=Plan.all_objects.all(),
        required=False,
        allow_null=True,
    )
    user_id = serializers.UUIDField(source="user.id", read_only=True)
    role = serializers.CharField(source="user.role", read_only=True)
    user_email = serializers.EmailField(source="user.email", read_only=True)

    class Meta:
        model = Member
        fields = [
            "id",
            "user_id",
            "email",
            "password",
            "user_email",
            "first_name",
            "last_name",
            "phone",
            "gym",
            "plan",
            "start_date",
            "end_date",
            "is_active",
            "role",
        ]
        read_only_fields = ["id", "end_date", "role", "user_id", "user_email"]

    def validate(self, attrs):
        request = self.context["request"]
        user = request.user
        role = getattr(user, "role", None)
        method = request.method.upper()

        tenant_gym = self.context.get("gym")
        if tenant_gym is None:
            raise serializers.ValidationError({"detail": _("Tenant gym is required.")})

        from core.config import ROLE_GYM_OWNER, ROLE_STAFF, ROLE_SUPER_ADMIN
        if role == ROLE_SUPER_ADMIN:
            raise serializers.ValidationError({"detail": _("Forbidden.")})

        # Strictly enforce tenant match.
        if user.gym_id != tenant_gym.id:
            raise serializers.ValidationError({"detail": _("Gym mismatch.")})

        if method == "POST":
            # FIXED: logic should use constants
            if role != ROLE_GYM_OWNER:
                raise serializers.ValidationError({"detail": _("Only owners can create members.")})
            if not attrs.get("plan"):
                raise serializers.ValidationError({"plan": _("plan is required.")})

        if method in {"PUT", "PATCH"}:
            # FIXED: staff role used "trainer" before — now staff
            if role not in {ROLE_GYM_OWNER, ROLE_STAFF}:
                raise serializers.ValidationError({"detail": _("Forbidden.")})

        return attrs

    def create(self, validated_data):
        gym = validated_data.pop("gym", None) or self.context.get("gym")
        if gym is None:
            raise serializers.ValidationError({"detail": _("Gym is required.")})

        email = validated_data.pop("email")
        password = validated_data.pop("password", None)
        if not password:
            raise serializers.ValidationError({"password": _("Password is required for member creation.")})

        # Optional profile fields.
        first_name = validated_data.pop("first_name", "")
        last_name = validated_data.pop("last_name", "")
        phone = validated_data.pop("phone", None)
        start_date = validated_data.pop("start_date", None)
        plan = validated_data.pop("plan", None)

        # Ensure the linked user is a member user.
        user = User.objects.create_user(
            email=email,
            password=password or User.objects.make_random_password(),
            first_name=first_name,
            last_name=last_name,
            role=User.Roles.MEMBER,
            is_verified=True,
            gym=gym,
            phone=phone,
        )

        member = Member.all_objects.create(user=user, gym=gym, plan=plan)

        if start_date is not None:
            from datetime import timedelta

            member.start_date = start_date
            member.end_date = start_date + timedelta(days=plan.duration_days)
            member.is_active = True
            member.save(update_fields=["plan", "start_date", "end_date", "is_active", "updated_at"])
        else:
            assign_plan_and_activate(member=member, plan=plan)

        create_notification(
            gym=gym,
            title="New member registered",
            message=f"{user.email} joined the gym.",
            type_value=Notification.Type.NEW_MEMBER,
        )

        # Dispatch welcome notification (email + WhatsApp if enabled)
        # Run after all DB work is committed — failure here never breaks member creation.
        try:
            from services.dispatch import NotificationDispatcher
            NotificationDispatcher().dispatch_welcome_member(
                member=member,
                gym=gym,
                password=password,
            )
        except Exception as exc:
            import logging
            logging.getLogger(__name__).warning(
                "Welcome notification failed for member %s: %s", user.email, exc
            )

        return member

    def update(self, instance, validated_data):
        # Members are tied to a user; we update the user's basic fields and member dates.
        email = validated_data.pop("email", None)
        password = validated_data.pop("password", None)
        first_name = validated_data.pop("first_name", None)
        last_name = validated_data.pop("last_name", None)
        phone = validated_data.pop("phone", None)

        start_date = validated_data.pop("start_date", None)
        plan = validated_data.pop("plan", None)
        _gym = validated_data.pop("gym", None)  # do not allow switching gym

        # Update user profile fields if provided.
        user = instance.user
        if email is not None:
            user.email = email
        if first_name is not None:
            user.first_name = first_name
        if last_name is not None:
            user.last_name = last_name
        if phone is not None:
            user.phone = phone
        if password:
            user.set_password(password)
        user.save()

        # Recompute membership dates if plan or start_date changes.
        if plan is not None:
            instance.plan = plan
        if start_date is not None:
            instance.start_date = start_date

        is_active = validated_data.pop("is_active", None)
        if is_active is not None:
            instance.is_active = is_active
            
        if instance.plan is not None and instance.start_date is not None:
            # Auto-calculate end_date from plan duration.
            from datetime import timedelta
            instance.end_date = instance.start_date + timedelta(days=instance.plan.duration_days)
            instance.save(update_fields=["plan", "start_date", "end_date", "is_active", "updated_at"])
        else:
            instance.save()
        return instance


class MemberDetailSerializer(MemberSerializer):
    attendance_history = serializers.SerializerMethodField()
    payment_history = serializers.SerializerMethodField()

    class Meta(MemberSerializer.Meta):
        fields = MemberSerializer.Meta.fields + ["attendance_history", "payment_history"]

    def get_attendance_history(self, obj):
        from attendance.models import Attendance
        # Only return last 30 days or last 10 records
        qs = Attendance.all_objects.filter(member=obj).order_by("-date")[:10]
        return AttendanceSerializer(qs, many=True).data

    def get_payment_history(self, obj):
        from payments.models import PaymentLedger
        qs = PaymentLedger.all_objects.filter(member=obj).order_by("-due_date")[:5]
        return PaymentLedgerSerializer(qs, many=True).data

