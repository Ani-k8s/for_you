from django.urls import path, include
from rest_framework.routers import DefaultRouter
from gyms.views import GymViewSet, GymRequestViewSet, EquipmentViewSet, PublicTenantConfigView

router = DefaultRouter()
router.register(r'requests', GymRequestViewSet, basename='gym-requests')
router.register(r'equipment', EquipmentViewSet, basename='equipment')
router.register(r'', GymViewSet, basename='gyms')

urlpatterns = [
    path('public/tenant-config/', PublicTenantConfigView.as_view(), name='tenant-config'),
    path('', include(router.urls)),
]
