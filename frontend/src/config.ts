export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'

export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  GYM_OWNER: 'gym_owner',
  STAFF: 'staff',
  MEMBER: 'member',
} as const

export const APP_CONFIG = {
  NAME: 'ForYou Gym SaaS',
  VERSION: '1.0.0',
}
