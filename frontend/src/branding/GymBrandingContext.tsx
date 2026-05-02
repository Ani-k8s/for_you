import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { api, getApiErrorMessage } from '../api/client'

type GymBrandingBranding = {
  gym_name: string
  is_tenant: boolean
  logo_url: string | null
  background_url: string | null
  primary_color: string
  theme_settings: any
}

const DEFAULT_BRANDING: GymBrandingBranding = {
  gym_name: '777c8 ELITE',
  is_tenant: false,
  logo_url: null,
  background_url: null,
  primary_color: '#dc2626',
  theme_settings: {}
}

type GymBrandingContextValue = {
  data: GymBrandingBranding
  isLoading: boolean
  isMainDomain: boolean
  subdomain: string | null
  error: string | null
  refresh: () => Promise<void>
}

const GymBrandingContext = createContext<GymBrandingContextValue | null>(null)

/**
 * Extract subdomain from hostname.
 * gym1.localhost -> gym1
 * localhost -> null
 */
function getSubdomain() {
  const hostname = window.location.hostname;
  
  // IP addresses (like 127.0.0.1) should always be treated as the main domain.
  const isIP = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(hostname);
  if (isIP || hostname === 'localhost') return null;

  const parts = hostname.split('.');
  if (parts.length >= 3) return parts[0];
  if (parts.length === 2 && (parts[1] === 'localhost' || parts[1] === 'foryou')) return parts[0];
  return null;
}

export function GymBrandingProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<GymBrandingBranding>(DEFAULT_BRANDING)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const subdomain = useMemo(() => getSubdomain(), [])
  const isMainDomain = !subdomain

  useEffect(() => {
    const primary = data.primary_color || DEFAULT_BRANDING.primary_color
    document.documentElement.style.setProperty('--brand-primary', primary)
  }, [data.primary_color])

  async function refresh() {
    setIsLoading(true)
    setError(null)
    try {
      const res = await api.get('/api/public/tenant-config/')
      const payload = res.data as GymBrandingBranding
      setData(payload)
      document.title = payload.is_tenant ? `${payload.gym_name} | Powered by 777c8` : '777c8 ELITE Gym SaaS'
    } catch (err) {
      const msg = getApiErrorMessage(err)
      console.error(`[Branding] Configuration fetch failed: ${msg}. Falling back to default identity.`)
      setError(msg)
      setData(DEFAULT_BRANDING)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    refresh()
  }, [subdomain])

  const value = useMemo(() => ({ 
    data, 
    isLoading, 
    isMainDomain, 
    subdomain, 
    error, 
    refresh 
  }), [data, error, isLoading, isMainDomain, subdomain])

  return <GymBrandingContext.Provider value={value}>{children}</GymBrandingContext.Provider>
}

export function useGymBranding() {
  const ctx = useContext(GymBrandingContext)
  if (!ctx) throw new Error('useGymBranding must be used within GymBrandingProvider')
  return ctx
}
