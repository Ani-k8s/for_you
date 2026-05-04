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
  
  // 1. Check for IP addresses or localhost
  const isIP = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(hostname);
  if (isIP || hostname === 'localhost') return null;

  // 2. Check for Vercel preview/production domains
  if (hostname.endsWith('.vercel.app')) return null;

  // 3. Check for main production domain
  const mainDomains = ['foryougym.com', 'www.foryougym.com'];
  if (mainDomains.includes(hostname)) return null;

  const parts = hostname.split('.');
  
  // 4. Local development with subdomains (e.g. gym1.localhost)
  if (parts.length === 2 && parts[1] === 'localhost') return parts[0];
  
  // 5. Production with subdomains (e.g. gym1.foryougym.com)
  if (parts.length >= 3) {
    const baseDomain = parts.slice(-2).join('.');
    if (baseDomain === 'foryougym.com') {
      return parts[0];
    }
  }
  
  return null;
}

export function GymBrandingProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<GymBrandingBranding>(DEFAULT_BRANDING)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const subdomain = useMemo(() => {
    const sd = getSubdomain();
    console.log(`[Branding] Detected Subdomain: ${sd || 'NONE (Main Domain)'}`);
    return sd;
  }, [])

  const isMainDomain = !subdomain

  useEffect(() => {
    const primary = data.primary_color || DEFAULT_BRANDING.primary_color
    document.documentElement.style.setProperty('--brand-primary', primary)
  }, [data.primary_color])

  async function refresh() {
    if (!subdomain) {
      console.log('[Branding] No subdomain detected. Skipping configuration fetch.');
      setIsLoading(false);
      return;
    }

    setIsLoading(true)
    setError(null)
    try {
      console.log(`[Branding] Fetching configuration for: ${subdomain}`);
      const res = await api.get('/api/public/tenant-config/')
      const payload = res.data as GymBrandingBranding
      setData(payload)
      document.title = payload.is_tenant ? `${payload.gym_name} | Powered by 777c8` : '777c8 ELITE Gym SaaS'
    } catch (err) {
      const msg = getApiErrorMessage(err)
      console.error(`[Branding] Configuration fetch failed: ${msg}. Falling back to default.`);
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
