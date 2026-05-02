import { Menu, LogOut, Activity, User, LifeBuoy, Bell } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import Button from './ui/Button'
import { useNavigate } from 'react-router-dom'
import GlobalSearch from './GlobalSearch'

export default function Navbar({ 
  onToggleSidebar
}: { 
  onToggleSidebar: () => void
}) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  return (
    <header className="sticky top-0 z-[100] flex h-20 shrink-0 items-center justify-between border-b border-white/5 bg-brand-carbon px-6 lg:px-10">
      
      {/* Left section: Identity & Hamburger */}
      <div className="flex items-center gap-6 w-1/3">
        <button
          type="button"
          className="text-slate-500 hover:text-white transition-all p-2 hover:bg-white/5 rounded-xl active:scale-90"
          onClick={onToggleSidebar}
        >
          <span className="sr-only">Toggle sidebar</span>
          <Menu className="h-6 w-6" aria-hidden="true" />
        </button>
        
        <div 
          className="flex items-center gap-3 group cursor-pointer transition-all active:scale-95" 
          onClick={() => {
            window.location.href = '/'
          }}
        >
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase tracking-[0.25em] text-white leading-none">ForYou</span>
              <span className="text-[8px] font-black uppercase tracking-[0.3em] text-brand-red leading-none mt-1">Gym SaaS</span>
            </div>
        </div>
      </div>

      {/* Center section: Search */}
      <div className="flex-1 flex justify-center max-w-xl">
        <GlobalSearch />
      </div>

      {/* Right section: Profile & Security */}
      <div className="flex items-center justify-end gap-6 w-1/3">
        <div className="hidden lg:flex items-center gap-4 pr-6 border-r border-white/5">
          <div className="h-10 w-10 glass-panel flex items-center justify-center rounded-xl text-slate-500 hover:text-white transition-all cursor-pointer hover:border-white/20 group relative">
             <Bell className="h-5 w-5 group-hover:scale-110 transition-transform" />
             <div className="absolute top-2 right-2 w-2 h-2 bg-brand-red rounded-full border-2 border-[#020203]" />
          </div>
          
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-black text-white uppercase tracking-widest leading-none">
              {user?.email?.split('@')[0] || 'Operator'}
            </span>
            <span className="text-[7px] font-black text-emerald-500 uppercase tracking-[0.3em] leading-none mt-1.5 flex items-center gap-1">
              <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
              Verified Session
            </span>
          </div>
          
          <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-brand-red to-brand-orange flex items-center justify-center text-white font-black text-sm shadow-xl shadow-brand-red/20 border border-white/10 shrink-0 hover:rotate-6 transition-all duration-500 cursor-pointer active-glow-brand">
            {user?.email?.[0].toUpperCase() || <User className="h-5 w-5" />}
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            onClick={() => window.dispatchEvent(new CustomEvent('open-support-chat'))}
            className="text-slate-500 hover:text-brand-orange hover:bg-brand-orange/5 h-11 px-3 border-white/5 hover:border-brand-orange/20 group transition-all"
          >
            <LifeBuoy className="h-5 w-5 transition-transform group-hover:rotate-12" />
          </Button>

          <Button 
            variant="ghost" 
            onClick={() => {
              logout()
              navigate('/')
            }}
            className="text-slate-500 hover:text-red-500 hover:bg-red-500/5 h-11 px-3 border-white/5 hover:border-red-500/20 group transition-all"
          >
            <LogOut className="h-5 w-5 transition-transform group-hover:translate-x-1" />
          </Button>
        </div>
      </div>
    </header>
  )
}
