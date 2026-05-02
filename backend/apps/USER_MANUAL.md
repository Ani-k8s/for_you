# Gym SaaS User Manual

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
