import { BarChart3 } from 'lucide-react'
import { cn } from '../../lib/cn'

export interface BarRow {
  label: string
  value: number
  barClass?: string
}

export function BarChart({
  title,
  description,
  rows,
  emptyLabel = 'Aucune donnée disponible.',
}: {
  title: string
  description?: string
  rows: BarRow[]
  emptyLabel?: string
}) {
  const max = Math.max(1, ...rows.map((row) => row.value))

  return (
    <section className="rounded-2xl border border-line bg-white p-5 shadow-card">
      <div className="flex items-center gap-2">
        <BarChart3 className="h-4 w-4 text-brand-600" aria-hidden="true" />
        <h2 className="text-sm font-bold text-ink">{title}</h2>
      </div>
      {description && <p className="mt-1 text-xs text-ink-muted">{description}</p>}

      {rows.length === 0 || rows.every((row) => row.value === 0) ? (
        <p className="mt-5 rounded-xl bg-canvas px-4 py-6 text-center text-xs text-ink-muted">{emptyLabel}</p>
      ) : (
        <div className="mt-5 space-y-3" role="img" aria-label={`${title} : ${rows.map((row) => `${row.label} ${row.value}`).join(', ')}`}>
          {rows.map((row) => (
            <div key={row.label}>
              <div className="mb-1.5 flex items-center justify-between gap-3 text-[11px] font-semibold text-ink-muted">
                <span className="truncate">{row.label}</span>
                <span className="text-ink">{row.value}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-brand-50">
                <div
                  className={cn('h-full rounded-full transition-all duration-500 ease-premium', row.barClass ?? 'bg-brand-600')}
                  style={{ width: `${Math.max(row.value > 0 ? 4 : 0, (row.value / max) * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
