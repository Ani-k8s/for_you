import { Shield } from 'lucide-react';

interface AuthHeaderProps {
  subtitle: string;
  logoUrl?: string;
  isTenant?: boolean;
  gymName?: string;
}

export function AuthHeader({ 
  subtitle, 
  logoUrl, 
  isTenant = false, 
  gymName 
}: AuthHeaderProps) {
  const isElite = !isTenant;
  const displayTitle = isElite ? "GYM CORE" : gymName;
  const displayTagline = isElite ? "The all-in-one management portal for your fitness business." : subtitle;

  return (
    <div className="mb-14 flex flex-col items-center text-center px-4 w-full">
      <div className="relative mb-10 group shrink-0">
        <div className="absolute -inset-12 bg-gradient-to-tr from-brand-red to-brand-orange rounded-full blur-[100px] opacity-20 group-hover:opacity-40 transition-opacity duration-1000" />
        <div className="relative flex h-20 w-20 md:h-24 md:w-24 items-center justify-center rounded-[2rem] bg-gradient-to-br from-brand-red to-brand-orange text-white shadow-2xl shadow-brand-red/20 transform transition-all duration-1000 group-hover:scale-110 group-hover:rotate-12 border border-white/10 active-glow-brand">
          {logoUrl ? (
            <img src={logoUrl} className="h-10 w-10 md:h-12 md:w-12 object-contain" alt="Logo" />
          ) : (
            <Shield className="h-8 w-8 md:h-10 md:w-10 text-white" />
          )}
        </div>
      </div>

      <div className="space-y-4 px-2 relative w-full">
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 bg-[#020203] text-[8px] font-black uppercase tracking-[0.5em] text-slate-700 break-words max-w-full">
           Welcome Back
        </div>
        <h1 className="text-4xl md:text-7xl font-black tracking-tighter text-white uppercase italic leading-tight py-4 text-gradient-elite font-display break-words">
          {displayTitle}
        </h1>
        
        <p className="text-slate-500 text-xs md:text-sm font-medium max-w-sm mx-auto leading-relaxed opacity-80 break-words">
          {displayTagline}
        </p>
      </div>

      <div className="mt-14 h-px w-32 bg-gradient-to-r from-transparent via-white/5 to-transparent shrink-0" />
    </div>
  );
}
