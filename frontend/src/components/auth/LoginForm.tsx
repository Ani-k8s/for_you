import React, { type FormEvent, useState } from 'react'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import type { User } from '../../auth/AuthContext'
import { getApiErrorMessage } from '../../api/client'
import { 
  AlertCircle, 
  ChevronRight
} from 'lucide-react'
import Button from '../ui/Button'
import { FloatingInput } from '../ui/FloatingInput'

// Route utility
function getDashboardRoute(u: User): string {
  if (u.role === 'gym_owner') return '/dashboard/owner'
  if (u.role === 'staff') return '/dashboard/trainer'
  if (u.role === 'super_admin') return '/dashboard/super-admin'
  if (u.role === 'member') return '/dashboard/member'
  return '/'
}

export default function LoginForm() {
  const navigate = useNavigate()
  const { login } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (submitting) return
    setSubmitting(true)
    setError(null)
    
    const loginEndpoint = '/api/token/'

    try {
      const loggedInUser = await login(email, password, loginEndpoint)
      toast.success('Sign in successful!')
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
    <form onSubmit={onSubmit} className="space-y-8">
      <FloatingInput 
        label="Email Address"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        type="email"
        required
      />

      <FloatingInput 
        label="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        type="password"
        required
      />

      {error && (
        <div className="flex items-center gap-3 rounded-2xl bg-brand-red/5 p-4 border border-brand-red/10 text-[10px] font-black uppercase tracking-wider text-brand-red animate-fadeInUp">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <Button 
        isLoading={submitting}
        type="submit" 
        className="w-full h-16 btn-premium-gradient rounded-2xl shadow-xl shadow-brand-red/10 active:scale-95 transition-all text-white"
      >
        <span className="text-xs font-black uppercase tracking-[0.2em] italic">Access Dashboard</span>
        {!submitting && <ChevronRight className="w-5 h-5 ml-2 group-hover:translate-x-1.5 transition-transform duration-300" />}
      </Button>
    </form>
  )
}
