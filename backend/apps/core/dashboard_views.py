from django.db.models import Count, Q, Sum
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from core.permissions import HasResolvedTenant
from django.utils import timezone

from core.config import ROLE_SUPER_ADMIN, ROLE_GYM_OWNER, ROLE_STAFF, ROLE_MEMBER
from members.models import Member
from payments.models import Payment
from attendance.models import Attendance
from gyms.models import Gym
from users.models import User
from notifications.models import Notification
from gyms.models import Equipment


class DashboardView(APIView):
    """
    Unified dashboard endpoint — returns role-specific data.

    GET /api/dashboard/
    Response shape adapts based on: super_admin / gym_owner / staff / member
    """
    permission_classes = [IsAuthenticated, HasResolvedTenant]

    def get(self, request):
        user = request.user
        role = getattr(user, "role", None)

        if role == ROLE_SUPER_ADMIN:
            return self._super_admin_dashboard()
        elif role == ROLE_GYM_OWNER:
            return self._owner_dashboard(user)
        elif role == ROLE_STAFF:
            return self._staff_dashboard(user)
        elif role == ROLE_MEMBER:
            return self._member_dashboard(user)
        else:
            return Response({"detail": "Unknown role."}, status=400)

    # ------------------------------------------------------------------
    # Super Admin Dashboard
    # ------------------------------------------------------------------
    def _super_admin_dashboard(self):
        total_gyms = Gym.objects.count()
        active_gyms = Gym.objects.filter(is_active=True).count()
        total_users = User.objects.count()
        total_members = Member.all_objects.count()
        
        from gyms.models import GymRequest
        pending_requests = GymRequest.objects.filter(status=GymRequest.Status.PENDING)
        pending_requests_count = pending_requests.count()

        gym_analytics = []
        for gym in Gym.objects.annotate(members_count=Count("members")).order_by("-created_at"):
            owner = User.objects.filter(gym=gym, role=ROLE_GYM_OWNER).first()
            gym_analytics.append({
                "id": str(gym.id),
                "name": gym.name,
                "subdomain": gym.subdomain,
                "full_url": gym.full_url,
                "members_count": gym.members_count,
                "is_configured": gym.is_configured,
                "is_active": gym.is_active,
                "owner_email": owner.email if owner else "No Owner",
                "created_at": gym.created_at,
            })

        return Response({
            "role": ROLE_SUPER_ADMIN,
            "total_gyms": total_gyms,
            "active_gyms": active_gyms,
            "total_users": total_users,
            "total_members": total_members,
            "pending_requests_count": pending_requests_count,
            "pending_requests": [
                {
                    "id": str(r.id),
                    "name": r.name,
                    "subdomain": r.subdomain,
                    "owner_email": r.owner_email,
                    "created_at": r.created_at,
                }
                for r in pending_requests
            ],
            "gym_wise_analytics": gym_analytics,
            "reports": [
                {"name": "All Gyms Summary", "url": "/api/reports/gyms/?export=pdf", "type": "pdf"},
                {"name": "Total Members Excel", "url": "/api/reports/members/?export=excel", "type": "excel"},
            ]
        })

    # ------------------------------------------------------------------
    # Gym Owner Dashboard
    # ------------------------------------------------------------------
    def _owner_dashboard(self, user):
        gym = user.gym
        if not gym:
            return Response({"detail": "No gym assigned."}, status=400)

        today = timezone.now().date()

        total_members = Member.all_objects.filter(gym=gym).count()
        active_members = Member.all_objects.filter(gym=gym, is_active=True).count()
        expired_members = Member.all_objects.filter(
            gym=gym, is_active=False, end_date__lt=today
        ).count()
        expiring_soon = Member.all_objects.filter(
            gym=gym,
            is_active=True,
            end_date__gte=today,
            end_date__lte=today + timezone.timedelta(days=7),
        ).count()

        attendance_today = Attendance.all_objects.filter(
            gym=gym, check_in__date=today
        ).count()

        # Revenue this month
        month_start = today.replace(day=1)
        revenue_this_month = Payment.all_objects.filter(
            gym=gym,
            status=Payment.Status.SUCCEEDED,
            paid_at__date__gte=month_start,
        ).aggregate(total=Sum("amount"))["total"] or 0

        # Total revenue
        total_revenue = Payment.all_objects.filter(
            gym=gym, status=Payment.Status.SUCCEEDED
        ).aggregate(total=Sum("amount"))["total"] or 0

        staff_count = User.objects.filter(gym=gym, role=ROLE_STAFF).count()

        unread_notifications = Notification.all_objects.filter(
            gym=gym, is_read=False
        ).count()

        # Recent members (last 5)
        recent_members = []
        for m in Member.all_objects.filter(gym=gym).select_related("user", "plan").order_by("-created_at")[:5]:
            recent_members.append({
                "id": str(m.id),
                "name": f"{m.user.first_name} {m.user.last_name}".strip() or m.user.email,
                "email": m.user.email,
                "plan": m.plan.name if m.plan else None,
                "end_date": m.end_date,
                "is_active": m.is_active,
            })

        # Membership growth (last 6 months)
        membership_growth = []
        for i in range(5, -1, -1):
            m_date = today - timezone.timedelta(days=i*30)
            month_label = m_date.strftime("%b")
            count = Member.all_objects.filter(gym=gym, created_at__year=m_date.year, created_at__month=m_date.month).count()
            membership_growth.append({"month": month_label, "members": count})

        # Recent Activity (Notifications)
        recent_activity = []
        for n in Notification.all_objects.filter(gym=gym).order_by("-created_at")[:10]:
            recent_activity.append({
                "id": str(n.id),
                "type": n.type,
                "title": n.title,
                "message": n.message,
                "created_at": n.created_at,
                "is_read": n.is_read
            })

        # Equipment Stats
        equipment_stats = Equipment.all_objects.filter(gym=gym).values("status").annotate(count=Count("id"))
        equipment_breakdown = {s["status"]: s["count"] for s in equipment_stats}

        # Revenue trends (last 6 months)
        revenue_growth = []
        for i in range(5, -1, -1):
            m_date = today - timezone.timedelta(days=i*30)
            month_label = m_date.strftime("%b")
            rev = Payment.all_objects.filter(
                gym=gym, 
                status=Payment.Status.SUCCEEDED,
                paid_at__year=m_date.year,
                paid_at__month=m_date.month
            ).aggregate(total=Sum("amount"))["total"] or 0
            revenue_growth.append({"month": month_label, "amount": float(rev)})

        return Response({
            "role": ROLE_GYM_OWNER,
            "gym": {"id": str(gym.id), "name": gym.name, "subdomain": gym.subdomain},
            "total_members": total_members,
            "active_members": active_members,
            "expired_members": expired_members,
            "expiring_soon": expiring_soon,
            "attendance_today": attendance_today,
            "staff_count": staff_count,
            "revenue_this_month": float(revenue_this_month),
            "total_revenue": float(total_revenue),
            "unread_notifications": unread_notifications,
            "recent_members": recent_members,
            "membership_growth": membership_growth,
            "revenue_growth": revenue_growth,
            "recent_activity": recent_activity,
            "equipment_stats": equipment_breakdown,
            "reports": [
                {"name": "Member List (PDF)", "url": "/api/reports/members/?export=pdf", "type": "pdf"},
                {"name": "Revenue Report (Excel)", "url": "/api/reports/revenue/?export=excel", "type": "excel"},
                {"name": "Staff List (Excel)", "url": "/api/reports/staff/?export=excel", "type": "excel"},
            ]
        })

    # ------------------------------------------------------------------
    # Staff Dashboard
    # ------------------------------------------------------------------
    def _staff_dashboard(self, user):
        gym = user.gym
        if not gym:
            return Response({"detail": "No gym assigned."}, status=400)

        today = timezone.now().date()

        total_members = Member.all_objects.filter(gym=gym, is_active=True).count()
        attendance_today = Attendance.all_objects.filter(
            gym=gym, check_in__date=today
        ).count()
        attendance_this_week = Attendance.all_objects.filter(
            gym=gym,
            check_in__date__gte=today - timezone.timedelta(days=7),
        ).count()

        # Members checked in today
        checked_in_today = []
        for att in Attendance.all_objects.filter(
            gym=gym, check_in__date=today
        ).select_related("member__user").order_by("-check_in")[:10]:
            m = att.member
            checked_in_today.append({
                "member_id": str(m.id),
                "name": f"{m.user.first_name} {m.user.last_name}".strip() or m.user.email,
                "check_in": att.check_in,
                "check_out": att.check_out,
            })

        expiring_soon = Member.all_objects.filter(
            gym=gym,
            is_active=True,
            end_date__gte=today,
            end_date__lte=today + timezone.timedelta(days=7),
        ).count()

        return Response({
            "role": ROLE_STAFF,
            "gym": {"id": str(gym.id), "name": gym.name, "subdomain": gym.subdomain},
            "total_active_members": total_members,
            "attendance_today": attendance_today,
            "attendance_this_week": attendance_this_week,
            "expiring_soon": expiring_soon,
            "checked_in_today": checked_in_today,
        })

    # ------------------------------------------------------------------
    # Member Dashboard
    # ------------------------------------------------------------------
    def _member_dashboard(self, user):
        gym = user.gym
        if not gym:
            return Response({"detail": "No gym assigned."}, status=400)

        try:
            member = user.member
        except Exception:
            return Response({"detail": "Member profile not found."}, status=404)

        today = timezone.now().date()
        days_left = None
        if member.end_date:
            days_left = max((member.end_date - today).days, 0)

        # Attendance history (last 10)
        attendance_history = []
        for att in Attendance.all_objects.filter(
            member=member
        ).order_by("-date")[:10]:
            attendance_history.append({
                "date": att.date,
                "check_in": att.check_in,
                "check_out": att.check_out,
            })

        unread_notifications = Notification.all_objects.filter(
            gym=gym, is_read=False
        ).count()

        return Response({
            "role": ROLE_MEMBER,
            "gym": {"id": str(gym.id), "name": gym.name},
            "member": {
                "id": str(member.id),
                "name": f"{user.first_name} {user.last_name}".strip() or user.email,
                "email": user.email,
                "plan": member.plan.name if member.plan else None,
                "start_date": member.start_date,
                "end_date": member.end_date,
                "is_active": member.is_active,
                "days_left": days_left,
            },
            "attendance_history": attendance_history,
            "unread_notifications": unread_notifications,
        })
