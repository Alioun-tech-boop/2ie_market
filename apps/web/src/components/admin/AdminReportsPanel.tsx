import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link } from '@tanstack/react-router'
import { CheckCircle2, Flag, Search, XCircle } from 'lucide-react'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { Skeleton } from '../ui/Skeleton'
import { useToast } from '../ui/Toast'
import { ApiError } from '../../lib/auth'
import { adminApi, type AdminPagination, type AdminReport, type ReportReason, type ReportStatus } from '../../lib/admin'

const fieldClasses =
  'h-10 w-full rounded-xl border border-line bg-white px-3 text-sm font-medium text-ink outline-none focus:border-brand-300'

const REASON_LABELS: Record<ReportReason, string> = {
  INAPPROPRIATE: 'Contenu inapproprié',
  FRAUD: 'Fraude ou arnaque',
  PROHIBITED: 'Produit interdit',
  MISLEADING: 'Annonce trompeuse',
  OTHER: 'Autre',
}

const STATUS_LABELS: Record<ReportStatus, string> = {
  OPEN: 'Ouvert',
  RESOLVED: 'Résolu',
  DISMISSED: 'Rejeté',
}

const STATUS_TONES: Record<ReportStatus, 'accent' | 'success' | 'muted'> = {
  OPEN: 'accent',
  RESOLVED: 'success',
  DISMISSED: 'muted',
}

function errorMessage(cause: unknown) {
  return cause instanceof ApiError ? cause.message : 'Une erreur est survenue.'
}

export function AdminReportsPanel() {
  const { showToast } = useToast()
  const [reports, setReports] = useState<AdminReport[]>([])
  const [pagination, setPagination] = useState<AdminPagination>({ page: 1, limit: 20, total: 0, pages: 1 })
  const [searchInput, setSearchInput] = useState('')
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<'' | ReportStatus>('OPEN')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await adminApi.reports({
        q: query || undefined,
        status: status || undefined,
        page,
        limit: 20,
      })
      setReports(result.reports)
      setPagination(result.pagination)
    } catch (cause) {
      setError(errorMessage(cause))
    } finally {
      setLoading(false)
    }
  }, [page, query, status])

  useEffect(() => {
    void load()
  }, [load])

  function applySearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPage(1)
    setQuery(searchInput.trim())
  }

  async function resolve(report: AdminReport, next: 'RESOLVED' | 'DISMISSED') {
    const note = window.prompt(
      next === 'RESOLVED' ? 'Note de résolution (facultatif)' : 'Motif du rejet (facultatif)',
    )
    if (note === null) return
    setBusy(report.id)
    try {
      const result = await adminApi.updateReport(report.id, next, note.trim() || undefined)
      setReports((current) => current.map((item) => (item.id === report.id ? result.report : item)))
      void load()
      showToast({
        tone: 'success',
        title: next === 'RESOLVED' ? 'Signalement résolu' : 'Signalement rejeté',
        description: report.listing.title,
      })
    } catch (cause) {
      showToast({ tone: 'accent', title: 'Traitement impossible', description: errorMessage(cause) })
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="space-y-5">
      <Card className="p-4">
        <form onSubmit={applySearch} className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px_auto]">
          <label className="relative block">
            <span className="sr-only">Rechercher un signalement</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
            <input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Annonce, détail ou signaleur"
              maxLength={100}
              className={`${fieldClasses} pl-9`}
            />
          </label>
          <select value={status} onChange={(event) => { setStatus(event.target.value as '' | ReportStatus); setPage(1) }} className={fieldClasses} aria-label="Filtrer par statut">
            <option value="">Tous les statuts</option>
            <option value="OPEN">Ouverts</option>
            <option value="RESOLVED">Résolus</option>
            <option value="DISMISSED">Rejetés</option>
          </select>
          <Button type="submit" size="md" iconLeft={<Search className="h-4 w-4" />}>Rechercher</Button>
        </form>
      </Card>

      {error && <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}

      <Card className="divide-y divide-line overflow-hidden">
        {loading ? (
          <div className="space-y-3 p-5">
            {Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-28 rounded-xl" />)}
          </div>
        ) : reports.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <Flag className="mx-auto h-8 w-8 text-brand-300" />
            <p className="mt-3 text-sm text-ink-muted">Aucun signalement ne correspond à ces critères.</p>
          </div>
        ) : (
          reports.map((report) => (
            <div key={report.id} className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={STATUS_TONES[report.status]} dot>{STATUS_LABELS[report.status]}</Badge>
                    <Badge tone="neutral">{REASON_LABELS[report.reason]}</Badge>
                  </div>
                  {report.listing.status === 'PUBLISHED' ? (
                    <Link
                      to="/annonce/$id"
                      params={{ id: report.listing.id }}
                      className="mt-2 block truncate text-sm font-bold text-brand-800 hover:underline"
                    >
                      {report.listing.title}
                    </Link>
                  ) : (
                    <p className="mt-2 truncate text-sm font-bold text-ink">{report.listing.title}</p>
                  )}
                  <p className="mt-1 text-[11px] text-ink-muted">
                    Boutique {report.listing.store.name} · signalé par {report.reporter.firstName} {report.reporter.lastName} le{' '}
                    {new Date(report.createdAt).toLocaleDateString('fr-FR')}
                  </p>
                </div>
                {report.status === 'OPEN' && (
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      loading={busy === report.id}
                      onClick={() => void resolve(report, 'RESOLVED')}
                      iconLeft={<CheckCircle2 className="h-4 w-4" />}
                    >
                      Résoudre
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      loading={busy === report.id}
                      onClick={() => void resolve(report, 'DISMISSED')}
                      iconLeft={<XCircle className="h-4 w-4" />}
                    >
                      Rejeter
                    </Button>
                  </div>
                )}
              </div>

              {report.details && (
                <p className="mt-3 rounded-xl bg-canvas px-3 py-2.5 text-xs leading-relaxed text-ink-muted">
                  {report.details}
                </p>
              )}
              {report.resolutionNote && (
                <p className="mt-2 text-[11px] text-ink-soft">
                  Décision : {report.resolutionNote}
                  {report.resolvedBy ? ` — ${report.resolvedBy.firstName} ${report.resolvedBy.lastName}` : ''}
                </p>
              )}
            </div>
          ))
        )}
      </Card>

      <div className="flex items-center justify-between gap-3 text-xs text-ink-muted">
        <span>{pagination.total} signalement(s) · page {pagination.page} / {Math.max(1, pagination.pages)}</span>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" disabled={page <= 1 || loading} onClick={() => setPage((value) => Math.max(1, value - 1))}>Précédent</Button>
          <Button size="sm" variant="outline" disabled={page >= pagination.pages || loading} onClick={() => setPage((value) => value + 1)}>Suivant</Button>
        </div>
      </div>
    </div>
  )
}
