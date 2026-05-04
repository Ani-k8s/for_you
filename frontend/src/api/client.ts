import axios, { AxiosError } from 'axios'
import { API_BASE_URL } from '../config'

export type ApiErrorShape = {
  success?: boolean
  message?: string
  data?: unknown
  errors?: unknown
}

function resolveApiBaseUrl(): string {
  return API_BASE_URL
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

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.warn('[Auth] Token expired or invalid. Clearing session.')
      localStorage.removeItem('access')
      localStorage.removeItem('refresh')
      localStorage.removeItem('user')
      // Only reload/redirect if we are not on public pages
      if (!window.location.pathname.match(/^\/(login|register)?$/) && window.location.pathname !== '/') {
        window.location.href = '/'
      }
    }
    return Promise.reject(error)
  }
)

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

