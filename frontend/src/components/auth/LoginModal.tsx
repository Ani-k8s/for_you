import { type FormEvent, useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import type { User } from '../../auth/AuthContext'
import { getApiErrorMessage } from '../../api/client'
import { useGymBranding } from '../../branding/GymBrandingContext'
import { getDashboardRoute } from '../../auth/authHelpers'
import { AlertCircle, ChevronRight } from 'lucide-react'
import Button from '../ui/Button'
import { FloatingInput } from '../ui/FloatingInput'
import Modal from '../ui/Modal'

interface LoginModalProps {
  open: boolean;
  onClose: () => void;
}

// Removed local getDashboardRoute to use centralized helper

export function LoginModal({ open, onClose }: LoginModalProps) {
  const navigate = useNavigate()
  const { login, isAuthenticated, user } = useAuth()
  const { data: gym } = useGymBranding()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Removed auto-redirect useEffect to prevent loops

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (submitting) return
    setSubmitting(true)
    setError(null)
    
    const loginEndpoint = gym.is_tenant ? '/api/tenant/login/' : '/api/auth/login/'

    try {
      const loggedInUser = await login(email, password, loginEndpoint)
      const dashboardRoute = getDashboardRoute(loggedInUser.role)
      console.log(`[Auth] Modal login successful. Navigating to: ${dashboardRoute}`)
      navigate(dashboardRoute, { replace: true })
      onClose()
    } catch (err: any) {
      setError(getApiErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  const loginContext = useMemo(() => {
    const hostname = window.location.hostname.toLowerCase();
    if (hostname.includes('admin.')) {
      return {
        title: "Admin Control Center",
        subtitle: "Manage gyms, users, and platform operations securely"
      };
    }
    if (gym.is_tenant) {
      return {
        title: `Welcome to ${gym.gym_name}`,
        subtitle: "Sign in to manage your gym operations"
      };
    }
    return {
      title: "Welcome Back",
      subtitle: "Sign in to manage your gym easily and securely"
    };
  }, [gym]);

  return (
    <Modal open={open} onClose={onClose} title={loginContext.title} className="max-w-lg">
      <div className="p-2">
          <p className="text-slate-400 text-[11px] font-bold uppercase tracking-widest leading-relaxed mb-10 opacity-70">
            {loginContext.subtitle}
          </p>

          <form onSubmit={onSubmit} className="space-y-10">
            <FloatingInput 
              label="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              required
            />
            <div className="space-y-3">
              <FloatingInput 
                label="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                required
              />
              <div className="flex justify-end p-1">
                 <button type="button" className="text-[9px] font-black uppercase tracking-widest text-slate-600 hover:text-brand-orange transition-colors">
                   Forgot Access Key?
                 </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-3 rounded-2xl bg-brand-red/5 p-5 border border-brand-red/10 text-[10px] font-black uppercase tracking-wider text-brand-red animate-float-up">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="pt-4">
              <Button 
                isLoading={submitting}
                type="submit" 
                className="w-full h-18 text-sm font-black italic uppercase tracking-[0.3em]"
              >
                {submitting ? 'Signing you in...' : 'Sign In'}
                {!submitting && <ChevronRight className="w-5 h-5 ml-4 group-hover:translate-x-2 transition-transform duration-500" />}
              </Button>
            </div>
          </form>

          <div className="mt-16 text-center space-y-3 border-t border-white/[0.03] pt-10 opacity-40">
             <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.5em]">
               &copy; 2026 777C8 ELITE
             </span>
          </div>
      </div>
    </Modal>
  )
}
