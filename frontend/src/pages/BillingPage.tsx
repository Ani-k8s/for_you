import { useState, useEffect } from 'react'
import { api, getApiErrorMessage } from '../api/client'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import { DollarSign, Clock, AlertCircle, Plus, Search, Filter } from 'lucide-react'

type LedgerEntry = {
  id: string
  member_name: string
  plan_name: string
  amount_total: string
  amount_paid: string
  amount_due: string
  status: 'paid' | 'partial' | 'pending' | 'overdue'
  due_date: string
  billing_date: string
}

export default function BillingPage() {
  const [ledgers, setLedgers] = useState<LedgerEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetchLedgers()
  }, [])

  async function fetchLedgers() {
    try {
      setLoading(true)
      const res = await api.get('/api/payments/ledgers/')
      setLedgers(res.data.results || [])
    } catch (err) {
      alert(getApiErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const filteredLedgers = ledgers.filter(l => 
    l.member_name.toLowerCase().includes(search.toLowerCase()) ||
    l.plan_name.toLowerCase().includes(search.toLowerCase())
  )

  const stats = {
    total_due: ledgers.reduce((acc, l) => acc + parseFloat(l.amount_due), 0),
    pending_count: ledgers.filter(l => l.status === 'pending' || l.status === 'overdue').length,
    overdue_count: ledgers.filter(l => l.status === 'overdue').length,
  }

  return (
    <div className="space-y-8 animate-fadeInUp">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">Financial Ledger</h1>
          <p className="text-slate-500 text-sm font-medium">Track member payments, dues, and subscription billing.</p>
        </div>
        <Button variant="primary" className="gap-2 h-11 px-6 shadow-brand-500/20 shadow-lg">
          <Plus className="h-4 w-4" />
          Create Invoice
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 bg-slate-900/40 border-slate-800 shadow-xl">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-brand-500/10 rounded-2xl text-brand-500">
              <DollarSign className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">Total Outstanding</p>
              <h3 className="text-2xl font-black text-white">${stats.total_due.toFixed(2)}</h3>
            </div>
          </div>
        </Card>
        <Card className="p-6 bg-slate-900/40 border-slate-800 shadow-xl">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-amber-500/10 rounded-2xl text-amber-500">
              <Clock className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">Pending Invoices</p>
              <h3 className="text-2xl font-black text-white">{stats.pending_count}</h3>
            </div>
          </div>
        </Card>
        <Card className="p-6 bg-slate-900/40 border-slate-800 shadow-xl">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-red-500/10 rounded-2xl text-red-500">
              <AlertCircle className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">Overdue Accounts</p>
              <h3 className="text-2xl font-black text-white">{stats.overdue_count}</h3>
            </div>
          </div>
        </Card>
      </div>

      {/* Table Section */}
      <Card className="overflow-hidden border-slate-800 bg-slate-900/20 backdrop-blur-xl shadow-2xl">
        <div className="p-6 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input 
              type="text" 
              placeholder="Search by member or plan..."
              className="w-full h-10 pl-10 pr-4 bg-slate-950/50 border border-slate-800 rounded-xl text-sm text-white focus:ring-1 focus:ring-brand-500 transition-all"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-2 h-10">
              <Filter className="h-4 w-4" />
              Filters
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-950/50 border-b border-slate-800">
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Member</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Plan</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Total</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Due</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Due Date</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={7} className="px-6 py-4"><div className="h-4 bg-slate-800 rounded w-full" /></td>
                  </tr>
                ))
              ) : filteredLedgers.length > 0 ? (
                filteredLedgers.map((l) => (
                  <tr key={l.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="px-6 py-4 font-bold text-white">{l.member_name}</td>
                    <td className="px-6 py-4 text-slate-400 text-sm">{l.plan_name}</td>
                    <td className="px-6 py-4 text-white font-mono text-sm">${l.amount_total}</td>
                    <td className="px-6 py-4 text-amber-500 font-mono text-sm">${l.amount_due}</td>
                    <td className="px-6 py-4">
                      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${
                        l.status === 'paid' ? 'bg-emerald-500/10 text-emerald-500' :
                        l.status === 'overdue' ? 'bg-red-500/10 text-red-500' :
                        'bg-amber-500/10 text-amber-500'
                      }`}>
                        {l.status}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-400 text-sm">{l.due_date}</td>
                    <td className="px-6 py-4 text-right">
                      <Button variant="outline" size="sm" className="h-8 text-[10px] font-black uppercase">
                        Record Payment
                      </Button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-20 text-center text-slate-500 font-medium">
                    No ledger entries found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
