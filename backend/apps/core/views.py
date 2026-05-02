from django.db.models import Q
from django.contrib.auth import get_user_model
from django.views.generic import TemplateView
from rest_framework.permissions import AllowAny, IsAuthenticated
from core.permissions import HasResolvedTenant
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import viewsets

import os





# ---------------------------------------------------------------------------
# System Status (Health Check)
# ---------------------------------------------------------------------------

class HealthCheckView(APIView):
    """
    GET /api/health/
    Public endpoint for load balancers and monitoring.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        return Response({"status": "ok", "message": "ForYou Gym SaaS Backend is operational."})


# ---------------------------------------------------------------------------
# User Manual (role-specific JSON docs)
# ---------------------------------------------------------------------------

class ManualView(APIView):
    """
    GET  /api/docs/manual/  — returns role-specific manual JSON
    PUT  /api/docs/manual/  — super admin updates a manual (by role)
    """
    permission_classes = [AllowAny, HasResolvedTenant]

    def get(self, request):
        role_param = request.query_params.get("role", "").strip()

        from core.config import ROLE_GYM_OWNER, ROLE_STAFF, ROLE_SUPER_ADMIN, ROLE_MEMBER
        if request.user.is_authenticated:
            if role_param and request.user.role == ROLE_SUPER_ADMIN:
                role = role_param
            else:
                role = getattr(request.user, "role", ROLE_MEMBER)
        else:
            role = ROLE_MEMBER

        # Normalize role aliases (legacy or frontend mismatches)
        role_map = {"trainer": ROLE_STAFF, "owner": ROLE_GYM_OWNER}
        role = role_map.get(role, role)

        from core.models import UserManual
        try:
            manual = UserManual.objects.get(role=role)
            return Response({
                "role": role.upper(),
                "title": manual.title,
                "sections": manual.content,
                "updated_at": manual.updated_at,
            })
        except UserManual.DoesNotExist:
            return Response({"error": "No manual configured for this role."}, status=404)

    def put(self, request):
        from core.models import UserManual
        if not request.user.is_authenticated or request.user.role != "super_admin":
            return Response({"error": "Forbidden"}, status=403)

        role = request.data.get("role")
        title = request.data.get("title")
        content = request.data.get("content")

        valid_roles = ["super_admin", "owner", "staff", "member"]
        if not role or role not in valid_roles:
            return Response({"error": f"Invalid role. Choose from: {valid_roles}"}, status=400)

        manual, _ = UserManual.objects.get_or_create(role=role)
        if title:
            manual.title = title
        if content:
            manual.content = content
        manual.save()

        # Regenerate PDF
        try:
            from core.utils.manual_utils import generate_manual_pdf
            generate_manual_pdf(manual)
        except Exception:
            pass  # PDF generation is optional

        return Response({"success": True, "title": manual.title, "role": role})


# ---------------------------------------------------------------------------
# Tenant Branding
# ---------------------------------------------------------------------------

class TenantBrandingView(APIView):
    """
    GET /api/tenant/branding/
    Public endpoint — returns branding assets for the current tenant gym.
    Tenant resolved by subdomain via TenantSubdomainMiddleware.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        tenant = getattr(request, "tenant", None)
        default_primary = "#22c55e"
        from core.permissions import IsSuperAdmin

        if tenant is None:
            return Response({
                "success": True,
                "message": "Global branding resolved",
                "data": {
                    "gym": None,
                    "features": {
                        "enable_google_auth": False,
                        "enable_whatsapp_otp": False,
                        "enable_email_login": True,
                        "enable_reminders": False,
                    },
                    "branding": {
                        "logo_url": None,
                        "cover_url": None,
                        "primary_color": default_primary,
                    },
                },
                "errors": None,
            })

        logo_url = request.build_absolute_uri(tenant.logo.url) if tenant.logo else None

        cover_url = None
        if getattr(tenant, "cover_image", None):
            cover_url = request.build_absolute_uri(tenant.cover_image.url)
        elif tenant.background_image:
            cover_url = request.build_absolute_uri(tenant.background_image.url)

        branding_image_url = None
        if tenant.branding_image:
            branding_image_url = request.build_absolute_uri(tenant.branding_image.url)

        primary_color = tenant.primary_color or default_primary

        features = {
            "enable_google_auth": False,
            "enable_whatsapp_otp": False,
            "enable_email_login": True,
            "enable_reminders": False,
        }

        if tenant.is_configured:
            try:
                from gyms.utils import get_gym_config
                config = get_gym_config(tenant)
                features = {
                    "enable_google_auth": config.enable_google_auth,
                    "enable_whatsapp_otp": config.enable_whatsapp_otp,
                    "enable_email_login": config.enable_email_login,
                    "enable_reminders": config.enable_reminders,
                }
            except ValueError:
                pass

        return Response({
            "success": True,
            "message": "Gym branding resolved",
            "data": {
                "gym": {
                    "id": str(tenant.id),
                    "name": tenant.name,
                    "subdomain": tenant.subdomain,
                    "full_url": tenant.full_url,
                    "is_configured": tenant.is_configured,
                },
                "features": features,
                "branding": {
                    "logo_url": logo_url,
                    "cover_url": cover_url,
                    "branding_image": branding_image_url,
                    "primary_color": primary_color,
                },
            },
            "errors": None,
        })


# ---------------------------------------------------------------------------
# Global Search
# ---------------------------------------------------------------------------

class SearchAPIView(APIView):
    """
    GET /api/search/?q=query
    Global search across Members, Gyms, and Users.
    Results are scoped by role/tenant.
    """
    permission_classes = [IsAuthenticated, HasResolvedTenant]

    def get(self, request):
        query = request.query_params.get("q", "").strip()
        if not query or len(query) < 2:
            return Response({"members": [], "gyms": [], "users": []})

        user = request.user
        role = getattr(user, "role", None)
        
        from django.contrib.auth import get_user_model
        User = get_user_model()

        from members.models import Member
        from gyms.models import Gym
        # 1. Members — FIXED: use user__ traversal since Member has no direct name/email
        member_qs = Member.all_objects.filter(
            Q(user__first_name__icontains=query)
            | Q(user__last_name__icontains=query)
            | Q(user__email__icontains=query)
        )
        if role != "super_admin":
            member_qs = member_qs.filter(gym=user.gym)

        member_data = [
            {
                "id": str(m.id),
                "name": f"{m.user.first_name} {m.user.last_name}".strip() or m.user.email,
                "email": m.user.email,
                "type": "member",
            }
            for m in member_qs[:5]
        ]

        # 2. Gyms — Super Admin only
        gym_data = []
        if role == "super_admin":
            gyms = Gym.objects.filter(
                Q(name__icontains=query) | Q(subdomain__icontains=query)
            )[:5]
            gym_data = [
                {"id": str(g.id), "name": g.name, "subdomain": g.subdomain, "type": "gym"}
                for g in gyms
            ]

        # 3. Users (staff/owners) — FIXED: removed username field (doesn't exist)
        user_qs = User.objects.filter(
            Q(email__icontains=query)
            | Q(first_name__icontains=query)
            | Q(last_name__icontains=query)
        )
        if role != "super_admin":
            user_qs = user_qs.filter(gym=user.gym)

        user_data = [
            {"id": str(u.id), "name": f"{u.first_name} {u.last_name}".strip() or u.email,
             "email": u.email, "type": "user", "role": u.role}
            for u in user_qs[:5]
        ]

        return Response({"members": member_data, "gyms": gym_data, "users": user_data})


# ---------------------------------------------------------------------------
# User Manual File (PDF)
# ---------------------------------------------------------------------------

class UserManualFileView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        role = getattr(request.user, "role", "member") if request.user.is_authenticated else "member"
        role_map = {"gym_owner": "owner", "trainer": "staff"}
        role = role_map.get(role, role)

        from core.models import UserManual
        try:
            manual = UserManual.objects.get(role=role)
            if not manual.file:
                try:
                    from core.utils.manual_utils import generate_manual_pdf
                    generate_manual_pdf(manual)
                except Exception:
                    pass

            return Response({
                "url": request.build_absolute_uri(manual.file.url) if manual.file else None,
                "title": manual.title,
                "updated_at": manual.updated_at,
            })
        except UserManual.DoesNotExist:
            return Response({"error": "Manual not found"}, status=404)


# ---------------------------------------------------------------------------
# Support Message (Chat History & Auto-Reply)
# ---------------------------------------------------------------------------

class SupportMessageView(APIView):
    """
    POST /api/support/message/
    Saves user message and returns role-based default reply.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        text = request.data.get("text", "").strip()
        if not text:
            return Response({"error": "Message text is required."}, status=400)

        # 1. Resolve role and gym
        user = request.user if request.user.is_authenticated else None
        role = getattr(user, "role", "member") if user else "member"
        gym = getattr(user, "gym", None) if user else None

        # 2. Save Message
        from core.models import SupportMessage, SupportConfig
        SupportMessage.objects.create(
            text=text,
            role=role,
            user=user,
            gym=gym
        )

        # 3. Resolve Auto-Reply (Priority: Role-Specific -> Global -> Default)
        default_reply_obj = SupportConfig.objects.filter(role=role, is_active=True).exclude(default_reply__isnull=True).exclude(default_reply="").first()
        if not default_reply_obj:
            default_reply_obj = SupportConfig.objects.filter(role='global', is_active=True).exclude(default_reply__isnull=True).exclude(default_reply="").first()

        response_text = default_reply_obj.default_reply if default_reply_obj else "Hi! Our team will get back to you shortly. For immediate help, try asking about 'login' or 'members'."
        
        return Response({
            "user_message": text,
            "response": response_text
        })


class SupportChatView(APIView):
    """
    POST /api/support/chat/
    Keyword-matching FAQ bot with DB-backed answers.
    """
    permission_classes = [AllowAny]

    KEYWORDS = {
        "password": "To reset your password, contact your gym administrator. They can update your account from the Users section.",
        "forgot": "If you forgot your password, contact your gym administrator and they'll reset it for you.",
        "attendance": "Go to 'Attendance', search for the member by name, then click the check-in button.",
        "check in": "Go to 'Attendance', search the member's name, and click 'Check In'.",
        "payment": "Go to 'Payments' in the sidebar to view payment history and status.",
        "member": "Go to 'Members' to add, view, or manage members. Click 'Add Member' to register a new one.",
        "add member": "Click 'Members', then 'Add Member'. Fill in name, email, phone, and plan, then save.",
        "login": "Enter your email and password on the login page. Contact your admin if you cannot log in.",
        "gym": "Gyms are managed by the Super Admin. Log in as Super Admin to create or manage gyms.",
        "dashboard": "Your dashboard shows total members, today's attendance, and recent activity.",
        "manual": "Go to 'Help Center' in the sidebar to view and download your user manual.",
        "help": "You're in the Help Center! Ask about: login, members, attendance, payments, or password.",
        "config": "Gym settings are managed by the Super Admin. Open gym settings (gear icon) to configure features.",
        "url": "In the Super Admin dashboard, find the gym and click 'Copy URL'.",
        "create gym": "As Super Admin, click 'Create New Gym', fill in the details, and click 'Create'.",
        "staff": "Staff can be added via the Staff section. Assign them the 'Staff' role and link to a gym.",
        "plan": "Membership plans are managed in gym settings. Contact your Super Admin to modify plans.",
        "notification": "Notifications are sent automatically for new members, renewals, and expiry reminders.",
        "expire": "Go to 'Members' and filter by 'Expiring Soon' to see members whose membership is ending.",
        "renew": "To renew a membership, open the member profile and update their plan and start date.",
    }

    def post(self, request):
        user_message = request.data.get("message", "").strip().lower()
        role = getattr(request.user, "role", "member") if request.user.is_authenticated else "member"

        if not user_message:
            return Response({"reply": "Hi! How can I help you? Try asking about login, members, attendance, or payments."})

        from core.models import SupportConfig, SupportNode
        
        # 1. Check for SupportFlow Nodes (Priority 1)
        node = SupportNode.objects.filter(is_active=True, target=role).first()
        if not node:
            node = SupportNode.objects.filter(is_active=True, target='global').first()
        
        if node and node.message.lower() in user_message:
            return Response({"reply": node.message})

        # 2. Match specific role FAQs next (SupportConfig)
        configs = SupportConfig.objects.filter(is_active=True)
        role_matches = configs.filter(role=role)
        for config in role_matches:
            if config.keyword.lower() in user_message:
                return Response({"reply": config.response})

        # 3. Match global role next
        global_matches = configs.filter(role="global")
        for config in global_matches:
            if config.keyword.lower() in user_message:
                return Response({"reply": config.response})

        # 4. Keyword fallback (Hardcoded defaults)
        for kw, resp in self.KEYWORDS.items():
            if kw in user_message:
                return Response({"reply": resp})

        # 5. Final Fallback
        return Response({
            "reply": "I'm not sure about that. Please contact our support team at support@foryougym.com for specialized assistance."
        })


# ---------------------------------------------------------------------------
# Support Config (Super Admin CRUD for FAQ)
# ---------------------------------------------------------------------------

class DocumentationViewSet(viewsets.ModelViewSet):
    """
    System documentation — versioned.
    Admin: Full CRUD
    Others: Read-only (latest version)
    """

    def get_serializer_class(self):
        from core.serializers import DocumentationSerializer
        return DocumentationSerializer

    def get_permissions(self):
        from core.permissions import IsSuperAdmin
        if self.action in ["list", "retrieve"]:
            return [IsAuthenticated()]
        return [IsSuperAdmin()]

    def get_queryset(self):
        from core.models import Documentation
        qs = Documentation.objects.all()
        if self.action == "list":
            # For non-admins, maybe only show the latest version per title?
            # For simplicity, we just order by version descending.
            return qs.order_by("title", "-version")
        return qs


class SupportConfigViewSet(viewsets.ModelViewSet):

    def get_serializer_class(self):
        from core.serializers import SupportConfigSerializer
        return SupportConfigSerializer

    def get_permissions(self):
        from core.permissions import IsSuperAdmin
        if self.action in ["list", "retrieve"]:
            return [IsAuthenticated()]
        return [IsSuperAdmin()]

    def get_queryset(self):
        from core.models import SupportConfig
        user = self.request.user
        if user.role == "super_admin":
            return SupportConfig.objects.all()
        # Non-admins can only read global or role-specific FAQs
        return SupportConfig.objects.filter(
            Q(role="global") | Q(role=user.role),
            is_active=True,
        )

    def update(self, request, *args, **kwargs):
        """
        Explicitly use partial=True for Support Config updates as requested.
        """
        partial = True
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)
        
        self.perform_update(serializer)
        return Response(serializer.data)


class SupportNodeViewSet(viewsets.ModelViewSet):
    """
    CRUD for the new SupportNode flow.
    """
    def get_serializer_class(self):
        from core.serializers import SupportNodeSerializer
        return SupportNodeSerializer

    def get_permissions(self):
        from core.permissions import IsSuperAdmin
        return [IsSuperAdmin()]

    def get_queryset(self):
        from core.models import SupportNode
        return SupportNode.objects.all()

    def create(self, request, *args, **kwargs):
        """
        Explicit POST override to ensure field mapping as requested.
        """
        data = request.data
        from core.models import SupportNode
        node = SupportNode.objects.create(
            message=data.get("message"),
            target=data.get("target"),
            gym=None,  # global
            is_active=True
        )
        serializer = self.get_serializer(node)
        return Response(serializer.data, status=201)


# ---------------------------------------------------------------------------
# Frontend SPA fallback
# ---------------------------------------------------------------------------

class FrontendAppView(TemplateView):
    template_name = "index.html"

    def get(self, request, *args, **kwargs):
        # Safety check: if index.html is missing, the frontend hasn't been built.
        # We return a helpful message instead of a 500 Internal Server Error.
        from django.conf import settings
        import os
        
        build_dir = settings.TEMPLATES[0]["DIRS"][0] if settings.TEMPLATES else ""
        index_path = os.path.join(build_dir, "index.html")
        
        if not os.path.exists(index_path):
            from django.http import HttpResponse
            return HttpResponse(
                "<html><body style='font-family:sans-serif; display:flex; flex-direction:column; align-items:center; justify-content:center; height:100vh; background:#0f172a; color:white; text-align:center;'>"
                "<h1 style='color:#facc15;'>Frontend Build Missing</h1>"
                "<p style='max-width:500px; line-height:1.6;'>The Django backend is running, but <code>frontend/dist/index.html</code> was not found.</p>"
                "<div style='background:#1e293b; padding:20px; border-radius:8px; border:1px solid #334155; margin-top:20px; font-family:monospace;'>"
                "cd frontend<br/>npm install<br/>npm run build"
                "</div>"
                "<p style='margin-top:20px; opacity:0.7;'>Alternatively, run <b>npm run dev</b> in the frontend folder and access <b>http://localhost:5173</b></p>"
                "</body></html>"
            )
        
        return super().get(request, *args, **kwargs)
