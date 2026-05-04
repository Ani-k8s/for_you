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
  isLoading: boolean
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
  const [isInitializing, setIsInitializing] = useState(true)

  const isAuthenticated = Boolean(accessToken && user)

  // Sync token with API client
  useEffect(() => {
    if (accessToken) {
      api.defaults.headers.common.Authorization = `Bearer ${accessToken}`
    } else {
      delete api.defaults.headers.common.Authorization
    }
  }, [accessToken])

  // Initial user fetch if we have a token but no user details
  useEffect(() => {
    const init = async () => {
      console.log(`[Auth] Initializing. Token: ${accessToken ? 'PRESENT' : 'MISSING'}, User: ${user ? 'PRESENT' : 'MISSING'}`);
      
      try {
        if (accessToken && !user) {
          console.log('[Auth] Attempting to restore user session...');
          const res = await api.get('/api/me/')
          const userData = res.data.success ? res.data.data : res.data
          setUser(userData)
          localStorage.setItem('user', JSON.stringify(userData))
          console.log('[Auth] Session restored successfully.');
        }
      } catch (err) {
        console.error('[Auth] Failed to restore user session:', err)
        localStorage.removeItem('access')
        localStorage.removeItem('refresh')
        localStorage.removeItem('user')
        setAccessToken(null)
        setUser(null)
      } finally {
        setIsInitializing(false)
        console.log('[Auth] Initialization complete.');
      }
    }
    init()
  }, [accessToken, user])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      accessToken,
      isAuthenticated,
      login: async (email: string, password: string, endpoint: string = '/api/token/'): Promise<User> => {
        console.log(`[Auth] Attempting login at: ${endpoint}`)
        const res = await api.post<any>(endpoint, { email, password })
        
        const payload = res.data.success && res.data.data ? res.data.data : res.data

        if (!payload || !payload.access) {
          throw new Error('Authentication failed: No access token received.')
        }

        // 1. Store tokens
        localStorage.setItem('access', payload.access)
        localStorage.setItem('refresh', payload.refresh)
        setAccessToken(payload.access)
        api.defaults.headers.common.Authorization = `Bearer ${payload.access}`

        // 2. Fetch user profile (Robust flow)
        try {
          setIsInitializing(true)
          const profileRes = await api.get('/api/me/')
          const userData = profileRes.data.success ? profileRes.data.data : profileRes.data
          
          localStorage.setItem('user', JSON.stringify(userData))
          setUser(userData)
          return userData
        } catch (err) {
          console.error('[Auth] Login successful but profile fetch failed:', err)
          // Fallback if profile API is down but we have tokens
          const fallbackUser = payload.user || { email, role: 'member' }
          setUser(fallbackUser)
          return fallbackUser
        } finally {
          setIsInitializing(false)
        }
      },
      loginWithGoogle: async (token: string): Promise<User> => {
        const res = await api.post<any>('/api/auth/google/', { token })
        const payload = res.data.success && res.data.data ? res.data.data : res.data

        if (!payload || !payload.access) {
          throw new Error('Google authentication failed.')
        }

        localStorage.setItem('access', payload.access)
        localStorage.setItem('refresh', payload.refresh)
        setAccessToken(payload.access)
        api.defaults.headers.common.Authorization = `Bearer ${payload.access}`

        try {
          const profileRes = await api.get('/api/me/')
          const userData = profileRes.data.success ? profileRes.data.data : profileRes.data
          localStorage.setItem('user', JSON.stringify(userData))
          setUser(userData)
          return userData
        } catch (err) {
          const fallbackUser = payload.user || { email: 'google-user', role: 'member' }
          setUser(fallbackUser)
          return fallbackUser
        }
      },
      logout: () => {
        localStorage.removeItem('access')
        localStorage.removeItem('refresh')
        localStorage.removeItem('user')
        setAccessToken(null)
        setUser(null)
        delete api.defaults.headers.common.Authorization
      },
      isLoading: isInitializing,
    }),
    [accessToken, user, isAuthenticated, isInitializing],
  )

  // We removed the return null blocker to ensure the App always renders.
  // The loading state is handled by the App component itself.

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

