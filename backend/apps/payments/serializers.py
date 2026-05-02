from __future__ import annotations

from rest_framework import serializers

from gyms.models import Plan
from members.models import Member
from payments.models import Payment, PaymentLedger, BillingStatus, PaymentMethod


class PaymentLedgerSerializer(serializers.ModelSerializer):
    member_name = serializers.ReadOnlyField(source="member.user.get_full_name")
    plan_name = serializers.ReadOnlyField(source="plan.name")

    class Meta:
        model = PaymentLedger
        fields = [
            "id",
            "gym",
            "member",
            "member_name",
            "plan",
            "plan_name",
            "amount_total",
            "amount_paid",
            "amount_due",
            "status",
            "due_date",
            "billing_date",
            "notes",
        ]
        read_only_fields = ["id", "gym", "amount_paid", "amount_due", "status", "billing_date"]


class PaymentSerializer(serializers.ModelSerializer):
    # Use `all_objects` to avoid binding an empty tenant queryset at import time.
    member = serializers.PrimaryKeyRelatedField(queryset=Member.all_objects.all())
    gym = serializers.PrimaryKeyRelatedField(read_only=True)
    plan = serializers.PrimaryKeyRelatedField(
        queryset=Plan.all_objects.all(),
        required=False,
        allow_null=True,
        write_only=True,
    )

    class Meta:
        model = Payment
        fields = [
            "id",
            "gym",
            "member",
            "ledger",
            "amount",
            "payment_method",
            "status",
            "transaction_id",
            "paid_at",
            "created_at",
        ]
        read_only_fields = ["id", "created_at", "gym"]

    def validate(self, attrs):
        request = self.context["request"]
        user = request.user
        role = getattr(user, "role", None)

        # For non-super-admins, ensure the payment belongs to the user's gym.
        if role != "super_admin":
            member = attrs.get("member")
            if member is None:
                return attrs
            user_gym = getattr(user, "gym", None)
            if user_gym is None or member.gym_id != user_gym.id:
                raise serializers.ValidationError({"detail": "Gym mismatch."})
        return attrs

    def update(self, instance, validated_data):
        validated_data.pop("plan", None)  # plan can be set only at payment creation
        validated_data.pop("member", None)  # do not allow switching member
        validated_data.pop("gym", None)
        return super().update(instance, validated_data)

    def create(self, validated_data):
        payment = Payment.all_objects.create(**validated_data)
        if payment.ledger and payment.status == Payment.Status.SUCCEEDED:
            payment.ledger.update_balance()
        return payment

