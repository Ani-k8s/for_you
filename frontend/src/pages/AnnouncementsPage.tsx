import { useEffect, useState } from 'react'
import { api, getApiErrorMessage } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Input from '../components/ui/Input'
import Modal from '../components/ui/Modal'
import Select from '../components/ui/Select'
import Skeleton from '../components/ui/Skeleton'
import { useToast } from '../components/ui/ToastProvider'
import { Bell, Plus, Trash2 } from 'lucide-react'

type Announcement = {
  id: string
  title: string
  content: string
  audience: 'all' | 'staff' | 'members'
  created_at: string
}

export default function AnnouncementsPage() {
  const { user } = useAuth()
  const role = user?.role
  const { toast } = useToast()
  
  const [items, setItems] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const canManage = role === 'gym_owner' || role === 'staff'

  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [audience, setAudience] = useState<Announcement['audience']>('all')
  const [saving, setSaving] = useState(false)

  async function refresh() {
    try {
      const res = await api.get('/api/gyms/announcements/')
      setItems(res.data.results ?? res.data)
    } catch (err) {
      setError(getApiErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await api.post('/api/gyms/announcements/', { title, content, audience })
      toast({ title: 'Announcement posted', intent: 'success' })
      setOpen(false)
      setTitle(''); setContent(''); setAudience('all')
      refresh()
    } catch (err) {
      toast({ title: 'Failed to post', description: getApiErrorMessage(err), intent: 'error' })
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this announcement?')) return
    try {
      await api.delete(`/api/gyms/announcements/${id}/`)
      toast({ title: 'Deleted', intent: 'success' })
      refresh()
    } catch (err) {
      toast({ title: 'Failed to delete', description: getApiErrorMessage(err), intent: 'error' })
    }
  }

  if (loading) return <Skeleton className="h-40 w-full" />

  return (
    <div className="animate-fadeInUp space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Announcements</h1>
          <p className="text-sm text-slate-500">Official updates and notices for your gym.</p>
        </div>
        {canManage && (
          <Button onClick={() => setOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" /> New Post
          </Button>
        )}
      </div>

      {error && (
        <Card className="p-4 bg-red-50 border-red-100 text-red-700">{error}</Card>
      )}

      <div className="space-y-4">
        {items.length === 0 ? (
          <Card className="p-12 text-center text-slate-500">
            <Bell className="h-10 w-10 mx-auto mb-4 opacity-20" />
            <p>No announcements yet.</p>
          </Card>
        ) : (
          items.map((item) => (
            <Card key={item.id} className="p-6 relative group overflow-hidden">
               <div className="absolute top-0 left-0 w-1 h-full bg-brand-500" />
               <div className="flex items-start justify-between gap-4">
                 <div className="flex-1">
                   <div className="flex items-center gap-3 mb-2">
                      <span className="text-xs font-black uppercase tracking-widest text-brand-500 bg-brand-500/10 px-2 py-1 rounded">
                        {item.audience}
                      </span>
                      <span className="text-[10px] font-medium text-slate-400">
                        {new Date(item.created_at).toLocaleDateString()}
                      </span>
                   </div>
                   <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{item.title}</h2>
                   <p className="text-slate-600 dark:text-slate-400 whitespace-pre-wrap leading-relaxed">{item.content}</p>
                 </div>
                 {canManage && (
                   <button onClick={() => handleDelete(item.id)} className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-2">
                     <Trash2 className="h-5 w-5" />
                   </button>
                 )}
               </div>
            </Card>
          ))
        )}
      </div>

      <Modal open={open} title="New Announcement" onClose={() => setOpen(false)}>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="text-xs font-bold uppercase text-slate-500 mb-1.5 block">Headline</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Main title..." required />
          </div>
          <div>
            <label className="text-xs font-bold uppercase text-slate-500 mb-1.5 block">Message Content</label>
            <textarea 
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4 text-sm focus:ring-2 focus:ring-brand-500 transition-all min-h-[150px]"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your announcement details here..."
              required
            />
          </div>
          <div>
            <label className="text-xs font-bold uppercase text-slate-500 mb-1.5 block">Audience</label>
            <Select value={audience} onChange={(e) => setAudience(e.target.value as any)}>
              <option value="all">Everyone</option>
              <option value="members">Members Only</option>
              <option value="staff">Staff/Trainers Only</option>
            </Select>
          </div>
          <div className="flex gap-3 pt-4">
            <Button type="submit" disabled={saving} className="flex-1">{saving ? 'Posting...' : 'Publish'}</Button>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="flex-1">Cancel</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
