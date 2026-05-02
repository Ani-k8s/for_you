import axios, { AxiosError } from 'axios'

export type ApiErrorShape = {
  success?: boolean
  message?: string
  data?: unknown
  errors?: unknown
}

function resolveApiBaseUrl(): string {
  const envBaseUrl = import.meta.env.VITE_API_BASE_URL?.toString()
  
  // If we have an explicit env var, use it.
  if (envBaseUrl) return envBaseUrl

  if (typeof window === 'undefined') return 'http://backend:8000'

  const currentHostname = window.location.hostname
  
  // In Docker/Production, we want to use the Nginx proxy.
  // We only use the hardcoded localhost:8000 for local development (non-docker).
  // If we are on a subdomain (ends with .localhost) and NOT on port 5173, 
  // we are likely in the Docker environment.
  if (
    (currentHostname === 'localhost' || currentHostname === '127.0.0.1') && 
    window.location.port === '5173'
  ) {
      return 'http://localhost:8000'
  }

  // Fallback to current origin (works for both main domain and subdomains in Docker/Production)
  return window.location.origin
}

export const api = axios.create({
  baseURL: resolveApiBaseUrl(),
})

// Auto-inject token from localStorage
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export function setAccessToken(token: string | null) {
  if (token) {
    localStorage.setItem('access', token)
  } else {
    localStorage.removeItem('access')
  }
}

export function getApiErrorMessage(err: unknown): string {
  console.error('[API Error]', err)
  const axiosErr = err as AxiosError<any>
  if (axiosErr.response?.data?.message) return String(axiosErr.response.data.message)
  if (axiosErr.response?.data?.detail) return String(axiosErr.response.data.detail)
  if (typeof axiosErr.response?.data === 'string') return axiosErr.response.data
  return axiosErr.message || 'Request failed unexpectedly. Please try again later.'
}

