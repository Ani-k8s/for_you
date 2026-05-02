import { useMemo } from 'react'
import { useGymBranding } from '../../branding/GymBrandingContext'

type Point = { x: string; y: number }

export default function LineChart({
  points,
  height = 180,
  className,
  showArea = true,
}: {
  points: Point[]
  height?: number
  className?: string
  showArea?: boolean
}) {
  const { data } = useGymBranding()
  const brand = data.primary_color || '#22c55e'

  const normalized = useMemo(() => {
    const clean = points.filter((p) => Number.isFinite(p.y))
    if (!clean.length) return null

    const ys = clean.map((p) => p.y)
    const minY = Math.min(...ys)
    const maxY = Math.max(...ys)
    const pad = maxY === minY ? 1 : (maxY - minY) * 0.15
    const lo = minY - pad
    const hi = maxY + pad

    return { clean, lo, hi }
  }, [points])

  if (!normalized) {
    return (
      <div className={className}>
        <div className="flex h-[180px] items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-sm text-white/60">
          No chart data
        </div>
      </div>
    )
  }

  const w = 520
  const h = height
  const padX = 28
  const padY = 18
  const innerW = w - padX * 2
  const innerH = h - padY * 2

  const { clean, lo, hi } = normalized

  const getX = (i: number) => padX + (clean.length === 1 ? innerW / 2 : (innerW * i) / (clean.length - 1))
  const getY = (y: number) => padY + innerH - ((y - lo) / (hi - lo)) * innerH

  const linePath = clean
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${getX(i).toFixed(2)} ${getY(p.y).toFixed(2)}`)
    .join(' ')

  const areaPath = showArea
    ? `${linePath} L ${getX(clean.length - 1).toFixed(2)} ${(padY + innerH).toFixed(2)} L ${getX(0).toFixed(
        2,
      )} ${(padY + innerH).toFixed(2)} Z`
    : ''

  return (
    <div className={className}>
      <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
        <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={height} role="img" aria-label="Line chart">
          {/* grid */}
          {[0, 1, 2, 3].map((i) => {
            const y = padY + (innerH * i) / 3
            return <line key={i} x1={padX} x2={w - padX} y1={y} y2={y} stroke="rgba(255,255,255,0.08)" />
          })}

          {showArea && (
            <path
              d={areaPath}
              fill={brand}
              opacity={0.12}
              stroke="none"
            />
          )}

          <path d={linePath} fill="none" stroke={brand} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />

          {clean.map((p, i) => (
            <g key={p.x}>
              <circle cx={getX(i)} cy={getY(p.y)} r={5} fill={brand} opacity={0.18} />
              <circle cx={getX(i)} cy={getY(p.y)} r={2.8} fill={brand} />
            </g>
          ))}
        </svg>
      </div>
    </div>
  )
}

