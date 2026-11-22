import type { HTMLAttributes } from 'react'
import { cn } from '../../lib/cn'

type Tone = 'brand' | 'accent' | 'neutral' | 'success' | 'muted'

const tones: Record<Tone, string> = {
  brand: 'bg-brand-50 text-brand-800 ring-brand-100',
  accent: 'bg-accent-50 text-accent-700 ring-accent-100',
  neutral: 'bg-white text-ink-muted ring-line',
  success: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  muted: 'bg-slate-100 text-slate-600 ring-slate-200',
}

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone
  dot?: boolean
}

export function Badge({ tone = 'brand', dot = false, className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ring-1 ring-inset',
        tones[tone],
        className,
      )}
      {...props}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />}
      {children}
    </span>
  )
}
