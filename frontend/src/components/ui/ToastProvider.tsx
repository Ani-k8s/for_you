import React, { createContext, useContext, useMemo, useRef, useState } from 'react'
import { AlertCircle, CheckCircle, Info, AlertTriangle, X } from 'lucide-react'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export type ToastIntent = 'success' | 'error' | 'info' | 'warning'

export type ToastInput = {
  title: string
  description?: string
  intent?: ToastIntent
}

type Toast = ToastInput & { id: string }

type ToastContextValue = {
  toast: (t: ToastInput) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

function makeId() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const timeoutsRef = useRef<Record<string, number>>({})

  function removeToast(id: string) {
    setToasts((prev) => prev.filter((t) => t.id !== id))
    const timeoutId = timeoutsRef.current[id]
    if (timeoutId) window.clearTimeout(timeoutId)
    delete timeoutsRef.current[id]
  }

  function toast({ title, description, intent = 'info' }: ToastInput) {
    const id = makeId()
    const next: Toast = { id, title, description, intent }
    setToasts((prev) => [next, ...prev].slice(0, 4))
    timeoutsRef.current[id] = window.setTimeout(() => removeToast(id), 5000)
  }

  const value = useMemo(() => ({ toast }), [])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-[380px] max-w-[calc(100vw-2rem)] flex-col gap-3">
        {toasts.map((t) => {
          let Icon = Info
          let iconColor = 'text-blue-500'
          
          if (t.intent === 'success') {
            Icon = CheckCircle
            iconColor = 'text-emerald-500'
          } else if (t.intent === 'error') {
            Icon = AlertCircle
            iconColor = 'text-red-500'
          } else if (t.intent === 'warning') {
            Icon = AlertTriangle
            iconColor = 'text-amber-500'
          }

          return (
            <div
              key={t.id}
              className={twMerge(
                clsx(
                  'pointer-events-auto flex w-full items-start gap-3 rounded-xl border bg-white p-4 shadow-xl transition-all dark:bg-slate-900',
                  t.intent === 'success' ? 'border-emerald-200 dark:border-emerald-900/50' : '',
                  t.intent === 'error' ? 'border-red-200 dark:border-red-900/50' : '',
                  t.intent === 'warning' ? 'border-amber-200 dark:border-amber-900/50' : '',
                  (!t.intent || t.intent === 'info') ? 'border-slate-200 dark:border-slate-800' : ''
                )
              )}
              role="status"
              aria-live="polite"
            >
              <Icon className={twMerge(clsx("h-5 w-5 shrink-0 mt-0.5", iconColor))} />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{t.title}</div>
                {t.description && <div className="mt-1 flex text-sm text-slate-500 dark:text-slate-400">{t.description}</div>}
              </div>
              <button
                className="shrink-0 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300 transition-colors"
                onClick={() => removeToast(t.id)}
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
