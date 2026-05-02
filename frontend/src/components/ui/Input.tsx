import React, { forwardRef } from 'react'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', error, ...props }, ref) => {
    return (
      <div className="relative w-full group">
        <input
          type={type}
          className={cn(
            'flex h-12 w-full rounded-xl border bg-white/[0.03] px-4 py-2 text-sm font-semibold text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500/40 transition-all duration-500 disabled:cursor-not-allowed disabled:opacity-50 ring-offset-slate-950 caret-brand-red',
            'border-white/10 hover:border-white/20',
            'dark:bg-slate-900/50 dark:text-slate-50 dark:placeholder:text-slate-500',
            error && 'border-red-500/50 focus:ring-red-500/10 focus:border-red-500',
            className
          )}
          ref={ref}
          {...props}
        />
        {error && (
          <p className="mt-2 text-[10px] font-black uppercase tracking-widest text-red-500 animate-fadeInUp ml-1">{error}</p>
        )}
      </div>
    )
  }
)
Input.displayName = 'Input'

export default Input
