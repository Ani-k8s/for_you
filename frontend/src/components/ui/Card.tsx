import type { ReactNode } from 'react'
import { twMerge } from 'tailwind-merge'

interface CardProps {
  children: ReactNode
  className?: string
  onClick?: () => void
  isGlass?: boolean
  isShimmer?: boolean
}

export default function Card({ 
  children, 
  className, 
  onClick,
  isGlass = true,
  isShimmer = false
}: CardProps) {
  return (
    <div 
      onClick={onClick}
      className={twMerge(
        'rounded-[2.5rem] transition-all duration-700 relative group min-h-0 min-w-0', // Removed overflow-hidden
        isGlass && 'bg-white/[0.01] backdrop-blur-3xl border border-white/5',
        isShimmer && 'before:absolute before:inset-0 before:p-[1px] before:bg-gradient-to-tr before:from-white/5 before:via-white/10 before:to-white/5 before:rounded-[2.5rem] before:-z-10',
        onClick && 'cursor-pointer hover:bg-white/[0.03] hover:border-brand-red/30 hover:shadow-[0_20px_50px_rgba(0,0,0,0.5)] hover:-translate-y-1 active:scale-[0.98]',
        className
      )}
    >
      {/* Subtle Hover Glow */}
      {onClick && (
        <div className="absolute inset-0 bg-brand-red/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700 rounded-[2.5rem]" />
      )}
      
      <div className="relative z-10 w-full h-auto">
        {children}
      </div>
    </div>
  )
}
