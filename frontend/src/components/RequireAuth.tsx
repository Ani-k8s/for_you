import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { Loader2 } from 'lucide-react'

export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const { accessToken, user, isAuthenticated } = useAuth()
  
  // If no token at all, definitely not logged in
  if (!accessToken) {
    return <Navigate to="/" replace />
  }

  // If we have a token but user profile isn't loaded yet, show a loader 
  if (!user) {
    return (
      <div className="h-screen w-full bg-[#010102] flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-brand-red animate-spin" />
      </div>
    )
  }

  // Final check
  if (!isAuthenticated) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}

