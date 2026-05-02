import { useEffect, useState } from 'react'
import { api, getApiErrorMessage } from '../api/client'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Skeleton from '../components/ui/Skeleton'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'
import { BellPlus, CalendarClock, History } from 'lucide-react'
import { useGymBranding } from '../branding/GymBrandingContext'

type Reminder = {
  id: number
  message: string
  send_via: 'WHATSAPP' | 'EMAIL' | 'BOTH'
  is_automated: boolean
  schedule_time: string | null
  expiry_days_before: number | null
  created_by_name: string
  created_at: string
}

function ReminderIcon({ sendVia }: { sendVia: string }) {
  if (sendVia === 'WHATSAPP') return <Badge intent="success">WhatsApp</Badge>
  if (sendVia === 'EMAIL') return <Badge intent="neutral">Email</Badge>
  return <Badge intent="primary">Both</Badge>
}

export default function RemindersPage() {
  const { data: brandingData } = useGymBranding()
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const [isCreating, setIsCreating] = useState(false)
  const [message, setMessage] = useState('')
  const [sendVia, setSendVia] = useState<'WHATSAPP' | 'EMAIL' | 'BOTH'>('WHATSAPP')
  const [isAutomated, setIsAutomated] = useState(false)
  const [expiryDaysBefore, setExpiryDaysBefore] = useState('3')
  const [saving, setSaving] = useState(false)

  const fetchReminders = async () => {
    try {
      setLoading(true)
      const res = await api.get('/api/reminders/')
      setReminders(res.data.results || res.data)
    } catch (err) {
      setError(getApiErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReminders()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setSaving(true)
      await api.post('/api/reminders/', {
        message, send_via: sendVia, is_automated: isAutomated,
        expiry_days_before: isAutomated && expiryDaysBefore ? parseInt(expiryDaysBefore, 10) : null,
      })
      setIsCreating(false); setMessage(''); setSendVia('WHATSAPP'); setIsAutomated(false); setExpiryDaysBefore('3')
      fetchReminders()
    } catch (err) {
      alert(getApiErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const handleManualSend = async () => {
    if (!message) return alert('Please enter a message to send manually.')
    try {
      setSaving(true)
      await api.post('/api/reminders/send/', { message, send_via: sendVia })
      alert('Reminder triggered manually!')
      await api.post('/api/reminders/', { message, send_via: sendVia, is_automated: false })
      setIsCreating(false); setMessage(''); setSendVia('WHATSAPP')
      fetchReminders()
    } catch (err) {
      alert(getApiErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  if (loading && !reminders.length) {
    return (
      <div className="space-y-6 animate-pulse w-full max-w-5xl mx-auto">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-[300px] w-full" />
      </div>
    )
  }

  if (brandingData.theme_settings?.enable_reminders === false) {
    return (
      <div className="animate-fadeInUp max-w-2xl mx-auto mt-12 text-center">
        <div className="rounded-xl border border-red-200 bg-red-50 p-12 dark:border-red-800/30 dark:bg-red-900/10">
          <BellPlus className="h-12 w-12 mx-auto text-red-500 mb-4 opacity-80" />
          <h1 className="text-xl font-bold text-red-900 dark:text-red-400">Feature Disabled</h1>
          <p className="mt-2 text-red-700 dark:text-red-300">
            The reminders module has been disabled for this gym by the Super Admin.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="animate-fadeInUp space-y-8 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Reminders</h1>
          <p className="mt-1 text-sm text-slate-500">Manage automated and manual notifications for members.</p>
        </div>
        {!isCreating && (
          <Button onClick={() => setIsCreating(true)}>
            <BellPlus className="h-4 w-4 mr-2" /> New Reminder
          </Button>
        )}
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800/30 dark:bg-red-900/10 dark:text-red-400">
          {error}
        </div>
      )}

      {isCreating && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-6">Create Reminder</h2>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Message</label>
              <textarea
                value={message} onChange={(e) => setMessage(e.target.value)} required
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50 min-h-[100px]"
                placeholder="E.g., Don't forget your scheduled class tomorrow!"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Send Via</label>
                <Select value={sendVia} onChange={(e) => setSendVia(e.target.value as any)}>
                  <option value="WHATSAPP">WhatsApp</option>
                  <option value="EMAIL">Email</option>
                  <option value="BOTH">Both</option>
                </Select>
              </div>
              
              <div className="flex items-center space-x-3 mt-6">
                <input
                  type="checkbox"
                  id="isAutomated"
                  checked={isAutomated}
                  onChange={(e) => setIsAutomated(e.target.checked)}
                  className="h-5 w-5 rounded border-slate-300 text-brand-600 focus:ring-brand-600 dark:border-slate-700 dark:bg-slate-900"
                />
                <label htmlFor="isAutomated" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Automate sending
                </label>
              </div>
            </div>

            {isAutomated && (
              <div className="animate-fadeInUp">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Send Days Before Expiry</label>
                <Input
                  type="number"
                  min="0"
                  max="365"
                  value={expiryDaysBefore}
                  onChange={(e) => setExpiryDaysBefore(e.target.value)}
                  required={isAutomated}
                  placeholder="e.g. 3"
                />
                <p className="mt-1 text-xs text-slate-500">
                  Members will receive this reminder exactly {expiryDaysBefore || 3} days before their plan expires.
                </p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row-reverse sm:items-center gap-3 pt-6 border-t border-slate-200 dark:border-slate-800">
              {isAutomated ? (
                <Button type="submit" disabled={saving} className="sm:w-auto w-full">{saving ? 'Scheduling...' : 'Schedule Reminder'}</Button>
              ) : (
                <Button type="button" onClick={handleManualSend} disabled={saving || !message} className="sm:w-auto w-full">Send Now</Button>
              )}
              <Button type="button" variant="outline" onClick={() => setIsCreating(false)} disabled={saving} className="sm:w-auto w-full">Cancel</Button>
            </div>
          </form>
        </Card>
      )}

      <Card className="flex flex-col">
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center">
            <History className="h-5 w-5 mr-2 text-slate-500" /> History & Scheduled
          </h2>
        </div>
        
        {reminders.length === 0 ? (
          <div className="p-10 text-center text-slate-500 flex flex-col items-center">
            <CalendarClock className="h-10 w-10 text-slate-300 dark:text-slate-700 mb-3" />
            <p>No reminders found. Create one to engage with your members.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {reminders.map((r) => (
              <div key={r.id} className="p-5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex items-start justify-between flex-wrap gap-4">
                <div className="space-y-1.5 flex-1 min-w-[300px]">
                  <div className="text-slate-900 dark:text-slate-100 font-medium break-words leading-snug">{r.message}</div>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span className="font-medium text-slate-600 dark:text-slate-400">{r.created_by_name || 'System Assistant'}</span>
                    <span>•</span>
                    <span>{new Date(r.created_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <ReminderIcon sendVia={r.send_via} />
                  {r.is_automated ? (
                    <Badge intent="info" className="flex items-center gap-1">
                      <CalendarClock className="h-3 w-3" />
                      {r.expiry_days_before !== null ? `${r.expiry_days_before} Days Before` : 'Automated'}
                    </Badge>
                  ) : (
                    <Badge intent="neutral">Manual</Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
