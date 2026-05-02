import React from 'react'
import Navbar from './Navbar'
import Sidebar from './Sidebar'
import SupportChat from './SupportChat'
import { twMerge } from 'tailwind-merge'

export default function AppShell({ children }: { children: React.ReactNode }) {
  // Sidebar is collapsed (hidden) by default on mobile, expanded on desktop
  const [isCollapsed, setIsCollapsed] = React.useState(window.innerWidth < 1024)

  React.useEffect(() => {
    const handleResize = () => {
      // Auto-collapse when entering mobile view, auto-expand when entering desktop view
      if (window.innerWidth < 1024) setIsCollapsed(true)
      else setIsCollapsed(false)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return (
    <div className="flex h-screen w-full bg-[#010102] text-slate-100 overflow-hidden relative selection:bg-brand-red/30 font-sans">
      
      {/* High-End Environmental Layers */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[70%] h-[70%] bg-brand-red/5 blur-[160px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[60%] h-[60%] bg-brand-orange/5 blur-[140px] rounded-full animate-pulse" style={{ animationDelay: '2s' }} />
        <div className="noise-overlay opacity-[0.02]" />
        <div className="vignette-overlay opacity-60" />
      </div>
      
      {/* Desktop Sidebar */}
      <aside 
        className={twMerge(
          "hidden lg:block shrink-0 relative z-[150] transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]",
          isCollapsed ? "w-0 opacity-0 -translate-x-full" : "w-80 opacity-100 translate-x-0"
        )}
      >
        <Sidebar 
          isCollapsed={false}
          onToggle={() => setIsCollapsed(true)}
          onSelection={() => {}}
          className="h-full" 
        />
      </aside>

      {/* Mobile Sidebar (Overlay/Drawer) */}
      <div 
        className={twMerge(
          "fixed inset-0 z-[140] bg-black/80 backdrop-blur-md transition-opacity duration-500 lg:hidden",
          isCollapsed ? "pointer-events-none opacity-0" : "opacity-100"
        )}
        onClick={() => setIsCollapsed(true)}
      />
      <aside 
        className={twMerge(
          "fixed inset-y-0 left-0 z-[160] w-80 transform transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] lg:hidden",
          isCollapsed ? "-translate-x-full" : "translate-x-0"
        )}
      >
        <Sidebar 
          onClose={() => setIsCollapsed(true)}
          onSelection={() => setIsCollapsed(true)}
          className="h-full shadow-[20px_0_60px_rgba(0,0,0,0.5)]" 
        />
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden relative z-10">
        <Navbar 
          onToggleSidebar={() => setIsCollapsed(!isCollapsed)}
        />
        <main className="flex-1 overflow-y-auto w-full custom-scrollbar relative">
          <div 
            className="max-w-[1600px] mx-auto px-6 sm:px-10 lg:px-16 py-10 lg:py-16 animate-float-up"
          >
            {children}
          </div>
        </main>
      </div>

      <SupportChat />

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { 
          background: rgba(255,255,255,0.03); 
          border-radius: 10px;
          transition: background 0.3s;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.1); }
      `}} />
    </div>
  )
}
