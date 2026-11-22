import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link } from '@tanstack/react-router'
import { Eye, Flag, ImageOff, Search, Star, Trash2, Undo2 } from 'lucide-react'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { Skeleton } from '../ui/Skeleton'
import { useToast } from '../ui/Toast'
import { ApiError, assetUrl } from '../../lib/auth'
import { adminApi, type AdminListing, type AdminPagination, type ModerationAction } from '../../lib/admin'
import { formatPrice, siteLabel } from '../../lib/format'
import { typeLabels } from '../../lib/listingLabels'
import type { ListingStatus, ListingType } from '../../lib/market'
import type { Site } from '@2ie/shared'

const fieldClasses =
  'h-10 w-full rounded-xl border border-line bg-white px-3 text-sm font-medium text-ink outline-none focus:border-brand-300'

const STATUS_LABELS: Record<ListingStatus, string> = {
  DRAFT: 'Brouillon',
  PUBLISHED: 'Publiée',
  PAUSED: 'Masquée',
  ARCHIVED: 'Archivée',
}

const STATUS_TONES: Record<ListingStatus, 'success' | 'accent' | 'muted' | 'neutral'> = {
  DRAFT: 'neutral',
  PUBLISHED: 'success',
  PAUSED: 'accent',
  ARCHIVED: 'muted',
}

function errorMessage(cause: unknown) {
  return cause instanceof ApiError ? cause.message : 'Une erreur est survenue.'
}

export function AdminListingsPanel() {
  const { showToast } = useToast()
  const [listings, setListings] = useState<AdminListing[]>([])
  const [pagination, setPagination] = useState<AdminPagination>({ page: 1, limit: 20, total: 0, pages: 1 })
  const [searchInput, setSearchInput] = useState('')
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<'' | ListingStatus>('')
  const [type, setType] = useState<'' | ListingType>('')
  const [site, setSite] = useState<'' | Site>('')
  const [featured, setFeatured] = useState<'' | 'true' | 'false'>('')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await adminApi.listings({
        q: query || undefined,
        status: status || undefined,
        type: type || undefined,
        site: site || undefined,
        featured: featured || undefined,
        page,
        limit: 20,
      })
      setListings(result.listings)
      setPagination(result.pagination)
    } catch (cause) {
      setError(errorMessage(cause))
    } finally {
      setLoading(false)
    }
  }, [featured, page, query, site, status, type])

  useEffect(() => {
    void load()
  }, [load])

  function applySearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPage(1)
    setQuery(searchInput.trim())
  }

  async function moderate(listing: AdminListing, action: ModerationAction) {
    const labels: Record<ModerationAction, string> = {
      HIDE: `Masquer « ${listing.title} » du site public ?`,
      RESTORE: `Republier « ${listing.title} » ?`,
      DELETE: `Supprimer « ${listing.title} » ? Elle sera archivée et retirée du site public.`,
    }
    if (!window.confirm(labels[action])) return
    setBusy(listing.id)
    try {
      const result = await adminApi.moderateListing(listing.id, action)
      setListings((current) =>
        current.map((item) =>
          item.id === listing.id
            ? { ...item, status: result.status, isFeatured: action === 'RESTORE' ? item.isFeatured : false }
            : item,
        ),
      )
      void load()
      showToast({
        tone: 'success',
        title: action === 'HIDE' ? 'Annonce masquée' : action === 'RESTORE' ? 'Annonce republiée' : 'Annonce archivée',
        description: listing.title,
      })
    } catch (cause) {
      showToast({ tone: 'accent', title: 'Modération impossible', description: errorMessage(cause) })
    } finally {
      setBusy(null)
    }
  }

  async function toggleFeatured(listing: AdminListing) {
    setBusy(listing.id)
    try {
      const result = await adminApi.setListingFeatured(listing.id, !listing.isFeatured)
      setListings((current) =>
        current.map((item) => (item.id === listing.id ? { ...item, isFeatured: result.listing.isFeatured } : item)),
      )
      showToast({
        tone: 'success',
        title: result.listing.isFeatured ? 'Annonce mise à la une' : 'Annonce retirée de la une',
        description: listing.title,
      })
    } catch (cause) {
      showToast({ tone: 'accent', title: 'Action impossible', description: errorMessage(cause) })
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="space-y-5">
      <Card className="p-4">
        <form onSubmit={applySearch} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
            <label className="relative block">
              <span className="sr-only">Rechercher une annonce</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
              <input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Titre de l’annonce ou boutique"
                maxLength={100}
                className={`${fieldClasses} pl-9`}
              />
            </label>
            <Button type="submit" size="md" iconLeft={<Search className="h-4 w-4" />}>Rechercher</Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-4">
            <select value={status} onChange={(event) => { setStatus(event.target.value as '' | ListingStatus); setPage(1) }} className={fieldClasses} aria-label="Filtrer par statut">
              <option value="">Tous les statuts</option>
              {Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <select value={type} onChange={(event) => { setType(event.target.value as '' | ListingType); setPage(1) }} className={fieldClasses} aria-label="Filtrer par type">
              <option value="">Tous les types</option>
              <option value="PHYSICAL">Produits neufs</option>
              <option value="SECOND_HAND">Occasion</option>
              <option value="SERVICE">Services</option>
            </select>
            <select value={site} onChange={(event) => { setSite(event.target.value as '' | Site); setPage(1) }} className={fieldClasses} aria-label="Filtrer par site">
              <option value="">Tous les sites</option>
              <option value="KAMBOINSIN">Kamboinsin</option>
              <option value="OUAGA">Ouaga</option>
            </select>
            <select value={featured} onChange={(event) => { setFeatured(event.target.value as '' | 'true' | 'false'); setPage(1) }} className={fieldClasses} aria-label="Filtrer par mise en avant">
              <option value="">Toutes</option>
              <option value="true">À la une</option>
              <option value="false">Non mises en avant</option>
            </select>
          </div>
        </form>
      </Card>

      {error && <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}

      <Card className="divide-y divide-line overflow-hidden">
        {loading ? (
          <div className="space-y-3 p-5">
            {Array.from({ length: 5 }, (_, index) => <Skeleton key={index} className="h-20 rounded-xl" />)}
          </div>
        ) : listings.length === 0 ? (
          <p className="px-5 py-12 text-center text-sm text-ink-muted">Aucune annonce ne correspond à ces critères.</p>
        ) : (
          listings.map((listing) => {
            const photo = assetUrl(listing.photo?.thumbUrl ?? listing.photo?.url)
            return (
              <div key={listing.id} className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center">
                <div className="h-20 w-24 shrink-0 overflow-hidden rounded-xl bg-brand-50">
                  {photo ? (
                    <img src={photo} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-brand-300"><ImageOff className="h-5 w-5" /></span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-bold text-ink">{listing.title}</p>
                    {listing.isFeatured && <Badge tone="accent" dot>À la une</Badge>}
                    <Badge tone={STATUS_TONES[listing.status]}>{STATUS_LABELS[listing.status]}</Badge>
                    {listing.reports > 0 && <Badge tone="muted"><Flag className="h-3 w-3" /> {listing.reports}</Badge>}
                  </div>
                  <p className="mt-1 truncate text-xs text-ink-muted">
                    {listing.store.name} · {siteLabel(listing.store.site)} · {typeLabels[listing.type]} · {listing.reference}
                  </p>
                  <p className="mt-1 text-[11px] text-ink-soft">
                    {formatPrice(listing.priceCents)} · {listing.viewsCount} vue(s) · {listing.category?.name ?? 'sans catégorie'}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  {listing.status === 'PUBLISHED' ? (
                    <Link
                      to="/annonce/$id"
                      params={{ id: listing.id }}
                      className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-line bg-white px-3 text-xs font-semibold text-ink hover:bg-brand-50"
                    >
                      <Eye className="h-4 w-4" /> Voir
                    </Link>
                  ) : (
                    <span className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-canvas px-3 text-xs font-semibold text-ink-soft">
                      <Eye className="h-4 w-4" /> Hors ligne
                    </span>
                  )}
                  <Button
                    size="sm"
                    variant={listing.isFeatured ? 'secondary' : 'outline'}
                    disabled={listing.status !== 'PUBLISHED'}
                    loading={busy === listing.id}
                    onClick={() => void toggleFeatured(listing)}
                    iconLeft={<Star className="h-4 w-4" />}
                  >
                    {listing.isFeatured ? 'Retirer la une' : 'Mettre à la une'}
                  </Button>
                  {listing.status !== 'PUBLISHED' ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      loading={busy === listing.id}
                      onClick={() => void moderate(listing, 'RESTORE')}
                      iconLeft={<Undo2 className="h-4 w-4" />}
                    >
                      Restaurer
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      loading={busy === listing.id}
                      onClick={() => void moderate(listing, 'HIDE')}
                      iconLeft={<Flag className="h-4 w-4" />}
                    >
                      Masquer
                    </Button>
                  )}
                  {listing.status !== 'ARCHIVED' && (
                    <Button
                      size="sm"
                      variant="ghost"
                      loading={busy === listing.id}
                      onClick={() => void moderate(listing, 'DELETE')}
                      iconLeft={<Trash2 className="h-4 w-4" />}
                    >
                      Supprimer
                    </Button>
                  )}
                </div>
              </div>
            )
          })
        )}
      </Card>

      <div className="flex items-center justify-between gap-3 text-xs text-ink-muted">
        <span>{pagination.total} annonce(s) · page {pagination.page} / {Math.max(1, pagination.pages)}</span>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" disabled={page <= 1 || loading} onClick={() => setPage((value) => Math.max(1, value - 1))}>Précédent</Button>
          <Button size="sm" variant="outline" disabled={page >= pagination.pages || loading} onClick={() => setPage((value) => value + 1)}>Suivant</Button>
        </div>
      </div>
    </div>
  )
}
