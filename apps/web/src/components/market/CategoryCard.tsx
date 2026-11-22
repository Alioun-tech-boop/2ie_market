import { ArrowUpRight } from 'lucide-react'
import { cn } from '../../lib/cn'
import type { Category } from '../../lib/types'

const toneStyles = {
  blue: 'bg-brand-50 text-brand-600 group-hover:bg-brand-100',
  mint: 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100',
  amber: 'bg-amber-50 text-amber-600 group-hover:bg-amber-100',
  violet: 'bg-violet-50 text-violet-600 group-hover:bg-violet-100',
  rose: 'bg-rose-50 text-rose-600 group-hover:bg-rose-100',
  slate: 'bg-slate-100 text-slate-600 group-hover:bg-slate-200',
} as const

export function CategoryCard({
  category,
  onClick,
  className,
}: {
  category: Category
  onClick?: () => void
  className?: string
}) {
  const Icon = category.icon

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group flex items-center gap-3 rounded-2xl border border-line bg-white p-4 text-left shadow-soft transition-all duration-300 ease-premium hover:-translate-y-1 hover:border-brand-200 hover:shadow-card',
        className,
      )}
    >
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors ${toneStyles[category.tone]}`}>
        <Icon className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-bold text-ink transition-colors group-hover:text-brand-700">
          {category.label}
        </span>
        <span className="mt-0.5 block text-[11px] text-ink-soft">{category.count} annonces</span>
      </span>
      <ArrowUpRight className="h-4 w-4 shrink-0 text-ink-soft opacity-0 transition-all duration-200 group-hover:translate-x-0.5 group-hover:opacity-100" aria-hidden="true" />
    </button>
  )
}
