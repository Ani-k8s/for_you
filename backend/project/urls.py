from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path, re_path
from django.views.generic import TemplateView
from rest_framework_simplejwt.views import TokenRefreshView
from rest_framework.routers import DefaultRouter
from users.views import GlobalLoginView, TenantLoginView, MeView, UserViewSet, GoogleAuthView
from gyms.views import GymConfigViewSet, GymViewSet, GymRequestViewSet, EquipmentViewSet, AnnouncementViewSet, PublicGymRegistrationView, PublicTenantConfigView
from core.reporting_views import ReportingViewSet
from core.dashboard_views import DashboardView
from core import views as core_views
from fitness.views import WorkoutPlanViewSet, DietPlanViewSet, MemberFitnessProfileViewSet

router = DefaultRouter()
router.register(r"users", UserViewSet, basename="user")
router.register(r"gym/config", GymConfigViewSet, basename="gym-config")
router.register(r"reports", ReportingViewSet, basename="reports")
router.register(r"support-config", core_views.SupportConfigViewSet, basename="support-config")
router.register(r"docs/system", core_views.DocumentationViewSet, basename="documentation")
router.register(r"fitness/workout", WorkoutPlanViewSet, basename="workout-plans")
router.register(r"fitness/diet", DietPlanViewSet, basename="diet-plans")
router.register(r"fitness/profile", MemberFitnessProfileViewSet, basename="fitness-profiles")
router.register(r'requests', GymRequestViewSet, basename='gym-requests')
router.register(r'equipment', EquipmentViewSet, basename='equipment')
router.register(r'announcements', AnnouncementViewSet, basename='announcements')
router.register(r'gyms', GymViewSet, basename='gyms')

urlpatterns = [
    path("", core_views.health, name="root_health"),
    path("api/", include(router.urls)),
    path("admin/", admin.site.urls),
    path("health/", core_views.HealthCheckView.as_view(), name="health"),
    re_path(r"^api/health/?$", core_views.HealthCheckView.as_view(), name="api_health"),
    
    # Auth APIs
    re_path(r"^api/token/?$", GlobalLoginView.as_view(), name="token_obtain_pair"),
    re_path(r"^api/token/refresh/?$", TokenRefreshView.as_view(), name="token_refresh"),
    re_path(r"^api/auth/login/?$", GlobalLoginView.as_view(), name="global_login"),
    re_path(r"^api/tenant/login/?$", TenantLoginView.as_view(), name="tenant_login"),
    re_path(r"^api/login/?$", GlobalLoginView.as_view(), name="token_obtain_pair_alias"), # Legacy support
    re_path(r"^api/refresh/?$", TokenRefreshView.as_view(), name="token_refresh_alias"),
    re_path(r"^api/auth/refresh/?$", TokenRefreshView.as_view(), name="token_refresh_alias_2"),
    re_path(r"^api/auth/google/?$", GoogleAuthView.as_view(), name="google_auth"),
    re_path(r"^api/auth/google-login/?$", GoogleAuthView.as_view(), name="google_auth_alias"),
    re_path(r"^api/me/?$", MeView.as_view(), name="me"),
    re_path(r"^api/auth/me/?$", MeView.as_view(), name="me_alias"),
    re_path(r"^api/dashboard/?$", DashboardView.as_view(), name="dashboard"),
    re_path(r"^api/tenant/branding/?$", core_views.TenantBrandingView.as_view(), name="tenant_branding"),
    re_path(r"^api/docs/manual/?$", core_views.ManualView.as_view(), name="docs_manual"),
    re_path(r"^api/docs/manual/file/?$", core_views.UserManualFileView.as_view(), name="docs_manual_file"),
    re_path(r"^api/support/chat/?$", core_views.SupportChatView.as_view(), name="support_chat"),
    re_path(r"^api/support/message/?$", core_views.SupportMessageView.as_view(), name="support_message"),
    re_path(r"^api/search/?$", core_views.SearchAPIView.as_view(), name="global_search"),

    # App APIs
    path("api/members/", include("members.urls")),
    path("api/payments/", include("payments.urls")),
    path("api/attendance/", include("attendance.urls")),
    path("api/gyms/", include("gyms.urls")),
    path("api/notifications/", include("notifications.urls")),
    path("api/reminders/", include("reminders.urls")),
    path("api/communication/", include("communication.urls")),
    path("api/public/register-gym/", PublicGymRegistrationView.as_view(), name="register_gym"),
    path("api/public/tenant-config/", PublicTenantConfigView.as_view(), name="tenant_config"),

    # Explicit /api/admin/ routes for Support system
    path("api/admin/support-config/<uuid:pk>/", core_views.SupportConfigViewSet.as_view({'put': 'update'}), name="admin_support_config_put"),
    path("api/admin/support-node/", core_views.SupportNodeViewSet.as_view({'post': 'create'}), name="admin_support_node_post"),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

# SPA catch-all
# This ensures that any path not matching the above (API, Admin, Static, Media)
# is served by the React frontend, allowing React Router to handle the route.
urlpatterns += [
    re_path(r"^(?!api/|admin/|static/|media/).*$",
            TemplateView.as_view(template_name="index.html"),
            name="spa-fallback"),
]
