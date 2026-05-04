import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { api, getApiErrorMessage } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import Card from '../components/ui/Card'
import LineChart from '../components/ui/LineChart'
import Skeleton from '../components/ui/Skeleton'
import Badge from '../components/ui/Badge'
import { Users, Activity, CalendarCheck, BellRing, CheckCircle2, Clock, Image as ImageIcon, Upload, TrendingUp, DollarSign } from 'lucide-react'
import Button from '../components/ui/Button'
import { twMerge } from 'tailwind-merge'

type GrowthPoint = { month: string; members: number }
type ActivityItem = {
  id: string
  type: string
  title: string
  message: string
  created_at: string
  is_read: boolean
}

type OwnerDashboardData = {
  total_members: number
  active_members: number
  attendance_today: number
  membership_growth: GrowthPoint[]
  revenue_growth?: { month: string; amount: number }[]
  recent_activity: ActivityItem[]
  expired_members?: number
  equipment_stats?: Record<string, number>
}

function formatRelativeTime(iso: string) {
  const dt = new Date(iso)
  if (Number.isNaN(dt.valueOf())) return '—'
  const diffMs = Date.now() - dt.getTime()
  const diffMin = Math.floor(diffMs / (1000 * 60))
  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  const diffDay = Math.floor(diffHr / 24)
  return `${diffDay}d ago`
}

function ActivityIcon({ type }: { type: string }) {
  if (type === 'new_member') return <Users className="h-4 w-4" />
  if (type === 'renewal_success') return <CheckCircle2 className="h-4 w-4" />
  if (type === 'expiry_reminder') return <Clock className="h-4 w-4" />
  return <BellRing className="h-4 w-4" />
}

export default function OwnerDashboard() {
  const { user } = useAuth()
  const [data, setData] = useState<OwnerDashboardData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [brandingFile, setBrandingFile] = useState<File | null>(null)
  const [brandingPreview, setBrandingPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    ;(async () => {
      try {
        setLoading(true)
        setError(null)
        const res = await api.get('/api/dashboard/')
        setData(res.data as OwnerDashboardData)
      } catch (err) {
        setError(getApiErrorMessage(err))
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      setBrandingFile(file)
      setBrandingPreview(URL.createObjectURL(file))
    }
  }

  async function handleUploadBranding() {
    if (!brandingFile) return
    setUploading(true)
    const formData = new FormData()
    formData.append('branding_image', brandingFile)
    
    try {
      if (!user?.gym?.id) throw new Error("Gym identity not found")
      await api.post(`/api/gyms/${user.gym.id}/set_branding/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      toast.success('Branding updated successfully!')
      setBrandingFile(null)
    } catch (err) {
      toast.error(getApiErrorMessage(err))
    } finally {
      setUploading(false)
    }
  }

  const growthPoints = useMemo(() => {
    const raw = data?.membership_growth ?? []
    return raw.map((p) => ({ x: p.month, y: p.members }))
  }, [data?.membership_growth])

  const revenuePoints = useMemo(() => {
    const raw = data?.revenue_growth ?? []
    return raw.map((p) => ({ x: p.month, y: p.amount }))
  }, [data?.revenue_growth])

  if (loading) {
    return (
      <div className="space-y-12 p-4 sm:p-8 animate-fadeInUp">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-4">
            <Skeleton className="h-12 w-64 rounded-2xl" />
            <Skeleton className="h-4 w-96 rounded-xl" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Skeleton className="h-[160px] rounded-[2.5rem]" />
          <Skeleton className="h-[160px] rounded-[2.5rem]" />
          <Skeleton className="h-[160px] rounded-[2.5rem]" />
          <Skeleton className="h-[160px] rounded-[2.5rem]" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
           <Skeleton className="h-[400px] rounded-[3rem]" />
           <Skeleton className="h-[400px] rounded-[3rem]" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8 sm:p-20 text-center animate-fadeInUp">
        <div className="bg-red-500/10 border border-red-500/20 p-12 rounded-[3rem] inline-block max-w-xl">
           <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-6" />
           <p className="text-[11px] font-black text-red-500 uppercase tracking-[0.4em] mb-4 italic">Operational Error</p>
           <p className="text-xl font-black text-white uppercase italic tracking-tighter break-words mb-8">{error}</p>
           <Button onClick={() => window.location.reload()} variant="primary" className="min-h-[56px] px-10">Reconnect to Dashboard</Button>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="p-8 sm:p-20 text-center animate-fadeInUp opacity-50">
         <p className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-700">Waiting for system data...</p>
      </div>
    )
  }

  return (
    <div className="animate-fadeInUp space-y-12 pb-32 p-4 sm:p-8 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-10 pb-12 border-b border-white/5">
        <div className="flex items-center gap-8">
            <div className="relative group shrink-0">
               <div className="absolute -inset-6 bg-brand-red/30 blur-3xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
               <div className="relative h-16 w-16 md:h-24 md:w-24 bg-gradient-to-br from-brand-red to-brand-orange rounded-[2rem] flex items-center justify-center shadow-2xl shadow-brand-red/30 border border-white/10 group-hover:rotate-12 transition-all duration-700 active-glow-brand">
                 <TrendingUp className="h-8 w-8 md:h-12 md:w-12 text-white group-hover:scale-110 transition-transform" />
               </div>
            </div>
           <div>
              <h1 className="text-4xl md:text-6xl font-black text-white uppercase italic tracking-tighter leading-tight mb-3 text-gradient-elite font-display break-words">
                Gym Dashboard
              </h1>
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                   <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.8)]" />
                   <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 break-words">
                      Gym: {user?.gym?.name || 'My Gym'}
                   </p>
                </div>
                <div className="h-1 w-1 rounded-full bg-slate-800 hidden sm:block" />
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-600 italic break-words">
                   All systems running smoothly
                </p>
              </div>
           </div>
        </div>
        <div className="flex flex-wrap items-center gap-6">
           <Badge intent="primary" className="min-h-10 h-auto px-8 font-black uppercase tracking-[0.25em] text-[10px] bg-brand-red/10 border-brand-red/20 text-brand-red shadow-xl">Owner Access</Badge>
           <div className="h-12 w-12 glass-panel flex items-center justify-center rounded-2xl text-slate-400 hover:text-white transition-all cursor-pointer hover:border-white/20 active:scale-90 group shrink-0">
              <Activity className="h-6 w-6 group-hover:scale-110 transition-transform" />
           </div>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        <Card isShimmer className="group p-8 bg-black/40 border-white/5 h-full hover:border-brand-red/30 transition-all duration-700">
          <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-[0.1] group-hover:scale-110 transition-all duration-700 pointer-events-none">
             <Users className="h-24 w-24" />
          </div>
          <div className="relative z-10 flex flex-col h-full">
             <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-600 block mb-6 group-hover:text-brand-red transition-colors">Total Members</span>
             <div className="text-5xl md:text-8xl font-black text-white uppercase italic tracking-tighter mb-4 leading-none font-display break-words group-hover:translate-x-1 transition-transform duration-700">{data.total_members}</div>
             <div className="mt-auto flex items-center gap-2 text-[10px] font-black text-emerald-500 uppercase tracking-widest italic break-words group-hover:translate-y-[-2px] transition-transform">
                <TrendingUp className="h-3.5 w-3.5" />
                <span>+12.5% Growth</span>
             </div>
          </div>
        </Card>

        <Card isShimmer className="group p-8 bg-black/40 border-white/5 h-full">
          <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity duration-700 pointer-events-none">
             <Activity className="h-20 w-20" />
          </div>
          <div className="relative z-10 flex flex-col h-full">
             <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-600 block mb-6">Active Now</span>
             <div className="text-5xl font-black text-white uppercase italic tracking-tighter mb-2 break-words">{data.active_members}</div>
             <div className="mt-auto w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-brand-red rounded-full shadow-[0_0_12px_rgba(255,26,26,0.6)] transition-all duration-1000" style={{ width: `${(data.active_members / (data.total_members || 1)) * 100}%` }} />
             </div>
          </div>
        </Card>

        <Card isShimmer className="group p-8 bg-black/40 border-white/5 h-full">
          <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity duration-700 pointer-events-none">
             <DollarSign className="h-20 w-20" />
          </div>
          <div className="relative z-10 flex flex-col h-full">
             <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-600 block mb-6">Expired Pass</span>
             <div className="text-5xl font-black text-white uppercase italic tracking-tighter mb-2 break-words">{data.expired_members ?? 0}</div>
             <div className="mt-auto flex items-center gap-2 text-[10px] font-black text-brand-orange uppercase tracking-widest animate-pulse break-words">
                <Clock className="h-3.5 w-3.5" />
                <span>Needs Renewal</span>
             </div>
          </div>
        </Card>

        <Card isShimmer className="group p-8 bg-black/40 border-white/5 h-full">
          <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity duration-700 pointer-events-none">
             <CalendarCheck className="h-20 w-20" />
          </div>
          <div className="relative z-10 flex flex-col h-full">
             <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-600 block mb-6">Today's Attendance</span>
             <div className="text-5xl font-black text-white uppercase italic tracking-tighter mb-2 break-words">{data.attendance_today}</div>
             <div className="mt-auto flex items-center gap-2 text-[10px] font-black text-brand-yellow uppercase tracking-widest break-words">
                <Users className="h-3.5 w-3.5" />
                <span>Busy Hours</span>
             </div>
          </div>
        </Card>
      </div>

      {/* Analytics */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
        <Card className="p-8 sm:p-10 bg-black/40 border-white/5 shadow-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10">
             <h2 className="text-lg font-black text-white uppercase italic tracking-tighter break-words">Member Growth</h2>
             <Button variant="secondary" size="sm" className="min-h-[32px] px-5 text-[9px] font-black tracking-widest bg-white/5 shrink-0">Download Report</Button>
          </div>
          <div className="w-full overflow-hidden">
            <LineChart points={growthPoints} height={280} />
          </div>
        </Card>
        
        <Card className="p-8 sm:p-10 bg-black/40 border-white/5 shadow-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10">
             <h2 className="text-lg font-black text-white uppercase italic tracking-tighter break-words">Monthly Revenue</h2>
             <div className="flex items-center gap-3 shrink-0">
                <span className="h-2 w-2 rounded-full bg-brand-red shadow-[0_0_10px_rgba(255,26,26,1)] animate-pulse" />
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Live Data</span>
             </div>
          </div>
          <div className="w-full overflow-hidden">
            <LineChart points={revenuePoints} height={280} />
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">
        <Card isShimmer className="p-8 sm:p-10 bg-black/40 border-white/5 shadow-2xl h-full">
           <h2 className="text-lg font-black text-white uppercase italic tracking-tighter mb-10 break-words">Equipment Health</h2>
           <div className="space-y-8">
               {['operational', 'under_maintenance', 'broken'].map(status => (
                   <div key={status} className="group cursor-default">
                       <div className="flex items-center justify-between mb-3 gap-4">
                           <div className="flex items-center gap-4 min-w-0">
                               <div className={twMerge(
                                   "h-2 w-2 rounded-full shrink-0",
                                   status === 'operational' ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)] animate-pulse' :
                                   status === 'broken' ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)] animate-pulse' : 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.8)] animate-pulse'
                               )} />
                               <span className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 group-hover:text-white transition-all duration-500 italic break-words">{status.replace('_', ' ')}</span>
                           </div>
                           <span className="text-base font-black text-white italic tracking-tighter shrink-0">{data.equipment_stats?.[status] || 0}</span>
                       </div>
                       <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <div className={twMerge(
                             "h-full rounded-full transition-all duration-[2000ms] ease-out",
                             status === 'operational' ? "bg-emerald-500" : status === 'broken' ? "bg-red-500" : "bg-amber-500"
                          )} style={{ width: `${((data.equipment_stats?.[status] || 0) / 50) * 100}%` }} />
                       </div>
                   </div>
               ))}
           </div>
        </Card>

        <Card className="xl:col-span-2 p-8 sm:p-10 bg-black/40 border-white/5 shadow-2xl h-full flex flex-col">
          <div className="flex items-center justify-between gap-4 mb-10 shrink-0">
             <h2 className="text-lg font-black text-white uppercase italic tracking-tighter break-words">Recent Notifications</h2>
             <span className="text-[10px] font-black text-slate-700 uppercase tracking-[0.3em] font-mono shrink-0">Live Updates</span>
          </div>
          <div className="space-y-6 overflow-y-auto pr-2 custom-scrollbar flex-1 min-h-0">
            {data.recent_activity.length > 0 ? (
              data.recent_activity.map((a) => (
                <div key={a.id} className="flex gap-6 group p-4 rounded-3xl hover:bg-white/[0.03] transition-all duration-500 border border-transparent hover:border-white/10 active-glow-brand">
                  <div className={twMerge(
                    "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border transition-all duration-500",
                    a.is_read 
                      ? "bg-slate-950 text-slate-700 border-white/5" 
                      : "bg-brand-red/10 text-brand-red border-brand-red/30 shadow-2xl shadow-brand-red/10 group-hover:scale-110 group-hover:rotate-3"
                  )}>
                    <ActivityIcon type={a.type} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                      <p className={twMerge(
                        "text-[15px] font-black uppercase italic tracking-tight transition-colors duration-500 break-words",
                        a.is_read ? "text-slate-500" : "text-white"
                      )}>{a.title}</p>
                      <span className="shrink-0 text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] font-mono">{formatRelativeTime(a.created_at)}</span>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed font-medium tracking-tight break-words">{a.message}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="h-56 flex flex-col items-center justify-center gap-5 opacity-40">
                 <div className="h-14 w-14 rounded-full border border-dashed border-white/20 flex items-center justify-center text-slate-700 animate-pulse">
                    <Activity className="h-7 w-7" />
                 </div>
                 <p className="text-[11px] font-black text-slate-700 uppercase tracking-[0.5em] italic text-center">No recent notifications</p>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Branding */}
      <Card className="p-8 sm:p-10 relative overflow-visible group border-white/5 bg-black/40 shadow-2xl rounded-[3rem]">
        <div className="absolute top-0 right-0 p-12 opacity-[0.02] text-brand-red group-hover:opacity-[0.05] transition-opacity pointer-events-none">
           <ImageIcon className="h-48 w-48" />
        </div>
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
                <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter mb-4 break-words">Gym Logo & Branding</h2>
                <p className="text-xs text-slate-500 mb-8 font-medium leading-relaxed max-w-sm break-words">Upload your gym's logo to personalize the login screen and member portal.</p>
                
                <div className="flex flex-col sm:flex-row gap-5">
                  <label className="flex-1 flex items-center justify-center min-h-[64px] border-2 border-dashed border-white/10 rounded-2xl cursor-pointer hover:border-brand-red/40 hover:bg-white/[0.02] transition-all group p-4 text-center">
                    <Upload className="h-5 w-5 mr-3 text-slate-500 group-hover:text-brand-red transition-colors shrink-0" />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] group-hover:text-white break-words">{brandingFile ? brandingFile.name : 'Choose Logo'}</span>
                    <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                  </label>
                  {brandingFile && (
                    <Button onClick={handleUploadBranding} isLoading={uploading} className="min-h-[64px] px-8 font-black uppercase text-[10px] tracking-widest btn-premium-gradient">
                       Apply Branding
                    </Button>
                  )}
                </div>
            </div>
            
            <div className="relative group w-full">
               <div className="absolute -inset-1 bg-gradient-to-r from-brand-red to-brand-orange rounded-3xl blur opacity-10 group-hover:opacity-25 transition-opacity" />
               <div className="relative aspect-video rounded-3xl border border-white/10 overflow-hidden bg-black/40 flex items-center justify-center shadow-2xl">
                   {brandingPreview ? (
                     <img src={brandingPreview} className="w-full h-full object-cover animate-image-reveal" alt="Preview" />
                   ) : (
                     <div className="flex flex-col items-center gap-4 text-slate-700">
                        <ImageIcon className="h-12 w-12" />
                        <span className="text-[10px] font-black uppercase tracking-[0.3em]">Logo Preview</span>
                     </div>
                   )}
               </div>
            </div>
        </div>
      </Card>
      
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes image-reveal {
          from { opacity: 0; transform: scale(1.05); filter: blur(10px); }
          to { opacity: 1; transform: scale(1); filter: blur(0); }
        }
        .animate-image-reveal { animation: image-reveal 1s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}} />
    </div>
  )
}
