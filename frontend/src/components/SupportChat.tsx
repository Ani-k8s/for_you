import React, { useState, useEffect, useRef } from 'react'
import { X, Send, Shield, Loader2, Minimize2, Maximize2 } from 'lucide-react'
import { api } from '../api/client'
import { twMerge } from 'tailwind-merge'
import { clsx } from 'clsx'

interface Message {
  role: 'user' | 'bot'
  text: string
  timestamp: Date
}

export default function SupportChat() {
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [message, setMessage] = useState('')
  const [chatHistory, setChatHistory] = useState<Message[]>([
    { role: 'bot', text: "Hello! I'm your 777c8 Elite Assistant. How can I help you navigate the platform today?", timestamp: new Date() }
  ])
  const [loading, setLoading] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleOpenChat = () => {
      setIsOpen(true)
      setIsMinimized(false)
    }
    window.addEventListener('open-support-chat', handleOpenChat)
    return () => window.removeEventListener('open-support-chat', handleOpenChat)
  }, [])

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [chatHistory, isOpen, isMinimized])

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!message.trim() || loading) return

    const userMessage = message.trim()
    setMessage('')
    
    // 1. Update UI for User Message immediately
    const userMessageObj: Message = { role: 'user', text: userMessage, timestamp: new Date() }
    setChatHistory(prev => [...prev, userMessageObj])
    setLoading(true)

    try {
      // 2. Call New Support Message API
      const response = await api.post('/api/support/message/', { text: userMessage })
      
      // 3. Extract and display auto-reply
      setChatHistory(prev => [...prev, { 
        role: 'bot', 
        text: response.data.response, 
        timestamp: new Date() 
      }])
    } catch (error) {
      setChatHistory(prev => [...prev, { 
        role: 'bot', 
        text: "I'm having trouble connecting to the neural link. Please contact system admin directly.", 
        timestamp: new Date() 
      }])
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className={twMerge(
      clsx(
        "fixed z-[100] transition-all duration-500 ease-out flex flex-col pointer-events-auto",
        isMinimized 
          ? "bottom-6 right-6 w-16 h-16 rounded-full" 
          : "bottom-6 right-6 w-[380px] h-[550px] shadow-2xl rounded-3xl"
      )
    )}>
      
      {/* Container Glass Wrapper */}
      <div className="relative flex flex-col h-full w-full bg-slate-950/90 border border-white/10 backdrop-blur-2xl rounded-3xl overflow-hidden shadow-brand-500/20 shadow-2xl animate-fadeInUp">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-brand-500/10 to-transparent border-b border-white/5">
          <div className="flex items-center gap-3">
             <div className="relative group">
                <div className="absolute -inset-1 bg-brand-500/20 rounded-full blur-sm animate-pulse opacity-50" />
                <div className="relative h-8 w-8 bg-brand-500 rounded-lg flex items-center justify-center shadow-lg shadow-brand-500/30">
                    <Shield className="h-4 w-4 text-white" />
                </div>
             </div>
             <div>
                <h4 className="text-xs font-black text-white uppercase tracking-widest leading-none">Support Center</h4>
                <div className="flex items-center gap-1.5 mt-1">
                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Secure Link Active</span>
                </div>
             </div>
          </div>
          <div className="flex items-center gap-1">
             <button 
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1.5 hover:bg-white/5 rounded-lg text-slate-500 hover:text-white transition-colors"
                title={isMinimized ? "Maximize" : "Minimize"}
             >
                {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
             </button>
             <button 
                onClick={() => setIsOpen(false)}
                className="p-1.5 hover:bg-brand-500/10 rounded-lg text-slate-500 hover:text-brand-400 transition-colors"
             >
                <X className="h-4 w-4" />
             </button>
          </div>
        </div>

        {/* Chat Body */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-4">
           {chatHistory.map((msg, idx) => (
             <div 
               key={idx} 
               className={twMerge(
                 clsx(
                   "flex flex-col max-w-[85%]",
                   msg.role === 'user' ? "ml-auto items-end" : "items-start"
                 )
               )}
             >
                <div className={twMerge(
                  clsx(
                    "p-3 text-xs leading-relaxed transition-all",
                    msg.role === 'user' 
                      ? "bg-brand-500 text-white rounded-2xl rounded-tr-none shadow-lg shadow-brand-500/10" 
                      : "bg-white/5 text-slate-200 border border-white/5 rounded-2xl rounded-tl-none"
                  )
                )}>
                  {msg.text}
                </div>
                <span className="text-[8px] font-bold text-slate-600 uppercase tracking-widest mt-1.5">
                  {msg.role === 'bot' ? '777c8 ELITE' : 'Security Token Auth'}
                </span>
             </div>
           ))}
           {loading && (
             <div className="flex items-start gap-2 max-w-[85%]">
                <div className="bg-white/5 p-3 rounded-2xl rounded-tl-none border border-white/5 flex items-center gap-2">
                   <Loader2 className="h-3 w-3 text-brand-500 animate-spin" />
                   <span className="text-[10px] italic text-slate-400">Processing cipher...</span>
                </div>
             </div>
           )}
           <div ref={chatEndRef} />
        </div>

        {/* Chat Input */}
        <div className="p-4 bg-slate-900/50 border-t border-white/5 backdrop-blur-xl">
           <form onSubmit={handleSendMessage} className="relative flex items-center">
              <input 
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="What is your query?"
                className="w-full bg-slate-950/50 border border-white/10 rounded-2xl py-3 pl-4 pr-12 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/20 transition-all font-medium custom-scrollbar"
                disabled={loading}
              />
              <button 
                type="submit"
                disabled={loading || !message.trim()}
                className="absolute right-2 p-2 bg-brand-500 hover:bg-brand-400 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded-xl transition-all active:scale-95 shadow-lg shadow-brand-500/20"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </button>
           </form>
           <p className="text-[8px] text-center text-slate-600 uppercase font-black tracking-[0.2em] mt-3">
              Encrypted Session &bull; ISO-27001 Compliant
           </p>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeInUp { animation: fadeInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}} />
    </div>
  )
}
