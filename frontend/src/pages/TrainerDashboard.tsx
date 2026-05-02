import { useEffect, useState } from 'react'
import { api, getApiErrorMessage } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import Card from '../components/ui/Card'
import Skeleton from '../components/ui/Skeleton'
import Badge from '../components/ui/Badge'
import { Users, CalendarCheck, Activity, Zap, TrendingUp, LayoutDashboard } from 'lucide-react'

type TrainerDashboardData = {
  assigned_members: number
  today_attendance: number
}

export default function TrainerDashboard() {
  const { user } = useAuth()
  const [data, setData] = useState<TrainerDashboardData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      try {
        setLoading(true)
        setError(null)
        const res = await api.get('/api/dashboard/trainer')
        setData(res.data.data as TrainerDashboardData)
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
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
                <LayoutDashboard className="h-8 w-8 md:h-10 md:w-10 text-white" />
              </div>
           </div>
           <div>
              <h1 className="text-4xl md:text-6xl font-black text-white uppercase italic tracking-tighter leading-tight mb-3 text-gradient-elite font-display break-words">Check-in Dashboard</h1>
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.8)]" />
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 break-words">
                    Check-in Dashboard &bull; Gym: {user?.gym?.name || 'My Gym'}
                  </p>
                </div>
              </div>
           </div>
        </div>
        <Badge intent="primary" className="h-10 px-8 font-black uppercase tracking-[0.2em] text-[10px] shadow-xl shrink-0">Active Session</Badge>
      </div>

      {data && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
           <Card isShimmer className="group p-10 bg-black/40 border-white/5 h-full">
              <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity duration-700 pointer-events-none">
                 <Users className="h-24 w-24" />
              </div>
              <div className="relative z-10 flex flex-col h-full">
                 <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-600 block mb-6 italic">Total Members</span>
                 <div className="text-6xl md:text-8xl font-black text-white italic uppercase tracking-tighter mb-4 break-words leading-none font-display">{data.assigned_members}</div>
                 <div className="mt-auto flex items-center gap-3 text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em] break-words">
                    <TrendingUp className="w-4 h-4 animate-pulse shrink-0" />
                    <span>Status: Active</span>
                 </div>
              </div>
           </Card>

           <Card isShimmer className="group p-10 bg-black/40 border-white/5 h-full">
              <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity duration-700 pointer-events-none">
                 <CalendarCheck className="h-24 w-24" />
              </div>
              <div className="relative z-10 flex flex-col h-full">
                 <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-600 block mb-6 italic">Today's Attendance</span>
                 <div className="text-6xl md:text-8xl font-black text-white italic uppercase tracking-tighter mb-4 break-words leading-none font-display">{data.today_attendance}</div>
                 <div className="mt-auto flex items-center gap-3 text-[10px] font-black text-brand-orange uppercase tracking-[0.4em] animate-pulse break-words">
                    <Zap className="w-4 h-4 shrink-0" />
                    <span>Recent Activity</span>
                 </div>
              </div>
           </Card>
        </div>
      )}

      {/* Analytics Placeholder */}
      <Card className="p-16 border-white/5 bg-black/40 shadow-2xl rounded-[3rem] flex flex-col items-center justify-center text-center gap-8">
         <div className="relative">
            <div className="absolute -inset-4 bg-white/5 blur-xl rounded-full animate-pulse" />
            <div className="h-20 w-20 rounded-full border border-dashed border-white/20 flex items-center justify-center text-slate-700 relative z-10">
               <Activity className="h-10 w-10" />
            </div>
         </div>
         <div className="space-y-4 max-w-xl">
            <p className="text-[11px] font-black text-slate-500 uppercase tracking-[0.5em] italic">Fetching member data...</p>
            <p className="text-sm text-slate-600 font-medium leading-relaxed tracking-tight break-words">All member profiles and training records are currently being updated with the management system.</p>
         </div>
      </Card>
    </div>
  )
}
