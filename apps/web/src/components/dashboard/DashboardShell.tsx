import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '../../lib/cn'

export interface DashboardNavItem {
  id: string
  label: string
  icon: LucideIcon
  badge?: number
}

export function DashboardShell({
  eyebrow,
  title,
  description,
  items,
  active,
  onSelect,
  action,
  children,
}: {
  eyebrow: string
  title: string
  description: string
  items: DashboardNavItem[]
  active: string
  onSelect: (id: string) => void
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <main className="min-h-[calc(100vh-4rem)] min-w-0 overflow-x-clip bg-canvas pb-20">
      <div className="container-premium min-w-0 pt-5 sm:pt-8 lg:pt-12">
        <header className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-end sm:justify-between sm:gap-5">
          <div className="min-w-0">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-brand-600">{eyebrow}</p>
            <h1 className="mt-2 break-words text-2xl font-extrabold tracking-tight text-ink lg:text-3xl">{title}</h1>
            <p className="mt-2 max-w-2xl break-words text-sm leading-relaxed text-ink-muted">{description}</p>
          </div>
          {action && <div className="w-full min-w-0 sm:w-auto sm:shrink-0">{action}</div>}
        </header>

        <div className="mt-5 grid min-w-0 gap-4 sm:mt-8 sm:gap-6 lg:grid-cols-[232px_minmax(0,1fr)]">
          <aside className="min-w-0 lg:sticky lg:top-24 lg:self-start">
            <nav
              aria-label="Sections du tableau de bord"
              className="flex max-w-full gap-1 overflow-x-auto overscroll-x-contain rounded-2xl border border-line bg-white p-2 shadow-soft lg:flex-col lg:overflow-visible"
            >
              {items.map((item) => {
                const Icon = item.icon
                const selected = item.id === active
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onSelect(item.id)}
                    aria-current={selected ? 'page' : undefined}
                    className={cn(
                      'flex shrink-0 items-center gap-2 rounded-xl px-3 py-2.5 text-left text-xs font-semibold transition-all duration-200 ease-premium sm:gap-2.5',
                      selected
                        ? 'bg-brand-800 text-white shadow-soft'
                        : 'text-ink-muted hover:bg-brand-50 hover:text-brand-800',
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span className="whitespace-nowrap">{item.label}</span>
                    {typeof item.badge === 'number' && item.badge > 0 && (
                      <span
                        className={cn(
                          'ml-auto flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-bold',
                          selected ? 'bg-white/20 text-white' : 'bg-accent-50 text-accent-700',
                        )}
                      >
                        {item.badge > 99 ? '99+' : item.badge}
                      </span>
                    )}
                  </button>
                )
              })}
            </nav>
          </aside>

          <div className="min-w-0 space-y-5 sm:space-y-6">{children}</div>
        </div>
      </div>
    </main>
  )
}
