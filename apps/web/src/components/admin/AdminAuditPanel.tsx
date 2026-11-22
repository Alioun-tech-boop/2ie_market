import { useCallback, useEffect, useState } from 'react'
import { ScrollText } from 'lucide-react'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { Skeleton } from '../ui/Skeleton'
import { ApiError } from '../../lib/auth'
import { adminApi, type AdminAuditEntry, type AdminPagination } from '../../lib/admin'

const ACTION_LABELS: Record<string, string> = {
  USER_SUSPENDED: 'Compte suspendu',
  USER_ACTIVATED: 'Compte réactivé',
  USER_ROLE_CHANGED: 'Rôle modifié',
  LISTING_HIDDEN: 'Annonce masquée',
  LISTING_RESTORED: 'Annonce restaurée',
  LISTING_ARCHIVED: 'Annonce archivée',
  LISTING_FEATURED: 'Annonce mise à la une',
  LISTING_UNFEATURED: 'Annonce retirée de la une',
  REPORT_RESOLVED: 'Signalement résolu',
  REPORT_DISMISSED: 'Signalement rejeté',
  PLATFORM_SETTINGS_UPDATED: 'Paramètres modifiés',
  PLATFORM_LOGO_UPDATED: 'Logo modifié',
  PLATFORM_LOGO_REMOVED: 'Logo retiré',
  CATEGORY_CREATED: 'Catégorie créée',
  CATEGORY_UPDATED: 'Catégorie modifiée',
  CATEGORY_ARCHIVED: 'Catégorie archivée',
}

function errorMessage(cause: unknown) {
  return cause instanceof ApiError ? cause.message : 'Une erreur est survenue.'
}

export function AdminAuditPanel() {
  const [entries, setEntries] = useState<AdminAuditEntry[]>([])
  const [pagination, setPagination] = useState<AdminPagination>({ page: 1, limit: 30, total: 0, pages: 1 })
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await adminApi.audit({ page, limit: 30 })
      setEntries(result.entries)
      setPagination(result.pagination)
    } catch (cause) {
      setError(errorMessage(cause))
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <div className="space-y-5">
      <Card className="flex items-start gap-3 border-brand-100 bg-brand-50/60 p-4">
        <ScrollText className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" />
        <p className="text-xs leading-relaxed text-brand-900">
          Journal immuable des opérations sensibles : suspension, rôles, modération, signalements, paramètres et catégories.
          Chaque entrée contient l’acteur, la cible, l’action et les métadonnées utiles.
        </p>
      </Card>

      {error && <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}

      <Card className="divide-y divide-line overflow-hidden">
        {loading ? (
          <div className="space-y-3 p-5">
            {Array.from({ length: 8 }, (_, index) => <Skeleton key={index} className="h-14 rounded-xl" />)}
          </div>
        ) : entries.length === 0 ? (
          <p className="px-5 py-12 text-center text-sm text-ink-muted">Aucune opération enregistrée.</p>
        ) : (
          entries.map((entry) => (
            <div key={entry.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="neutral">{ACTION_LABELS[entry.action] ?? entry.action.replaceAll('_', ' ')}</Badge>
                  <span className="text-[11px] text-ink-soft">{entry.targetType}{entry.targetId ? ` · ${entry.targetId.slice(0, 8)}…` : ''}</span>
                </div>
                <p className="mt-1 text-xs text-ink-muted">
                  {entry.actor ? `${entry.actor.firstName} ${entry.actor.lastName} (${entry.actor.email})` : 'Système'}
                </p>
              </div>
              <span className="shrink-0 text-[11px] text-ink-soft">
                {new Date(entry.createdAt).toLocaleString('fr-FR')}
              </span>
            </div>
          ))
        )}
      </Card>

      <div className="flex items-center justify-between gap-3 text-xs text-ink-muted">
        <span>{pagination.total} entrée(s) · page {pagination.page} / {Math.max(1, pagination.pages)}</span>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" disabled={page <= 1 || loading} onClick={() => setPage((value) => Math.max(1, value - 1))}>Précédent</Button>
          <Button size="sm" variant="outline" disabled={page >= pagination.pages || loading} onClick={() => setPage((value) => value + 1)}>Suivant</Button>
        </div>
      </div>
    </div>
  )
}
