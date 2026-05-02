from __future__ import annotations

import json
import os
import secrets
from decimal import Decimal, InvalidOperation
from datetime import timedelta
from pathlib import Path

from django.conf import settings as django_settings
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.core.management import call_command
from django.db import transaction
from django.utils import timezone
from django.db.utils import OperationalError
from rest_framework.test import APIClient

from core.models import Documentation
from gyms.models import Gym, Plan
from members.models import Member
from members.services import assign_plan_and_activate
from payments.models import Payment
from payments.models import PaymentMethod
from payments.services import handle_payment_success
from users.models import User


def _parse_bool(value: str | None, default: bool = False) -> bool:
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "y", "on"}


def _parse_duration_to_days(duration: str) -> int:
    d = str(duration).strip().lower()
    if d.isdigit():
        return int(d)
    mapping = {"monthly": 30, "month": 30, "yearly": 365, "year": 365, "annual": 365}
    if d in mapping:
        return mapping[d]
    raise ValueError(f"Unknown plan duration: {duration!r}. Use monthly/yearly or a number of days.")


class Command(BaseCommand):
    help = "Full automated setup: migrations, demo data, documentation, and API validation."

    def add_arguments(self, parser):
        parser.add_argument(
            "--skip-demos",
            action="store_true",
            help="Run migrations and documentation only.",
        )

    def handle(self, *args, **options):
        skip_demos = options.get("skip_demos", False)

        self.stdout.write(self.style.NOTICE("Running migrations (with retries)…"))
        self._run_migrations_with_retries()

        self.stdout.write(self.style.NOTICE("Generating USER_MANUAL.md and DB documentation…"))
        self._generate_and_store_user_manual()

        if not skip_demos:
            self.stdout.write(self.style.NOTICE("Creating demo gyms, users, plans, memberships, and payments…"))
            self._bootstrap_demo_data()

            self.stdout.write(self.style.NOTICE("Running automated API + tenant isolation validations…"))
            self._run_validations()

        self.stdout.write(self.style.SUCCESS("Full setup completed successfully."))

    def _run_migrations_with_retries(self):
        # makemigrations is needed for the Documentation model + any recent changes
        call_command("makemigrations", interactive=False, verbosity=0)

        attempts = 3
        last_exc: Exception | None = None
        for i in range(attempts):
            try:
                call_command("migrate", interactive=False, verbosity=0)
                return
            except OperationalError as exc:
                last_exc = exc
                self.stdout.write(self.style.WARNING(f"Migration attempt {i + 1}/{attempts} failed: {exc}"))
                # Simple retry backoff (sleeps are acceptable for setup commands).
                import time

                time.sleep(2 * (i + 1))

        raise RuntimeError(f"Migrations failed after {attempts} attempts: {last_exc}")

    def _generate_and_store_user_manual(self) -> None:
        root_dir = Path(__file__).resolve().parents[3]
        manual_path = root_dir / "USER_MANUAL.md"

        # Non-technical user manual for real gym owners and staff.
        manual_md = """# Gym SaaS User Manual

## 1. Introduction
This system helps gym owners and staff manage members, membership plans, attendance, and payments in one place.

Each gym runs under its own website address using your gym’s subdomain (for example: `gym1.localhost` in this demo).

## Insert screenshot of app home/login here

---

## 2. How to Login
1. Open your gym’s website address in your browser.
   - Example: `http://gym1.localhost:5173`
2. Enter your email.
3. Enter your password.
4. Click **Sign in**.

If you are not allowed to access this gym, login will fail or you will see a “Forbidden/Invalid tenant” message.

## Insert screenshot of login screen here

---

## 3. Roles Explanation

### Super Admin
The Super Admin manages the overall platform and can view platform-wide information.

### Owner
The Owner manages the gym: adding members, assigning plans, tracking attendance, and checking payments.

### Trainer
The Trainer supports day-to-day gym operations. Trainers can view and update members (including plan updates) and record attendance.

### Member
Members can view their own membership details (for example: plan and membership dates). They cannot manage members or payments for the whole gym.

---

## 4. How to Use Key Features

### 4.1 Create a Gym (Super Admin)
1. Sign in as a **Super Admin**.
2. Open the system’s Administration Panel.
3. Create a new Gym entry using the gym name and subdomain (for example: `gym2`).
4. Create an **Owner** for that gym.

After creation, staff can sign in using the new gym’s subdomain address.

---

### 4.2 Add Members (Owner)
1. Sign in as an **Owner**.
2. Open **Members**.
3. In the **Create member** form:
   - Enter member email
   - Enter a password
   - Choose a membership plan
   - (Optional) Choose a start date
4. Click **Create member**.

The member will be added to your gym and assigned to the chosen plan.

## Insert screenshot: Members -> Create member form

---

### 4.3 Assign Plans (Owner / Trainer)
1. Sign in as an **Owner** or **Trainer**.
2. Open **Members**.
3. In **Update membership**:
   - Select the member
   - Choose the new plan
   - (Optional) Select a start date
4. Click **Update membership**.

The member’s membership dates update based on the selected plan.

## Insert screenshot: Members -> Update membership form

---

### 4.4 Track Attendance (Owner / Trainer)
1. Sign in as an **Owner** or **Trainer**.
2. Open **Attendance**.
3. Select a member.
4. Click **Check in today**.
5. When needed, click **Check out today**.

Attendance is tracked per member for the current date.

## Insert screenshot: Attendance page (check-in/check-out buttons)

---

### 4.5 Manage Payments (Owner)
1. Sign in as an **Owner**.
2. Open **Payments**.
3. In **Create payment**:
   - Select the member
   - Choose payment status
   - Enter the amount
   - Choose payment method (cash/UPI/card)
   - If the status is **Succeeded**, select the plan that will activate the membership
4. Click **Create payment**.

When a payment is marked as **Succeeded**, the system will activate the membership using the selected plan.

## Insert screenshot: Payments -> Create payment form

---

## 5. Dashboard Explanation

### Owner Dashboard
Shows:
- total members
- active vs. expired members
- total revenue and monthly revenue

## Insert screenshot: Owner dashboard

### Trainer Dashboard
Shows:
- number of active assigned members
- attendance count for today

## Insert screenshot: Trainer dashboard

### Super Admin Dashboard
Shows platform-level analytics such as total gyms, total users, and revenue across all gyms.

## Insert screenshot: Super Admin dashboard

---

## 6. Common Workflows (Examples)

### Example A: Add a new member and set their plan
1. Go to **Members**
2. Click **Create member**
3. Choose the correct plan
4. Click **Create member**

### Example B: Upgrade a member’s plan
1. Go to **Members**
2. Find the member in the **Update membership** section
3. Select the new plan
4. Click **Update membership**

### Example C: Record attendance for today
1. Go to **Attendance**
2. Pick the member
3. Click **Check in today**
4. Later click **Check out today**

---

## 7. Troubleshooting

### Login fails
Common causes:
1. You used the wrong gym address (subdomain). Make sure the browser address matches your gym (example: `gym1.localhost`).
2. Email or password is incorrect.
3. Your account role does not match what you are trying to do.

### “Forbidden” or access denied
This usually means:
- you are logged into the correct account, but
- you are viewing the wrong gym subdomain, or
- your role does not have permission for that action.

### Payments don’t activate membership
Double-check:
1. Payment status should be **Succeeded**
2. You selected a plan (when status is succeeded)

---

## 8. Insert Screenshot Summary
- Insert screenshot of dashboard here
- Insert screenshot of members list here
- Insert screenshot of attendance here
- Insert screenshot of payments here
"""

        # Write the markdown file for humans.
        manual_path.write_text(manual_md, encoding="utf-8")

        # Store (and version) the manual inside the database.
        title = "User Manual"
        latest = (
            Documentation.objects.filter(title=title, is_active=True)
            .order_by("-version", "-updated_at")
            .first()
        )
        if latest is not None and latest.content == manual_md:
            return

        next_version = 1 if latest is None else (latest.version + 1)
        Documentation.objects.create(title=title, content=manual_md, version=next_version, is_active=True)

    @transaction.atomic
    def _bootstrap_demo_data(self) -> None:
        UserModel = get_user_model()

        gym_name = os.environ["GYM_NAME"]
        gym_subdomain = os.environ["GYM_SUBDOMAIN"]

        super_admin_email = os.environ["SUPER_ADMIN_EMAIL"]
        super_admin_password = os.environ["SUPER_ADMIN_PASSWORD"]

        owner_name = os.environ["OWNER_NAME"]
        owner_email = os.environ["OWNER_EMAIL"]
        owner_password = os.environ["OWNER_PASSWORD"]

        domain = owner_email.split("@", 1)[1] if "@" in owner_email else "gym.com"
        demo_user_password = os.environ.get("DEMO_USER_PASSWORD", owner_password)

        number_of_members = int(os.environ.get("NUMBER_OF_DEMO_MEMBERS", "0"))
        number_of_trainers = int(os.environ.get("NUMBER_OF_DEMO_TRAINERS", "2"))
        enable_payments = _parse_bool(os.environ.get("ENABLE_DEMO_PAYMENTS", "false"), default=False)

        raw_plans = os.environ.get("DEMO_MEMBERSHIP_PLANS_JSON", "[]")
        plans_spec = json.loads(raw_plans)

        if not isinstance(plans_spec, list) or not plans_spec:
            raise ValueError("DEMO_MEMBERSHIP_PLANS_JSON must be a non-empty JSON list of plans.")

        plan_objs: list[Plan] = []
        today = timezone.localdate()

        # Gym
        gym, _ = Gym.objects.update_or_create(
            subdomain=gym_subdomain,
            defaults={"name": gym_name, "is_active": True},
        )

        # Create plans for this gym.
        for p in plans_spec:
            name = str(p["name"])
            price = Decimal(str(p["price"]))
            duration_days = _parse_duration_to_days(p["duration"])

            plan_obj = Plan.all_objects.filter(gym=gym, name=name).first()
            if plan_obj is None:
                plan_obj = Plan.all_objects.create(gym=gym, name=name, price=price, duration_days=duration_days)
            else:
                plan_obj.price = price
                plan_obj.duration_days = duration_days
                plan_obj.save(update_fields=["price", "duration_days", "updated_at"])
            plan_objs.append(plan_obj)

        # Ensure Super Admin
        super_admin, created = UserModel.objects.get_or_create(
            email=super_admin_email,
            defaults={
                "role": User.Roles.SUPER_ADMIN,
                "is_verified": True,
            },
        )
        if created:
            super_admin.set_password(super_admin_password)
            super_admin.is_staff = True
            super_admin.is_superuser = True
            super_admin.gym = None
            super_admin.save()
        else:
            super_admin.set_password(super_admin_password)
            super_admin.role = User.Roles.SUPER_ADMIN
            super_admin.is_verified = True
            super_admin.is_staff = True
            super_admin.is_superuser = True
            super_admin.gym = None
            super_admin.save(update_fields=["password", "role", "is_verified", "is_staff", "is_superuser", "gym"])

        # Ensure Owner
        owner_first, owner_last = (owner_name.split(" ", 1) + [""])[:2] if owner_name else ("Owner", "")
        owner_user, created = UserModel.objects.get_or_create(
            email=owner_email,
            defaults={
                "role": User.Roles.GYM_OWNER,
                "is_verified": True,
                "gym": gym,
                "first_name": owner_first,
                "last_name": owner_last,
            },
        )
        if created:
            owner_user.set_password(owner_password)
            owner_user.save()
        else:
            owner_user.set_password(owner_password)
            owner_user.role = User.Roles.GYM_OWNER
            owner_user.is_verified = True
            owner_user.gym = gym
            owner_user.first_name = owner_first
            owner_user.last_name = owner_last
            owner_user.save(
                update_fields=["password", "role", "is_verified", "gym", "first_name", "last_name"]
            )

        # Trainers
        for i in range(1, number_of_trainers + 1):
            email = f"trainer{i}@{domain}"
            trainer_first = f"Trainer{i}"
            trainer_last = ""
            trainer, created = UserModel.objects.get_or_create(
                email=email,
                defaults={
                    "role": User.Roles.STAFF,
                    "is_verified": True,
                    "gym": gym,
                    "first_name": trainer_first,
                    "last_name": trainer_last,
                },
            )
            if created:
                trainer.set_password(demo_user_password)
                trainer.save()
            else:
                trainer.set_password(demo_user_password)
                trainer.role = User.Roles.STAFF
                trainer.is_verified = True
                trainer.gym = gym
                trainer.first_name = trainer_first
                trainer.last_name = trainer_last
                trainer.save(update_fields=["password", "role", "is_verified", "gym", "first_name", "last_name"])

        # Members
        for i in range(1, number_of_members + 1):
            email = f"member{i}@{domain}"
            first_name = f"Member{i}"
            last_name = ""
            member_user, created = UserModel.objects.get_or_create(
                email=email,
                defaults={
                    "role": User.Roles.MEMBER,
                    "is_verified": True,
                    "gym": gym,
                    "first_name": first_name,
                    "last_name": last_name,
                },
            )
            if created:
                member_user.set_password(demo_user_password)
                member_user.save()
            else:
                member_user.set_password(demo_user_password)
                member_user.role = User.Roles.MEMBER
                member_user.is_verified = True
                member_user.gym = gym
                member_user.first_name = first_name
                member_user.last_name = last_name
                member_user.save(update_fields=["password", "role", "is_verified", "gym", "first_name", "last_name"])

            chosen_plan = plan_objs[(i - 1) % len(plan_objs)]

            member_obj, _ = Member.all_objects.update_or_create(
                user=member_user,
                defaults={
                    "gym": gym,
                    "plan": chosen_plan,
                },
            )
            # Activate / set membership dates.
            assign_plan_and_activate(member_obj, chosen_plan)

            if enable_payments:
                transaction_id = f"{gym_subdomain}_seed_member{i}_txn"
                payment = Payment.all_objects.filter(transaction_id=transaction_id).first()
                if payment is None:
                    payment = Payment.all_objects.create(
                        gym=gym,
                        member=member_obj,
                        amount=chosen_plan.price,
                        payment_method=PaymentMethod.CARD,
                        status=Payment.Status.PENDING,
                        transaction_id=transaction_id,
                        paid_at=None,
                    )

                if payment.status != Payment.Status.SUCCEEDED:
                    handle_payment_success(payment, plan=chosen_plan, create_notification_flag=True)

        # Create a second gym entry (used only for tenant isolation validation).
        other_subdomain = f"{gym_subdomain}-other"
        Gym.objects.update_or_create(
            subdomain=other_subdomain,
            defaults={"name": f"{gym_name} (Other)", "is_active": True},
        )

    def _run_validations(self) -> None:
        UserModel = get_user_model()
        gym_subdomain = os.environ["GYM_SUBDOMAIN"]
        other_subdomain = f"{gym_subdomain}-other"

        super_admin_email = os.environ["SUPER_ADMIN_EMAIL"]
        super_admin_password = os.environ["SUPER_ADMIN_PASSWORD"]

        owner_email = os.environ["OWNER_EMAIL"]
        owner_password = os.environ["OWNER_PASSWORD"]

        host_gym1 = f"{gym_subdomain}.localhost"
        host_gym2 = f"{other_subdomain}.localhost"

        def login(client_host: str, email: str, password: str) -> dict:
            payload = {"email": email, "password": password}
            res = client.post(
                "/api/auth/login",
                payload,
                format="json",
                HTTP_HOST=client_host,
            )
            if res.status_code != 200 or not res.data.get("success"):
                raise RuntimeError(f"Login failed for {email} on host {client_host}: {res.status_code} {res.data}")
            return res.data["data"]

        client = APIClient()

        # Owner login (gym1)
        owner_tokens = login(host_gym1, owner_email, owner_password)
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {owner_tokens['access']}")

        # Refresh token should work.
        refresh_res = client.post(
            "/api/auth/refresh/",
            {"refresh": owner_tokens["refresh"]},
            format="json",
            HTTP_HOST=host_gym1,
        )
        if refresh_res.status_code != 200:
            raise RuntimeError(f"Token refresh failed: {refresh_res.status_code} {refresh_res.data}")

        # Owner CRUD: members list should be tenant-scoped (host gym1)
        members_res = client.get("/api/members/", HTTP_HOST=host_gym1)
        if members_res.status_code != 200:
            raise RuntimeError(f"Members list failed: {members_res.status_code} {members_res.data}")

        # Tenant isolation: owner token on gym2 should be blocked.
        blocked_res = client.get("/api/members/", HTTP_HOST=host_gym2)
        if blocked_res.status_code not in {400, 401, 403}:
            raise RuntimeError(f"Tenant isolation failed (expected forbidden). Status: {blocked_res.status_code} {blocked_res.data}")

        # Gyms endpoint should be tenant-scoped for owner.
        gyms_res = client.get("/api/gyms/", HTTP_HOST=host_gym1)
        if gyms_res.status_code != 200:
            raise RuntimeError(f"Gyms list failed: {gyms_res.status_code} {gyms_res.data}")

        # Payment create should succeed for owner.
        gym = Gym.objects.get(subdomain=gym_subdomain)
        plan = Plan.all_objects.filter(gym=gym).first()
        member = Member.all_objects.filter(gym=gym).first()
        if plan is None or member is None:
            raise RuntimeError("Demo bootstrap did not create plan/member as expected.")

        create_payment_res = client.post(
            "/api/payments/",
            {
                "member": str(member.id),
                "plan": str(plan.id),
                "amount": str(plan.price),
                "payment_method": "card",
                "status": Payment.Status.SUCCEEDED,
                "transaction_id": f"{gym_subdomain}_validation_txn",
            },
            format="json",
            HTTP_HOST=host_gym1,
        )
        if create_payment_res.status_code not in {200, 201}:
            raise RuntimeError(f"Payment creation failed: {create_payment_res.status_code} {create_payment_res.data}")

        # Attendance check-in/out should work and be tenant-scoped.
        check_in_res = client.post(
            "/api/attendance/check-in/",
            {"member_id": str(member.id)},
            format="json",
            HTTP_HOST=host_gym1,
        )
        if check_in_res.status_code != 200:
            raise RuntimeError(f"Attendance check-in failed: {check_in_res.status_code} {check_in_res.data}")

        check_out_res = client.post(
            "/api/attendance/check-out/",
            {"member_id": str(member.id)},
            format="json",
            HTTP_HOST=host_gym1,
        )
        if check_out_res.status_code != 200:
            raise RuntimeError(f"Attendance check-out failed: {check_out_res.status_code} {check_out_res.data}")

        # Super Admin login should succeed on any gym host.
        client.credentials()  # clear auth
        super_tokens = login(host_gym2, super_admin_email, super_admin_password)
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {super_tokens['access']}")

        # Super admin gyms list should include both gyms.
        gyms_all_res = client.get("/api/gyms/", HTTP_HOST=host_gym2)
        if gyms_all_res.status_code != 200:
            raise RuntimeError(f"Super admin gyms list failed: {gyms_all_res.status_code} {gyms_all_res.data}")

