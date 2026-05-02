import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { Plus, Edit2, Trash2, Search, MessageCircle, AlertCircle, CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { twMerge } from 'tailwind-merge'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import Badge from '../components/ui/Badge'

interface SupportFAQ {
  id: string
  keyword: string
  response: string
  role: string
  is_active: boolean
}

const ROLE_OPTIONS = [
  { value: 'global', label: 'Everyone' },
  { value: 'super_admin', label: 'Super Admin Only' },
  { value: 'gym_owner', label: 'Gym Owner Only' },
  { value: 'staff', label: 'Staff Only' },
  { value: 'member', label: 'Member Only' },
]

export default function SupportConfigPage() {
  const [faqs, setFaqs] = useState<SupportFAQ[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [editingFaq, setEditingFaq] = useState<Partial<SupportFAQ> | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const fetchFaqs = async () => {
    setLoading(true)
    try {
      const response = await axios.get('/api/support-config/')
      setFaqs(response.data)
      setError(null)
    } catch (err) {
      setError('Failed to load help center data.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchFaqs()
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingFaq?.keyword || !editingFaq?.response) return
    setSaving(true)

    try {
      if (editingFaq.id) {
        await axios.put(`/api/admin/support-config/${editingFaq.id}/`, editingFaq)
      } else {
        await axios.post('/api/admin/support-node/', {
          message: editingFaq.response,
          target: editingFaq.role || 'global'
        })
        await axios.post('/api/support-config/', {
          ...editingFaq,
          role: editingFaq.role || 'global',
          is_active: editingFaq.is_active !== undefined ? editingFaq.is_active : true
        })
      }
      fetchFaqs()
      setIsModalOpen(false)
      setEditingFaq(null)
    } catch (err) {
      alert('Error updating support topic. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this help topic?')) return
    try {
      await axios.delete(`/api/support-config/${id}/`)
      fetchFaqs()
    } catch (err) {
      alert('Deletion failed.')
    }
  }

  const filteredFaqs = faqs.filter(f => 
    f.keyword.toLowerCase().includes(searchTerm.toLowerCase()) || 
    f.response.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-12 animate-fadeInUp max-w-[1600px] mx-auto pb-32 p-4 sm:p-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-8 pb-12 border-b border-white/5">
        <div className="flex items-center gap-6">
          <div className="h-16 w-16 bg-brand-red/10 rounded-2xl flex items-center justify-center border border-brand-red/20 shadow-lg shadow-brand-red/10 shrink-0">
            <MessageCircle className="h-8 w-8 text-brand-red" />
          </div>
          <div>
            <h1 className="text-4xl md:text-6xl font-black text-white uppercase italic tracking-tighter leading-tight font-display text-gradient-elite">Help Center</h1>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] mt-2 flex items-center gap-2">
               Configure automated responses and FAQs
            </p>
          </div>
        </div>
        <Button 
           onClick={() => { setEditingFaq({ is_active: true, role: 'global' }); setIsModalOpen(true); }}
           className="min-h-[64px] px-10 btn-premium-gradient text-[10px] font-black uppercase tracking-[0.2em] italic shadow-2xl shadow-brand-red/30"
        >
           <Plus className="h-5 w-5 mr-3 shrink-0" />
           Add New Topic
        </Button>
      </div>

      <div className="space-y-12">
        <div className="relative group max-w-md w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 group-hover:text-brand-red transition-colors" />
            <input 
               type="text"
               placeholder="Search help topics..."
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
               className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-brand-red/40 transition-all font-medium backdrop-blur-md h-12"
            />
        </div>

        {loading ? (
            <div className="h-64 rounded-[2rem] border border-white/5 bg-white/[0.02] flex flex-col items-center justify-center gap-4">
              <Loader2 className="h-10 w-10 text-brand-red animate-spin" />
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Loading Help Center...</span>
            </div>
        ) : error ? (
           <div className="p-12 rounded-[2rem] border border-red-500/20 bg-red-500/5 flex flex-col items-center gap-4 text-center">
               <AlertCircle className="h-10 w-10 text-red-500" />
               <p className="text-sm font-bold text-red-400 uppercase tracking-widest">{error}</p>
           </div>
        ) : (
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredFaqs.map(faq => (
                <Card key={faq.id} isShimmer className="p-8 flex flex-col h-full bg-[#050505] border-white/5 shadow-2xl transition-all duration-700 hover:border-brand-red/30">
                   <div className="flex items-start justify-between gap-4 mb-8 shrink-0">
                      <Badge intent={faq.is_active ? 'primary' : 'neutral'} className="min-h-6 h-auto px-4 py-1 text-[9px] font-black uppercase tracking-widest">
                         {faq.is_active ? 'Active' : 'Inactive'} &bull; {ROLE_OPTIONS.find(r => r.value === faq.role)?.label}
                      </Badge>
                      <div className="flex gap-2 shrink-0">
                         <button onClick={() => { setEditingFaq(faq); setIsModalOpen(true); }} className="p-2 bg-white/5 hover:bg-brand-red/10 rounded-xl text-slate-500 hover:text-brand-red transition-all active:scale-90">
                            <Edit2 className="h-3.5 w-3.5" />
                         </button>
                         <button onClick={() => handleDelete(faq.id)} className="p-2 bg-white/5 hover:bg-red-500/10 rounded-xl text-slate-500 hover:text-red-500 transition-all active:scale-90">
                            <Trash2 className="h-3.5 w-3.5" />
                         </button>
                      </div>
                   </div>
                   <h3 className="text-lg font-black text-white uppercase italic tracking-tight mb-4 leading-tight break-words">Trigger: {faq.keyword}</h3>
                   <p className="text-slate-400 text-sm leading-relaxed mb-8 break-words flex-1">{faq.response}</p>
                   
                   <div className="pt-6 border-t border-white/5 flex items-center justify-between shrink-0">
                      <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest leading-none">Reference: #{faq.id.slice(0, 8)}</span>
                   </div>
                </Card>
              ))}
              {filteredFaqs.length === 0 && (
                <div className="col-span-full py-32 border-2 border-dashed border-white/5 rounded-[3rem] flex items-center justify-center bg-white/[0.01]">
                   <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em] italic text-center">No help topics found matching your search</p>
                </div>
              )}
           </div>
        )}
      </div>

      {isModalOpen && (
        <Modal 
          open={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
          title={editingFaq?.id ? 'Edit Support Topic' : 'Add New Topic'}
          className="max-w-2xl bg-[#050505] rounded-[2rem] sm:rounded-[3rem]"
        >
          <form onSubmit={handleSave} className="p-2 space-y-10">
             <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em] ml-1">Trigger Keyword</label>
                <input 
                  required
                  value={editingFaq?.keyword || ''}
                  onChange={e => setEditingFaq(prev => ({ ...prev, keyword: e.target.value }))}
                  className="w-full h-14 bg-white/[0.03] border border-white/10 rounded-2xl px-6 text-sm font-medium text-white focus:outline-none focus:border-brand-red/40 transition-all"
                  placeholder="e.g. membership, hours, price"
                />
             </div>

             <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em] ml-1">Automatic Response</label>
                <textarea 
                  required
                  value={editingFaq?.response || ''}
                  onChange={e => setEditingFaq(prev => ({ ...prev, response: e.target.value }))}
                  rows={5}
                  className="w-full bg-white/[0.03] border border-white/10 rounded-2xl p-6 text-sm font-medium text-white focus:outline-none focus:border-brand-red/40 transition-all resize-none"
                  placeholder="Enter the message users will receive when this keyword is matched..."
                />
             </div>

             <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em] ml-1">User Role</label>
                    <select 
                      value={editingFaq?.role || 'global'}
                      onChange={e => setEditingFaq(prev => ({ ...prev, role: e.target.value }))}
                      className="w-full h-14 bg-black border border-white/10 rounded-2xl px-5 text-[11px] font-black uppercase tracking-widest text-slate-300 focus:outline-none focus:border-brand-red/40"
                    >
                      {ROLE_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </select>
                </div>
                <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em] ml-1">Status</label>
                    <button 
                      type="button"
                      onClick={() => setEditingFaq(prev => ({ ...prev, is_active: !prev?.is_active }))}
                      className={twMerge(
                          "w-full h-14 rounded-2xl border transition-all flex items-center justify-center gap-3",
                          editingFaq?.is_active !== false ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.1)]" : "bg-red-500/10 border-red-500/20 text-red-500"
                      )}
                    >
                       {editingFaq?.is_active !== false ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
                       <span className="text-[11px] font-black uppercase tracking-widest">{editingFaq?.is_active !== false ? 'Active' : 'Inactive'}</span>
                    </button>
                </div>
             </div>

             <div className="flex gap-6 pt-6">
                <Button 
                   type="button" 
                   variant="secondary"
                   onClick={() => setIsModalOpen(false)}
                   className="flex-1 h-16 uppercase font-black tracking-[0.2em] text-xs"
                >
                   Cancel
                </Button>
                <Button 
                   type="submit"
                   isLoading={saving}
                   className="flex-1 h-16 uppercase font-black tracking-[0.2em] text-xs btn-premium-gradient shadow-2xl shadow-brand-red/30"
                >
                   Save Changes
                </Button>
             </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
