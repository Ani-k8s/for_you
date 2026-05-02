from django.contrib import admin

from payments.models import Payment


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ["id", "transaction_id", "gym", "member", "amount", "payment_method", "status", "paid_at"]
    search_fields = ["transaction_id", "member__user__email", "gym__subdomain"]
    list_filter = ["status", "payment_method", "paid_at", "gym"]
