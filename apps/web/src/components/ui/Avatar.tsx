import { useState } from 'react'
import { cn } from '../../lib/cn'
import type { Tone } from '../../lib/types'

const tones: Record<Tone, string> = {
  blue: 'from-brand-500 to-brand-800',
  mint: 'from-emerald-400 to-teal-700',
  amber: 'from-amber-400 to-orange-600',
  violet: 'from-violet-400 to-indigo-700',
  rose: 'from-rose-400 to-pink-700',
  slate: 'from-slate-400 to-slate-700',
}

const sizes = {
  sm: 'h-9 w-9 text-xs',
  md: 'h-11 w-11 text-sm',
  lg: 'h-14 w-14 text-base',
}

export function Avatar({
  name,
  src,
  tone = 'blue',
  size = 'md',
  className,
}: {
  name: string
  src?: string | null
  tone?: Tone
  size?: keyof typeof sizes
  className?: string
}) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')

  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br font-bold text-white ring-2 ring-white',
        tones[tone],
        sizes[size],
        className,
      )}
      aria-label={name}
    >
      {src && failedSrc !== src ? (
        <img src={src} alt={name} loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={() => setFailedSrc(src)} className="h-full w-full rounded-full object-cover" />
      ) : initials}
    </span>
  )
}
