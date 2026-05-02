import { useEffect, useState, useRef } from 'react'
import { api, getApiErrorMessage } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Input from '../components/ui/Input'
import Skeleton from '../components/ui/Skeleton'
import { useToast } from '../components/ui/ToastProvider'
import { Send, MessageCircle, Check, CheckCheck } from 'lucide-react'

type Message = {
  id: string
  sender_email: string
  sender_name: string
  recipient: string
  content: string
  is_read: boolean
  created_at: string
}

type Contact = {
  id: string
  email: string
  first_name: string
  last_name: string
}

export default function ChatPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const scrollRef = useRef<HTMLDivElement>(null)
  
  const [messages, setMessages] = useState<Message[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [newContent, setNewContent] = useState('')

  async function refreshMessages() {
    try {
      const res = await api.get('/api/communication/messages/')
      setMessages(res.data.results ?? res.data)
    } catch (err) {
      console.error(err)
    }
  }

  async function loadContacts() {
    try {
      // In a real app, this would be a specialized "chat contacts" endpoint.
      // For now, we list gym members/staff.
      const res = await api.get('/api/users/')
      const list = res.data.results ?? res.data
      setContacts(list.filter((c: any) => c.id !== user?.id))
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refreshMessages()
    loadContacts()
    const ival = setInterval(refreshMessages, 5000) // Polling fallback
    return () => clearInterval(ival)
  }, [])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedContact || !newContent.trim()) return
    setSending(true)
    try {
      await api.post('/api/communication/messages/', {
        recipient: selectedContact.id,
        content: newContent
      })
      setNewContent('')
      refreshMessages()
    } catch (err) {
      toast({ title: 'Send failed', description: getApiErrorMessage(err), intent: 'error' })
    } finally {
      setSending(false)
    }
  }

  const thread = messages.filter(m => 
    selectedContact && (
      (m.sender_email === user?.email && m.recipient === selectedContact.id) ||
      (m.sender_email === selectedContact.email && m.recipient === user?.id)
    )
  ).sort((a,b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

  if (loading) return <Skeleton className="h-[500px] w-full" />

  return (
    <div className="animate-fadeInUp flex h-[calc(100vh-14rem)] gap-4 overflow-hidden">
      {/* Contact List */}
      <Card className="w-80 flex flex-col p-4">
        <h2 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4">Internal Directory</h2>
        <div className="flex-1 overflow-y-auto space-y-2 pr-2">
          {contacts.map(c => (
            <button
              key={c.id}
              onClick={() => setSelectedContact(c)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all ${
                selectedContact?.id === c.id 
                  ? 'bg-brand-500/10 text-white border border-brand-500/20' 
                  : 'hover:bg-slate-50 dark:hover:bg-slate-800 border border-transparent'
              }`}
            >
              <div className="h-10 w-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 font-bold shrink-0">
                {c.first_name?.[0].toUpperCase() ?? c.email[0].toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-bold truncate text-slate-900 dark:text-white">
                  {c.first_name} {c.last_name}
                </div>
                <div className="text-xs text-slate-500 truncate">{c.email}</div>
              </div>
            </button>
          ))}
        </div>
      </Card>

      {/* Chat Window */}
      <Card className="flex-1 flex flex-col p-0 overflow-hidden relative">
        {selectedContact ? (
          <>
            {/* Header */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                 <div className="h-10 w-10 rounded-full bg-brand-500/10 flex items-center justify-center text-brand-500 font-bold">
                   {selectedContact.first_name[0].toUpperCase()}
                 </div>
                 <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">{selectedContact.first_name} {selectedContact.last_name}</h3>
                    <div className="flex items-center gap-1.5">
                      <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Online</span>
                    </div>
                 </div>
              </div>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6">
              {thread.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center opacity-30">
                  <MessageCircle className="h-12 w-12 mb-4" />
                  <p className="text-sm font-bold uppercase tracking-widest">Starting conversation...</p>
                  <p className="text-xs mt-1">Start the conversation with {selectedContact.first_name}</p>
                </div>
              ) : (
                thread.map(m => {
                  const isOwn = m.sender_email === user?.email
                  return (
                    <div key={m.id} className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
                       <div className={`max-w-[70%] p-4 rounded-2xl shadow-sm ${
                         isOwn 
                          ? 'bg-brand-600 text-white rounded-tr-none' 
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-tl-none'
                       }`}>
                         <p className="text-sm leading-relaxed">{m.content}</p>
                       </div>
                       <div className="mt-1.5 flex items-center gap-1.5">
                          <span className="text-[10px] text-slate-400 font-medium">
                            {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {isOwn && (
                            m.is_read ? <CheckCheck className="h-3 w-3 text-brand-500" /> : <Check className="h-3 w-3 text-slate-400" />
                          )}
                       </div>
                    </div>
                  )
                })
              )}
            </div>

            {/* Input */}
            <form onSubmit={handleSend} className="p-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-black/20">
               <div className="flex gap-2">
                 <Input 
                   value={newContent} 
                   onChange={(e) => setNewContent(e.target.value)} 
                   placeholder={`Message ${selectedContact.first_name}...`} 
                   disabled={sending}
                   className="flex-1 h-12"
                 />
                 <Button type="submit" disabled={sending || !newContent.trim()} className="h-12 w-12 p-0 flex items-center justify-center shrink-0">
                    <Send className="h-5 w-5" />
                 </Button>
               </div>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-12 opacity-30">
             <div className="h-24 w-24 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center mb-6">
                <MessageCircle className="h-12 w-12 text-slate-400" />
             </div>
             <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter">Messages</h2>
             <p className="text-sm max-w-xs mt-2">Select a contact from the directory to start a conversation.</p>
          </div>
        )}
      </Card>
    </div>
  )
}
