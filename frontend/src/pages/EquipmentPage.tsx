import { useEffect, useState } from 'react'
import { api, getApiErrorMessage } from '../api/client'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import { Wrench, Plus, Search, Filter, AlertTriangle, Clock } from 'lucide-react'

type EquipmentItem = {
  id: string
  name: string
  category: string
  serial_number: string
  status: 'operational' | 'under_maintenance' | 'broken' | 'retired'
  last_maintenance: string
  next_maintenance: string
}

export default function EquipmentPage() {
  const [items, setItems] = useState<EquipmentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetchItems()
  }, [])

  async function fetchItems() {
    try {
      setLoading(true)
      const res = await api.get('/api/gyms/equipment/')
      setItems(res.data.results || [])
    } catch (err) {
      alert(getApiErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const filteredItems = items.filter(item => 
    item.name.toLowerCase().includes(search.toLowerCase()) ||
    item.category?.toLowerCase().includes(search.toLowerCase())
  )

  const stats = {
    total: items.length,
    under_maintenance: items.filter(i => i.status === 'under_maintenance').length,
    broken: items.filter(i => i.status === 'broken').length,
  }

  return (
    <div className="space-y-8 animate-fadeInUp">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">Asset Maintenance</h1>
          <p className="text-slate-500 text-sm font-medium">Track gym equipment, maintenance logs, and asset health.</p>
        </div>
        <Button variant="primary" className="gap-2 h-11 px-6 shadow-brand-500/20 shadow-lg">
          <Plus className="h-4 w-4" />
          Add Asset
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 bg-slate-900/40 border-slate-800 shadow-xl">
           <div className="flex items-center gap-4 mb-4">
             <div className="p-3 bg-brand-500/10 rounded-2xl text-brand-500">
               <Wrench className="h-6 w-6" />
             </div>
             <div>
               <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">Total Assets</p>
               <h3 className="text-2xl font-black text-white">{stats.total}</h3>
             </div>
           </div>
        </Card>
        <Card className="p-6 bg-slate-900/40 border-slate-800 shadow-xl">
           <div className="flex items-center gap-4 mb-4">
             <div className="p-3 bg-amber-500/10 rounded-2xl text-amber-500">
               <Clock className="h-6 w-6" />
             </div>
             <div>
               <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">Under Repair</p>
               <h3 className="text-2xl font-black text-white">{stats.under_maintenance}</h3>
             </div>
           </div>
        </Card>
        <Card className="p-6 bg-slate-900/40 border-slate-800 shadow-xl">
           <div className="flex items-center gap-4 mb-4">
             <div className="p-3 bg-red-500/10 rounded-2xl text-red-500">
               <AlertTriangle className="h-6 w-6" />
             </div>
             <div>
               <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">Critical Faults</p>
               <h3 className="text-2xl font-black text-white">{stats.broken}</h3>
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
              placeholder="Search by name or category..."
              className="w-full h-10 pl-10 pr-4 bg-slate-950/50 border border-slate-800 rounded-xl text-sm text-white focus:ring-1 focus:ring-brand-500 transition-all font-medium"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-2 h-10 font-bold uppercase text-[10px] tracking-widest">
              <Filter className="h-3 w-3" />
              Categorize
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-950/50 border-b border-slate-800">
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Asset Name</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Category</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Serial #</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Next Maint.</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Ops</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={6} className="px-6 py-4"><div className="h-4 bg-slate-800 rounded w-full" /></td>
                  </tr>
                ))
              ) : filteredItems.length > 0 ? (
                filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                            <Wrench className="h-4 w-4 text-slate-500 group-hover:text-brand-500 transition-colors" />
                            <span className="font-bold text-white">{item.name}</span>
                        </div>
                    </td>
                    <td className="px-6 py-4 text-slate-400 text-sm">{item.category}</td>
                    <td className="px-6 py-4 text-slate-500 text-xs font-mono">{item.serial_number}</td>
                    <td className="px-6 py-4">
                      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${
                        item.status === 'operational' ? 'bg-emerald-500/10 text-emerald-500' :
                        item.status === 'broken' ? 'bg-red-500/10 text-red-500' :
                        'bg-amber-500/10 text-amber-500'
                      }`}>
                         <span className={`h-1.5 w-1.5 rounded-full ${
                             item.status === 'operational' ? 'bg-emerald-500' :
                             item.status === 'broken' ? 'bg-red-500' : 'bg-amber-500'
                         }`} />
                        {item.status.replace('_', ' ')}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-400 text-sm font-medium">{item.next_maintenance || '—'}</td>
                    <td className="px-6 py-4 text-right">
                      <Button variant="outline" size="sm" className="h-8 text-[10px] font-black uppercase tracking-widest">
                        Details
                      </Button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center text-slate-500 font-medium font-mono text-xs">
                    No active assets registered in the cloud.
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
