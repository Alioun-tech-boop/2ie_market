import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearch } from '@tanstack/react-router'
import {
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  Filter,
  MapPin,
  Search,
  SlidersHorizontal,
  Sparkles,
  X,
} from 'lucide-react'
import { ListingCard } from '../components/market/ListingCard'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { Skeleton } from '../components/ui/Skeleton'
import { useToast } from '../components/ui/Toast'
import { ApiError } from '../lib/auth'
import { siteLabel } from '../lib/format'
import { availabilityLabels, shortTypeLabels } from '../lib/listingLabels'
import {
  AVAILABILITY_FILTERS,
  SITE_FILTERS,
  SEARCH_SORT_FILTERS,
  SEARCH_TYPE_FILTERS,
  defaultSearchState,
  marketApi,
  type AvailabilityFilter,
  type PublicCategory,
  type SearchResponse,
  type SearchSort,
  type SearchState,
  type SiteFilter,
  type SearchType,
} from '../lib/market'

const sortLabels: Record<SearchSort, string> = {
  popular: 'Popularité',
  recent: 'Plus récentes',
  'price-asc': 'Prix croissant',
  'price-desc': 'Prix décroissant',
}

const typeFilterLabels: Record<SearchType, string> = {
  ALL: 'Tout',
  PRODUCT: 'Produits',
  PHYSICAL: 'Neuf',
  SECOND_HAND: shortTypeLabels.SECOND_HAND,
  SERVICE: 'Services',
}

function optionClasses(active: boolean): string {
  return (
    'rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ' +
    (active
      ? 'border-brand-800 bg-brand-800 text-white'
      : 'border-line bg-white text-ink-muted hover:border-brand-300 hover:text-brand-800')
  )
}

export default function SearchPage() {
  const search = useSearch({ from: '/recherche' })
  const navigate = useNavigate()
  const { showToast } = useToast()

  const [categories, setCategories] = useState<PublicCategory[]>([])
  const [queryInput, setQueryInput] = useState(search.q)
  const [minPrice, setMinPrice] = useState(search.minPriceCents === undefined ? '' : String(search.minPriceCents / 100))
  const [maxPrice, setMaxPrice] = useState(search.maxPriceCents === undefined ? '' : String(search.maxPriceCents / 100))
  const [showFilters, setShowFilters] = useState(false)
  const [data, setData] = useState<SearchResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)

  const navigatedQuery = useRef(search.q)
  const requestId = useRef(0)

  const { q, category, type, site, availability, minPriceCents, maxPriceCents, sort, page } = search

  useEffect(() => {
    marketApi
      .categories()
      .then((result) => setCategories(result.categories))
      .catch(() => showToast({ tone: 'info', title: 'Catégories indisponibles', description: 'Les filtres restent utilisables.' }))
  }, [showToast])

  // Synchronise le champ avec l'URL lors d'un retour navigateur ou d'une navigation externe.
  useEffect(() => {
    if (search.q !== navigatedQuery.current) {
      navigatedQuery.current = search.q
      setQueryInput(search.q)
    }
  }, [search.q])

  // Recherche instantanée : on n'écrit dans l'URL qu'après 300 ms d'inactivité.
  useEffect(() => {
    if (queryInput === search.q) return
    const timer = window.setTimeout(() => {
      navigatedQuery.current = queryInput
      void navigate({
        to: '/recherche',
        search: { ...search, q: queryInput, page: 1 },
        replace: true,
      })
    }, 300)
    return () => window.clearTimeout(timer)
  }, [queryInput, search, navigate])

  useEffect(() => {
    setMinPrice(minPriceCents === undefined ? '' : String(minPriceCents / 100))
    setMaxPrice(maxPriceCents === undefined ? '' : String(maxPriceCents / 100))
  }, [minPriceCents, maxPriceCents])

  // Le garde-fou ignore les réponses périmées quand l'utilisateur change vite de filtre.
  useEffect(() => {
    const id = ++requestId.current
    setLoading(true)
    setError(null)
    marketApi
      .search({ q, category, type, site, availability, minPriceCents, maxPriceCents, sort, page, limit: defaultSearchState.limit })
      .then((result) => {
        if (id === requestId.current) setData(result)
      })
      .catch((cause) => {
        if (id !== requestId.current) return
        setError(cause instanceof ApiError ? cause.message : 'Impossible de charger les annonces.')
        showToast({ tone: 'info', title: 'Recherche impossible', description: 'Veuillez réessayer dans un instant.' })
      })
      .finally(() => {
        if (id === requestId.current) setLoading(false)
      })
  }, [q, category, type, site, availability, minPriceCents, maxPriceCents, sort, page, retryCount, showToast])

  function setFilter<K extends keyof SearchState>(key: K, value: SearchState[K]) {
    const next = { ...search, [key]: value, page: 1 } as SearchState
    void navigate({ to: '/recherche', search: next })
  }

  function clearFilter(key: keyof SearchState) {
    setFilter(key, defaultSearchState[key])
  }

  function goToPage(target: number) {
    void navigate({ to: '/recherche', search: { ...search, page: target } })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function applyPrice() {
    const next: SearchState = { ...search, page: 1 }
    const min = Number(minPrice)
    const max = Number(maxPrice)
    next.minPriceCents = minPrice.trim() === '' || Number.isNaN(min) ? undefined : Math.round(min * 100)
    next.maxPriceCents = maxPrice.trim() === '' || Number.isNaN(max) ? undefined : Math.round(max * 100)
    if (next.minPriceCents === search.minPriceCents && next.maxPriceCents === search.maxPriceCents) return
    void navigate({ to: '/recherche', search: next })
  }

  function resetAll() {
    void navigate({ to: '/recherche', search: defaultSearchState })
  }

  const categoryTotal = useMemo(() => categories.reduce((sum, item) => sum + item.count, 0), [categories])

  const activeFilters = useMemo(() => {
    const items: { key: keyof SearchState; label: string }[] = []
    if (q) items.push({ key: 'q', label: `« ${q} »` })
    if (category) {
      const selected = categories.find((item) => item.slug === category)
      items.push({ key: 'category', label: selected?.name ?? category })
    }
    if (type !== 'ALL') items.push({ key: 'type', label: typeFilterLabels[type] })
    if (site !== 'ALL') items.push({ key: 'site', label: siteLabel(site) })
    if (availability !== 'ALL') items.push({ key: 'availability', label: availabilityLabels[availability] })
    if (minPriceCents !== undefined) {
      items.push({ key: 'minPriceCents', label: `Min ${(minPriceCents / 100).toLocaleString('fr-FR')} F` })
    }
    if (maxPriceCents !== undefined) {
      items.push({ key: 'maxPriceCents', label: `Max ${(maxPriceCents / 100).toLocaleString('fr-FR')} F` })
    }
    return items
  }, [q, category, type, site, availability, minPriceCents, maxPriceCents, categories])

  const total = data?.pagination.total ?? 0
  const pages = data?.pagination.pages ?? 0

  return (
    <main className="bg-canvas pb-16">
      <div className="container-premium pt-3 lg:pt-5">
        <header className="max-w-3xl">
          <form
            role="search"
            className="mt-0 flex items-center gap-3 rounded-2xl border border-line bg-white px-4 shadow-card transition-shadow focus-within:border-brand-300 focus-within:shadow-lift"
            onSubmit={(event) => {
              event.preventDefault()
              navigatedQuery.current = queryInput
              void navigate({ to: '/recherche', search: { ...search, q: queryInput, page: 1 }, replace: true })
            }}
          >
            <Search className="h-5 w-5 shrink-0 text-brand-500" aria-hidden="true" />
            <input
              type="search"
              value={queryInput}
              onChange={(event) => setQueryInput(event.target.value)}
              placeholder="Un produit, un service, une boutique…"
              aria-label="Rechercher un produit ou un service"
              className="h-14 min-w-0 flex-1 bg-transparent text-sm font-medium text-ink outline-none placeholder:font-normal placeholder:text-ink-soft [&::-webkit-search-cancel-button]:hidden"
            />
            {queryInput && (
              <button
                type="button"
                onClick={() => setQueryInput('')}
                aria-label="Effacer la recherche"
                className="rounded-full p-1.5 text-ink-soft transition-colors hover:bg-brand-50 hover:text-brand-700"
              >
                <X className="h-4 w-4" />
              </button>
            )}
            <Button type="submit" size="sm" className="hidden sm:inline-flex">
              Rechercher
            </Button>
          </form>
        </header>

        <nav aria-label="Catégories" className="scrollbar-none -mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
          <button
            type="button"
            onClick={() => setFilter('category', '')}
            aria-pressed={category === ''}
            className={
              'flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-xs font-bold transition-colors ' +
              (category === ''
                ? 'border-brand-800 bg-brand-800 text-white shadow-soft'
                : 'border-line bg-white text-ink-muted hover:border-brand-300 hover:text-brand-800')
            }
          >
            Toutes
            <span className={category === '' ? 'rounded-full bg-white/20 px-1.5 py-0.5 text-[10px]' : 'rounded-full bg-brand-50 px-1.5 py-0.5 text-[10px]'}>
              {categoryTotal}
            </span>
          </button>
          {categories.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setFilter('category', item.slug)}
              aria-pressed={category === item.slug}
              className={
                'flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-xs font-bold transition-colors ' +
                (category === item.slug
                  ? 'border-brand-800 bg-brand-800 text-white shadow-soft'
                  : 'border-line bg-white text-ink-muted hover:border-brand-300 hover:text-brand-800')
              }
            >
              {item.name}
              <span className={category === item.slug ? 'rounded-full bg-white/20 px-1.5 py-0.5 text-[10px]' : 'rounded-full bg-brand-50 px-1.5 py-0.5 text-[10px]'}>
                {item.count}
              </span>
            </button>
          ))}
        </nav>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
          <p className="text-sm font-semibold text-ink" aria-live="polite">
            {total} annonce(s) trouvée(s)
          </p>
          <div className="flex items-center gap-3">
            <div className="relative">
              <select
                value={sort}
                onChange={(event) => setFilter('sort', event.target.value as SearchSort)}
                aria-label="Trier les annonces"
                className="appearance-none rounded-xl border border-line bg-white py-2 pl-3 pr-9 text-xs font-semibold text-ink outline-none"
              >
                {SEARCH_SORT_FILTERS.map((value) => (
                  <option key={value} value={value}>
                    {sortLabels[value]}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" aria-hidden="true" />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters((current) => !current)}
              aria-expanded={showFilters}
              iconLeft={<Filter className="h-4 w-4" />}
              className="lg:hidden"
            >
              Filtres
              {activeFilters.length > 0 && (
                <Badge tone="accent" className="ml-1">
                  {activeFilters.length}
                </Badge>
              )}
            </Button>
          </div>
        </div>

        {activeFilters.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {activeFilters.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => clearFilter(item.key)}
                aria-label={`Retirer le filtre ${item.label}`}
                className="inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 px-3 py-1.5 text-[11px] font-semibold text-brand-800 transition-colors hover:bg-brand-100"
              >
                {item.label}
                <X className="h-3 w-3" aria-hidden="true" />
              </button>
            ))}
          </div>
        )}

        <div className="mt-6 lg:grid lg:grid-cols-[260px_1fr] lg:gap-8">
          <aside className={showFilters ? 'block' : 'hidden lg:block'} aria-label="Filtres de recherche">
            <div className="space-y-5 rounded-2xl border border-line bg-white p-5 shadow-card lg:sticky lg:top-24">
              <div className="flex items-center gap-2 border-b border-line pb-4">
                <SlidersHorizontal className="h-4 w-4 text-brand-600" aria-hidden="true" />
                <h2 className="text-sm font-extrabold text-brand-900">Filtres</h2>
              </div>

              <fieldset>
                <legend className="mb-2.5 text-xs font-extrabold uppercase tracking-wider text-ink-muted">Type</legend>
                <div className="flex flex-wrap gap-2">
                  {SEARCH_TYPE_FILTERS.map((value) => (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={type === value}
                      onClick={() => setFilter('type', value)}
                      className={optionClasses(type === value)}
                    >
                      {typeFilterLabels[value]}
                    </button>
                  ))}
                </div>
              </fieldset>

              <fieldset>
                <legend className="mb-2.5 flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-ink-muted">
                  <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                  Site
                </legend>
                <div className="flex flex-wrap gap-2">
                  {SITE_FILTERS.map((value) => (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={site === value}
                      onClick={() => setFilter('site', value as SiteFilter)}
                      className={optionClasses(site === value)}
                    >
                      {value === 'ALL' ? 'Tous les sites' : siteLabel(value)}
                    </button>
                  ))}
                </div>
              </fieldset>

              <fieldset>
                <legend className="mb-2.5 text-xs font-extrabold uppercase tracking-wider text-ink-muted">Disponibilité</legend>
                <div className="flex flex-wrap gap-2">
                  {AVAILABILITY_FILTERS.map((value) => (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={availability === value}
                      onClick={() => setFilter('availability', value as AvailabilityFilter)}
                      className={optionClasses(availability === value)}
                    >
                      {value === 'ALL' ? 'Toutes' : availabilityLabels[value]}
                    </button>
                  ))}
                </div>
              </fieldset>

              <fieldset>
                <legend className="mb-2.5 text-xs font-extrabold uppercase tracking-wider text-ink-muted">Prix (F)</legend>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    value={minPrice}
                    onChange={(event) => setMinPrice(event.target.value)}
                    onBlur={applyPrice}
                    placeholder="Min"
                    aria-label="Prix minimum en francs"
                    className="h-10 w-full min-w-0 rounded-xl border border-line bg-white px-3 text-xs font-medium text-ink outline-none focus:border-brand-300"
                  />
                  <span className="text-xs text-ink-soft">—</span>
                  <input
                    type="number"
                    min="0"
                    value={maxPrice}
                    onChange={(event) => setMaxPrice(event.target.value)}
                    onBlur={applyPrice}
                    placeholder="Max"
                    aria-label="Prix maximum en francs"
                    className="h-10 w-full min-w-0 rounded-xl border border-line bg-white px-3 text-xs font-medium text-ink outline-none focus:border-brand-300"
                  />
                </div>
                <Button variant="secondary" size="sm" fullWidth className="mt-3" onClick={applyPrice}>
                  Appliquer
                </Button>
              </fieldset>

              <Button variant="ghost" size="sm" fullWidth onClick={resetAll}>
                Réinitialiser les filtres
              </Button>
            </div>
          </aside>

          <section aria-label="Annonces" className="mt-6 lg:mt-0">
            {loading ? (
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
                {Array.from({ length: 8 }, (_, index) => (
                  <Skeleton key={index} className="h-72 rounded-2xl" />
                ))}
              </div>
            ) : error ? (
              <EmptyState
                title="Impossible d'afficher les annonces"
                description={error}
                action={
                  <Button variant="outline" size="sm" onClick={() => setRetryCount((current) => current + 1)}>
                    Réessayer
                  </Button>
                }
              />
            ) : !data || data.listings.length === 0 ? (
              <EmptyState
                title="Aucune annonce trouvée"
                description="Essayez d'élargir votre recherche ou de retirer certains filtres pour voir plus d'annonces."
                action={
                  <Button variant="outline" size="sm" onClick={resetAll}>
                    Réinitialiser les filtres
                  </Button>
                }
              />
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
                  {data.listings.map((listing) => (
                    <ListingCard key={listing.id} listing={listing} />
                  ))}
                </div>
                {pages > 1 && (
                  <div className="mt-8 flex items-center justify-center gap-4">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => goToPage(page - 1)}
                      iconLeft={<ArrowLeft className="h-4 w-4" />}
                    >
                      Précédent
                    </Button>
                    <span className="text-xs font-semibold text-ink-muted">
                      Page {page} sur {pages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= pages}
                      onClick={() => goToPage(page + 1)}
                      iconRight={<ArrowRight className="h-4 w-4" />}
                    >
                      Suivant
                    </Button>
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      </div>
    </main>
  )
}
