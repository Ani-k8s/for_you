from rest_framework import viewsets
from rest_framework.exceptions import ValidationError
from core.permissions import IsGymOwner, IsGymOwnerOrSuperAdmin
from payments.models import Payment, PaymentLedger
from payments.serializers import PaymentSerializer, PaymentLedgerSerializer
from payments.services import handle_payment_success


class PaymentViewSet(viewsets.ModelViewSet):
    serializer_class = PaymentSerializer
    permission_classes = [IsGymOwner]
    search_fields = ["transaction_id", "member__user__email"]
    ordering_fields = ["created_at", "amount"]
    filterset_fields = ["status"]

    def get_queryset(self):
        user = self.request.user
        return Payment.objects.for_user(user)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response({
            "message": "Payment recorded successfully",
            "data": serializer.data
        }, status=status.HTTP_201_CREATED)

    def perform_create(self, serializer):
        user = self.request.user
        serializer.save(gym=user.gym)
        payment = serializer.instance
        if payment.status == Payment.Status.SUCCEEDED:
            handle_payment_success(payment)
            if payment.ledger:
                payment.ledger.update_balance()

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response({
            "message": "Payment updated successfully",
            "data": serializer.data
        })

    def perform_update(self, serializer):
        old_status = self.get_object().status
        payment = serializer.save()
        if payment.status == Payment.Status.SUCCEEDED and old_status != Payment.Status.SUCCEEDED:
            handle_payment_success(payment)
            if payment.ledger:
                payment.ledger.update_balance()


class PaymentLedgerViewSet(viewsets.ModelViewSet):
    serializer_class = PaymentLedgerSerializer
    permission_classes = [IsGymOwnerOrSuperAdmin]
    filterset_fields = ["status", "member"]
    ordering_fields = ["due_date", "amount_due"]

    def get_queryset(self):
        user = self.request.user
        return PaymentLedger.objects.for_user(user)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response({
            "message": "Ledger entry created successfully",
            "data": serializer.data
        }, status=status.HTTP_201_CREATED)

    def perform_create(self, serializer):
        user = self.request.user
        serializer.save(gym=user.gym)
