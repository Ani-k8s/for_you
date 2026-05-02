from django.contrib.auth import get_user_model
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import permissions, viewsets, status
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework_simplejwt.tokens import RefreshToken
from django.conf import settings

from core.permissions import IsSuperAdmin, HasResolvedTenant
from users.serializers import (
    UserSerializer, 
    UserCreateUpdateSerializer, 
    CustomTokenObtainPairSerializer,
    TenantTokenObtainPairSerializer
)

User = get_user_model()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _build_user_payload(user):
    """Reusable compact user dict attached to auth responses."""
    gym_payload = None
    if user.gym:
        gym_payload = {
            "id": str(user.gym.id),
            "name": user.gym.name,
            "subdomain": user.gym.subdomain,
            "full_url": user.gym.full_url,
        }
    return {
        "id": str(user.id),
        "email": user.email,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "role": user.role,
        "gym": gym_payload,
    }


def _check_gym_login_allowed(request, user, login_type: str):
    """
    Validate gym approval and tenant isolation during login.
    1. SUPER_ADMIN: always allow bypass.
    2. Others: must match resolved tenant and gym must be approved.
    """
    from core.config import ROLE_SUPER_ADMIN
    if user.role == ROLE_SUPER_ADMIN:
        return None

    # Resolve tenant from request (placed by middleware)
    tenant = getattr(request, "tenant", None)
    
    if not tenant:
        return {"detail": "Gym not found. Please provide a valid ?gym= parameter or correct subdomain.", "code": "gym_not_found"}

    if user.gym != tenant:
        return {"detail": "Invalid access. Your account does not belong to this gym.", "code": "invalid_gym_access"}

    if not tenant.is_approved:
        return {"detail": "Gym not approved yet. Please wait for administrator approval.", "code": "gym_not_approved"}

    if not tenant.is_active:
        return {"detail": "This gym has been deactivated. Please contact support.", "code": "gym_inactive"}

    # Feature Config check (Guarantee it exists per requested correction #3)
    from gyms.models import GymFeatureConfig
    config, _ = GymFeatureConfig.objects.get_or_create(gym=tenant)
    
    if login_type == "email" and not config.enable_email_login:
        return {"detail": "Email login is disabled for this gym.", "code": "email_login_disabled"}
    if login_type == "google" and not config.enable_google_auth:
        return {"detail": "Google login is disabled for this gym.", "code": "google_login_disabled"}

    return None


# ---------------------------------------------------------------------------
# Login
# ---------------------------------------------------------------------------

class LoginView(TokenObtainPairView):
    """
    DEPRECATED: Use GlobalLoginView or TenantLoginView instead.
    Standard JWT login. Returns access + refresh token plus enriched user payload.
    """
    permission_classes = [permissions.AllowAny]
    serializer_class = CustomTokenObtainPairSerializer

    def post(self, request, *args, **kwargs):
        email = request.data.get("email", "").strip()
        
        if not email:
            return Response({"detail": "Email is required."}, status=400)

        tenant = getattr(request, "tenant", None)
        if tenant:
            # Scoped login for tenants
            user = User.objects.filter(email__iexact=email, gym=tenant).first()
        else:
            # Global login for Super Admins
            user = User.objects.filter(email__iexact=email).first()

        if user:
            error = _check_gym_login_allowed(request, user, "email")
            if error:
                return Response(error, status=403)

        response = super().post(request, *args, **kwargs)

        if response.status_code == 200 and user:
            response.data["user"] = _build_user_payload(user)

        return response

class GlobalLoginView(LoginView):
    """
    Main domain login. Typically for SuperAdmins or global users.
    """
    def post(self, request, *args, **kwargs):
        return super().post(request, *args, **kwargs)

class TenantLoginView(TokenObtainPairView):
    """
    Subdomain-based login. Enforces that the user belongs to the resolved tenant.
    """
    permission_classes = [permissions.AllowAny]
    serializer_class = TenantTokenObtainPairSerializer

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["tenant"] = getattr(self.request, "tenant", None)
        return context

    def post(self, request, *args, **kwargs):
        email = request.data.get("email", "").strip()
        tenant = getattr(request, "tenant", None)

        # Use the serializer validation to handle most of the isolation
        response = super().post(request, *args, **kwargs)

        if response.status_code == 200:
            user = User.objects.filter(email__iexact=email).first()
            # Final safety check via helper
            error = _check_gym_login_allowed(request, user, "email")
            if error:
                return Response(error, status=403)
            
            response.data["user"] = _build_user_payload(user)

        return response


# ---------------------------------------------------------------------------
# Google OAuth
# ---------------------------------------------------------------------------

class GoogleAuthView(APIView):
    """
    POST /api/auth/google
    Accepts a Google ID token, verifies it, and returns JWT tokens.
    Only members who already have an account in the system can log in via Google.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        token = request.data.get("token", "").strip()
        if not token:
            return Response({"detail": "Google ID token is required."}, status=400)

        email = self._verify_google_token(token)
        if email is None:
            return Response({"detail": "Invalid or expired Google token."}, status=400)

        user = User.objects.filter(email__iexact=email).first()
        if not user:
            return Response(
                {"detail": "No account found for this Google email. Please contact your gym administrator."},
                status=403,
            )

        error = _check_gym_login_allowed(request, user, "google")
        if error:
            return Response(error, status=403)

        refresh = RefreshToken.for_user(user)
        return Response({
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "user": _build_user_payload(user),
        })

    def _verify_google_token(self, token: str):
        """
        Verify Google ID token against Google's public keys.
        Returns the verified email on success, None on failure.

        Falls back to decode-without-verify in development (DEBUG=True)
        so devs can test without a real Google token.
        """
        client_id = getattr(settings, "GOOGLE_CLIENT_ID", "")

        # Production: proper verification
        if client_id:
            try:
                from google.oauth2 import id_token
                from google.auth.transport import requests as google_requests
                idinfo = id_token.verify_oauth2_token(
                    token, google_requests.Request(), client_id
                )
                return idinfo.get("email")
            except Exception:
                # If google-auth not installed or verification fails
                pass

        # Dev fallback: decode without verifying signature
        if settings.DEBUG:
            try:
                import jwt as pyjwt
                decoded = pyjwt.decode(token, options={"verify_signature": False})
                return decoded.get("email")
            except Exception:
                pass

        return None


# ---------------------------------------------------------------------------
# Me (profile)
# ---------------------------------------------------------------------------

class MeView(APIView):
    """
    GET  /api/auth/me  — return current user's profile
    PATCH /api/auth/me — update first_name / last_name / password
    """
    permission_classes = [IsAuthenticated, HasResolvedTenant]

    def get(self, request):
        return Response(_build_user_payload(request.user))

    def patch(self, request):
        user = request.user
        data = request.data
        changed = False

        if "first_name" in data:
            user.first_name = data["first_name"]
            changed = True
        if "last_name" in data:
            user.last_name = data["last_name"]
            changed = True
        if "password" in data:
            new_pass = data["password"]
            if len(new_pass) < 6:
                return Response({"detail": "Password must be at least 6 characters."}, status=400)
            user.set_password(new_pass)
            changed = True

        if changed:
            user.save()

        return Response(_build_user_payload(user))


# ---------------------------------------------------------------------------
# User Management (Super Admin only)
# ---------------------------------------------------------------------------

class UserViewSet(viewsets.ModelViewSet):
    """
    Full user CRUD — Super Admin only.
    Gym owners use /api/staff/ for staff management.
    """
    queryset = User.objects.all().order_by("-date_joined")
    permission_classes = [IsSuperAdmin]
    search_fields = ["email", "first_name", "last_name"]
    filterset_fields = ["role", "gym", "is_active"]
    ordering_fields = ["date_joined", "email"]

    def get_serializer_class(self):
        if self.action in ["create", "update", "partial_update"]:
            return UserCreateUpdateSerializer
        return UserSerializer
