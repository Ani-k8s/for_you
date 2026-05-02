from rest_framework import status, viewsets, permissions
from rest_framework.views import APIView
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import transaction
import re

from core.permissions import IsSuperAdmin, IsGymOwnerOrSuperAdmin, IsGymOwner
from core.config import ROLE_SUPER_ADMIN
from gyms.models import Gym, Plan, GymRequest, GymFeatureConfig
from users.models import User
from gyms.serializers import (
    GymSerializer,
    PlanSerializer,
    GymRequestAdminSerializer,
    GymFeatureConfigSerializer,
    GymOnboardingSerializer,
    EquipmentSerializer,
    AnnouncementSerializer,
    PublicGymRegistrationSerializer,
)


class GymViewSet(viewsets.ModelViewSet):
    """
    Gym CRUD.
    - Super Admin: all gyms (create / list / update / delete)
    - Gym Owner:   only their own gym (retrieve / partial_update)
    """
    serializer_class = GymSerializer
    queryset = Gym.objects.all()

    def get_permissions(self):
        if self.action in ["create", "destroy"]:
            return [IsSuperAdmin()]
        return [IsGymOwnerOrSuperAdmin()]

    def get_queryset(self):
        user = self.request.user
        if user.role == ROLE_SUPER_ADMIN:
            return Gym.objects.all().order_by("-created_at")
        if user.gym:
            return Gym.objects.filter(id=user.gym.id)
        return Gym.objects.none()

    # ------------------------------------------------------------------
    # Create gym + owner in one atomic transaction
    # ------------------------------------------------------------------
    def create(self, request, *args, **kwargs):
        serializer = GymOnboardingSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        with transaction.atomic():
            name = serializer.validated_data["name"]
            subdomain = serializer.validated_data.get("subdomain") or ""

            if not subdomain:
                subdomain = re.sub(r"[^a-z0-9_]", "", name.lower().replace(" ", "_"))

            gym = Gym.objects.create(
                name=name,
                subdomain=subdomain,
                full_url=f"http://{subdomain}.localhost:5173",
            )

            owner_password = serializer.validated_data["owner_password"]
            owner = User.objects.create_user(
                email=serializer.validated_data["owner_email"],
                password=owner_password,
                first_name=serializer.validated_data["owner_name"],
                role=User.Roles.GYM_OWNER,
                gym=gym,
                is_verified=True,
            )

            # Send welcome email to new owner
            try:
                from core.email import send_owner_welcome_email
                send_owner_welcome_email(
                    to_email=owner.email,
                    owner_name=owner.first_name,
                    gym_name=gym.name,
                    gym_url=gym.full_url or f"http://{gym.subdomain}.localhost:5173",
                    password=owner_password,
                )
            except Exception:
                pass  # Never break gym creation because email failed

        return Response(
            {
                "id": str(gym.id),
                "name": gym.name,
                "subdomain": gym.subdomain,
                "dev_url": gym.dev_url,
                "prod_url": gym.prod_url,
                "full_url": gym.full_url,
                "is_configured": gym.is_configured,
                "owner_email": owner.email,
            },
            status=status.HTTP_201_CREATED,
        )

    # ------------------------------------------------------------------
    # Branding update (logo, cover, color)
    # ------------------------------------------------------------------
    @action(detail=True, methods=["patch"], permission_classes=[IsGymOwnerOrSuperAdmin],
            url_path="update-branding")
    def update_branding(self, request, pk=None):
        """
        PATCH /api/gyms/{id}/update-branding/
        Accepts: logo, cover_image, background_image, primary_color, theme (JSON)
        """
        gym = self.get_object()

        # Enforce tenant isolation for owners
        if request.user.role != ROLE_SUPER_ADMIN:
            if not request.user.gym or request.user.gym.id != gym.id:
                return Response({"detail": "Forbidden."}, status=403)

        if "logo" in request.FILES:
            gym.logo = request.FILES["logo"]
        if "cover_image" in request.FILES:
            gym.cover_image = request.FILES["cover_image"]
        if "background_image" in request.FILES:
            gym.background_image = request.FILES["background_image"]
        if "branding_image" in request.FILES:
            gym.branding_image = request.FILES["branding_image"]
        if "primary_color" in request.data:
            gym.primary_color = request.data["primary_color"]
        if "theme" in request.data:
            gym.theme_settings = request.data["theme"]

        gym.save()
        serializer = GymSerializer(gym, context={"request": request})
        return Response({
            "message": "Branding updated successfully",
            "data": serializer.data
        })

    # ------------------------------------------------------------------
    # Legacy branding (kept for backward compat)
    # ------------------------------------------------------------------
    @action(detail=True, methods=["post"], permission_classes=[IsGymOwnerOrSuperAdmin],
            url_path="set-branding")
    def set_branding(self, request, pk=None):
        gym = self.get_object()
        branding_image = request.FILES.get("branding_image")
        if not branding_image:
            return Response({"error": "No image provided"}, status=400)
        gym.branding_image = branding_image
        gym.save()
        return Response({"success": True, "branding_image": gym.branding_image.url})

    # ------------------------------------------------------------------
    # Approval API (Super Admin Only)
    # ------------------------------------------------------------------
    @action(detail=True, methods=["patch"], permission_classes=[IsSuperAdmin],
            url_path="approve")
    def approve(self, request, pk=None):
        """
        PATCH /api/gyms/{id}/approve/
        Approves and activates a gym.
        """
        gym = self.get_object()
        gym.status = "approved"
        gym.is_active = True
        gym.is_approved = True
        gym.save(update_fields=["status", "is_active", "is_approved", "updated_at"])
        
        # Ensure owner is also active if exists
        if gym.owner:
            gym.owner.is_active = True
            gym.owner.save(update_fields=["is_active"])

        return Response({
            "message": "Gym approved and activated successfully", 
            "status": gym.status,
            "is_active": gym.is_active
        }, status=status.HTTP_200_OK)

    # ------------------------------------------------------------------
    # Feature config (super admin configures; owner reads)
    # ------------------------------------------------------------------
    @action(detail=False, methods=["get"], permission_classes=[IsGymOwnerOrSuperAdmin],
            url_path="config")
    def config(self, request):
        gym_slug = request.GET.get("gym")
        if not gym_slug:
            return Response({"error": "?gym= param required"}, status=400)

        gym = Gym.objects.filter(subdomain=gym_slug).first()
        if not gym:
            return Response({"error": "Gym not found"}, status=404)

        # Owners can only read their own config
        if request.user.role != ROLE_SUPER_ADMIN:
            if not request.user.gym or request.user.gym.id != gym.id:
                return Response({"detail": "Forbidden."}, status=403)

        config_obj, _ = GymFeatureConfig.objects.get_or_create(gym=gym)

        return Response(GymFeatureConfigSerializer(config_obj).data)

    @action(detail=True, methods=["patch"], permission_classes=[IsGymOwnerOrSuperAdmin],
            url_path="update_config")
    def update_config(self, request, pk=None):
        """
        PATCH /api/gyms/{id}/update-config/
        Owner can update their own config; super admin can update any.
        Saving config marks the gym as is_configured=True.
        """
        gym = self.get_object()

        if request.user.role != ROLE_SUPER_ADMIN:
            if not request.user.gym or request.user.gym.id != gym.id:
                return Response({"detail": "Forbidden."}, status=403)

        config_obj, _ = GymFeatureConfig.objects.get_or_create(gym=gym)
        serializer = GymFeatureConfigSerializer(config_obj, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        # Mark gym as configured once settings are saved
        gym.is_configured = True
        gym.save(update_fields=["is_configured", "updated_at"])

        return Response({
            "message": "Configuration saved successfully",
            "data": serializer.data
        })

    # ------------------------------------------------------------------
    # Plans (nested under gym)
    # ------------------------------------------------------------------
    @action(detail=True, methods=["get", "post"], permission_classes=[IsGymOwnerOrSuperAdmin],
            url_path="plans")
    def plans(self, request, pk=None):
        gym = self.get_object()

        if request.method == "GET":
            plans = Plan.all_objects.filter(gym=gym)
            return Response(PlanSerializer(plans, many=True).data)

        # POST — create plan
        serializer = PlanSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(gym=gym)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


# ---------------------------------------------------------------------------
# GymRequest (any user can submit; super admin approves/rejects)
# ---------------------------------------------------------------------------

class GymRequestViewSet(viewsets.ModelViewSet):
    queryset = GymRequest.objects.all().order_by("-created_at")

    def get_serializer_class(self):
        if self.request.user.is_authenticated and self.request.user.role == ROLE_SUPER_ADMIN:
            return GymRequestAdminSerializer
        return GymRequestSerializer

    def get_permissions(self):
        if self.action == "create":
            return [permissions.AllowAny()]
        return [IsSuperAdmin()]

    @action(detail=True, methods=["post"], permission_classes=[IsSuperAdmin])
    def approve(self, request, pk=None):
        """
        FIXED: Create both the Gym and an owner User on approval.
        Sends welcome email to owner.
        """
        instance = self.get_object()
        if instance.status != GymRequest.Status.PENDING:
            return Response({"detail": "Already processed."}, status=400)

        owner_password = request.data.get("owner_password", "")
        if not owner_password or len(owner_password) < 6:
            return Response(
                {"detail": "Provide owner_password (min 6 chars) to approve."},
                status=400,
            )

        with transaction.atomic():
            gym = Gym.objects.create(
                name=instance.name,
                subdomain=instance.subdomain,
                full_url=f"http://{instance.subdomain}.localhost:5173",
                status="approved",
                is_approved=True,
                is_active=True,
            )

            # Create owner user
            owner = User.objects.filter(email__iexact=instance.owner_email).first()
            if owner:
                owner.role = User.Roles.GYM_OWNER
                owner.gym = gym
                owner.is_active = True
                owner.is_verified = True
                owner.save()
            else:
                owner = User.objects.create_user(
                    email=instance.owner_email,
                    password=owner_password or "Temp@123",
                    role=User.Roles.GYM_OWNER,
                    gym=gym,
                    is_active=True,
                    is_verified=True,
                )

            # Link owner to the gym
            gym.owner = owner
            gym.save(update_fields=["owner", "updated_at"])

            # Create default plan for immediate onboarding
            from gyms.models import Plan
            Plan.objects.create(
                gym=gym,
                name="Elite Membership",
                price=99.99,
                duration_days=30
            )

            instance.status = GymRequest.Status.APPROVED
            instance.approved_by = request.user
            instance.message = f"Approved by {request.user.email}."
            instance.save()

        # Welcome email
        try:
            from core.email import send_owner_welcome_email
            send_owner_welcome_email(
                to_email=owner.email,
                owner_name=owner.first_name or "Gym Owner",
                gym_name=gym.name,
                gym_url=gym.full_url,
                password=owner_password,
            )
        except Exception:
            pass

        return Response({
            "detail": "Gym approved and owner account created.",
            "gym_id": str(gym.id),
            "owner_email": owner.email,
            "gym_url": gym.full_url,
        })

    @action(detail=True, methods=["post"], permission_classes=[IsSuperAdmin])
    def reject(self, request, pk=None):
        instance = self.get_object()
        reason = request.data.get("reason", "")
        instance.status = GymRequest.Status.REJECTED
        instance.rejection_reason = reason
        instance.message = f"Rejected by {request.user.email}. Reason: {reason}"
        instance.save()
        return Response({"detail": "Gym request rejected.", "reason": reason})

class PublicGymRegistrationView(APIView):
    """
    POST /api/public/register-gym/
    Public endpoint for potential gym owners to request a new tenant.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = PublicGymRegistrationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(
            {"message": "Gym registration request received! We will contact you soon.", "id": serializer.data["id"]},
            status=status.HTTP_201_CREATED
        )


class PublicTenantConfigView(APIView):
    """
    GET /api/public/tenant-config/
    Returns branding config for the CURRENT tenant based on subdomain.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        # request.tenant is set by TenantSubdomainMiddleware
        tenant = getattr(request, "tenant", None)
        if not tenant:
            # Main site branding
            return Response({
                "gym_name": "777c8 ELITE",
                "is_tenant": False,
                "logo_url": None,
                "background_url": None,
                "primary_color": "#dc2626", # Default Red accent
                "theme_settings": {}
            })
        
        return Response({
            "gym_name": tenant.name,
            "is_tenant": True,
            "logo_url": tenant.logo.url if tenant.logo else None,
            "background_url": tenant.background_image.url if tenant.background_image else None,
            "primary_color": tenant.primary_color,
            "theme_settings": tenant.theme_settings
        })

# ---------------------------------------------------------------------------
# GymConfig (Standalone for PUT /api/config/{gym_id}/)
# ---------------------------------------------------------------------------

class GymConfigViewSet(viewsets.ViewSet):
    """
    Dedicated view for Super Admin to manage gym feature configurations.
    """
    permission_classes = [IsSuperAdmin]
    lookup_field = "gym_id"

    def update(self, request, gym_id=None):
        """
        PUT /api/gym/config/{gym_id}/
        Updates the feature configuration AND branding (logo, background, theme) for a gym.
        """
        from django.shortcuts import get_object_or_404
        gym = get_object_or_404(Gym, pk=gym_id)
        
        # 1. Update branding fields (on Gym model)
        gym_serializer = GymSerializer(gym, data=request.data, partial=True)
        gym_serializer.is_valid(raise_exception=True)
        gym_serializer.save()
        
        # 2. Update feature configuration (on GymFeatureConfig model)
        config_obj, _ = GymFeatureConfig.objects.get_or_create(gym=gym)
        config_serializer = GymFeatureConfigSerializer(config_obj, data=request.data, partial=True)
        config_serializer.is_valid(raise_exception=True)
        config_serializer.save()
        
        # Mark gym as configured
        if not gym.is_configured:
            gym.is_configured = True
            gym.save(update_fields=["is_configured", "updated_at"])
            
        return Response({
            "gym": gym_serializer.data,
            "feature_config": config_serializer.data
        })


from core.permissions import IsOwnerOrStaff

class AnnouncementViewSet(viewsets.ModelViewSet):
    serializer_class = AnnouncementSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        qs = Announcement.objects.filter(gym=user.gym, is_active=True)
        if user.role == 'member':
            from django.db.models import Q
            qs = qs.filter(Q(audience='all') | Q(audience='members'))
        elif user.role in ['trainer', 'staff']:
            from django.db.models import Q
            qs = qs.filter(Q(audience='all') | Q(audience='staff'))
        return qs

    def perform_create(self, serializer):
        serializer.save(gym=self.request.user.gym)

class EquipmentViewSet(viewsets.ModelViewSet):
    serializer_class = EquipmentSerializer
    permission_classes = [IsOwnerOrStaff]
    filterset_fields = ["status", "category"]
    ordering_fields = ["purchase_date", "next_maintenance"]

    def get_queryset(self):
        from gyms.models import Equipment
        return Equipment.objects.for_user(self.request.user)

    def perform_create(self, serializer):
        user = self.request.user
        serializer.save(gym=user.gym)
