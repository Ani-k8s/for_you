import { useEffect, useState } from 'react'
import { api, getApiErrorMessage } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Tooltip from '../components/ui/Tooltip'
import Modal from '../components/ui/Modal'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/Table'
import { Building, Users, Plus, X, Settings2, Lock, Unlock, Mail, User as UserIcon, Copy, Shield, Activity, Zap, AlertCircle, ShieldCheck, Loader2 } from 'lucide-react'
import { twMerge } from 'tailwind-merge'
import Badge from '../components/ui/Badge'

type SuperAdminDashboardData = {
  total_gyms: number
  total_users: number
  pending_requests_count: number
  pending_requests: {
    id: string
    name: string
    subdomain: string
    owner_email: string
    created_at: string
  }[]
  gym_wise_analytics: {
    id: string
    name: string
    subdomain: string
    full_url: string
    owner_email: string
    members_count: number
    is_configured: boolean
    is_active: boolean
  }[]
}

export default function SuperAdminDashboard() {
  useAuth()
  const [data, setData] = useState<SuperAdminDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [showManualEditor, setShowManualEditor] = useState(false)
  const [editingRole, setEditingRole] = useState<string | null>(null)
  const [manualTitle, setManualTitle] = useState('')
  const [manualContent, setManualContent] = useState('')
  const [manualSaving, setManualSaving] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'bot' } | null>(null)
  const [approvingRequestId, setApprovingRequestId] = useState<string | null>(null)
  const [passwordForApproval, setPasswordForApproval] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      const res = await api.get('/api/dashboard/')
      setData(res.data as SuperAdminDashboardData)
    } finally {
      setLoading(false)
    }
  }

  const showToast = (message: string) => {
    setToast({ message, type: 'success' })
    setTimeout(() => setToast(null), 3000)
  }

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    showToast(`${label} copied!`)
  }

  const [globalReply, setGlobalReply] = useState('')
  const [savingConfig, setSavingConfig] = useState(false)
  const [supportConfigId, setSupportConfigId] = useState<string | null>(null)

  useEffect(() => {
    fetchDashboardData()
    fetchSupportConfig()
  }, [])

  const fetchSupportConfig = async () => {
    try {
        const response = await api.get('/api/support/config/')
        const globalConfig = response.data.find((c: any) => c.role === 'global')
        if (globalConfig) {
            setGlobalReply(globalConfig.default_reply || '')
            setSupportConfigId(globalConfig.id)
        }
    } catch (error) {
        console.error('Failed to fetch support config:', error)
    }
  }

  const saveSupportConfig = async () => {
    setSavingConfig(true)
    try {
        if (supportConfigId) {
            await api.patch(`/api/support/config/${supportConfigId}/`, {
                default_reply: globalReply
            })
        } else {
            const resp = await api.post('/api/support/config/', {
                role: 'global',
                keyword: 'system_default',
                response: 'Default response',
                default_reply: globalReply,
                is_active: true
            })
            setSupportConfigId(resp.data.id)
        }
        showToast('System configuration updated successfully.')
    } catch (err) {
      setToast({ message: getApiErrorMessage(err), type: 'bot' })
    } finally {
        setSavingConfig(false)
    }
  }

  async function toggleGymStatus(gymId: string, currentStatus: boolean) {
    try {
      await api.patch(`/api/gyms/${gymId}/`, { is_active: !currentStatus })
      fetchDashboardData()
      showToast(currentStatus ? 'Gym deactivated.' : 'Gym activated.')
    } catch (err) {
      alert(getApiErrorMessage(err))
    }
  }
  
  async function handleApproveRequest(requestId: string) {
    if (!passwordForApproval) {
      alert('Please provide a password for the new owner account.')
      return
    }
    setApprovingRequestId(requestId)
    try {
      await api.post(`/api/gyms/requests/${requestId}/approve/`, { 
        owner_password: passwordForApproval 
      })
      showToast('Gym registration approved!')
      setApprovingRequestId(null)
      setPasswordForApproval('')
      fetchDashboardData()
    } catch (err) {
      alert(getApiErrorMessage(err))
      setApprovingRequestId(null)
    }
  }

  async function fetchManualForEdit(role: string) {
    setEditingRole(role)
    try {
      const res = await api.get(`/api/docs/manual/?role=${role}`)
      setManualTitle(res.data.title)
      setManualContent(JSON.stringify(res.data.sections, null, 2))
      setShowManualEditor(true)
    } catch (err) {
      setManualTitle(`${role.replace('_', ' ')} Manual`)
      setManualContent('[]')
      setShowManualEditor(true)
    }
  }

  async function handleSaveManual() {
    if (!editingRole) return
    setManualSaving(true)
    try {
      const parsed = JSON.parse(manualContent)
      await api.put('/api/docs/manual/', {
        role: editingRole,
        title: manualTitle,
        content: parsed
      })
      showToast('Documentation updated successfully!')
      setShowManualEditor(false)
    } catch (err) {
      if (err instanceof SyntaxError) alert('Invalid JSON format in documentation!')
      else alert(getApiErrorMessage(err))
    } finally {
      setManualSaving(false)
    }
  }

  const filteredGyms = data?.gym_wise_analytics.filter(gym => 
    gym.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    gym.subdomain.toLowerCase().includes(searchTerm.toLowerCase()) ||
    gym.owner_email.toLowerCase().includes(searchTerm.toLowerCase())
  ) || []

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 animate-pulse">
        <Loader2 className="h-16 w-16 text-brand-red animate-spin" />
        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500">Loading Platform Administration...</p>
      </div>
    )
  }

  return (
    <div className="space-y-12 animate-fadeInUp pb-32 p-4 sm:p-8 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-10 pb-12 border-b border-white/5">
        <div className="flex items-center gap-8">
           <div className="relative group shrink-0">
              <div className="absolute -inset-4 bg-brand-yellow/10 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
               <div className="h-16 w-16 md:h-20 md:w-20 bg-gradient-to-br from-brand-yellow to-brand-orange text-white rounded-2xl flex items-center justify-center shadow-xl shadow-brand-orange/20 border border-white/10 p-3 group-hover:rotate-6 transition-transform">
                <Shield className="h-8 w-8 md:h-10 md:w-10 text-white" />
              </div>
           </div>
           <div>
              <h1 className="text-4xl md:text-6xl font-black text-white uppercase italic tracking-tighter leading-tight font-display text-gradient-elite break-words">
                Platform Administration
              </h1>
              <div className="flex flex-wrap items-center gap-4">
                 <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                    <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500 break-words">All systems online</span>
                 </div>
                 <div className="h-3 w-px bg-white/10 hidden sm:block" />
                 <span className="text-[9px] font-bold uppercase tracking-widest text-brand-orange break-words">Master Node</span>
              </div>
           </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
            <Button 
              onClick={() => copyToClipboard(`${window.location.origin}/register-gym`, 'Registration Link')}
              variant="secondary"
              className="min-h-[48px] px-6 text-[10px] font-bold uppercase tracking-widest border-white/5 bg-white/5"
            >
              <Copy className="w-4 h-4 mr-2 shrink-0" />
              Copy Registration Link
            </Button>
            <Button 
              onClick={() => showToast('Initiating Onboarding...')}
              className="min-h-[48px] px-8 text-[10px] font-bold uppercase tracking-widest btn-premium-gradient shrink-0"
            >
              <Plus className="w-4 h-4 mr-2 shrink-0" />
              Register New Gym
            </Button>
        </div>
      </div>

      {/* Settings */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
              <Card className="h-full p-8 sm:p-10 bg-black/40 border-white/5 shadow-2xl">
                  <div className="flex items-center gap-4 mb-10 shrink-0">
                      <div className="h-12 w-12 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10 shrink-0">
                          <Settings2 className="h-6 w-6 text-slate-400" />
                      </div>
                      <div className="min-w-0">
                          <h3 className="text-xl font-black text-white uppercase italic tracking-tighter">Platform Settings</h3>
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1 break-words">Configure settings that affect all gyms and users</p>
                      </div>
                  </div>

                  <div className="space-y-10">
                      <div className="group">
                          <label className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em] mb-4 block break-words">Global Support Message</label>
                          <div className="relative">
                              <textarea 
                                  className="w-full bg-slate-900/50 border border-white/10 rounded-2xl p-6 text-sm text-white placeholder-slate-700 focus:outline-none focus:border-brand-red/50 transition-all min-h-[140px] resize-none"
                                  placeholder="Enter the automated response for all incoming support messages..."
                                  value={globalReply}
                                  onChange={(e) => setGlobalReply(e.target.value)}
                              />
                              <div className="absolute top-4 right-4 h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                          </div>
                          <div className="flex justify-end mt-6">
                              <Button 
                                  onClick={saveSupportConfig}
                                  isLoading={savingConfig}
                                  className="min-h-[56px] px-10 btn-premium-gradient text-xs uppercase font-black tracking-widest"
                              >
                                  Save Configuration
                              </Button>
                          </div>
                      </div>
                  </div>
              </Card>
          </div>
          
          <Card className="p-8 sm:p-10 bg-black/40 border-white/5 shadow-2xl flex flex-col items-center justify-center text-center h-full">
              <div className="h-16 w-16 bg-brand-red/10 rounded-[2rem] flex items-center justify-center border border-brand-red/20 mb-8 shadow-2xl shadow-brand-red/10 shrink-0">
                  <ShieldCheck className="h-8 w-8 text-brand-red" />
              </div>
              <h4 className="text-lg font-black text-white uppercase italic tracking-tighter mb-4 break-words">Encrypted Infrastructure</h4>
              <p className="text-[11px] font-medium text-slate-500 leading-relaxed max-w-[240px] break-words mb-10">
                  Your session is protected with end-to-end encryption. All actions are logged for security audits.
              </p>
              <div className="flex items-center gap-2 px-6 py-3 bg-emerald-500/10 border border-emerald-500/20 rounded-full shrink-0">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">Encryption Active</span>
              </div>
          </Card>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
         <Card isShimmer className="group p-8 bg-black/40 border-white/5 shadow-2xl h-full flex flex-col justify-between">
            <div className="absolute -top-10 -right-10 p-8 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity duration-700 pointer-events-none">
               <Building className="h-32 w-32" />
            </div>
            <div className="relative z-10">
               <span className="text-[9px] font-bold uppercase tracking-[0.3em] text-slate-500 block mb-4">Total Gyms</span>
               <div className="text-5xl font-black text-white italic tracking-tighter mb-4 break-words">{data?.total_gyms}</div>
            </div>
            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden mt-8">
               <div className="h-full bg-brand-orange animate-pulse" style={{ width: '100%' }} />
            </div>
         </Card>

         <Card isShimmer className="group p-8 bg-black/40 border-white/5 shadow-2xl h-full flex flex-col justify-between">
            <div className="absolute -top-10 -right-10 p-8 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity duration-700 pointer-events-none">
               <Users className="h-32 w-32" />
            </div>
            <div className="relative z-10">
               <span className="text-[9px] font-bold uppercase tracking-[0.3em] text-slate-500 block mb-4">Total Platform Users</span>
               <div className="text-5xl font-black text-white italic tracking-tighter mb-4 break-words">{data?.total_users}</div>
            </div>
            <div className="flex items-center gap-2 text-[9px] font-bold text-emerald-500/80 uppercase tracking-widest mt-8 break-words">
               <Zap className="w-3.5 h-3.5 shrink-0" />
               <span>Real-time Sync</span>
            </div>
         </Card>

         <Card isShimmer className={twMerge(
           "group p-8 bg-black/40 border-white/5 shadow-2xl h-full flex flex-col justify-between transition-colors",
           data && data.pending_requests_count > 0 ? "border-brand-orange/30 bg-brand-orange/[0.02]" : ""
         )}>
            <div className="absolute -top-10 -right-10 p-8 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity duration-700 pointer-events-none">
               <Activity className="h-32 w-32" />
            </div>
            <div className="relative z-10">
               <span className="text-[9px] font-bold uppercase tracking-[0.3em] text-slate-500 block mb-4">Pending Requests</span>
               <div className="text-5xl font-black text-white italic tracking-tighter mb-4 break-words">{data?.pending_requests_count}</div>
            </div>
            <div className={twMerge(
               "flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest mt-8 break-words",
               data && data.pending_requests_count > 0 ? "text-brand-orange animate-pulse" : "text-slate-600"
            )}>
               <AlertCircle className="w-3.5 h-3.5 shrink-0" />
               <span>{data && data.pending_requests_count > 0 ? 'Action Required' : 'All Clear'}</span>
            </div>
         </Card>
      </div>

      {/* Approvals */}
      {data && data.pending_requests.length > 0 && (
        <div className="space-y-8 pt-6">
           <div className="flex items-center gap-4">
              <div className="h-2 w-2 rounded-full bg-brand-orange animate-ping" />
              <h2 className="text-2xl font-black text-white uppercase tracking-tighter italic break-words">Pending Gym Approvals</h2>
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {data.pending_requests.map(req => (
                <Card key={req.id} isShimmer className="p-8 border-brand-orange/20 bg-brand-orange/[0.02] shadow-2xl rounded-[2.5rem]">
                   <div className="flex items-start justify-between mb-8 gap-4">
                      <div className="min-w-0">
                         <h3 className="text-lg font-black text-white uppercase italic tracking-tight break-words">{req.name}</h3>
                         <p className="text-[10px] font-bold text-slate-500 tracking-[0.2em] mt-1 uppercase italic break-words">{req.subdomain}.gym.saas</p>
                      </div>
                      <div className="h-2.5 w-2.5 rounded-full bg-brand-orange animate-pulse shrink-0" />
                   </div>
                   
                   <div className="space-y-4 mb-10 shrink-0">
                      <div className="flex items-center gap-3 min-w-0">
                         <Mail className="w-4 h-4 text-slate-600 shrink-0" />
                         <span className="text-xs font-medium text-slate-400 break-words">{req.owner_email}</span>
                      </div>
                   </div>
 
                   <div className="pt-8 border-t border-white/5">
                      {approvingRequestId === req.id ? (
                        <div className="space-y-6 animate-fadeInUp">
                           <input 
                             type="password"
                             placeholder="Set owner password..."
                             className="w-full h-12 bg-black/40 border border-brand-orange/30 rounded-2xl px-5 text-sm font-bold text-white focus:outline-none focus:border-brand-orange transition-all"
                             value={passwordForApproval}
                             onChange={(e) => setPasswordForApproval(e.target.value)}
                           />
                           <div className="flex gap-4">
                             <Button onClick={() => handleApproveRequest(req.id)} className="flex-1 min-h-[48px] btn-premium-gradient text-[10px] font-black uppercase tracking-widest">Complete Approval</Button>
                             <Button variant="secondary" onClick={() => setApprovingRequestId(null)} className="h-12 w-12 flex items-center justify-center p-0 shrink-0 rounded-2xl"><X className="w-5 h-5" /></Button>
                           </div>
                        </div>
                      ) : (
                        <Button onClick={() => setApprovingRequestId(req.id)} className="w-full min-h-[56px] font-black text-[10px] tracking-widest uppercase btn-premium-gradient">Approve Registration</Button>
                      )}
                   </div>
                </Card>
              ))}
           </div>
        </div>
      )}
 
      {/* Registry */}
      <div className="space-y-10 pt-12">
         <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter break-words shrink-0">Registered Gyms</h2>
            
            <div className="relative group w-full md:w-96 shrink-0">
               <Activity className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600 group-focus-within:text-brand-orange transition-colors" />
               <input 
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
                 placeholder="Search registered gyms..."
                 className="w-full h-12 bg-white/[0.02] border border-white/10 rounded-2xl pl-12 pr-4 text-sm font-medium text-white placeholder-slate-700 focus:outline-none focus:border-brand-orange/40 transition-all"
               />
            </div>
         </div>
         
         <Card isShimmer className="p-0 border-white/5 bg-black/40 shadow-2xl rounded-[2.5rem] sm:rounded-[3.5rem] overflow-visible">
            <div className="overflow-x-auto custom-scrollbar rounded-[2.5rem] sm:rounded-[3.5rem]">
               <Table className="w-full">
                  <TableHeader>
                     <TableRow className="bg-white/[0.02] border-b border-white/5">
                        <TableHead className="py-6 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Gym Website Link</TableHead>
                        <TableHead className="px-10 py-6 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Gym & Owner</TableHead>
                        <TableHead className="px-10 py-6 text-center text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Status</TableHead>
                        <TableHead className="pr-10 py-6 text-right text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Actions</TableHead>
                     </TableRow>
                  </TableHeader>
                  <TableBody>
                     {filteredGyms.map(g => (
                       <TableRow key={g.id} className="group border-b border-white/[0.02] hover:bg-white/[0.01] transition-all duration-500">
                          <TableCell className="pl-10 py-6">
                             <span className="font-mono text-[11px] font-black text-brand-orange italic uppercase tracking-tight break-words">{g.subdomain}.gym.saas</span>
                          </TableCell>
                          <TableCell className="px-10 py-6">
                             <div className="text-sm font-black text-white uppercase italic tracking-tight break-words max-w-[250px]">{g.name}</div>
                             <div className="text-[10px] font-medium text-slate-500 mt-1 break-words max-w-[250px]">{g.owner_email}</div>
                          </TableCell>
                          <TableCell className="px-10 py-6 text-center">
                             <Badge intent={g.is_configured ? 'primary' : 'neutral'} className="min-h-6 h-auto px-4 py-1 text-[8px] font-black uppercase tracking-widest">
                                {g.is_configured ? 'Active' : 'Pending Setup'}
                             </Badge>
                          </TableCell>
                          <TableCell className="pr-10 py-6 text-right">
                             <div className="flex items-center justify-end gap-3">
                                <Tooltip text="Copy Link">
                                   <button onClick={() => copyToClipboard(g.full_url, 'Registration Link')} className="p-2.5 bg-white/[0.03] hover:bg-brand-orange/10 rounded-xl text-slate-500 hover:text-brand-orange transition-all active:scale-90">
                                      <Copy className="w-4 h-4" />
                                   </button>
                                </Tooltip>
                                <Tooltip text="Status">
                                   <button onClick={() => toggleGymStatus(g.id, g.is_active)} className={twMerge(
                                       "p-2.5 rounded-xl transition-all active:scale-90",
                                       g.is_active ? "bg-white/[0.03] text-slate-500 hover:text-white" : "bg-brand-orange/20 text-brand-orange"
                                   )}>
                                      {g.is_active ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                                   </button>
                                </Tooltip>
                             </div>
                          </TableCell>
                       </TableRow>
                     ))}
                     {filteredGyms.length === 0 && (
                       <TableRow>
                          <TableCell colSpan={4} className="py-20 text-center">
                             <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-700">No gyms found matching your search</p>
                          </TableCell>
                       </TableRow>
                     )}
                  </TableBody>
               </Table>
            </div>
         </Card>
      </div>

      {/* Documentation */}
      <div className="space-y-12 pt-20">
         <div className="flex items-center justify-between gap-6">
            <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter break-words font-display">Administrative Documentation</h2>
            <Badge intent="neutral" className="text-[9px] font-black uppercase tracking-[0.4em] px-4 py-2 shrink-0">System Documentation</Badge>
         </div>
         
         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { role: 'super_admin', label: 'Command', icon: Shield },
              { role: 'gym_owner', label: 'Strategic', icon: UserIcon },
              { role: 'staff', label: 'Staff', icon: Activity },
              { role: 'member', label: 'Member', icon: Zap },
            ].map(item => (
              <Card key={item.role} isShimmer className="p-10 transition-all duration-700 group border-white/5 bg-[#050505] flex flex-col h-full hover:border-brand-red/30">
                 <div className="flex items-center justify-between mb-10 shrink-0">
                    <div className="h-16 w-16 bg-white/[0.03] text-slate-600 group-hover:bg-brand-red group-hover:text-white rounded-2xl flex items-center justify-center transition-all duration-700 group-hover:shadow-2xl group-hover:shadow-brand-red/30 group-hover:rotate-12 border border-white/10 shrink-0">
                       <item.icon className="w-8 h-8" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-800">v1.0</span>
                 </div>
                 <h3 className="text-xl font-black text-white uppercase italic mb-8 tracking-tighter text-gradient-elite break-words leading-tight">{item.label} Documentation</h3>
                 <Button 
                   variant="secondary" 
                   size="sm" 
                   onClick={() => fetchManualForEdit(item.role)}
                   className="mt-auto w-full min-h-[48px] font-black uppercase tracking-[0.2em] italic border-white/10 bg-white/5 hover:bg-white/10 text-[10px] transition-all"
                 >
                   Update Docs
                 </Button>
              </Card>
            ))}
         </div>
      </div>

      {/* Modal */}
      {showManualEditor && (
        <Modal 
          open={showManualEditor} 
          onClose={() => setShowManualEditor(false)} 
          title={`Edit Documentation: ${editingRole}`}
          className="max-w-6xl bg-[#050505] rounded-[2.5rem] sm:rounded-[3.5rem] h-[90vh] flex flex-col"
        >
          <div className="p-2 space-y-10 flex-1 flex flex-col min-h-0">
             <div className="space-y-3 shrink-0">
                <label className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em] ml-1">Document Title</label>
                <input 
                  className="w-full h-16 bg-white/[0.03] border border-white/10 rounded-2xl px-6 text-xl font-black text-white uppercase tracking-tighter italic focus:outline-none focus:border-brand-red transition-all"
                  value={manualTitle}
                  onChange={e => setManualTitle(e.target.value)}
                />
             </div>
             <div className="flex-1 flex flex-col space-y-3 min-h-0">
                <label className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em] ml-1">Document Body (JSON)</label>
                <textarea 
                  className="flex-1 w-full bg-[#030303] border border-white/10 rounded-2xl p-8 font-mono text-xs text-brand-orange focus:outline-none focus:border-brand-red resize-none custom-scrollbar"
                  value={manualContent}
                  onChange={e => setManualContent(e.target.value)}
                />
             </div>
             <div className="flex gap-6 pt-6 shrink-0">
                <Button variant="secondary" onClick={() => setShowManualEditor(false)} className="flex-1 h-16 uppercase font-black tracking-[0.2em] text-xs">Cancel</Button>
                <Button onClick={handleSaveManual} isLoading={manualSaving} className="flex-[2] h-16 uppercase font-black tracking-[0.2em] text-sm btn-premium-gradient shadow-2xl shadow-brand-red/30 italic">Save Changes</Button>
             </div>
          </div>
        </Modal>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-12 right-12 z-[150] animate-fadeInLeft">
           <div className="glass-panel px-8 py-5 flex items-center gap-5 border-emerald-500/30 shadow-2xl backdrop-blur-3xl rounded-[2rem]">
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_12px_rgba(16,185,129,0.8)]" />
              <span className="text-[11px] font-black uppercase tracking-[0.2em] text-white">{toast.message}</span>
           </div>
        </div>
      )}
    </div>
  )
}
