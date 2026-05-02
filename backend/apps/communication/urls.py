from django.urls import path, include
from rest_framework.routers import DefaultRouter
from communication.views import ChatMessageViewSet

router = DefaultRouter()
router.register(r"messages", ChatMessageViewSet, basename="messages")

urlpatterns = [
    path("", include(router.urls)),
]
