import React from 'react'
import { cn } from './Button'

type BadgeIntent = 'primary' | 'success' | 'warning' | 'danger' | 'neutral' | 'info'

export default function Badge({
  children,
  intent = 'neutral',
  className,
}: {
  children: React.ReactNode
  intent?: BadgeIntent
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset',
        intent === 'primary' && 'bg-brand-50 text-brand-700 ring-brand-600/20 dark:bg-brand-500/10 dark:text-brand-400 dark:ring-brand-500/20',
        intent === 'success' && 'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/20',
        intent === 'warning' && 'bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-500/20',
        intent === 'danger' && 'bg-red-50 text-red-700 ring-red-600/10 dark:bg-red-500/10 dark:text-red-400 dark:ring-red-500/20',
        intent === 'neutral' && 'bg-slate-50 text-slate-600 ring-slate-500/10 dark:bg-slate-400/10 dark:text-slate-400 dark:ring-slate-400/20',
        intent === 'info' && 'bg-blue-50 text-blue-700 ring-blue-700/10 dark:bg-blue-500/10 dark:text-blue-400 dark:ring-blue-500/20',
        className
      )}
    >
      {children}
    </span>
  )
}
