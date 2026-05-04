import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { Loader2 } from 'lucide-react'

export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isLoading, isAuthenticated } = useAuth()
  
  // 1. Show loader while the auth state is still being initialized (fetching profile, etc.)
  if (isLoading) {
    return (
      <div className="h-screen w-full bg-[#010102] flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-brand-red animate-spin" />
      </div>
    )
  }
  
  // 2. If not authenticated after loading, redirect to landing
  if (!isAuthenticated) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}

