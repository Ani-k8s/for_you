import React from 'react'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { Loader2 } from 'lucide-react'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg' | 'xl'
  isLoading?: boolean
}

export default function Button({
  className,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  children,
  ...props
}: ButtonProps) {
  const variantStyles = {
    primary: 'bg-gradient-to-r from-brand-red to-brand-orange text-white font-black uppercase tracking-[0.25em] shadow-[0_10px_30px_-5px_rgba(255,26,26,0.4)] border border-white/10 hover:shadow-[0_20px_50px_-10px_rgba(255,26,26,0.6)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]',
    secondary: 'bg-white/[0.03] hover:bg-white/[0.08] text-white border border-white/10 backdrop-blur-md font-black uppercase tracking-widest active:scale-[0.98] hover:border-white/20',
    outline: 'bg-transparent border border-white/10 hover:border-white/30 hover:bg-white/5 text-white font-black uppercase tracking-widest active:scale-[0.98]',
    ghost: 'bg-transparent hover:bg-white/5 text-slate-500 hover:text-white font-black uppercase tracking-widest active:scale-[0.98]',
    danger: 'bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 font-black uppercase tracking-widest active:scale-[0.98]',
  }

  const sizeStyles = {
    sm: 'min-h-[40px] py-2 px-6 text-[10px]',
    md: 'min-h-[48px] py-3 px-8 text-[11px]',
    lg: 'min-h-[64px] py-4 px-12 text-xs',
    xl: 'min-h-[80px] py-5 px-16 text-sm',
  }

  return (
    <button
      className={cn(
        'relative inline-flex items-center justify-center rounded-2xl transition-all duration-500 disabled:opacity-50 disabled:pointer-events-none group font-sans italic break-words text-center',
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {/* Decorative Layers - Wrapped in an overflow-hidden container to protect the button's layout */}
      <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        
        {/* Animated Glow Border for Primary */}
        {variant === 'primary' && (
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-[200%] group-hover:translate-x-[200%] transition-transform duration-1000 ease-in-out" />
        )}
      </div>
      
      {isLoading ? (
        <Loader2 className="mr-3 h-4 w-4 animate-spin text-white shrink-0" />
      ) : null}
      
      <span className="relative z-10 flex items-center justify-center gap-2 flex-wrap">
        {children}
      </span>
    </button>
  )
}
