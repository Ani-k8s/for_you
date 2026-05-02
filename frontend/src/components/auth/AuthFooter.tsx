import { Globe, Shield } from 'lucide-react';

interface AuthFooterProps {
  gymName?: string;
  isTenant?: boolean;
}

export function AuthFooter({ gymName, isTenant = false }: AuthFooterProps) {
  return (
    <div className="mt-16 flex flex-col items-center gap-6 opacity-40 hover:opacity-100 transition-opacity duration-1000">
      <div className="flex items-center gap-10">
         <div className="flex items-center gap-2.5 text-slate-500">
            <Globe className="w-3.5 h-3.5" />
            <span className="text-[9px] font-black uppercase tracking-[0.4em]">System Online</span>
         </div>
         <div className="flex items-center gap-2.5 text-slate-500">
            <Shield className="w-3.5 h-3.5" />
            <span className="text-[9px] font-black uppercase tracking-[0.4em]">Secure Connection</span>
         </div>
      </div>
      <div className="text-center space-y-2">
        <p className="text-[9px] text-slate-700 font-black uppercase tracking-[0.6em]">
          &copy; 2026 {isTenant ? gymName : '777C8 ELITE'}. ALL RIGHTS RESERVED.
        </p>
        <p className="text-[8px] text-slate-800 font-bold uppercase tracking-[0.3em]">
          SECURE &bull; RELIABLE &bull; PROFESSIONAL GYM MANAGEMENT
        </p>
      </div>
    </div>
  );
}
