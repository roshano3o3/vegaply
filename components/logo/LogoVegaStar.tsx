// 4-point compass star where the north point sits at y=1 (vs y=3 for the south),
// making the upward arm visibly longer — direction without being decorative.
'use client'
import { useId } from 'react'

interface Props {
  size?: number
  className?: string
}

export function LogoVegaStar({ size = 32, className }: Props) {
  const id = useId()
  const gId = `vs-g-${id}`

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Vegaply"
    >
      <defs>
        <linearGradient id={gId} x1="16" y1="1" x2="16" y2="29" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FBBF24" />
          <stop offset="100%" stopColor="#F59E0B" />
        </linearGradient>
      </defs>
      {/* North elongated (y=1), South at y=29, East/West symmetric at y=16 */}
      <path
        d="M 16 1 L 20 13 L 29 16 L 20 19 L 16 29 L 12 19 L 3 16 L 12 13 Z"
        fill={`url(#${gId})`}
      />
    </svg>
  )
}
