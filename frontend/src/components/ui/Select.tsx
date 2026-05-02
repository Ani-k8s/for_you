import React, { forwardRef } from 'react'
import { cn } from './Button' // REUSING the cn function

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: string
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, error, ...props }, ref) => {
    return (
      <div className="relative w-full">
        <select
          className={cn(
            'flex h-10 w-full items-center justify-between rounded-md border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50',
            'dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50',
            error && 'border-red-500 focus:ring-red-500 dark:border-red-500',
            className
          )}
          ref={ref}
          {...props}
        >
          {children}
        </select>
        {error && (
          <p className="mt-1 text-xs text-red-500 animate-fadeInUp">{error}</p>
        )}
      </div>
    )
  }
)
Select.displayName = 'Select'

export default Select
