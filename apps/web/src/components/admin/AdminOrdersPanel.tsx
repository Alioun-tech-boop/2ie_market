import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { CheckCircle2, Clock3, Search, ShoppingBag, Store as StoreIcon, Wallet } from 'lucide-react'
import { StatCard } from '../dashboard/StatCard'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { Skeleton } from '../ui/Skeleton'
import { ApiError } from '../../lib/auth'
import { adminApi, type AdminOrderGroup, type AdminPagination } from '../../lib/admin'
import { formatPrice, siteLabel } from '../../lib/format'
import { ORDER_STATUSES, orderStatusLabels, orderStatusTones, type OrderStatus } from '../../lib/orderLabels'
import type { Site } from '@2ie/shared'

const fieldClasses =
  'h-10 w-full rounded-xl border border-line bg-white px-3 text-sm font-medium text-ink outline-none focus:border-brand-300'

function errorMessage(cause: unknown) {
  return cause instanceof ApiError ? cause.message : 'Une erreur est survenue.'
}

function OrderGroupCard({ group }: { group: AdminOrderGroup }) {
  return (
    <div className="p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-sm font-extrabold text-brand-900">{group.reference}</p>
          <p className="mt-0.5 text-[11px] text-ink-muted">
            {group.client.firstName} {group.client.lastName} · {siteLabel(group.site)} ·{' '}
            {new Date(group.createdAt).toLocaleDateString('fr-FR')}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={orderStatusTones[group.status]} dot>{orderStatusLabels[group.status]}</Badge>
          <span className="text-sm font-extrabold text-ink">{formatPrice(group.totalCents)}</span>
        </div>
      </div>

      <div className="mt-3 space-y-2">
        {group.orders.map((order) => (
          <div key={order.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-canvas px-3 py-2.5">
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 truncate text-xs font-bold text-ink">
                <StoreIcon className="h-3.5 w-3.5 text-brand-600" /> {order.store.name}
              </p>
              <p className="mt-0.5 text-[10px] text-ink-muted">
                {order.orderNumber} · {order.itemCount} article(s) · {siteLabel(order.store.site)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge tone={orderStatusTones[order.status]}>{orderStatusLabels[order.status]}</Badge>
              <span className="text-xs font-bold text-ink">{formatPrice(order.totalCents)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function AdminOrdersPanel() {
  const [groups, setGroups] = useState<AdminOrderGroup[]>([])
  const [pagination, setPagination] = useState<AdminPagination>({ page: 1, limit: 20, total: 0, pages: 1 })
  const [stats, setStats] = useState({ pending: 0, completed: 0, gmvCents: 0 })
  const [searchInput, setSearchInput] = useState('')
  const [query, setQuery] = useState('')
  const [site, setSite] = useState<'' | Site>('')
  const [status, setStatus] = useState<'' | OrderStatus>('')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await adminApi.orders({
        q: query || undefined,
        site: site || undefined,
        status: status || undefined,
        page,
        limit: 20,
      })
      setGroups(result.groups)
      setPagination(result.pagination)
      setStats(result.stats)
    } catch (cause) {
      setError(errorMessage(cause))
    } finally {
      setLoading(false)
    }
  }, [page, query, site, status])

  useEffect(() => {
    void load()
  }, [load])

  function applySearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPage(1)
    setQuery(searchInput.trim())
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Commandes en attente" value={stats.pending} icon={Clock3} tone="bg-accent-50 text-accent-700" hint="Toutes boutiques confondues" />
        <StatCard label="Commandes terminées" value={stats.completed} icon={CheckCircle2} tone="bg-emerald-50 text-emerald-700" hint="Sous-commandes terminées" />
        <StatCard label="Volume confirmé" value={formatPrice(stats.gmvCents)} icon={Wallet} tone="bg-brand-50 text-brand-700" hint="Hors commandes annulées ou refusées" />
      </div>

      <Card className="p-4">
        <form onSubmit={applySearch} className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_160px_180px_auto]">
          <label className="relative block">
            <span className="sr-only">Rechercher une commande</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
            <input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Référence CMD-…"
              maxLength={64}
              className={`${fieldClasses} pl-9`}
            />
          </label>
          <select value={site} onChange={(event) => { setSite(event.target.value as '' | Site); setPage(1) }} className={fieldClasses} aria-label="Filtrer par site">
            <option value="">Tous les sites</option>
            <option value="KAMBOINSIN">Kamboinsin</option>
            <option value="OUAGA">Ouaga</option>
          </select>
          <select value={status} onChange={(event) => { setStatus(event.target.value as '' | OrderStatus); setPage(1) }} className={fieldClasses} aria-label="Filtrer par statut">
            <option value="">Tous les statuts</option>
            {ORDER_STATUSES.map((value) => <option key={value} value={value}>{orderStatusLabels[value]}</option>)}
          </select>
          <Button type="submit" size="md" iconLeft={<Search className="h-4 w-4" />}>Rechercher</Button>
        </form>
      </Card>

      {error && <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}

      <Card className="divide-y divide-line overflow-hidden">
        {loading ? (
          <div className="space-y-3 p-5">
            {Array.from({ length: 5 }, (_, index) => <Skeleton key={index} className="h-24 rounded-xl" />)}
          </div>
        ) : groups.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <ShoppingBag className="mx-auto h-8 w-8 text-brand-300" />
            <p className="mt-3 text-sm text-ink-muted">Aucune commande ne correspond à ces critères.</p>
          </div>
        ) : (
          groups.map((group) => <OrderGroupCard key={group.id} group={group} />)
        )}
      </Card>

      <div className="flex items-center justify-between gap-3 text-xs text-ink-muted">
        <span>{pagination.total} groupe(s) · page {pagination.page} / {Math.max(1, pagination.pages)}</span>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" disabled={page <= 1 || loading} onClick={() => setPage((value) => Math.max(1, value - 1))}>Précédent</Button>
          <Button size="sm" variant="outline" disabled={page >= pagination.pages || loading} onClick={() => setPage((value) => value + 1)}>Suivant</Button>
        </div>
      </div>
    </div>
  )
}
