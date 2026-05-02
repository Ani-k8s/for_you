import React, { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { cn } from './Button'

type ModalSize = 'sm' | 'md' | 'lg'

export interface ModalProps {
  open: boolean
  title?: string
  onClose: () => void
  children: React.ReactNode
  size?: ModalSize
  className?: string
}

export default function Modal({
  open,
  title,
  onClose,
  children,
  size = 'md',
  className,
}: ModalProps) {
  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)

    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = prevOverflow
    }
  }, [open, onClose])

  if (!open) return null

  const widthClass = size === 'sm' ? 'max-w-lg' : size === 'lg' ? 'max-w-4xl' : 'max-w-2xl'

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 overflow-y-auto">
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-md animate-fadeIn"
        aria-hidden="true"
        onClick={onClose}
      />
      <div
        className={cn(
          'relative w-full rounded-[2rem] sm:rounded-[3rem] border border-white/10 bg-[#050505] shadow-2xl animate-float-up flex flex-col my-auto max-h-[95vh]',
          widthClass,
          className
        )}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between gap-4 border-b border-white/5 p-6 sm:p-8 bg-white/[0.02] shrink-0">
          {title ? <h2 className="text-lg sm:text-xl font-black text-white uppercase italic tracking-tighter break-words line-clamp-2">{title}</h2> : <div />}
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/5 text-slate-500 hover:text-white transition-all active:scale-90 shrink-0"
          >
            <span className="sr-only">Close</span>
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-6 sm:p-8 overflow-y-auto custom-scrollbar flex-1">
          {children}
        </div>
      </div>
    </div>,
    document.body,
  )
}
