import {
  Archive,
  Bell,
  CheckCheck,
  CheckCircle2,
  Clock3,
  ShoppingBag,
  type LucideIcon,
} from 'lucide-react'
import { useNotifications } from '../../context/NotificationsContext'
import type { NotificationDto, NotificationType } from '../../lib/notifications'
import { EmptyState } from '../ui/EmptyState'
import { Skeleton } from '../ui/Skeleton'

const dateFormatter = new Intl.DateTimeFormat('fr-FR', {
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
})

const icons: Record<NotificationType, LucideIcon> = {
  ORDER_PLACED: ShoppingBag,
  NEW_ORDER: Bell,
  ORDER_STATUS: CheckCircle2,
  LISTING_ARCHIVED: Archive,
}

function NotificationRow({ item }: { item: NotificationDto }) {
  const { markRead } = useNotifications()
  const Icon = icons[item.type]

  return (
    <a
      href={item.href}
      onClick={() => {
        if (!item.read) void markRead(item.id)
      }}
      className={`flex gap-3 rounded-xl border p-3 transition-colors ${
        item.read
          ? 'border-line bg-white hover:bg-brand-50/50'
          : 'border-brand-100 bg-brand-50/60 hover:bg-brand-50'
      }`}
    >
      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-brand-700 ring-1 ring-inset ring-brand-100">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-bold text-ink">{item.title}</span>
          {!item.read && <span className="h-2 w-2 rounded-full bg-accent-500" aria-label="Non lue" />}
        </span>
        <span className="mt-1 block text-xs leading-relaxed text-ink-muted">{item.message}</span>
        <span className="mt-2 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-ink-soft">
          <Clock3 className="h-3 w-3" aria-hidden="true" />
          {dateFormatter.format(new Date(item.createdAt))}
        </span>
      </span>
    </a>
  )
}

export function NotificationsPanel({ limit = 8 }: { limit?: number }) {
  const { notifications, unreadCount, loading, markAllRead } = useNotifications()
  const visible = notifications.slice(0, limit)

  return (
    <section className="rounded-2xl border border-line bg-white p-5 shadow-card">
      <header className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-ink">Notifications</h2>
          <p className="mt-1 text-xs text-ink-muted">
            {unreadCount > 0 ? `${unreadCount} non lue${unreadCount > 1 ? 's' : ''}` : 'Tout est à jour'}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={() => void markAllRead()}
            className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-50"
          >
            <CheckCheck className="h-4 w-4" aria-hidden="true" />
            Tout marquer
          </button>
        )}
      </header>

      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((key) => (
            <Skeleton key={key} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="Aucune notification"
          description="Les nouvelles commandes et les changements de statut apparaîtront ici."
        />
      ) : (
        <div className="space-y-2">
          {visible.map((item) => (
            <NotificationRow key={item.id} item={item} />
          ))}
        </div>
      )}
    </section>
  )
}
