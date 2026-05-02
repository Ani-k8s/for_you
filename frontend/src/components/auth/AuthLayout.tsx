import { useEffect, useRef, type ReactNode } from 'react';

interface AuthLayoutProps {
  children: ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  const visualRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mouse = { x: 50, y: 50 };
    const current = { x: 50, y: 50 };

    const handleMouseMove = (e: MouseEvent) => {
      const { innerWidth, innerHeight } = window;
      mouse.x = (e.clientX / innerWidth) * 100;
      mouse.y = (e.clientY / innerHeight) * 100;
    };

    let frameId: number;
    const update = () => {
      current.x += (mouse.x - current.x) * 0.05;
      current.y += (mouse.y - current.y) * 0.05;
      
      if (visualRef.current) {
        visualRef.current.style.setProperty('--mouse-x', `${current.x}%`);
        visualRef.current.style.setProperty('--mouse-y', `${current.y}%`);
      }
      
      frameId = requestAnimationFrame(update);
    };

    window.addEventListener('mousemove', handleMouseMove);
    frameId = requestAnimationFrame(update);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(frameId);
    };
  }, []);

  return (
    <div 
      ref={visualRef} 
      className="relative flex min-h-screen w-full flex-col items-center justify-center bg-[#010102] font-sans selection:bg-brand-red/30 py-20 px-6 overflow-hidden"
    >
      {/* Premium Environmental Layers */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        {/* Dynamic Gradient Atmosphere */}
        <div 
          className="absolute inset-0 opacity-40 transition-transform duration-1000 ease-out"
          style={{
            background: `radial-gradient(circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(255, 26, 26, 0.15) 0%, transparent 50%)`
          }}
        />
        
        {/* Fixed Glow Blobs */}
        <div className="absolute -top-[20%] -left-[10%] w-[60%] h-[60%] bg-brand-red/10 blur-[140px] rounded-full animate-pulse" />
        <div className="absolute -bottom-[20%] -right-[10%] w-[60%] h-[60%] bg-brand-orange/5 blur-[140px] rounded-full animate-pulse" style={{ animationDelay: '3s' }} />
        
        <div className="noise-overlay opacity-[0.03]" />
        <div className="vignette-overlay opacity-60" />
      </div>

      <div className="relative z-20 w-full flex flex-col items-center justify-center animate-float-up my-auto">
        {children}
      </div>

      {/* Security Footer */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-4 opacity-30 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-700">
         <div className="flex items-center gap-6">
            <div className="text-[8px] font-black uppercase tracking-[0.4em] text-slate-500">AES-256 Encrypted</div>
            <div className="h-1 w-1 rounded-full bg-slate-800" />
            <div className="text-[8px] font-black uppercase tracking-[0.4em] text-slate-500">Tier-4 Infrastructure</div>
         </div>
         <p className="text-[7px] font-bold text-slate-900 uppercase tracking-widest">&copy; 2026 777C8 Elite Security Systems</p>
      </div>
    </div>
  );
}
