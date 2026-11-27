import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from '@tanstack/react-router'
import { ArrowLeft, CalendarDays, MapPin, Search, Star, Store as StoreIcon } from 'lucide-react'
import { ListingCard } from '../components/market/ListingCard'
import { Badge } from '../components/ui/Badge'
import { EmptyState } from '../components/ui/EmptyState'
import { Skeleton } from '../components/ui/Skeleton'
import { useToast } from '../components/ui/Toast'
import { useAuth } from '../context/AuthContext'
import { ApiError, assetUrl } from '../lib/auth'
import { siteLabel } from '../lib/format'
import { marketApi, type Listing, type PublicStore, type StoreReview } from '../lib/market'

type Tab = 'all' | 'products' | 'services' | 'reviews'

export default function StorePage() {
  const { slug } = useParams({ from: '/boutique/$slug' })
  const { user } = useAuth()
  const { showToast } = useToast()
  const [store, setStore] = useState<PublicStore | null>(null)
  const [allListings, setAllListings] = useState<Listing[]>([])
  const [reviews, setReviews] = useState<StoreReview[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [tab, setTab] = useState<Tab>('all')
  const [query, setQuery] = useState('')
  const [reviewRating, setReviewRating] = useState(5)
  const [reviewComment, setReviewComment] = useState('')
  const [reviewSubmitting, setReviewSubmitting] = useState(false)

  useEffect(() => {
    let active = true
    setLoading(true)
    setNotFound(false)
    Promise.all([marketApi.store(slug), marketApi.storeListings(slug), marketApi.reviews(slug)])
      .then(([s, l, r]) => {
        if (!active) return
        setStore(s.store)
        setAllListings(l.listings)
        setReviews(r.reviews)
      })
      .catch((error: unknown) => {
        if (!active) return
        if (error instanceof ApiError && error.status === 404) setNotFound(true)
        else showToast({ tone: 'info', title: 'Chargement impossible', description: 'Réessayez dans un instant.' })
      })
      .finally(() => active && setLoading(false))
    return () => { active = false }
  }, [slug, showToast])

  const visibleListings = useMemo(() => {
    let list = allListings
    if (tab === 'products') list = list.filter((item) => item.type !== 'SERVICE')
    if (tab === 'services') list = list.filter((item) => item.type === 'SERVICE')
    const needle = query.trim().toLowerCase()
    if (needle) list = list.filter((item) => `${item.title} ${item.description} ${item.category?.name ?? ''}`.toLowerCase().includes(needle))
    return list
  }, [allListings, tab, query])

  if (loading) {
    return (
      <main className="container-premium py-10">
        <Skeleton className="h-52 w-full rounded-3xl" />
        <Skeleton className="mt-8 h-12 w-full max-w-lg" />
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-72 rounded-2xl" />)}
        </div>
      </main>
    )
  }

  if (notFound || !store) {
    return (
      <main className="container-premium py-16">
        <EmptyState
          icon={StoreIcon}
          title="Boutique introuvable"
          description="Cette boutique n'existe plus ou n'est pas disponible pour le moment."
          action={<Link to="/" className="inline-flex items-center gap-2 text-sm font-semibold text-brand-700 hover:underline"><ArrowLeft className="h-4 w-4" /> Retour à l'accueil</Link>}
        />
      </main>
    )
  }

  const logo = assetUrl(store.logoUrl)
  const isOwner = user?.store?.id === store.id
  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: 'all', label: 'Tout voir', count: allListings.length },
    { key: 'products', label: 'Produits', count: store.counts.products },
    { key: 'services', label: 'Services', count: store.counts.services },
    ...(store.reviews.enabled ? [{ key: 'reviews' as const, label: 'Avis', count: store.reviews.count }] : []),
  ]

  return (
    <main className="pb-16">
      <section className="relative overflow-hidden border-b border-line bg-gradient-to-br from-brand-50 via-white to-white">
        <div className="container-premium py-10 lg:py-14">
          <Link to="/" className="inline-flex items-center gap-2 text-xs font-semibold text-ink-muted hover:text-brand-700">
            <ArrowLeft className="h-3.5 w-3.5" /> Marketplace
          </Link>
          <div className="mt-6 flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 flex-col gap-5 sm:flex-row sm:items-center">
              <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-3xl border-4 border-white bg-brand-800 text-2xl font-extrabold text-white shadow-card">
                {logo ? <img src={logo} alt={`Logo de ${store.name}`} className="h-full w-full object-cover" /> : store.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-extrabold tracking-tight text-ink lg:text-3xl">{store.name}</h1>
                  {!store.isActive && <Badge tone="muted">En pause</Badge>}
                  {isOwner && <Badge tone="accent">Votre boutique</Badge>}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs font-medium text-ink-muted">
                  <span className="inline-flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-brand-500" /> {siteLabel(store.site)}</span>
                  <span className="inline-flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5 text-brand-500" /> Depuis {new Date(store.createdAt).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}</span>
                  {store.reviews.average && <span className="inline-flex items-center gap-1.5 text-accent-700"><Star className="h-3.5 w-3.5 fill-current" /> {store.reviews.average}/5</span>}
                </div>
                <p className="mt-3 max-w-2xl whitespace-pre-line text-sm leading-relaxed text-ink-muted">{store.description}</p>
                <p className="mt-2 text-[11px] text-ink-soft">Localisation précise communiquée lors de la commande. Aucun paiement en ligne.</p>
              </div>
            </div>
            <div className="flex shrink-0 flex-col gap-2 sm:w-56">
              {isOwner && <Link to="/tableau-de-bord" className="inline-flex h-10 items-center justify-center rounded-xl border border-line bg-white px-4 text-xs font-semibold text-ink hover:border-brand-300 hover:text-brand-800">Gérer ma boutique</Link>}
            </div>
          </div>
        </div>
      </section>

      <section className="container-premium py-8 lg:py-10">
        <div className="flex flex-col gap-4 border-b border-line lg:flex-row lg:items-center lg:justify-between">
          <div className="flex gap-1 overflow-x-auto">
            {tabs.map((item) => (
              <button key={item.key} type="button" onClick={() => setTab(item.key)} className={`whitespace-nowrap rounded-t-xl px-4 py-3 text-sm font-semibold transition-colors ${tab === item.key ? 'border-b-2 border-brand-700 text-brand-800' : 'text-ink-muted hover:text-brand-700'}`}>
                {item.label}{item.count !== undefined && <span className="ml-1.5 text-xs text-ink-soft">{item.count}</span>}
              </button>
            ))}
          </div>
          {tab !== 'reviews' && (
            <div className="relative mb-3 lg:w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" aria-hidden="true" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher dans cette boutique" className="h-10 w-full rounded-xl border border-line bg-white pl-9 pr-3 text-sm outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-500/10" />
            </div>
          )}
        </div>

        {tab === 'reviews' ? (
          <div className="mt-8">
            {user && !isOwner && store.reviews.enabled && (
              <form
                className="mb-6 rounded-2xl border border-line bg-white p-5"
                onSubmit={async (event) => {
                  event.preventDefault()
                  if (reviewSubmitting) return
                  setReviewSubmitting(true)
                  try {
                    await marketApi.submitReview(slug, { rating: reviewRating, comment: reviewComment.trim() })
                    const refreshed = await marketApi.reviews(slug)
                    setReviews(refreshed.reviews)
                    setReviewComment('')
                    showToast({ tone: 'success', title: 'Avis enregistré', description: 'Merci pour votre retour.' })
                  } catch (error) {
                    showToast({ tone: 'info', title: 'Avis non envoyé', description: error instanceof ApiError ? error.message : 'Une commande terminée est nécessaire pour publier un avis.' })
                  } finally {
                    setReviewSubmitting(false)
                  }
                }}
              >
                <h2 className="text-sm font-bold text-ink">Votre avis sur cette boutique</h2>
                <p className="mt-1 text-xs text-ink-muted">Disponible après une commande terminée.</p>
                <div className="mt-3 flex items-center gap-1" role="radiogroup" aria-label="Note sur cinq étoiles">
                  {Array.from({ length: 5 }, (_, index) => {
                    const value = index + 1
                    return (
                      <button key={value} type="button" onClick={() => setReviewRating(value)} aria-label={`${value} étoile(s)`} aria-pressed={reviewRating === value} className="rounded p-1 text-amber-500">
                        <Star className={`h-6 w-6 ${value <= reviewRating ? 'fill-current' : ''}`} />
                      </button>
                    )
                  })}
                </div>
                <textarea value={reviewComment} onChange={(event) => setReviewComment(event.target.value)} maxLength={1000} rows={3} placeholder="Partagez votre expérience (facultatif)" className="mt-3 w-full rounded-xl border border-line p-3 text-sm outline-none focus:border-brand-400" />
                <button type="submit" disabled={reviewSubmitting} className="mt-3 inline-flex h-10 items-center rounded-xl bg-brand-800 px-4 text-xs font-bold text-white disabled:opacity-50">
                  {reviewSubmitting ? 'Publication…' : 'Publier mon avis'}
                </button>
              </form>
            )}
            {reviews.length === 0 ? (
              <EmptyState icon={Star} title="Les avis arrivent bientôt" description="Les avis seront publiés après les premières commandes finalisées." />
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {reviews.map((review) => (
                  <article key={review.id} className="rounded-2xl border border-line bg-white p-5">
                    <div className="flex items-center gap-1 text-accent-600">
                      {Array.from({ length: review.rating }, (_, i) => <Star key={i} className="h-3.5 w-3.5 fill-current" aria-hidden="true" />)}
                    </div>
                    <p className="mt-3 text-sm leading-relaxed text-ink">{review.comment ?? 'Avis publié.'}</p>
                    <p className="mt-4 text-xs font-semibold text-ink-muted">{review.author.firstName} {review.author.lastName[0]}.</p>
                  </article>
                ))}
              </div>
            )}
          </div>
        ) : visibleListings.length === 0 ? (
          <div className="mt-8">
            <EmptyState title="Aucune annonce pour le moment" description={query ? 'Aucun résultat pour cette recherche dans cette boutique.' : 'Le commerçant n’a pas encore publié d’annonce dans cette catégorie.'} />
          </div>
        ) : (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {visibleListings.map((listing) => <ListingCard key={listing.id} listing={listing} />)}
          </div>
        )}
      </section>
    </main>
  )
}
