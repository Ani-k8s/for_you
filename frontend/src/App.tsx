import React from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import RequireAuth from './components/RequireAuth'
import ErrorBoundary from './components/ErrorBoundary'
import AppShell from './components/AppShell'
import LoginPage from './pages/LoginPage'
import LandingPage from './pages/LandingPage'
import RegisterGymPage from './pages/RegisterGymPage'
import OwnerDashboard from './pages/OwnerDashboard'
import TrainerDashboard from './pages/TrainerDashboard'
import SuperAdminDashboard from './pages/SuperAdminDashboard'
import RemindersPage from './pages/RemindersPage'
import MembersPage from './pages/MembersPage'
import MemberDashboard from './pages/MemberDashboard'

import AttendancePage from './pages/AttendancePage'
import HelpPage from './pages/HelpPage'
import GymsPage from './pages/GymsPage'
import UsersPage from './pages/UsersPage'
import SupportConfigPage from './pages/SupportConfigPage'
import ReportsPage from './pages/ReportsPage'
import RegistrationLinkPage from './pages/RegistrationLinkPage'
import BillingPage from './pages/BillingPage'
import EquipmentPage from './pages/EquipmentPage'
import FitnessPlansPage from './pages/FitnessPlansPage'
import AnnouncementsPage from './pages/AnnouncementsPage'
import ChatPage from './pages/ChatPage'

import { useGymBranding } from './branding/GymBrandingContext'
import { Loader2 } from 'lucide-react'
import { Toaster } from 'sonner'

export default function App() {
  const { isMainDomain, isLoading } = useGymBranding()

  if (isLoading) {
    return (
      <div className="h-screen w-full bg-brand-carbon flex items-center justify-center">
        <Loader2 className="h-10 w-10 text-brand-red animate-spin" />
      </div>
    )
  }

  return (
    <BrowserRouter>
      <Toaster position="top-right" richColors closeButton theme="dark" />
      <ErrorBoundary>
        <Routes>
        {isMainDomain ? (
          /* GLOBAL MARKETING APP (Main Domain) */
          <>
            <Route path="/" element={<LandingPage />} />
            <Route path="/register" element={<RegisterGymPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register-gym" element={<RegisterGymPage />} />
            <Route path="/help" element={<HelpPage />} />
            
            {/* Super Admin Access on Main Domain */}
            <Route
              path="/dashboard/super-admin"
              element={
                <RequireAuth>
                  <AppShell>
                    <SuperAdminDashboard />
                  </AppShell>
                </RequireAuth>
              }
            />
            <Route
              path="/gyms"
              element={
                <RequireAuth>
                  <AppShell>
                    <GymsPage />
                  </AppShell>
                </RequireAuth>
              }
            />
            <Route
              path="/users"
              element={
                <RequireAuth>
                  <AppShell>
                    <UsersPage />
                  </AppShell>
                </RequireAuth>
              }
            />
             <Route
              path="/admin/support-config"
              element={
                <RequireAuth>
                  <AppShell>
                    <SupportConfigPage />
                  </AppShell>
                </RequireAuth>
              }
            />

            <Route path="*" element={<Navigate to="/" replace />} />
          </>
        ) : (
          /* TENANT BRANDED APP (Subdomain) */
          <>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterGymPage />} />
            {/* Gym Dashboards */}
            <Route
              path="/dashboard/owner"
              element={
                <RequireAuth>
                  <AppShell>
                    <OwnerDashboard />
                  </AppShell>
                </RequireAuth>
              }
            />
            <Route
              path="/dashboard/trainer"
              element={
                <RequireAuth>
                  <AppShell>
                    <TrainerDashboard />
                  </AppShell>
                </RequireAuth>
              }
            />
            <Route
              path="/dashboard/member"
              element={
                <RequireAuth>
                  <AppShell>
                    <MemberDashboard />
                  </AppShell>
                </RequireAuth>
              }
            />
            <Route
              path="/members"
              element={
                <RequireAuth>
                  <AppShell>
                    <MembersPage />
                  </AppShell>
                </RequireAuth>
              }
            />
            <Route
              path="/reminders"
              element={
                <RequireAuth>
                  <AppShell>
                    <RemindersPage />
                  </AppShell>
                </RequireAuth>
              }
            />
            <Route
              path="/attendance"
              element={
                <RequireAuth>
                  <AppShell>
                    <AttendancePage />
                  </AppShell>
                </RequireAuth>
              }
            />
            <Route
              path="/reports"
              element={
                <RequireAuth>
                  <AppShell>
                    <ReportsPage />
                  </AppShell>
                </RequireAuth>
              }
            />
            <Route
              path="/billing"
              element={
                <RequireAuth>
                  <AppShell>
                    <BillingPage />
                  </AppShell>
                </RequireAuth>
              }
            />
            <Route
              path="/equipment"
              element={
                <RequireAuth>
                  <AppShell>
                    <EquipmentPage />
                  </AppShell>
                </RequireAuth>
              }
            />
            <Route
              path="/fitness"
              element={
                <RequireAuth>
                  <AppShell>
                    <FitnessPlansPage />
                  </AppShell>
                </RequireAuth>
              }
            />
            <Route
              path="/announcements"
              element={
                <RequireAuth>
                  <AppShell>
                    <AnnouncementsPage />
                  </AppShell>
                </RequireAuth>
              }
            />
            <Route
              path="/messages"
              element={
                <RequireAuth>
                  <AppShell>
                    <ChatPage />
                  </AppShell>
                </RequireAuth>
              }
            />

            <Route path="/registration-link" element={<RegistrationLinkPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </>
        )}
      </Routes>
      </ErrorBoundary>
    </BrowserRouter>
  )
}
