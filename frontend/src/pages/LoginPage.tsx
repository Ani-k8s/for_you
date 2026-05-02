import { type FormEvent, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import type { User } from '../auth/AuthContext'
import { getApiErrorMessage } from '../api/client'
import { useGymBranding } from '../branding/GymBrandingContext'
import { 
  AlertCircle, 
  ChevronRight,
  ShieldCheck,
  Zap
} from 'lucide-react'
import Button from '../components/ui/Button'
import { AuthLayout } from '../components/auth/AuthLayout'
import { AuthHeader } from '../components/auth/AuthHeader'
import { FloatingInput } from '../components/ui/FloatingInput'
import Card from '../components/ui/Card'

// Route utility
function getDashboardRoute(u: User): string {
  if (u.role === 'gym_owner') return '/dashboard/owner'
  if (u.role === 'staff') return '/dashboard/trainer'
  if (u.role === 'super_admin') return '/dashboard/super-admin'
  return '/members'
}

export default function LoginPage() {
  const navigate = useNavigate()
  const { login, isAuthenticated, user } = useAuth()
  const { data: gym } = useGymBranding()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isAuthenticated && user) {
      navigate(getDashboardRoute(user), { replace: true })
    }
  }, [isAuthenticated, user, navigate])

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (submitting) return
    setSubmitting(true)
    setError(null)
    
    const loginEndpoint = '/api/token/'

    try {
      const loggedInUser = await login(email, password, loginEndpoint)
      toast.success('Login successful!')
      navigate(getDashboardRoute(loggedInUser), { replace: true })
    } catch (err: any) {
      const msg = getApiErrorMessage(err)
      setError(msg)
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout>
      <AuthHeader 
        subtitle="Access your command center and manage your elite facility"
        logoUrl={gym.logo_url || undefined}
        isTenant={gym.is_tenant}
        gymName={gym.gym_name}
      />

      <div className="relative w-full max-w-[500px] px-6 animate-float-up mb-24">
        {/* Advanced Decorative Elements */}
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-brand-red/10 blur-3xl rounded-full animate-pulse pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-brand-orange/10 blur-3xl rounded-full animate-pulse pointer-events-none" />

        <Card isShimmer className="p-0 border-white/10 bg-[#050505] shadow-2xl rounded-[2.5rem] sm:rounded-[3rem] active-glow-brand overflow-visible">
          <div className="flex items-center justify-between p-6 sm:p-8 bg-white/[0.02] border-b border-white/5 shrink-0">
             <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                   <ShieldCheck className="h-4 w-4 text-emerald-500" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 break-words">Account Login</span>
             </div>
             <div className="flex items-center gap-2 shrink-0">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[8px] font-black uppercase tracking-widest text-emerald-500/60">Secure Session</span>
             </div>
          </div>
          
          <div className="p-8 sm:p-14">
            <form onSubmit={onSubmit} className="space-y-8">
              <div className="space-y-6">
                <FloatingInput 
                  name="email"
                  label="Email Address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  required
                />

                <FloatingInput 
                  name="password"
                  label="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type="password"
                  required
                />
              </div>

              {error && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="flex items-center gap-3 rounded-2xl bg-brand-red/10 p-4 border border-brand-red/20 text-[11px] font-bold text-brand-red"
                >
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span className="break-words">{error}</span>
                </motion.div>
              )}

              <div className="pt-4">
                <Button 
                  isLoading={submitting}
                  type="submit" 
                  className="w-full min-h-[64px] btn-premium-gradient rounded-2xl shadow-2xl shadow-brand-red/20 active:scale-95 transition-all group"
                >
                  <div className="relative z-10 flex items-center justify-center font-black uppercase tracking-[0.2em] text-xs">
                    <span>Sign In</span>
                    {!submitting && <ChevronRight className="w-5 h-5 ml-2 group-hover:translate-x-2 transition-transform shrink-0" />}
                  </div>
                </Button>
              </div>
            </form>

            <div className="mt-12 pt-10 border-t border-white/5 flex flex-col items-center gap-8">
               <div className="flex flex-wrap items-center justify-center gap-8 opacity-40 hover:opacity-80 transition-opacity">
                  <div className="flex items-center gap-2 text-white">
                     <Zap className="h-3.5 w-3.5 text-brand-yellow fill-brand-yellow shrink-0" />
                     <span className="text-[9px] font-black uppercase tracking-widest">Fast Performance</span>
                  </div>
                  <div className="flex items-center gap-2 text-white">
                     <ShieldCheck className="h-3.5 w-3.5 text-brand-red shrink-0" />
                     <span className="text-[9px] font-black uppercase tracking-widest">Secure Encryption</span>
                  </div>
               </div>
               <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest text-center break-words">
                 Having trouble signing in? <span className="text-white hover:text-brand-red cursor-pointer transition-colors">Contact Support</span>
               </p>
            </div>
          </div>
        </Card>
      </div>
    </AuthLayout>
  )
}
