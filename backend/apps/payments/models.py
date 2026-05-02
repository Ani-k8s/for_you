from django.db import models

from core.models import TenantModel
from members.models import Member


class PaymentMethod(models.TextChoices):
    CASH = "cash", "Cash"
    UPI = "upi", "UPI"
    CARD = "card", "Card"
    OTHER = "other", "Other"


class BillingStatus(models.TextChoices):
    PAID = "paid", "Paid"
    PARTIAL = "partial", "Partial"
    PENDING = "pending", "Pending"
    OVERDUE = "overdue", "Overdue"


class PaymentLedger(TenantModel):
    gym = models.ForeignKey("gyms.Gym", on_delete=models.CASCADE, related_name="ledgers")
    member = models.ForeignKey(Member, on_delete=models.CASCADE, related_name="ledgers")
    plan = models.ForeignKey("gyms.Plan", on_delete=models.SET_NULL, null=True, blank=True)
    
    amount_total = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    amount_paid = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    amount_due = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    
    status = models.CharField(max_length=20, choices=BillingStatus.choices, default=BillingStatus.PENDING)
    due_date = models.DateField(null=True, blank=True)
    billing_date = models.DateField(auto_now_add=True)
    
    notes = models.TextField(null=True, blank=True)

    class Meta:
        ordering = ["-due_date"]

    def __str__(self) -> str:
        return f"{self.member.user.email} - {self.status} ({self.amount_due} due)"

    def update_balance(self):
        payments = self.payments.filter(status=Payment.Status.SUCCEEDED).aggregate(
            total=models.Sum("amount")
        )["total"] or 0
        self.amount_paid = payments
        self.amount_due = self.amount_total - self.amount_paid
        
        if self.amount_due <= 0:
            self.status = BillingStatus.PAID
        elif self.amount_paid > 0:
            self.status = BillingStatus.PARTIAL
        else:
            # Check if overdue
            from django.utils import timezone
            if self.due_date < timezone.now().date():
                self.status = BillingStatus.OVERDUE
            else:
                self.status = BillingStatus.PENDING
        
        self.save()


class Payment(TenantModel):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        SUCCEEDED = "succeeded", "Succeeded"
        FAILED = "failed", "Failed"

    gym = models.ForeignKey("gyms.Gym", on_delete=models.CASCADE, related_name="payments")
    member = models.ForeignKey(Member, on_delete=models.CASCADE, related_name="payments")
    ledger = models.ForeignKey(PaymentLedger, on_delete=models.CASCADE, null=True, blank=True, related_name="payments")
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    payment_method = models.CharField(max_length=20, choices=PaymentMethod.choices, default=PaymentMethod.CASH)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    transaction_id = models.CharField(max_length=100, unique=True, null=True, blank=True)
    paid_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-updated_at"]

    def __str__(self) -> str:
        return f"{self.transaction_id} ({self.status})"
