from django.urls import path, include
from rest_framework.routers import DefaultRouter
from payments.views import PaymentViewSet, PaymentLedgerViewSet

router = DefaultRouter()
router.register(r'ledgers', PaymentLedgerViewSet, basename='payment-ledgers')
router.register(r'', PaymentViewSet, basename='payments')

urlpatterns = [
    path('', include(router.urls)),
]
