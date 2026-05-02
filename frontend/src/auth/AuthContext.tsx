import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { api } from '../api/client'

export type Role = 'super_admin' | 'gym_owner' | 'staff' | 'member'

export type Gym = { id: string; name: string; subdomain: string }

export type User = {
  id: string
  email: string
  role: Role
  gym: Gym | null
}

type AuthContextValue = {
  user: User | null
  accessToken: string | null
  login: (email: string, password: string, endpoint?: string) => Promise<User>
  loginWithGoogle: (token: string) => Promise<User>
  logout: () => void
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

function readStoredUser(): User | null {
  const raw = localStorage.getItem('user')
  if (!raw) return null
  try {
    return JSON.parse(raw) as User
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => readStoredUser())
  const [accessToken, setAccessToken] = useState<string | null>(() =>
    localStorage.getItem('access'),
  )

  const isAuthenticated = Boolean(accessToken && user)

  useEffect(() => {
    if (accessToken) {
      api.defaults.headers.common.Authorization = `Bearer ${accessToken}`
    } else {
      delete api.defaults.headers.common.Authorization
    }
  }, [accessToken])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      accessToken,
      isAuthenticated,
      login: async (email: string, password: string, endpoint: string = '/api/token/'): Promise<User> => {
        const res = await api.post<any>(endpoint, { email, password })
        
        // Handle both standard DRF and my unified wrapper format
        const responseData = res.data
        const payload = responseData.success && responseData.data ? responseData.data : responseData

        if (!payload || !payload.access) {
          throw new Error('Authentication failed: No access token received.')
        }

        localStorage.setItem('access', payload.access)
        localStorage.setItem('refresh', payload.refresh)
        localStorage.setItem('user', JSON.stringify(payload.user))
        
        setAccessToken(payload.access)
        setUser(payload.user)
        return payload.user
      },
      loginWithGoogle: async (token: string): Promise<User> => {
        const res = await api.post<any>('/api/auth/google/', { token })
        
        const responseData = res.data
        const payload = responseData.success && responseData.data ? responseData.data : responseData

        if (!payload || !payload.access) {
          throw new Error('Authentication failed: No access token received.')
        }

        localStorage.setItem('access', payload.access)
        localStorage.setItem('refresh', payload.refresh)
        localStorage.setItem('user', JSON.stringify(payload.user))
        
        setAccessToken(payload.access)
        setUser(payload.user)
        return payload.user
      },
      logout: () => {
        localStorage.removeItem('access')
        localStorage.removeItem('refresh')
        localStorage.removeItem('user')
        setAccessToken(null)
        setUser(null)
      },
    }),
    [accessToken, user, isAuthenticated],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

