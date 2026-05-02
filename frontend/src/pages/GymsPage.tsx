import { useEffect, useState, useRef } from 'react'
import { toast } from 'sonner'
import { api, getApiErrorMessage } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/Table'
import { Plus, Settings2, Lock, Unlock, Loader2, X, Mail, Building2, User as UserIcon, ShieldCheck, Globe, Activity } from 'lucide-react'
import { twMerge } from 'tailwind-merge'
import Badge from '../components/ui/Badge'

type GymData = {
  id: string
  name: string
  subdomain: string
  members_count: number
  is_configured: boolean
  is_active: boolean
}

type GymFeatureConfig = {
  id: number
  gym: string | null
  enable_google_auth: boolean
  enable_whatsapp_otp: boolean
  enable_email_login: boolean
  enable_reminders: boolean
}

export default function GymsPage() {
  useAuth()
  const [gyms, setGyms] = useState<GymData[]>([])
  const [selectedGym, setSelectedGym] = useState<GymData | null>(null)
  const [config, setConfig] = useState<GymFeatureConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const [showAddModal, setShowAddModal] = useState(false)
  const [creating, setCreating] = useState(false)
  const [configSaving, setConfigSaving] = useState(false)
  
  const [form, setForm] = useState({
    name: '',
    subdomain: '',
    owner_name: '',
    owner_email: '',
    owner_password: ''
  })
  
  const configSectionRef = useRef<HTMLDivElement>(null)

  const fetchGyms = async () => {
    try {
      setLoading(true)
      const res = await api.get('/api/dashboard/')
      setGyms(res.data.gym_wise_analytics || [])
    } catch (err) {
      setError(getApiErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchGyms()
  }, [])

  const handleCreateGym = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)
    try {
      const res = await api.post('/api/gyms/', form)
      setShowAddModal(false)
      setForm({ name: '', subdomain: '', owner_name: '', owner_email: '', owner_password: '' })
      await fetchGyms()
      handleConfigure(res.data)
      toast.success("Gym registered successfully!")
    } catch (err) {
      toast.error(getApiErrorMessage(err))
    } finally {
      setCreating(false)
    }
  }

  const handleConfigure = async (gym: any) => {
    setSelectedGym(gym)
    try {
      const res = await api.get(`/api/gyms/config/?gym=${gym.subdomain}`)
      setConfig(res.data)
      setTimeout(() => {
        configSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 100)
    } catch (err) {
      toast.error(getApiErrorMessage(err))
    }
  }

  const updateConfig = async (field: keyof GymFeatureConfig) => {
    if (!config || !selectedGym) return
    setConfigSaving(true)
    try {
      const res = await api.patch(`/api/gyms/${selectedGym.id}/update_config/`, { [field]: !config[field] })
      setConfig(res.data.data || res.data)
      setGyms(prev => prev.map(g => g.id === selectedGym.id ? { ...g, is_configured: true } : g))
      toast.success("Configuration saved!")
    } catch (err) {
      toast.error(getApiErrorMessage(err))
    } finally {
      setConfigSaving(false)
    }
  }

  const toggleStatus = async (gym: GymData) => {
    try {
        await api.patch(`/api/gyms/${gym.id}/`, { is_active: !gym.is_active })
        toast.success(`Gym ${gym.is_active ? 'deactivated' : 'activated'}!`)
        fetchGyms()
    } catch (err) {
        toast.error(getApiErrorMessage(err))
    }
  }

  if (loading && gyms.length === 0) {
    return (
        <div className="flex flex-col items-center justify-center p-20 text-slate-400 gap-6 animate-pulse">
            <Loader2 className="h-12 w-12 animate-spin text-brand-red" />
            <p className="font-black tracking-[0.3em] text-[10px] uppercase italic">Loading Gyms...</p>
        </div>
    )
  }

  return (
    <div className="space-y-12 animate-fadeInUp max-w-[1600px] mx-auto pb-32 p-4 sm:p-8">
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-200 p-5 rounded-2xl flex items-center justify-between shadow-2xl">
            <span className="text-sm font-medium">{error}</span>
            <button onClick={() => setError(null)} className="p-2 hover:bg-white/10 rounded-lg transition-colors"><X className="h-4 w-4" /></button>
        </div>
      )}

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-10 pb-12 border-b border-white/5">
        <div className="flex items-center gap-8">
           <div className="relative group">
              <div className="absolute -inset-6 bg-brand-orange/20 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
              <div className="h-16 w-16 md:h-20 md:w-20 bg-gradient-to-br from-brand-yellow to-brand-orange text-white rounded-3xl flex items-center justify-center shadow-2xl shadow-brand-orange/30 border border-white/10 group-hover:rotate-6 transition-all duration-700 active-glow-brand">
                <Building2 className="h-8 w-8 md:h-10 md:w-10 text-white" />
              </div>
           </div>
           <div>
              <h1 className="text-3xl md:text-6xl font-black text-white uppercase italic tracking-tighter leading-tight mb-3 text-gradient-elite font-display">
                Gym Management
              </h1>
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                   <div className="w-2 h-2 rounded-full bg-brand-orange animate-pulse" />
                   <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">
                      Manage all gym locations and their website links
                   </p>
                </div>
              </div>
           </div>
        </div>
        <Button 
            onClick={() => setShowAddModal(true)}
            className="min-h-[64px] px-10 btn-premium-gradient text-[10px] font-black uppercase tracking-[0.2em] italic shadow-2xl shadow-brand-red/30"
        >
          <Plus className="h-5 w-5 mr-3 shrink-0" />
          Register New Gym
        </Button>
      </div>

      <div className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-brand-yellow/10 via-brand-orange/5 to-brand-red/10 blur-2xl rounded-[3rem] opacity-50 pointer-events-none" />
        <Card isShimmer className="relative p-0 border-white/5 bg-black/40 shadow-2xl rounded-[2rem] sm:rounded-[3.5rem] overflow-visible">
          <div className="overflow-x-auto custom-scrollbar rounded-[2rem] sm:rounded-[3.5rem]">
            <Table className="w-full">
              <TableHeader>
                <TableRow className="bg-white/[0.02] border-b border-white/5">
                  <TableHead className="pl-10 py-6">Gym Name</TableHead>
                  <TableHead className="px-10 py-6">Gym Website Link</TableHead>
                  <TableHead className="px-10 py-6 text-center">Status</TableHead>
                  <TableHead className="pr-10 py-6 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {gyms.map((gym) => (
                  <TableRow key={gym.id} className="hover:bg-white/[0.03] border-b border-white/[0.02] transition-all duration-500 group">
                    <TableCell className="pl-10 py-6">
                      <div className="text-base font-black text-white uppercase italic tracking-tight break-words max-w-[250px]">{gym.name}</div>
                    </TableCell>
                    <TableCell className="px-10 py-6">
                      <div className="flex items-center gap-2">
                        <Globe className="h-3 w-3 text-brand-orange shrink-0" />
                        <span className="font-mono text-[11px] font-black text-brand-orange uppercase italic tracking-widest break-words">
                          {gym.subdomain}.gym.saas
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="px-10 py-6 text-center">
                      <Badge intent={gym.is_configured ? 'primary' : 'neutral'} className={twMerge(
                        "h-6 px-4 text-[9px] font-black uppercase tracking-widest",
                        !gym.is_configured && "animate-pulse"
                      )}>
                          {gym.is_configured ? 'ACTIVE' : 'SETUP PENDING'}
                      </Badge>
                    </TableCell>
                    <TableCell className="pr-10 py-6 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleConfigure(gym)} 
                          className="h-10 w-10 p-0 bg-white/[0.02] border-white/10 hover:border-white/30 text-slate-400 hover:text-white"
                        >
                          <Settings2 className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleStatus(gym)} 
                          className={twMerge(
                            "h-10 w-10 p-0 border transition-all",
                            gym.is_active 
                              ? "bg-white/[0.02] border-white/10 text-slate-500 hover:text-white" 
                              : "bg-brand-red/10 border-brand-red/30 text-brand-red shadow-lg shadow-brand-red/20"
                          )}
                        >
                           {gym.is_active ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {gyms.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="py-20 text-center">
                      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-700">No gyms registered yet</p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>

      <div ref={configSectionRef} className="scroll-mt-32" />
      {selectedGym && config && (
        <div className="pt-20 space-y-10 animate-float-up">
           <div className="flex items-center gap-6 border-l-4 border-brand-red pl-8">
              <div>
                <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter mb-2 break-words">Settings for: {selectedGym.name}</h2>
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-600">Configure available features for this gym</p>
              </div>
           </div>
           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {[
                { id: 'enable_email_login', label: 'Email Login', icon: Mail },
                { id: 'enable_reminders', label: 'Announcements', icon: Activity },
                { id: 'enable_google_auth', label: 'Google Auth', icon: ShieldCheck },
                { id: 'enable_whatsapp_otp', label: 'Two-Factor Auth', icon: Lock },
              ].map((item) => (
                <Card key={item.id} className="p-8 flex flex-col justify-between bg-[#050505] border-white/5 hover:border-white/10 shadow-2xl transition-all duration-700 group h-full">
                  <div className="flex items-center justify-between mb-8">
                    <item.icon className="h-6 w-6 text-slate-600 group-hover:text-brand-red transition-colors" />
                    <div className={twMerge(
                      "h-2 w-2 rounded-full",
                      config[item.id as keyof GymFeatureConfig] ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]" : "bg-slate-800"
                    )} />
                  </div>
                  <h3 className="font-black text-white text-xs uppercase tracking-[0.2em] italic mb-8 break-words">{item.label}</h3>
                  <Button 
                    variant={config[item.id as keyof GymFeatureConfig] ? 'primary' : 'outline'} 
                    className="w-full min-h-[48px] text-[10px] font-black uppercase tracking-[0.2em]"
                    onClick={() => updateConfig(item.id as keyof GymFeatureConfig)}
                    disabled={configSaving}
                  >
                    {config[item.id as keyof GymFeatureConfig] ? 'Deactivate' : 'Activate'}
                  </Button>
                </Card>
              ))}
           </div>
        </div>
      )}

      {showAddModal && (
        <Modal 
          open={showAddModal} 
          onClose={() => setShowAddModal(false)} 
          title="Register New Gym"
          className="max-w-2xl bg-[#050505] rounded-[2rem] sm:rounded-[3rem]"
        >
          <form onSubmit={handleCreateGym} className="p-2 space-y-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
               <div className="space-y-8">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-600 pl-1">Gym Name</label>
                    <input className="w-full h-14 px-6 rounded-2xl bg-white/[0.03] border border-white/10 text-sm font-medium text-white focus:outline-none focus:border-brand-red/40 transition-all" placeholder="e.g. Titan Fitness" value={form.name} required onChange={e => setForm({...form, name: e.target.value})} />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-600 pl-1">Gym Website Link</label>
                    <input className="w-full h-14 px-6 rounded-2xl bg-white/[0.03] border border-white/10 text-sm font-mono font-bold text-brand-orange focus:outline-none focus:border-brand-orange/40 transition-all" placeholder="e.g. titan-core" value={form.subdomain} required onChange={e => setForm({...form, subdomain: e.target.value.toLowerCase().replace(/\s+/g, '-')})} />
                  </div>
               </div>
               <div className="space-y-8">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-600 pl-1">Owner Name</label>
                    <input className="w-full h-14 px-6 rounded-2xl bg-white/[0.03] border border-white/10 text-sm font-medium text-white focus:outline-none focus:border-brand-red/40 transition-all" placeholder="e.g. John Doe" value={form.owner_name} required onChange={e => setForm({...form, owner_name: e.target.value})} />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-600 pl-1">Owner Email</label>
                    <div className="relative">
                        <Mail className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600" />
                        <input className="w-full h-14 pl-12 pr-6 rounded-2xl bg-white/[0.03] border border-white/10 text-sm font-medium text-white focus:outline-none focus:border-brand-red/40 transition-all" type="email" placeholder="owner@gym.com" value={form.owner_email} required onChange={e => setForm({...form, owner_email: e.target.value})} />
                    </div>
                  </div>
               </div>
            </div>
            <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-600 pl-1">Owner Password</label>
                <div className="relative">
                    <UserIcon className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600" />
                    <input className="w-full h-14 pl-12 pr-6 rounded-2xl bg-white/[0.03] border border-white/10 text-sm font-medium text-white focus:outline-none focus:border-brand-red/40 transition-all" type="password" placeholder="••••••••••••" value={form.owner_password} required onChange={e => setForm({...form, owner_password: e.target.value})} />
                </div>
            </div>
            <Button variant="primary" className="w-full min-h-[64px] uppercase font-black tracking-[0.2em] text-xs italic shadow-2xl shadow-brand-red/20 mt-4" disabled={creating}>{creating ? 'Creating Gym...' : 'Register Gym'}</Button>
          </form>
        </Modal>
      )}
    </div>
  )
}
