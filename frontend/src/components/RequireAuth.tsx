import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { Loader2 } from 'lucide-react'

export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const { accessToken, user, isAuthenticated } = useAuth()
  
  // If no token at all, definitely not logged in
  if (!accessToken) {
    console.log("[Auth] RequireAuth: No token found, redirecting to /login")
    return <Navigate to="/login" replace />
  }

  // If we have a token but user profile isn't loaded yet, show a loader 
  // instead of redirecting (avoids the "flicker" and redirect loop)
  if (!user) {
    return (
      <div className="h-screen w-full bg-[#010102] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 text-brand-red animate-spin" />
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Restoring Session...</p>
        </div>
      </div>
    )
  }

  // Final check
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

