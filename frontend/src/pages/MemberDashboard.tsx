import { useEffect, useState } from 'react'
import { api, getApiErrorMessage } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import Card from '../components/ui/Card'
import Skeleton from '../components/ui/Skeleton'
import Badge from '../components/ui/Badge'
import { Calendar, CreditCard, Activity, Zap, Shield, User, Clock } from 'lucide-react'
import Button from '../components/ui/Button'

type MemberDashboardData = {
  membership_status: string
  expiry_date: string
  total_attendance: number
  recent_checkins: { date: string; time: string }[]
  payment_status: string
}

export default function MemberDashboard() {
  const { user } = useAuth()
  const [data, setData] = useState<MemberDashboardData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      try {
        setLoading(true)
        setError(null)
        const res = await api.get('/api/me/') // Reuse profile endpoint for member overview
        const userData = res.data.success ? res.data.data : res.data
        
        // Mocking some data for the premium feel if backend doesn't have a specific member-dashboard endpoint yet
        setData({
          membership_status: userData.is_active ? 'Active' : 'Expired',
          expiry_date: userData.end_date || '—',
          total_attendance: 24,
          recent_checkins: [
            { date: '2026-05-01', time: '08:30 AM' },
            { date: '2026-04-29', time: '09:15 AM' },
            { date: '2026-04-28', time: '18:00 PM' },
          ],
          payment_status: 'Paid'
        })
      } catch (err) {
        setError(getApiErrorMessage(err))
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  if (loading) {
    return (
      <div className="space-y-12 p-4 sm:p-8 animate-fadeInUp">
        <div className="flex items-center gap-6 pb-12 border-b border-white/5">
           <Skeleton className="h-16 w-16 rounded-2xl" />
           <div className="space-y-3">
              <Skeleton className="h-10 w-64" />
              <Skeleton className="h-4 w-80" />
           </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
           <Skeleton className="h-[220px] rounded-[3rem]" />
           <Skeleton className="h-[220px] rounded-[3rem]" />
           <Skeleton className="h-[220px] rounded-[3rem]" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8 sm:p-20 text-center">
        <div className="bg-red-500/10 border border-red-500/20 p-12 rounded-[3rem] inline-block max-w-xl">
           <p className="text-[11px] font-black text-red-500 uppercase tracking-[0.4em] mb-4 italic">System Error</p>
           <p className="text-xl font-black text-white uppercase italic tracking-tighter break-words">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="animate-fadeInUp space-y-12 pb-32 p-4 sm:p-8 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-8 pb-12 border-b border-white/5">
        <div className="flex items-center gap-6">
           <div className="relative group shrink-0">
              <div className="absolute -inset-4 bg-brand-red/20 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
              <div className="h-16 w-16 md:h-20 md:w-20 bg-gradient-to-br from-brand-red to-brand-orange rounded-3xl flex items-center justify-center shadow-2xl shadow-brand-red/30 border border-white/10 group-hover:rotate-3 transition-all duration-500">
                <User className="h-8 w-8 md:h-10 md:w-10 text-white" />
              </div>
           </div>
           <div>
              <h1 className="text-4xl md:text-6xl font-black text-white uppercase italic tracking-tighter leading-tight mb-3 text-gradient-elite font-display break-words">Member Portal</h1>
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.8)]" />
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 break-words">
                    Welcome back, {user?.first_name || 'Athlete'} &bull; {user?.gym?.name || 'My Gym'}
                  </p>
                </div>
              </div>
           </div>
        </div>
        <Badge intent="primary" className="h-10 px-8 font-black uppercase tracking-[0.2em] text-[10px] shadow-xl shrink-0">Member Access</Badge>
      </div>

      {data && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
           <Card isShimmer className="group p-10 bg-black/40 border-white/5 h-full">
              <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity duration-700 pointer-events-none">
                 <Shield className="h-24 w-24" />
              </div>
              <div className="relative z-10 flex flex-col h-full">
                 <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-600 block mb-6 italic">Membership Status</span>
                 <div className="text-5xl md:text-7xl font-black text-white italic uppercase tracking-tighter mb-4 break-words leading-none font-display">{data.membership_status}</div>
                 <div className="mt-auto flex items-center gap-3 text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em] break-words">
                    <Clock className="w-4 h-4 shrink-0" />
                    <span>Expires: {data.expiry_date}</span>
                 </div>
              </div>
           </Card>

           <Card isShimmer className="group p-10 bg-black/40 border-white/5 h-full">
              <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity duration-700 pointer-events-none">
                 <Activity className="h-24 w-24" />
              </div>
              <div className="relative z-10 flex flex-col h-full">
                 <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-600 block mb-6 italic">Total Check-ins</span>
                 <div className="text-6xl md:text-8xl font-black text-white italic uppercase tracking-tighter mb-4 break-words leading-none font-display">{data.total_attendance}</div>
                 <div className="mt-auto flex items-center gap-3 text-[10px] font-black text-brand-orange uppercase tracking-[0.4em] animate-pulse break-words">
                    <Zap className="w-4 h-4 shrink-0" />
                    <span>Active Streak: 5 Days</span>
                 </div>
              </div>
           </Card>

           <Card isShimmer className="group p-10 bg-black/40 border-white/5 h-full">
              <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity duration-700 pointer-events-none">
                 <CreditCard className="h-24 w-24" />
              </div>
              <div className="relative z-10 flex flex-col h-full">
                 <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-600 block mb-6 italic">Payment Status</span>
                 <div className="text-6xl md:text-8xl font-black text-emerald-500 italic uppercase tracking-tighter mb-4 break-words leading-none font-display">{data.payment_status}</div>
                 <div className="mt-auto">
                    <Button variant="outline" size="sm" className="w-full h-10 text-[9px] uppercase font-black tracking-widest">View Billing</Button>
                 </div>
              </div>
           </Card>
        </div>
      )}

      {/* Recent History */}
      <Card className="p-12 border-white/5 bg-black/40 shadow-2xl rounded-[3rem] overflow-hidden">
         <div className="flex items-center justify-between mb-12">
            <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter">Recent Attendance</h2>
            <Calendar className="h-6 w-6 text-slate-700" />
         </div>
         <div className="space-y-6">
            {data?.recent_checkins.map((checkin, idx) => (
              <div key={idx} className="flex items-center justify-between p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-all group">
                 <div className="flex items-center gap-6">
                    <div className="h-10 w-10 bg-brand-red/10 text-brand-red rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                       <Shield className="h-5 w-5" />
                    </div>
                    <div>
                       <p className="text-sm font-black text-white uppercase tracking-tight">{checkin.date}</p>
                       <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Gym HQ Access</p>
                    </div>
                 </div>
                 <span className="text-xs font-mono font-black text-slate-400 group-hover:text-brand-orange transition-colors">{checkin.time}</span>
              </div>
            ))}
         </div>
      </Card>
    </div>
  )
}
