import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { ExternalLink, LogOut, ShieldCheck } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { usePlatform } from '../../context/PlatformContext'
import { cn } from '../../lib/cn'

export interface AdminNavItem {
  id: string
  label: string
  icon: LucideIcon
  badge?: number
}

export function AdminShell({
  title,
  description,
  items,
  active,
  onSelect,
  action,
  children,
}: {
  title: string
  description: string
  items: AdminNavItem[]
  active: string
  onSelect: (id: string) => void
  action?: ReactNode
  children: ReactNode
}) {
  const { user, logout } = useAuth()
  const { platform } = usePlatform()
  async function handleLogout() {
    await logout()
  }

  return (
    <div className="min-h-screen bg-slate-950 lg:grid lg:grid-cols-[264px_minmax(0,1fr)]">
      <aside className="border-b border-white/10 bg-slate-950 px-3 py-3 lg:sticky lg:top-0 lg:h-screen lg:border-b-0 lg:border-r lg:px-4 lg:py-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-white ring-1 ring-inset ring-white/15">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-extrabold tracking-tight text-white">Administration</p>
              <p className="truncate text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">{platform.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Link
              to="/"
              className="inline-flex h-9 items-center gap-1.5 rounded-xl px-2.5 text-[11px] font-semibold text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
            >
              <ExternalLink className="h-3.5 w-3.5" /> Site
            </Link>
            <button type="button" onClick={() => void handleLogout()} className="inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-rose-500/15 px-3 text-xs font-bold text-rose-200 transition-colors hover:bg-rose-500/25" aria-label="Se déconnecter"><LogOut className="h-4 w-4" /><span className="hidden sm:inline">Déconnexion</span></button>
          </div>
        </div>

        <nav aria-label="Sections d'administration" className="mt-4 grid grid-cols-2 gap-1 sm:grid-cols-4 lg:mt-7 lg:flex lg:flex-col">
          {items.map((item) => {
            const Icon = item.icon
            const selected = item.id === active
            return (
              <button key={item.id} type="button" onClick={() => onSelect(item.id)} aria-current={selected ? 'page' : undefined}
                className={cn(
                  'flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-xs font-semibold transition-colors',
                  selected ? 'bg-white text-slate-950 shadow-soft' : 'text-slate-300 hover:bg-white/10 hover:text-white',
                )}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="whitespace-nowrap">{item.label}</span>
                {typeof item.badge === 'number' && item.badge > 0 && (
                  <span
                    className={cn(
                      'ml-auto flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-bold',
                      selected ? 'bg-slate-950 text-white' : 'bg-accent-500 text-white',
                    )}
                  >
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </button>
            )
          })}
        </nav>

        <div className="mt-4 hidden rounded-2xl border border-white/10 bg-white/[0.04] p-3 lg:block">
          <p className="truncate text-xs font-bold text-white">
            {user ? `${user.firstName} ${user.lastName}` : 'Administrateur'}
          </p>
          <p className="mt-0.5 truncate text-[10px] text-slate-400">{user?.email ?? 'Session sécurisée'}</p>
          <button
            type="button"
            onClick={() => void handleLogout()}
            className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-white/10 px-2.5 py-2 text-[11px] font-semibold text-white transition-colors hover:bg-white/20"
          >
            <LogOut className="h-3.5 w-3.5" /> Se déconnecter
          </button>
        </div>
      </aside>

      <main className="min-w-0 bg-slate-50">
        <header className="border-b border-slate-200 bg-white px-4 py-5 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-brand-600">Console sécurisée</p>
              <h1 className="mt-1.5 text-2xl font-extrabold tracking-tight text-slate-950 lg:text-3xl">{title}</h1>
              <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-slate-500">{description}</p>
            </div>
            {action}
          </div>
        </header>

        <div className="space-y-6 p-4 sm:p-6 lg:p-8">{children}</div>
      </main>
    </div>
  )
}
