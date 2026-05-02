import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from './Button';

interface FloatingInputProps {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  type?: string;
  required?: boolean;
  name?: string;
  icon?: any;
  isTextArea?: boolean;
}

export function FloatingInput({ 
  label, 
  value, 
  onChange, 
  type = 'text', 
  required = false,
  name,
  icon: Icon,
  isTextArea = false
}: FloatingInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const inputType = type === 'password' ? (showPassword ? 'text' : 'password') : type;

  const sharedProps = {
    name,
    value,
    onChange,
    onFocus: () => setIsFocused(true),
    onBlur: () => setIsFocused(false),
    required,
    className: cn(
      "w-full transition-all duration-700 font-medium text-white px-6 focus:outline-none placeholder-transparent border active-glow-brand bg-[#020203]",
      isTextArea ? "py-6 min-h-[120px] resize-none" : "h-16 text-sm",
      isFocused 
        ? "border-brand-red/40 bg-white/[0.04] shadow-[0_0_30px_rgba(255,26,26,0.05)]" 
        : "border-white/5 hover:border-white/10"
    )
  };

  return (
    <div className="relative w-full group">
      {/* Dynamic Label */}
      <div className={cn(
        "absolute left-5 transition-all duration-500 pointer-events-none flex items-center gap-2 z-20 font-black italic",
        isFocused || value 
          ? "-top-3 text-[9px] uppercase tracking-[0.3em] text-brand-red px-3 bg-[#050505] scale-100 origin-left border-x border-white/5" 
          : "top-1/2 -translate-y-1/2 text-xs text-slate-600 tracking-widest uppercase"
      )}>
        {Icon && !(isFocused || value) && <Icon className="w-3.5 h-3.5 opacity-40 group-hover:opacity-70 transition-opacity" />}
        {label}
      </div>

      <div className="relative overflow-hidden rounded-2xl group">
        {isTextArea ? (
          <textarea {...sharedProps} rows={4} />
        ) : (
          <input {...sharedProps} type={inputType} />
        )}
        
        {/* Glow Shadow Effect */}
        <div className={cn(
          "absolute inset-0 pointer-events-none transition-opacity duration-1000",
          isFocused ? "opacity-10" : "opacity-0"
        )}>
          <div className="absolute inset-0 bg-brand-red blur-xl" />
        </div>
      </div>

      {type === 'password' && !isTextArea && (
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-6 top-1/2 -translate-y-1/2 p-2 text-slate-700 hover:text-white transition-all z-30 active:scale-90"
        >
          {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
        </button>
      )}
    </div>
  );
}
