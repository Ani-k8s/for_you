import { useEffect, useState } from 'react'
import { api, getApiErrorMessage } from '../api/client'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/Table'
import { Users, Shield, ShieldCheck, User as UserIcon } from 'lucide-react'
import { twMerge } from 'tailwind-merge'
import Badge from '../components/ui/Badge'

type User = {
  id: string
  email: string
  role: string
  first_name: string
  last_name: string
  gym: { name: string } | null
  is_active: boolean
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const res = await api.get('/api/users/')
      setUsers(res.data.results || res.data)
    } catch (err) {
      setError(getApiErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const toggleUserStatus = async (user: User) => {
    try {
      await api.patch(`/api/users/${user.id}/`, { is_active: !user.is_active })
      fetchUsers()
    } catch (err) {
      alert(getApiErrorMessage(err))
    }
  }

  return (
    <div className="animate-fadeInUp space-y-12 pb-32 p-4 sm:p-8 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-8 pb-12 border-b border-white/5">
        <div className="flex items-center gap-6">
           <div className="h-16 w-16 bg-gradient-to-br from-brand-yellow to-brand-orange rounded-2xl flex items-center justify-center shadow-2xl shadow-brand-orange/20 border border-white/10 p-4">
              <Users className="h-8 w-8 text-white" />
           </div>
           <div>
              <h1 className="text-4xl md:text-6xl font-black text-white uppercase italic tracking-tighter leading-tight mb-2 text-gradient-elite font-display">Team Management</h1>
              <div className="flex items-center gap-3">
                 <div className="w-2 h-2 rounded-full bg-brand-orange animate-pulse shadow-[0_0_10px_rgba(255,165,0,0.8)]" />
                 <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Manage system users, roles, and access permissions</p>
              </div>
           </div>
        </div>
      </div>

      {error && <div className="bg-red-500/10 border border-red-500/30 text-red-200 p-6 rounded-2xl text-xs font-bold uppercase tracking-widest animate-pulse">{error}</div>}

      <Card isShimmer className="relative p-0 border-white/5 bg-black/40 shadow-2xl rounded-[2rem] sm:rounded-[3.5rem] overflow-visible">
         <div className="overflow-x-auto custom-scrollbar rounded-[2rem] sm:rounded-[3.5rem]">
            <Table className="w-full">
               <TableHeader>
                  <TableRow className="bg-white/[0.02] border-b border-white/5">
                     <TableHead className="pl-10 py-6 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 italic">User</TableHead>
                     <TableHead className="px-10 py-6 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 italic">Role</TableHead>
                     <TableHead className="px-10 py-6 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 italic">Gym Assignment</TableHead>
                     <TableHead className="px-10 py-6 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 italic text-center">Status</TableHead>
                     <TableHead className="pr-10 py-6 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 italic text-right">Actions</TableHead>
                  </TableRow>
               </TableHeader>
               <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={5} className="py-20 text-center"><p className="text-[10px] font-black text-slate-700 uppercase tracking-[0.3em] animate-pulse">Loading Users...</p></TableCell></TableRow>
                  ) : users.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="py-20 text-center"><p className="text-[10px] font-black text-slate-700 uppercase tracking-[0.3em]">No users found</p></TableCell></TableRow>
                  ) : (
                    users.map((u) => (
                      <TableRow key={u.id} className="group border-b border-white/[0.02] hover:bg-white/[0.01] transition-all duration-500">
                        <TableCell className="pl-10 py-6">
                           <div className="flex items-center gap-4">
                              <div className="h-10 w-10 shrink-0 rounded-xl bg-orange-500/10 flex items-center justify-center text-brand-orange group-hover:scale-110 transition-transform">
                                 <UserIcon className="h-5 w-5" />
                              </div>
                              <div className="min-w-0">
                                 <div className="text-sm font-black text-white uppercase italic tracking-tight break-words max-w-[200px]">{u.first_name} {u.last_name}</div>
                                 <div className="text-[10px] font-medium text-slate-500 mt-0.5 break-words max-w-[200px]">{u.email}</div>
                              </div>
                           </div>
                        </TableCell>
                        <TableCell className="px-10 py-6">
                           <div className="flex items-center gap-2">
                              {u.role === 'super_admin' ? <ShieldCheck className="w-3.5 h-3.5 text-brand-orange shrink-0" /> : <Shield className="w-3.5 h-3.5 text-slate-600 shrink-0" />}
                              <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest break-words">{u.role.replace('_', ' ')}</span>
                           </div>
                        </TableCell>
                        <TableCell className="px-10 py-6 font-mono text-[10px] font-bold text-slate-500 tracking-tight italic uppercase break-words max-w-[150px]">{u.gym?.name || 'Platform Admin'}</TableCell>
                        <TableCell className="px-10 py-6 text-center">
                           <Badge intent={u.is_active ? 'primary' : 'neutral'} className="min-h-6 h-auto px-4 py-1 text-[8px] font-black uppercase tracking-widest">
                               {u.is_active ? 'Active' : 'Inactive'}
                           </Badge>
                        </TableCell>
                        <TableCell className="pr-10 py-6 text-right">
                           <Button 
                             onClick={() => toggleUserStatus(u)}
                             className={twMerge(
                               "min-h-[36px] px-6 text-[9px] font-black uppercase tracking-widest italic transition-all duration-300",
                               u.is_active ? "border-white/5 text-slate-500 hover:bg-white/5" : "btn-premium-gradient text-white"
                             )}
                             variant="secondary"
                           >
                             {u.is_active ? 'Deactivate' : 'Activate'}
                           </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
               </TableBody>
            </Table>
         </div>
      </Card>
    </div>
  )
}
