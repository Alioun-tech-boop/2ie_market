import type { LucideIcon } from 'lucide-react'
import { cn } from '../../lib/cn'

export function StatCard({
  label,
  value,
  icon: Icon,
  tone,
  hint,
}: {
  label: string
  value: number | string
  icon: LucideIcon
  tone: string
  hint?: string
}) {
  return (
    <div className="rounded-2xl border border-line bg-white p-5 shadow-soft transition-all duration-300 ease-premium hover:-translate-y-0.5 hover:shadow-card">
      <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl', tone)}>
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>
      <p className="mt-4 text-2xl font-extrabold tracking-tight text-ink">{value}</p>
      <p className="mt-1 text-xs font-medium text-ink-muted">{label}</p>
      {hint && <p className="mt-1 text-[10px] text-ink-soft">{hint}</p>}
    </div>
  )
}
