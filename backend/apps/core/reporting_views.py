import io
from django.utils import timezone
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.http import HttpResponse

from core.permissions import HasResolvedTenant, IsSuperAdmin, ROLE_SUPER_ADMIN, ROLE_GYM_OWNER, ROLE_STAFF
from gyms.models import Gym, Plan
from members.models import Member
from users.models import User
from attendance.models import Attendance
from payments.models import Payment

# Dependencies for exports
from openpyxl import Workbook
from reportlab.lib.pagesizes import letter, landscape
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib import colors

class ReportingViewSet(viewsets.ViewSet):
    """
    Unified Reporting API for Gym Owners and Super Admins.
    Supports customizable columns and exports to Excel/PDF.
    """
    permission_classes = [permissions.IsAuthenticated, HasResolvedTenant]

    def _get_columns(self, request, default_cols):
        cols_param = request.query_params.get("columns")
        if cols_param:
            req_cols = [c.strip() for c in cols_param.split(",") if c.strip()]
            # Filter requested columns to only include those in the default set
            return [c for c in req_cols if c in default_cols]
        return default_cols

    # -------------------------------------------------------------------------
    # 1. Members Report
    # -------------------------------------------------------------------------
    @action(detail=False, methods=["get"], url_path="members")
    def members_report(self, request):
        user = request.user
        tenant = getattr(request, "tenant", None)
        
        if user.role == ROLE_SUPER_ADMIN:
            queryset = Member.all_objects.all()
        else:
            queryset = Member.all_objects.filter(gym=tenant)

        # Basic Filter
        status_filter = request.query_params.get("status")
        if status_filter == "active":
            queryset = queryset.filter(end_date__gte=timezone.now().date())
        elif status_filter == "expired":
            queryset = queryset.filter(end_date__lt=timezone.now().date())

        default_cols = ["name", "email", "plan", "start_date", "end_date", "gym"]
        columns = self._get_columns(request, default_cols)

        data = []
        for m in queryset.select_related("user", "gym", "plan"):
            row = {}
            if "name" in columns: row["name"] = f"{m.user.first_name} {m.user.last_name}".strip() or m.user.email
            if "email" in columns: row["email"] = m.user.email
            if "plan" in columns: row["plan"] = m.plan.name if m.plan else "N/A"
            if "start_date" in columns: row["start_date"] = str(m.start_date) if m.start_date else "N/A"
            if "end_date" in columns: row["end_date"] = str(m.end_date) if m.end_date else "N/A"
            if "gym" in columns: row["gym"] = m.gym.name
            data.append(row)

        export_format = request.query_params.get("export")
        if export_format == "excel":
            return self._export_excel("Members_Report", columns, data)
        elif export_format == "pdf":
            return self._export_pdf("Members_Report", columns, data)

        return Response({"columns": columns, "data": data})

    # -------------------------------------------------------------------------
    # 2. Staff Report
    # -------------------------------------------------------------------------
    @action(detail=False, methods=["get"], url_path="staff")
    def staff_report(self, request):
        user = request.user
        tenant = getattr(request, "tenant", None)
        
        if user.role == ROLE_SUPER_ADMIN:
            # Super Admin sees everyone
            queryset = User.objects.filter(role__in=[ROLE_GYM_OWNER, ROLE_STAFF, ROLE_SUPER_ADMIN])
        else:
            # Gym Owner sees their staff and themselves
            queryset = User.objects.filter(gym=tenant, role__in=[ROLE_GYM_OWNER, ROLE_STAFF])

        default_cols = ["name", "email", "role", "joined_at", "gym"]
        columns = self._get_columns(request, default_cols)

        data = []
        for u in queryset.select_related("gym"):
            row = {}
            if "name" in columns: row["name"] = f"{u.first_name} {u.last_name}".strip() or u.email
            if "email" in columns: row["email"] = u.email
            if "role" in columns: row["role"] = u.get_role_display()
            if "joined_at" in columns: row["joined_at"] = u.date_joined.strftime("%Y-%m-%d")
            if "gym" in columns: row["gym"] = u.gym.name if u.gym else "Global"
            data.append(row)

        export_format = request.query_params.get("export")
        if export_format == "excel":
            return self._export_excel("Staff_Report", columns, data)
        elif export_format == "pdf":
            return self._export_pdf("Staff_Report", columns, data)

        return Response({"columns": columns, "data": data})

    # -------------------------------------------------------------------------
    # 3. Attendance Report
    # -------------------------------------------------------------------------
    @action(detail=False, methods=["get"], url_path="attendance")
    def attendance_report(self, request):
        user = request.user
        tenant = getattr(request, "tenant", None)
        
        if user.role == ROLE_SUPER_ADMIN:
            queryset = Attendance.objects.all()
        else:
            queryset = Attendance.objects.filter(gym=tenant)

        # Filters
        date_param = request.query_params.get("date")
        if date_param:
            queryset = queryset.filter(date=date_param)

        default_cols = ["member", "date", "check_in_time", "scan_method", "gym"]
        columns = self._get_columns(request, default_cols)

        data = []
        for a in queryset.select_related("member__user", "gym"):
            row = {}
            if "member" in columns: row["member"] = f"{a.member.user.first_name} {a.member.user.last_name}".strip() or a.member.user.email
            if "date" in columns: row["date"] = str(a.date)
            if "check_in_time" in columns: row["check_in_time"] = a.check_in_time.strftime("%H:%M") if a.check_in_time else "N/A"
            if "scan_method" in columns: row["scan_method"] = a.scan_method.title()
            if "gym" in columns: row["gym"] = a.gym.name
            data.append(row)

        export_format = request.query_params.get("export")
        if export_format == "excel":
            return self._export_excel("Attendance_Report", columns, data)
        elif export_format == "pdf":
            return self._export_pdf("Attendance_Report", columns, data)

        return Response({"columns": columns, "data": data})

    # -------------------------------------------------------------------------
    # EXPORT HELPERS
    # -------------------------------------------------------------------------
    def _export_excel(self, filename, columns, data):
        wb = Workbook()
        ws = wb.active
        ws.title = filename[:31]

        # Header
        ws.append([c.replace("_", " ").title() for c in columns])

        # Data
        for row in data:
            ws.append([row.get(c) for c in columns])

        output = io.BytesIO()
        wb.save(output)
        output.seek(0)

        response = HttpResponse(
            output.read(),
            content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        )
        response["Content-Disposition"] = f"attachment; filename={filename}.xlsx"
        return response

    def _export_pdf(self, filename, columns, data):
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=landscape(letter))
        styles = getSampleStyleSheet()
        elements = []

        # Title
        elements.append(Paragraph(filename.replace("_", " "), styles["Title"]))
        
        # Table Header
        header = [c.replace("_", " ").title() for c in columns]
        table_data = [header]

        # Table Rows
        for row in data:
            table_data.append([str(row.get(c, "")) for c in columns])

        # Create Table
        t = Table(table_data)
        t.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 12),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
        ]))

        elements.append(t)
        doc.build(elements)
        
        buffer.seek(0)
        response = HttpResponse(buffer.read(), content_type="application/pdf")
        response["Content-Disposition"] = f"attachment; filename={filename}.pdf"
        return response
