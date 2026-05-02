import { Link, useLocation } from 'react-router-dom'
import { Home, Users, CalendarCheck, Bell, Building2, UserCog, Shield, FileText, MessageCircle, CreditCard, Activity, Wrench, ChevronLeft, X } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import { useGymBranding } from '../branding/GymBrandingContext'
import { useState } from 'react'
import { api } from '../api/client'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

function BrandMark({ logoUrl, isCollapsed }: { logoUrl: string | null, isCollapsed: boolean }) {
  if (logoUrl) {
    return <img src={logoUrl} alt="Gym logo" className={cn("rounded-xl object-cover shadow-2xl border border-white/10 active:scale-95 transition-all duration-500", isCollapsed ? "h-8 w-8" : "h-10 w-10")} loading="lazy" />
  }
  return (
    <div className={cn("flex items-center justify-center rounded-xl bg-gradient-to-br from-brand-red to-brand-orange text-white shadow-2xl shadow-brand-red/20 border border-white/10 active:scale-95 transition-all duration-500", isCollapsed ? "h-8 w-8" : "h-10 w-10")}>
      <Shield className={cn("fill-white transition-all", isCollapsed ? "h-4 w-4" : "h-6 w-6")} />
    </div>
  )
}

function SidebarNavItem({ to, label, icon: Icon, isCollapsed, onSelection }: any) {
  const location = useLocation()
  const isActive = location.pathname.startsWith(to) && (to !== '/' || location.pathname === '/')

  return (
    <Link
      to={to}
      onClick={onSelection}
      className={cn(
        'relative flex items-center gap-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-700 group italic mb-2 min-h-[56px]', // Removed overflow-hidden, added min-h
        isCollapsed ? 'px-2 py-3 justify-center' : 'px-5 py-4',
        isActive
          ? 'bg-gradient-to-r from-brand-red/10 to-transparent text-white border-white/10 shadow-[0_10px_40px_rgba(255,26,26,0.15)]'
          : 'text-slate-500 hover:bg-white/[0.03] hover:text-white border-transparent'
      )}
    >
      {isActive && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-brand-red rounded-r-full shadow-[0_0_15px_rgba(255,26,26,0.8)]" />
      )}
      
      <div className={cn(
        "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all duration-700",
        isActive ? "bg-gradient-to-br from-brand-red to-brand-orange text-white shadow-xl shadow-brand-red/30" : "bg-white/[0.02] text-slate-700 group-hover:bg-white/10 group-hover:text-slate-300"
      )}>
        <Icon className="h-5 w-5" strokeWidth={isActive ? 3 : 2.5} />
      </div>
      
      {!isCollapsed && (
        <span className={cn(
          "transition-all duration-700 break-words leading-tight", // Removed truncate
          isActive ? "translate-x-1" : "group-hover:translate-x-1"
        )}>{label}</span>
      )}

      {!isCollapsed && isActive && (
        <div className="absolute right-4 w-1.5 h-1.5 rounded-full bg-brand-red shadow-[0_0_12px_rgba(255,26,26,1)] animate-pulse" />
      )}
    </Link>
  )
}

export default function Sidebar({ 
  className, 
  onClose,
  isCollapsed = false,
  onToggle,
  onSelection
}: { 
  className?: string, 
  onClose?: () => void,
  isCollapsed?: boolean,
  onToggle?: () => void,
  onSelection?: () => void
}) {
  const { user } = useAuth()
  const role = user?.role ?? 'member'
  const { data } = useGymBranding()
  const [downloading, setDownloading] = useState(false)

  const handleManualDownload = async (e: React.MouseEvent) => {
    e.preventDefault()
    setDownloading(true)
    try {
      const response = await api.get('/api/docs/manual/file/')
      if (response.data.url) {
        window.open(response.data.url, '_blank')
      }
    } catch (error) {
      console.error('Manual download failed:', error)
    } finally {
      setDownloading(false)
    }
  }

  const items = [
    { 
      to: role === 'super_admin' ? '/dashboard/super-admin' : 
          role === 'gym_owner' ? '/dashboard/owner' : 
          role === 'staff' ? '/dashboard/trainer' : '/dashboard/member', 
      label: 'Dashboard', 
      icon: Home, 
      roles: ['super_admin', 'gym_owner', 'staff', 'member'] 
    },
    { to: '/gyms', label: 'Gyms', icon: Building2, roles: ['super_admin'] },
    { to: '/users', label: 'Team', icon: UserCog, roles: ['super_admin'] },
    { to: '/members', label: 'Members', icon: Users, roles: ['gym_owner', 'staff'] },
    { to: '/attendance', label: 'Attendance', icon: CalendarCheck, roles: ['gym_owner', 'staff', 'member'] },
    { to: '/plans', label: 'Plans', icon: FileText, roles: ['gym_owner'] },
    { to: '/announcements', label: 'Announcements', icon: Bell, roles: ['gym_owner', 'staff', 'member'] },
    { to: '/billing', label: 'Billing', icon: CreditCard, roles: ['gym_owner', 'member'] },
    { to: '/chat', label: 'Messages', icon: MessageCircle, roles: ['gym_owner', 'staff'] },
    { to: '/reports', label: 'Reports', icon: Activity, roles: ['gym_owner'] },
    { to: '/equipment', label: 'Equipment', icon: Wrench, roles: ['gym_owner', 'staff'] },
    { to: '/config', label: 'Settings', icon: Shield, roles: ['gym_owner'] },
  ].filter(i => i.roles.includes(role))

  return (
    <aside className={cn(
      "fixed inset-y-0 left-0 z-[150] flex flex-col bg-[#020203]/80 backdrop-blur-3xl border-r border-white/5 transition-all duration-700 ease-in-out",
      isCollapsed ? "w-24" : "w-80",
      className
    )}>
      {/* Sidebar Header */}
      <div className={cn("flex shrink-0 items-center border-b border-white/5 transition-all duration-700", isCollapsed ? "h-20 justify-center" : "h-24 px-8 justify-between")}>
        <div className="flex items-center gap-4">
           <BrandMark logoUrl={data?.logo_url || null} isCollapsed={isCollapsed} />
           {!isCollapsed && (
             <div className="flex flex-col">
               <span className="text-sm font-black uppercase tracking-[0.2em] text-white italic font-display leading-tight">GYM <span className="text-brand-red">PLATFORM</span></span>
               <span className="text-[8px] font-black uppercase tracking-[0.4em] text-slate-700 mt-1">Management Portal</span>
             </div>
           )}
        </div>
        {!isCollapsed && (onToggle || onClose) && (
          <button 
            onClick={onClose || onToggle} 
            className="h-8 w-8 flex items-center justify-center rounded-xl bg-white/[0.02] border border-white/5 text-slate-500 hover:text-white transition-all active:scale-90"
          >
             {onClose ? <X className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        )}
      </div>

      {/* Navigation Content */}
      <nav className="flex-1 overflow-y-auto px-4 py-8 custom-scrollbar">
        {items.map((item) => (
          <SidebarNavItem 
            key={item.to} 
            {...item} 
            isCollapsed={isCollapsed} 
            onSelection={onSelection} 
          />
        ))}
      </nav>

      {/* Footer System Status */}
      <div className={cn("mt-auto border-t border-white/5 p-6 transition-all duration-700", isCollapsed ? "items-center" : "")}>
        {!isCollapsed ? (
          <button 
            onClick={handleManualDownload}
            disabled={downloading}
            className="group relative flex w-full items-center gap-4 rounded-[1.5rem] bg-white/[0.02] p-4 border border-white/5 hover:border-brand-red/30 transition-all active:scale-[0.98] min-h-[80px]"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-red/10 text-brand-red group-hover:bg-brand-red group-hover:text-white transition-all duration-500 shadow-lg shadow-brand-red/10">
              <FileText className="h-5 w-5" />
            </div>
            <div className="flex flex-col items-start min-w-0">
               <span className="text-[10px] font-black uppercase tracking-widest text-white break-words w-full text-left">{downloading ? 'Loading...' : 'Documentation'}</span>
               <span className="text-[8px] font-bold text-slate-600 uppercase tracking-widest mt-1 break-words w-full text-left line-clamp-2">User Manual & Training</span>
            </div>
          </button>
        ) : (
          <div className="flex flex-col items-center gap-6">
             <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-white/[0.02] border border-white/5 text-slate-600">
                <Shield className="h-5 w-5" />
             </div>
          </div>
        )}
      </div>
    </aside>
  )
}
