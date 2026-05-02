import React, { useEffect, useRef, useState } from 'react'
import { api, getApiErrorMessage } from '../api/client'
import { FileText, Download, Loader2, BookOpen, ExternalLink, HelpCircle, Send, MessageCircle, User, Bot } from 'lucide-react'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'

type ManualInfo = {
  url: string | null
  title: string
  updated_at: string
}

type ChatMessage = {
  id: number
  role: 'user' | 'bot'
  text: string
}

let msgId = 0

export default function HelpPage() {
  const [loading, setLoading] = useState(true)
  const [manual, setManual] = useState<ManualInfo | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Chat
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: msgId++, role: 'bot', text: "Hi! I'm the support assistant. Ask me anything — like how to add members, how to login, or how to reset your password." }
  ])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchManual()
  }, [])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function fetchManual() {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get('/api/docs/manual/file/')
      setManual(res.data)
    } catch (err) {
      setError(getApiErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = () => {
    if (manual?.url) {
      const fullUrl = manual.url.startsWith('http') ? manual.url : `${window.location.origin}${manual.url}`
      window.open(fullUrl, '_blank')
    }
  }

  async function sendMessage() {
    const text = chatInput.trim()
    if (!text) return

    const userMsg: ChatMessage = { id: msgId++, role: 'user', text }
    setMessages(prev => [...prev, userMsg])
    setChatInput('')
    setChatLoading(true)

    try {
      const res = await api.post('/api/support/chat/', { message: text })
      const botMsg: ChatMessage = { id: msgId++, role: 'bot', text: res.data.reply }
      setMessages(prev => [...prev, botMsg])
    } catch {
      const errMsg: ChatMessage = { id: msgId++, role: 'bot', text: 'Sorry, I had trouble responding. Please try again.' }
      setMessages(prev => [...prev, errMsg])
    } finally {
      setChatLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="max-w-5xl mx-auto py-10 px-6 font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Help Center</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2">Find answers, download guides, or chat with support.</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-brand-500/10 rounded-full border border-brand-500/20">
          <HelpCircle className="h-4 w-4 text-brand-500" />
          <span className="text-xs font-bold text-brand-600 dark:text-brand-400">Support Active</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left: Manual + Quick Links */}
        <div className="lg:col-span-2 space-y-6">
          {/* User Manual Card */}
          <Card className="p-6 border-none bg-white dark:bg-slate-900 shadow-xl rounded-2xl overflow-hidden relative">
            <div className="absolute top-0 right-0 p-6 opacity-5">
              <BookOpen className="h-24 w-24 text-slate-900 dark:text-white" />
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-xl bg-brand-600 flex items-center justify-center text-white shadow-lg">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-900 dark:text-white">User Manual</h2>
                  <p className="text-xs text-slate-500">Your role-specific guide</p>
                </div>
              </div>

              {loading ? (
                <div className="flex flex-col items-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-brand-500 mb-3" />
                  <p className="text-sm text-slate-500">Loading your manual...</p>
                </div>
              ) : error ? (
                <div className="p-4 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 text-center">
                  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                  <Button variant="ghost" size="sm" onClick={fetchManual} className="mt-3 text-red-600">
                    Try Again
                  </Button>
                </div>
              ) : manual ? (
                <>
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">{manual.title}</p>
                  <p className="text-xs text-slate-500 mb-5">
                    Download or view this guide any time to learn how to use the platform.
                  </p>
                  <div className="flex flex-col gap-3">
                    <Button 
                      size="sm"
                      onClick={handleDownload}
                      className="bg-brand-600 hover:bg-brand-500 text-white rounded-xl font-bold gap-2"
                      title="Download manual as PDF"
                    >
                      <Download className="h-4 w-4" />
                      Download PDF
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="rounded-xl font-bold gap-2"
                      onClick={() => window.open(manual.url || '', '_blank')}
                      title="View manual in your browser"
                    >
                      <ExternalLink className="h-4 w-4" />
                      View in Browser
                    </Button>
                  </div>
                  <p className="mt-4 text-[10px] text-slate-400">
                    Updated: {new RegExp(/^\d{4}-\d{2}-\d{2}/).exec(manual.updated_at)?.[0] || 'Recently'}
                  </p>
                </>
              ) : (
                <p className="text-slate-500 text-sm">No manual available for your role yet.</p>
              )}
            </div>
          </Card>

          {/* Quick Tips */}
          <Card className="p-5 border border-brand-500/20 bg-brand-500/5 rounded-2xl">
            <h3 className="text-xs font-bold text-brand-600 dark:text-brand-400 mb-3">💡 Quick Tips</h3>
            <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
              <li>• Type your question in the chat on the right</li>
              <li>• Ask about members, attendance, or payments</li>
              <li>• Download your manual for a full guide</li>
              <li>• Press Enter to send your message</li>
            </ul>
          </Card>
        </div>

        {/* Right: Support Chat */}
        <div className="lg:col-span-3">
          <Card className="border-none bg-white dark:bg-slate-900 shadow-xl rounded-2xl overflow-hidden flex flex-col h-[520px]">
            {/* Chat Header */}
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-brand-600 flex items-center justify-center text-white">
                <MessageCircle className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-sm font-black text-slate-900 dark:text-white">Support Chat</h2>
                <p className="text-xs text-emerald-500 font-medium">Online — ask anything</p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 text-white ${msg.role === 'bot' ? 'bg-brand-600' : 'bg-slate-700'}`}>
                    {msg.role === 'bot' ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
                  </div>
                  <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    msg.role === 'bot'
                      ? 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-sm'
                      : 'bg-brand-600 text-white rounded-tr-sm'
                  }`}>
                    {msg.text}
                  </div>
                </div>
              ))}

              {chatLoading && (
                <div className="flex gap-3">
                  <div className="h-7 w-7 rounded-full bg-brand-600 flex items-center justify-center text-white shrink-0">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl rounded-tl-sm px-4 py-3">
                    <div className="flex gap-1 items-center h-4">
                      <span className="h-2 w-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="h-2 w-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="h-2 w-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask a question... e.g. How do I add members?"
                  className="flex-1 h-11 px-4 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500 placeholder:text-slate-400"
                  disabled={chatLoading}
                />
                <Button
                  variant="primary"
                  className="h-11 px-4 rounded-xl"
                  onClick={sendMessage}
                  disabled={chatLoading || !chatInput.trim()}
                  title="Send message"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-[10px] text-slate-400 mt-2 text-center">Press Enter to send · Shift+Enter for new line</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
