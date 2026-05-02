import { useEffect, useMemo, useState } from 'react'
import { api, getApiErrorMessage } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Input from '../components/ui/Input'
import Modal from '../components/ui/Modal'
import Select from '../components/ui/Select'
import Skeleton from '../components/ui/Skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/Table'
import { useToast } from '../components/ui/ToastProvider'
import { UserPlus, LayoutGrid, List, Users, User as UserIcon, Mail, Calendar, Search, SlidersHorizontal } from 'lucide-react'

type Plan = { id: string; name: string; price: number; duration_days: number }

type Member = {
  id: string
  user_id: string
  user_email: string
  first_name?: string
  last_name?: string
  gym: string
  plan: string | null
  start_date: string | null
  end_date: string | null
  is_active: boolean
  role: string
  attendance_history?: any[]
  payment_history?: any[]
}

type SortKey = 'email' | 'plan' | 'start' | 'end' | 'status'
type SortDir = 'asc' | 'desc'

function sortMembers(list: Member[], sortKey: SortKey, sortDir: SortDir, planNameById: Record<string, string>) {
  const dir = sortDir === 'asc' ? 1 : -1
  return [...list].sort((a, b) => {
    let res = 0
    if (sortKey === 'email') res = a.user_email.localeCompare(b.user_email)
    if (sortKey === 'plan') {
      res = (planNameById[a.plan ?? ''] ?? '').localeCompare(planNameById[b.plan ?? ''] ?? '')
    }
    if (sortKey === 'start') res = (a.start_date ?? '').localeCompare(b.start_date ?? '')
    if (sortKey === 'end') res = (a.end_date ?? '').localeCompare(b.end_date ?? '')
    if (sortKey === 'status') res = Number(a.is_active) - Number(b.is_active)
    return res * dir
  })
}

function toDateInputValue(dateIso: string | null) {
  if (!dateIso) return ''
  const d = new Date(dateIso)
  if (Number.isNaN(d.valueOf())) return ''
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

export default function MembersPage() {
  const { user } = useAuth()
  const role = user?.role
  const gymId = user?.gym?.id
  const { toast } = useToast()

  const canCreate = role === 'gym_owner'

  const [members, setMembers] = useState<Member[]>([])
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'expired'>('all')
  const [planFilter, setPlanFilter] = useState<string>('all')
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table')
  const [sortKey, setSortKey] = useState<SortKey>('email')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  async function refresh() {
    if (!gymId) return
    const [mRes, pRes] = await Promise.all([api.get('/api/members/'), api.get(`/api/gyms/${gymId}/plans/`)])
    const membersRaw = mRes.data.results ?? mRes.data
    const plansRaw = pRes.data.results ?? pRes.data
    setMembers(membersRaw as Member[])
    setPlans(plansRaw as Plan[])
  }

  useEffect(() => {
    if (!gymId) return
    ;(async () => {
      try {
        setLoading(true)
        await refresh()
      } catch (err) {
        toast({ title: 'Error', description: getApiErrorMessage(err), intent: 'error' })
      } finally {
        setLoading(false)
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gymId])

  const planNameById = useMemo(() => {
    const map: Record<string, string> = {}
    plans.forEach((p) => {
      map[p.id] = p.name
    })
    return map
  }, [plans])

  const filteredMembers = useMemo(() => {
    let list = members
    const q = search.trim().toLowerCase()
    if (q) {
      list = list.filter((m) => m.user_email.toLowerCase().includes(q) || m.first_name?.toLowerCase().includes(q) || m.last_name?.toLowerCase().includes(q))
    }
    if (statusFilter === 'active') list = list.filter((m) => m.is_active)
    if (statusFilter === 'expired') list = list.filter((m) => !m.is_active)
    if (planFilter !== 'all') list = list.filter((m) => m.plan === planFilter)

    return sortMembers(list, sortKey, sortDir, planNameById)
  }, [members, search, statusFilter, planFilter, sortKey, sortDir, planNameById])

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedMember, setSelectedMember] = useState<Member | null>(null)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    plan_id: '',
    start_date: '',
    end_date: '',
    is_active: true,
  })

  function openCreate() {
    setSelectedMember(null)
    setForm({
      email: '',
      password: '',
      first_name: '',
      last_name: '',
      plan_id: plans[0]?.id ?? '',
      start_date: new Date().toISOString().split('T')[0],
      end_date: '',
      is_active: true,
    })
    setIsModalOpen(true)
  }

  function openEdit(m: Member) {
    setSelectedMember(m)
    setForm({
      email: m.user_email,
      password: '',
      first_name: m.first_name ?? '',
      last_name: m.last_name ?? '',
      plan_id: m.plan ?? '',
      start_date: toDateInputValue(m.start_date),
      end_date: toDateInputValue(m.end_date),
      is_active: m.is_active,
    })
    setIsModalOpen(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      if (selectedMember) {
        await api.patch(`/api/members/${selectedMember.id}/`, {
          first_name: form.first_name,
          last_name: form.last_name,
          plan_id: form.plan_id,
          start_date: form.start_date || null,
          end_date: form.end_date || null,
          is_active: form.is_active,
        })
        toast({ title: 'Member updated successfully', intent: 'success' })
      } else {
        await api.post('/api/members/', {
          email: form.email,
          password: form.password,
          first_name: form.first_name,
          last_name: form.last_name,
          plan_id: form.plan_id,
          start_date: form.start_date || null,
          end_date: form.end_date || null,
        })
        toast({ title: 'New member added successfully', intent: 'success' })
      }
      setIsModalOpen(false)
      await refresh()
    } catch (err) {
      toast({ title: 'Save Failed', description: getApiErrorMessage(err), intent: 'error' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-12 p-8 animate-fadeInUp">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-4">
            <Skeleton className="h-12 w-64 rounded-2xl" />
            <Skeleton className="h-4 w-96 rounded-xl" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Skeleton className="h-32 rounded-[2.5rem]" />
          <Skeleton className="h-32 rounded-[2.5rem]" />
          <Skeleton className="h-32 rounded-[2.5rem]" />
          <Skeleton className="h-32 rounded-[2.5rem]" />
        </div>
        <Skeleton className="h-[600px] rounded-[3.5rem]" />
      </div>
    )
  }

  return (
    <div className="animate-fadeInUp max-w-[1600px] mx-auto pb-32 p-4 sm:p-8">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-10 mb-12 pb-12 border-b border-white/5">
        <div className="flex items-center gap-8">
           <div className="relative group">
              <div className="absolute -inset-6 bg-brand-red/20 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
              <div className="h-16 w-16 md:h-20 md:w-20 bg-gradient-to-br from-brand-red to-brand-orange text-white rounded-3xl flex items-center justify-center shadow-2xl shadow-brand-red/30 border border-white/10 group-hover:rotate-6 transition-all duration-700 active-glow-brand">
                <Users className="h-8 w-8 md:h-10 md:w-10 text-white" />
              </div>
           </div>
           <div>
              <h1 className="text-3xl md:text-6xl font-black text-white uppercase italic tracking-tighter leading-tight mb-3 text-gradient-elite font-display">
                Member Directory
              </h1>
              <div className="flex items-center gap-3">
                 <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                 <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">
                    Manage your gym members in real-time
                 </p>
              </div>
           </div>
        </div>
        {canCreate && (
          <Button onClick={openCreate} className="min-h-[64px] px-10 btn-premium-gradient text-[10px] font-black uppercase tracking-[0.2em] italic shadow-2xl shadow-brand-red/30">
            <UserPlus className="h-5 w-5 mr-3 shrink-0" />
            Add New Member
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
        <Card isShimmer className="p-8 bg-[#050505] border-white/5">
           <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-600 block mb-6 italic">Active Members</span>
           <div className="text-5xl font-black text-white uppercase italic tracking-tighter leading-none font-display">
             {members.filter(m => m.is_active).length}
           </div>
        </Card>
        <Card isShimmer className="p-8 bg-[#050505] border-white/5">
           <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-600 block mb-6 italic">Expired Memberships</span>
           <div className="text-5xl font-black text-brand-red uppercase italic tracking-tighter leading-none font-display">
             {members.filter(m => !m.is_active).length}
           </div>
        </Card>
        <div className="sm:col-span-2 lg:col-span-2">
           <Card className="p-8 bg-white/[0.01] border-white/5 h-full flex flex-col justify-center">
              <div className="flex flex-col sm:flex-row items-center gap-6">
                 <div className="flex-1 w-full relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600" />
                    <Input 
                      placeholder="Search by name or email..." 
                      className="pl-12 bg-white/[0.03] border-white/10 h-12 rounded-2xl" 
                      value={search} 
                      onChange={e => setSearch(e.target.value)} 
                    />
                 </div>
                 <div className="flex items-center gap-2 bg-white/[0.03] border border-white/10 rounded-2xl p-1 shrink-0">
                    <Button variant={viewMode === 'table' ? 'primary' : 'ghost'} size="sm" onClick={() => setViewMode('table')} className="h-10 w-10 p-0 rounded-xl">
                      <List className="h-4 w-4" />
                    </Button>
                    <Button variant={viewMode === 'cards' ? 'primary' : 'ghost'} size="sm" onClick={() => setViewMode('cards')} className="h-10 w-10 p-0 rounded-xl">
                      <LayoutGrid className="h-4 w-4" />
                    </Button>
                 </div>
              </div>
           </Card>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-6 mb-12 p-6 bg-white/[0.02] border border-white/5 rounded-3xl backdrop-blur-xl">
         <div className="flex items-center gap-3">
            <SlidersHorizontal className="h-4 w-4 text-brand-red" />
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Filter by:</span>
         </div>
         <div className="flex flex-wrap items-center gap-4">
            <Select value={statusFilter} onChange={(e: any) => setStatusFilter(e.target.value as 'all' | 'active' | 'expired')} className="h-10 bg-black/40 border-white/10 text-[10px] font-black uppercase tracking-widest">
              <option value="all">All Statuses</option>
              <option value="active">Active Members</option>
              <option value="expired">Expired Memberships</option>
            </Select>
            <Select value={planFilter} onChange={(e: any) => setPlanFilter(e.target.value)} className="h-10 bg-black/40 border-white/10 text-[10px] font-black uppercase tracking-widest">
              <option value="all">All Plans</option>
              {plans.map(p => <option key={p.id} value={p.id}>{p.name.toUpperCase()}</option>)}
            </Select>
         </div>
      </div>

      {viewMode === 'table' ? (
        <Card isShimmer className="p-0 border-white/5 bg-black/40 shadow-2xl rounded-[2rem] sm:rounded-[3.5rem] overflow-visible">
           <div className="overflow-x-auto custom-scrollbar rounded-[2rem] sm:rounded-[3.5rem]">
             <Table className="w-full">
                <TableHeader>
                   <TableRow className="bg-white/[0.02] border-b border-white/5">
                      <TableHead className="pl-10 py-6 cursor-pointer hover:text-white" onClick={() => { setSortKey('email'); setSortDir(sortDir === 'asc' ? 'desc' : 'asc') }}>
                        Member {sortKey === 'email' && (sortDir === 'asc' ? '↑' : '↓')}
                      </TableHead>
                      <TableHead className="px-10 py-6 cursor-pointer hover:text-white" onClick={() => { setSortKey('plan'); setSortDir(sortDir === 'asc' ? 'desc' : 'asc') }}>
                        Plan {sortKey === 'plan' && (sortDir === 'asc' ? '↑' : '↓')}
                      </TableHead>
                      <TableHead className="px-10 py-6 cursor-pointer hover:text-white" onClick={() => { setSortKey('start'); setSortDir(sortDir === 'asc' ? 'desc' : 'asc') }}>
                        Start Date {sortKey === 'start' && (sortDir === 'asc' ? '↑' : '↓')}
                      </TableHead>
                      <TableHead className="px-10 py-6 cursor-pointer hover:text-white" onClick={() => { setSortKey('end'); setSortDir(sortDir === 'asc' ? 'desc' : 'asc') }}>
                        End Date {sortKey === 'end' && (sortDir === 'asc' ? '↑' : '↓')}
                      </TableHead>
                      <TableHead className="px-10 py-6 cursor-pointer hover:text-white text-center" onClick={() => { setSortKey('status'); setSortDir(sortDir === 'asc' ? 'desc' : 'asc') }}>
                        Status {sortKey === 'status' && (sortDir === 'asc' ? '↑' : '↓')}
                      </TableHead>
                      <TableHead className="pr-10 py-6 text-right">Actions</TableHead>
                   </TableRow>
                </TableHeader>
                <TableBody>
                   {filteredMembers.map(m => (
                      <TableRow key={m.id} className="hover:bg-white/[0.03] border-b border-white/[0.02] transition-all duration-500 group">
                         <TableCell className="pl-10 py-6">
                            <div className="flex items-center gap-4">
                               <div className="h-10 w-10 shrink-0 rounded-xl bg-gradient-to-br from-brand-red to-brand-orange text-white flex items-center justify-center font-black text-xs shadow-lg shadow-brand-red/20 border border-white/10 group-hover:rotate-6 transition-transform">
                                  {m.user_email[0].toUpperCase()}
                                </div>
                               <div className="min-w-0">
                                  <div className="text-sm font-black text-white uppercase italic tracking-tight break-words max-w-[200px]">{m.first_name} {m.last_name}</div>
                                  <div className="text-[10px] font-medium text-slate-500 break-words max-w-[200px]">{m.user_email}</div>
                               </div>
                            </div>
                         </TableCell>
                         <TableCell className="px-10 py-6">
                            <Badge intent="neutral" className="min-h-6 h-auto px-4 py-1 text-[9px] font-black uppercase tracking-widest border-white/10 bg-white/5 break-words max-w-[150px]">
                               {planNameById[m.plan ?? ''] || 'UNASSIGNED'}
                            </Badge>
                         </TableCell>
                         <TableCell className="px-10 py-6">
                            <div className="text-xs font-bold text-slate-400 whitespace-nowrap">{m.start_date || '—'}</div>
                         </TableCell>
                         <TableCell className="px-10 py-6">
                            <div className="text-xs font-bold text-slate-400 whitespace-nowrap">{m.end_date || '—'}</div>
                         </TableCell>
                         <TableCell className="px-10 py-6 text-center">
                            <Badge intent={m.is_active ? 'primary' : 'neutral'} className="min-h-6 h-auto px-4 py-1 text-[9px] font-black uppercase tracking-widest">
                               {m.is_active ? 'ACTIVE' : 'EXPIRED'}
                            </Badge>
                         </TableCell>
                         <TableCell className="pr-10 py-6 text-right">
                            <Button variant="ghost" size="sm" onClick={() => openEdit(m)} className="min-h-[40px] px-4 text-[10px] font-black uppercase tracking-widest bg-white/[0.02] border-white/10 hover:border-white/30 text-slate-400 hover:text-white">
                               Edit
                            </Button>
                         </TableCell>
                      </TableRow>
                   ))}
                   {filteredMembers.length === 0 && (
                     <TableRow>
                        <TableCell colSpan={6} className="py-20 text-center">
                           <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-700">No members found matching your search</p>
                        </TableCell>
                     </TableRow>
                   )}
                </TableBody>
             </Table>
           </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
           {filteredMembers.map(m => (
             <Card key={m.id} isShimmer className="p-8 bg-[#050505] border-white/5 hover:border-brand-red/30 transition-all duration-700 group active-glow-brand flex flex-col h-full">
                <div className="flex items-start justify-between mb-8">
                   <div className="h-12 w-12 shrink-0 rounded-2xl bg-gradient-to-br from-brand-red to-brand-orange text-white flex items-center justify-center font-black text-sm shadow-xl shadow-brand-red/20 border border-white/10 group-hover:rotate-12 transition-transform">
                      {m.user_email[0].toUpperCase()}
                   </div>
                   <Badge intent={m.is_active ? 'primary' : 'neutral'} className="min-h-5 h-auto px-3 py-1 text-[8px] font-black tracking-widest uppercase">
                      {m.is_active ? 'ACTIVE' : 'EXPIRED'}
                   </Badge>
                </div>
                <div className="mb-8 min-w-0">
                   <h3 className="text-lg font-black text-white uppercase italic tracking-tighter break-words leading-tight mb-1">{m.first_name} {m.last_name}</h3>
                   <p className="text-[10px] font-medium text-slate-500 break-words">{m.user_email}</p>
                </div>
                <div className="space-y-4 border-t border-white/5 pt-6 mb-8 mt-auto">
                   <div className="flex items-center justify-between gap-4">
                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-600 shrink-0">Plan</span>
                      <span className="text-[9px] font-black text-slate-300 uppercase italic tracking-widest text-right break-words">{planNameById[m.plan ?? ''] || '—'}</span>
                   </div>
                   <div className="flex items-center justify-between gap-4">
                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-600 shrink-0">Expires</span>
                      <span className="text-[9px] font-black text-slate-300 uppercase italic tracking-widest text-right whitespace-nowrap">{m.end_date || '—'}</span>
                   </div>
                </div>
                <Button variant="outline" className="w-full min-h-[44px] text-[9px] font-black uppercase tracking-widest" onClick={() => openEdit(m)}>Manage Member</Button>
             </Card>
           ))}
           {filteredMembers.length === 0 && (
              <div className="col-span-full py-20 text-center">
                 <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-700">No members found matching your search</p>
              </div>
           )}
        </div>
      )}

      {isModalOpen && (
        <Modal 
          open={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
          title={selectedMember ? "Edit Member" : "Add New Member"}
          className="max-w-xl bg-[#050505] rounded-[2rem] sm:rounded-[3rem]"
        >
          <form onSubmit={handleSave} className="p-2 space-y-10">
            {!selectedMember && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-600 pl-1">Email Address</label>
                    <div className="relative">
                       <Mail className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600" />
                       <input className="w-full h-14 pl-12 pr-6 rounded-2xl bg-white/[0.03] border border-white/10 text-sm font-medium text-white focus:outline-none focus:border-brand-red/40 transition-all" value={form.email} required placeholder="member@email.com" onChange={e => setForm({...form, email: e.target.value})} />
                    </div>
                 </div>
                 <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-600 pl-1">Password</label>
                    <div className="relative">
                       <UserIcon className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600" />
                       <input className="w-full h-14 pl-12 pr-6 rounded-2xl bg-white/[0.03] border border-white/10 text-sm font-medium text-white focus:outline-none focus:border-brand-red/40 transition-all" type="password" placeholder="••••••••" value={form.password} required={!selectedMember} onChange={e => setForm({...form, password: e.target.value})} />
                    </div>
                 </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-600 pl-1">First Name</label>
                  <input className="w-full h-14 px-6 rounded-2xl bg-white/[0.03] border border-white/10 text-sm font-medium text-white focus:outline-none focus:border-brand-red/40 transition-all" value={form.first_name} required placeholder="First Name" onChange={e => setForm({...form, first_name: e.target.value})} />
               </div>
               <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-600 pl-1">Last Name</label>
                  <input className="w-full h-14 px-6 rounded-2xl bg-white/[0.03] border border-white/10 text-sm font-medium text-white focus:outline-none focus:border-brand-red/40 transition-all" value={form.last_name} required placeholder="Last Name" onChange={e => setForm({...form, last_name: e.target.value})} />
               </div>
            </div>

            <div className="space-y-3">
               <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-600 pl-1">Membership Plan</label>
               <Select value={form.plan_id} onChange={(e: any) => setForm({...form, plan_id: e.target.value})} className="h-14 bg-white/[0.03] border-white/10 text-sm font-medium rounded-2xl">
                  {plans.map(p => <option key={p.id} value={p.id}>{p.name.toUpperCase()} — ${p.price}</option>)}
               </Select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-600 pl-1">Start Date</label>
                  <div className="relative">
                     <Calendar className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600" />
                     <input type="date" className="w-full h-14 pl-12 pr-6 rounded-2xl bg-white/[0.03] border border-white/10 text-sm font-medium text-white focus:outline-none focus:border-brand-red/40 transition-all [color-scheme:dark]" value={form.start_date} required onChange={e => setForm({...form, start_date: e.target.value})} />
                  </div>
               </div>
               <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-600 pl-1">End Date (Optional)</label>
                  <div className="relative">
                     <Calendar className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600" />
                     <input type="date" className="w-full h-14 pl-12 pr-6 rounded-2xl bg-white/[0.03] border border-white/10 text-sm font-medium text-white focus:outline-none focus:border-brand-red/40 transition-all [color-scheme:dark]" value={form.end_date} onChange={e => setForm({...form, end_date: e.target.value})} />
                  </div>
               </div>
            </div>

            <div className="flex items-center gap-3 p-6 bg-white/[0.02] border border-white/5 rounded-2xl">
               <input type="checkbox" id="is_active" className="h-5 w-5 rounded border-white/10 bg-black/40 text-brand-red focus:ring-brand-red/20" checked={form.is_active} onChange={e => setForm({...form, is_active: e.target.checked})} />
               <label htmlFor="is_active" className="text-xs font-black uppercase tracking-widest text-white italic">Mark member as active</label>
            </div>

            <Button variant="primary" className="w-full min-h-[64px] uppercase font-black tracking-[0.2em] text-xs italic shadow-2xl shadow-brand-red/20" disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</Button>
          </form>
        </Modal>
      )}
    </div>
  )
}
