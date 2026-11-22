import { AlertTriangle, CheckCircle2, Flag, Package, ShieldCheck, ShoppingBag, Store, Users } from 'lucide-react'
import { BarChart } from '../dashboard/BarChart'
import { StatCard } from '../dashboard/StatCard'
import { Badge } from '../ui/Badge'
import { Card } from '../ui/Card'
import { Skeleton } from '../ui/Skeleton'
import type { AdminOverview } from '../../lib/admin'
import { formatPrice, siteLabel } from '../../lib/format'
import { orderStatusLabels } from '../../lib/orderLabels'

const STATUS_BAR: Record<string, string> = {
  PENDING: 'bg-accent-500',
  CONFIRMED: 'bg-brand-600',
  REJECTED: 'bg-slate-400',
  PREPARING: 'bg-violet-500',
  READY: 'bg-brand-500',
  COMPLETED: 'bg-emerald-500',
  CANCELLED: 'bg-slate-300',
}

function AuditList({ overview }: { overview: AdminOverview }) {
  return (
    <Card className="p-5">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 text-brand-600" />
        <h2 className="text-sm font-bold text-ink">Dernières opérations sensibles</h2>
      </div>
      <p className="mt-1 text-xs text-ink-muted">Journal d’audit des actions administratives.</p>
      {overview.recentAudit.length === 0 ? (
        <p className="mt-5 rounded-xl bg-canvas px-4 py-6 text-center text-xs text-ink-muted">
          Aucune opération enregistrée pour le moment.
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-line">
          {overview.recentAudit.map((entry) => (
            <li key={entry.id} className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
              <div className="min-w-0">
                <p className="truncate text-xs font-bold text-ink">{entry.action.replaceAll('_', ' ')}</p>
                <p className="mt-0.5 truncate text-[11px] text-ink-muted">
                  {entry.actor ? `${entry.actor.firstName} ${entry.actor.lastName}` : 'Système'} · {entry.targetType}
                </p>
              </div>
              <span className="shrink-0 text-[10px] text-ink-soft">
                {new Date(entry.createdAt).toLocaleDateString('fr-FR')}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

export function AdminOverviewPanel({ overview, loading }: { overview: AdminOverview | null; loading: boolean }) {
  if (loading || !overview) {
    return (
      <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }, (_, index) => (
            <Skeleton key={index} className="h-28 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-72 rounded-2xl" />
      </div>
    )
  }

  const { stats } = overview

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Utilisateurs"
          value={stats.users}
          icon={Users}
          tone="bg-brand-50 text-brand-700"
          hint={`${stats.activeUsers} actifs · ${stats.suspendedUsers} suspendus`}
        />
        <StatCard
          label="Annonces"
          value={stats.listings}
          icon={Package}
          tone="bg-violet-50 text-violet-700"
          hint={`${stats.publishedListings} publiées · ${stats.featuredListings} à la une`}
        />
        <StatCard
          label="Commandes"
          value={stats.orders}
          icon={ShoppingBag}
          tone="bg-accent-50 text-accent-700"
          hint={`${stats.pendingOrders} en attente · ${stats.completedOrders} terminées`}
        />
        <StatCard
          label="Signalements ouverts"
          value={stats.openReports}
          icon={Flag}
          tone="bg-rose-50 text-rose-600"
          hint={`${stats.reports} signalement(s) au total`}
        />
        <StatCard
          label="Boutiques"
          value={stats.stores}
          icon={Store}
          tone="bg-emerald-50 text-emerald-700"
          hint={`${stats.categories} catégories`}
        />
        <StatCard
          label="Volume confirmé"
          value={formatPrice(stats.gmvCents)}
          icon={CheckCircle2}
          tone="bg-emerald-50 text-emerald-700"
          hint="Commandes confirmées, en préparation, prêtes ou terminées"
        />
        <StatCard
          label="Comptes suspendus"
          value={stats.suspendedUsers}
          icon={AlertTriangle}
          tone="bg-amber-50 text-amber-700"
          hint="Sessions révoquées à la suspension"
        />
        <StatCard
          label="Annonces masquées"
          value={stats.pausedListings}
          icon={Flag}
          tone="bg-slate-100 text-slate-700"
          hint={`${stats.archivedListings} archivées`}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <BarChart
          title="Commandes par statut"
          description="Répartition réelle de toutes les sous-commandes."
          rows={overview.byStatus.map((row) => ({
            label: orderStatusLabels[row.status],
            value: row.count,
            barClass: STATUS_BAR[row.status],
          }))}
          emptyLabel="Aucune commande enregistrée."
        />
        <BarChart
          title="Activité par site"
          description="Commandes enregistrées sur chaque site."
          rows={overview.bySite.map((row) => ({ label: siteLabel(row.site), value: row.orders }))}
          emptyLabel="Aucune commande enregistrée."
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className="overflow-hidden">
          <div className="border-b border-line px-5 py-4">
            <h2 className="text-sm font-bold text-ink">Synthèse par site</h2>
            <p className="mt-1 text-xs text-ink-muted">Utilisateurs, annonces et volume confirmé.</p>
          </div>
          <div className="divide-y divide-line">
            {overview.bySite.map((row) => (
              <div key={row.site} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                <div>
                  <p className="text-sm font-bold text-ink">{siteLabel(row.site)}</p>
                  <p className="mt-0.5 text-[11px] text-ink-muted">
                    {row.users} utilisateur(s) · {row.listings} annonce(s)
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-extrabold text-brand-800">{row.orders} commande(s)</p>
                  <p className="text-[11px] text-ink-muted">{formatPrice(row.gmvCents)} confirmés</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <AuditList overview={overview} />
      </div>

      <Card className="flex flex-wrap items-center gap-3 border-brand-100 bg-brand-50/60 p-4">
        <Badge tone="success" dot>Contrôle serveur</Badge>
        <p className="text-xs leading-relaxed text-brand-900">
          Toutes les actions de cette console sont vérifiées côté API avec le rôle administrateur relu en base,
          validées par Zod et journalisées dans <span className="font-mono">audit_logs</span>.
        </p>
      </Card>
    </div>
  )
}
