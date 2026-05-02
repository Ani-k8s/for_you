import { useEffect, useMemo, useState } from 'react'
import { api, getApiErrorMessage } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'
import Skeleton from '../components/ui/Skeleton'
import { useToast } from '../components/ui/ToastProvider'

type Member = {
  id: string
  user_email: string
  gym: string
}

type AttendanceRecord = {
  id: string
  gym: string
  member: string
  date: string
  check_in: string | null
  check_out: string | null
  created_at: string
}

function formatTime(iso: string | null) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.valueOf())) return '—'
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export default function AttendancePage() {
  const { user } = useAuth()
  const role = user?.role
  const gymId = user?.gym?.id
  const { toast } = useToast()

  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)

  const [query, setQuery] = useState('')
  const [selectedMemberId, setSelectedMemberId] = useState<string>('')
  const [running, setRunning] = useState(false)

  const [todayRecords, setTodayRecords] = useState<AttendanceRecord[]>([])
  const [recordsLoading, setRecordsLoading] = useState(false)

  const selectedMember = useMemo(
    () => members.find((m) => m.id === selectedMemberId) ?? null,
    [members, selectedMemberId],
  )

  async function loadMembers() {
    const mRes = await api.get('/api/members/')
    const raw = mRes.data.results ?? mRes.data
    setMembers(raw.map((m: any) => ({ id: m.id, user_email: m.user_email, gym: String(m.gym) })))
  }

  async function loadTodayRecords() {
    setRecordsLoading(true)
    try {
      const res = await api.get('/api/attendance/')
      const raw = res.data.results ?? res.data
      const today = new Date().toISOString().slice(0, 10)
      const filtered = (raw as AttendanceRecord[]).filter((r) => String(r.date).slice(0, 10) === today)
      setTodayRecords(filtered)
    } finally {
      setRecordsLoading(false)
    }
  }

  useEffect(() => {
    if (!gymId) return
    ;(async () => {
      try {
        setLoading(true)
        await Promise.all([loadMembers(), loadTodayRecords()])
      } catch (err) {
        toast({ title: 'Sync Error', description: getApiErrorMessage(err), intent: 'error' })
      } finally {
        setLoading(false)
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gymId])

  const filteredMembers = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return members.slice(0, 50)
    return members.filter((m) => m.user_email.toLowerCase().includes(q)).slice(0, 50)
  }, [members, query])

  async function onCheckIn() {
    if (!selectedMember) return
    setRunning(true)
    try {
      await api.post('/api/attendance/check-in/', { member_id: selectedMember.id })
      toast({ title: 'Checked in successfully', description: selectedMember.user_email, intent: 'success' })
      await loadTodayRecords()
    } catch (err) {
      toast({ title: 'Check-in failed', description: getApiErrorMessage(err), intent: 'error' })
    } finally {
      setRunning(false)
    }
  }

  async function onCheckOut() {
    if (!selectedMember) return
    setRunning(true)
    try {
      await api.post('/api/attendance/check-out/', { member_id: selectedMember.id })
      toast({ title: 'Checked out successfully', description: selectedMember.user_email, intent: 'success' })
      await loadTodayRecords()
    } catch (err) {
      toast({ title: 'Check-out failed', description: getApiErrorMessage(err), intent: 'error' })
    } finally {
      setRunning(false)
    }
  }

  if (role !== 'gym_owner' && role !== 'staff') {
    return <div className="p-8 text-white/70">Attendance management is available for Owners and Staff only.</div>
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-fadeInUp p-4 sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="h-7 w-44 rounded-xl bg-white/10" />
            <div className="mt-2 h-4 w-64 rounded-xl bg-white/10" />
          </div>
        </div>
        <Skeleton className="h-[220px]" />
        <Skeleton className="h-[320px]" />
      </div>
    )
  }

  return (
    <div className="animate-fadeInUp p-4 sm:p-8 max-w-[1600px] mx-auto pb-32">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-12">
        <div>
          <h1 className="text-4xl md:text-6xl font-black text-white uppercase italic tracking-tighter text-gradient-elite font-display leading-tight">
            Attendance
          </h1>
          <div className="mt-2 text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Record member entry and exit for today</div>
        </div>
        <div className="shrink-0">
          <Badge intent="primary" className="font-black uppercase tracking-widest text-[10px] px-6 py-2">Check-in Dashboard</Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <Card className="xl:col-span-2 p-8 bg-black/40 border-white/5 shadow-2xl">
          <div>
            <h2 className="text-xl font-black text-white uppercase italic tracking-tighter mb-2">Check-In / Check-Out</h2>
            <p className="text-xs text-slate-500 font-medium tracking-tight">Search and select a member to update their status</p>
          </div>

          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
            <div className="min-w-0">
              <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-600">Search by Email</label>
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="e.g. member@email.com" className="bg-white/5 border-white/10 h-12" />
            </div>
            <div className="min-w-0">
              <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-600">Member Selected</label>
              <Select value={selectedMemberId} onChange={(e) => setSelectedMemberId(e.target.value)} className="bg-white/5 border-white/10 h-12">
                <option value="">Choose from results...</option>
                {filteredMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.user_email}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Button type="button" disabled={!selectedMember || running} onClick={onCheckIn} className="w-full min-h-[56px] font-black uppercase tracking-widest text-[11px] btn-premium-gradient">
              Confirm Check-In
            </Button>
            <Button type="button" variant="secondary" disabled={!selectedMember || running} onClick={onCheckOut} className="w-full min-h-[56px] font-black uppercase tracking-widest text-[11px]">
              Confirm Check-Out
            </Button>
          </div>

          {selectedMember && (
            <div className="mt-8 rounded-3xl border border-brand-red/20 bg-brand-red/5 p-6 active-glow-brand animate-float-up">
              <div className="text-[10px] font-black uppercase tracking-widest text-brand-red mb-2">Current Selection</div>
              <div className="text-sm font-black text-white break-words uppercase italic">{selectedMember.user_email}</div>
            </div>
          )}
        </Card>

        <Card className="p-8 bg-black/40 border-white/5 shadow-2xl flex flex-col h-full">
          <div className="flex items-center justify-between gap-3 mb-8 shrink-0">
            <div>
              <h2 className="text-xl font-black text-white uppercase italic tracking-tighter">Recent Activity</h2>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Latest Entries</p>
            </div>
            <Button type="button" variant="ghost" onClick={loadTodayRecords} disabled={recordsLoading} className="min-h-[32px] px-3 text-[9px] font-black tracking-widest bg-white/5">
              Refresh List
            </Button>
          </div>

          <div className="space-y-4 overflow-y-auto pr-2 custom-scrollbar flex-1 min-h-0">
            {recordsLoading && <Skeleton className="h-[120px]" />}
            {!recordsLoading && todayRecords.length === 0 && (
              <div className="rounded-3xl border border-white/5 bg-white/[0.02] p-10 text-center">
                <p className="text-[10px] font-black text-slate-700 uppercase tracking-[0.3em] italic">No activity recorded today</p>
              </div>
            )}
            {!recordsLoading &&
              todayRecords.slice(0, 15).map((r) => (
                <div key={r.id} className="group rounded-2xl border border-white/5 bg-white/[0.02] p-5 hover:bg-white/[0.05] transition-all duration-300">
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest italic">{formatTime(r.check_in)}</span>
                    <Badge intent={r.check_out ? 'neutral' : 'primary'} className="min-h-5 h-auto px-3 py-1 text-[9px] font-black uppercase tracking-tighter">
                       {r.check_out ? 'Checked Out' : 'In Gym'}
                    </Badge>
                  </div>
                  <div className="text-sm font-black text-white break-words uppercase italic mb-4">{r.member}</div>
                  <div className="grid grid-cols-2 gap-4 border-t border-white/5 pt-4">
                    <div>
                      <div className="text-[9px] font-black uppercase tracking-widest text-slate-600 mb-1">IN</div>
                      <div className="text-xs font-bold text-slate-400 whitespace-nowrap">{formatTime(r.check_in)}</div>
                    </div>
                    <div>
                      <div className="text-[9px] font-black uppercase tracking-widest text-slate-600 mb-1">OUT</div>
                      <div className="text-xs font-bold text-slate-400 whitespace-nowrap">{formatTime(r.check_out)}</div>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
