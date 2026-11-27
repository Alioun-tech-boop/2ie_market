import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from '@tanstack/react-router'
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  ImageOff,
  MapPin,
  Minus,
  Package,
  Plus,
  ShoppingCart,
  Store as StoreIcon,
} from 'lucide-react'
import { FavoriteButton } from '../components/market/FavoriteButton'
import { ReportListingButton } from '../components/market/ReportListingButton'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { Price } from '../components/ui/Price'
import { Skeleton } from '../components/ui/Skeleton'
import { useToast } from '../components/ui/Toast'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import { ApiError, assetUrl } from '../lib/auth'
import { formatPrice, siteLabel } from '../lib/format'
import { availabilityLabels, conditionLabels, durationLabel, typeLabels } from '../lib/listingLabels'
import { marketApi, type Listing } from '../lib/market'

export default function ListingPage() {
  const { id } = useParams({ from: '/annonce/$id' })
  const { status } = useAuth()
  const { addItem } = useCart()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const [listing, setListing] = useState<Listing | null>(null)
  const [activePhoto, setActivePhoto] = useState(0)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [quantity, setQuantity] = useState(1)
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    setQuantity(1)
  }, [id])

  useEffect(() => {
    let active = true
    setLoading(true)
    setNotFound(false)

    ;(async () => {
      try {
        const result = await marketApi.listing(id)
        if (!active) return
        setListing(result.listing)
        setActivePhoto(0)
      } catch (error: unknown) {
        if (!active) return
        if (error instanceof ApiError && error.status === 404) setNotFound(true)
        else showToast({ tone: 'info', title: 'Chargement impossible', description: 'Réessayez dans un instant.' })
      } finally {
        if (active) setLoading(false)
      }
    })()

    return () => {
      active = false
    }
  }, [id, showToast])

  if (loading) {
    return (
      <main className="container-premium py-10">
        <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
          <Skeleton className="aspect-[4/3] rounded-3xl" />
          <div className="space-y-4">
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-5 w-1/3" />
            <Skeleton className="h-32 w-full rounded-2xl" />
          </div>
        </div>
      </main>
    )
  }

  if (notFound || !listing) {
    return (
      <main className="container-premium py-16">
        <EmptyState
          icon={StoreIcon}
          title="Annonce introuvable"
          description="Cette annonce n'est plus disponible ou a été retirée par le vendeur."
          action={
            <Link to="/" className="inline-flex items-center gap-2 text-sm font-semibold text-brand-700 hover:underline">
              <ArrowLeft className="h-4 w-4" /> Explorer la marketplace
            </Link>
          }
        />
      </main>
    )
  }

  const photos = listing.photos.map((photo) => assetUrl(photo.thumbUrl ?? photo.url)).filter(Boolean) as string[]
  const mainPhoto = photos[activePhoto] ?? null
  const available = listing.availability === 'AVAILABLE'
  const maxQuantity = Math.max(1, Math.min(99, listing.quantity ?? 99))

  async function handleAdd() {
    if (status !== 'authenticated') {
      void navigate({ to: '/connexion' })
      return
    }
    if (!available || adding) return
    setAdding(true)
    try {
      await addItem(listing!.id, Math.min(quantity, maxQuantity))
      showToast({
        tone: 'success',
        title: 'Ajouté au panier',
        description: `« ${listing!.title} » · quantité ${Math.min(quantity, maxQuantity)}`,
      })
    } catch {
      // Le contexte du panier affiche déjà la notification d'erreur.
    } finally {
      setAdding(false)
    }
  }

  return (
    <main className="container-premium py-8 lg:py-12">
      <Link
        to="/boutique/$slug"
        params={{ slug: listing.store.slug }}
        className="inline-flex items-center gap-2 text-xs font-semibold text-ink-muted hover:text-brand-700"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Voir la boutique {listing.store.name}
      </Link>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:gap-12">
        <section aria-label="Photos de l'annonce">
          <div className="overflow-hidden rounded-3xl border border-line bg-brand-50">
            {mainPhoto ? (
              <img src={mainPhoto} alt={listing.title} className="aspect-[4/3] w-full object-cover" />
            ) : (
              <div className="flex aspect-[4/3] items-center justify-center text-brand-300">
                <ImageOff className="h-12 w-12" aria-hidden="true" />
              </div>
            )}
          </div>
          {photos.length > 1 && (
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {photos.map((photo, index) => (
                <button
                  key={photo}
                  type="button"
                  onClick={() => setActivePhoto(index)}
                  aria-label={`Afficher la photo ${index + 1}`}
                  className={`h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 transition-all ${
                    activePhoto === index ? 'border-brand-700' : 'border-transparent opacity-70 hover:opacity-100'
                  }`}
                >
                  <img src={photo} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </section>

        <section>
          <div className="flex flex-wrap items-center gap-2">
            {listing.isFeatured && <Badge tone="accent" dot>À la une</Badge>}
            <Badge tone="brand">{typeLabels[listing.type]}</Badge>
            {listing.category && <Badge tone="neutral">{listing.category.name}</Badge>}
            <Badge tone={available ? 'success' : 'muted'} dot={available}>
              {availabilityLabels[listing.availability]}
            </Badge>
          </div>

          <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-ink lg:text-3xl">{listing.title}</h1>
          <div className="mt-4">
            <Price cents={listing.priceCents} size="lg" />
            <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-ink-soft">Réf. {listing.reference}</p>
          </div>

          <div className="mt-6 rounded-2xl border border-line bg-white p-5">
            <h2 className="text-sm font-bold text-ink">Description</h2>
            <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-ink-muted">{listing.description}</p>
          </div>

          <dl className="mt-4 grid grid-cols-2 gap-3">
            {listing.condition && (
              <div className="rounded-2xl bg-brand-50 p-4">
                <dt className="flex items-center gap-1.5 text-[11px] font-semibold text-brand-700">
                  <Package className="h-3.5 w-3.5" /> État
                </dt>
                <dd className="mt-1 text-sm font-bold text-ink">{conditionLabels[listing.condition]}</dd>
              </div>
            )}
            {listing.quantity !== null && (
              <div className="rounded-2xl bg-brand-50 p-4">
                <dt className="flex items-center gap-1.5 text-[11px] font-semibold text-brand-700">
                  <Package className="h-3.5 w-3.5" /> Stock
                </dt>
                <dd className="mt-1 text-sm font-bold text-ink">{listing.quantity} unité(s)</dd>
              </div>
            )}
            {listing.durationMinutes && (
              <div className="rounded-2xl bg-brand-50 p-4">
                <dt className="flex items-center gap-1.5 text-[11px] font-semibold text-brand-700">
                  <Clock3 className="h-3.5 w-3.5" /> Durée
                </dt>
                <dd className="mt-1 text-sm font-bold text-ink">{durationLabel(listing.durationMinutes)}</dd>
              </div>
            )}
          </dl>

          {listing.requirements && (
            <div className="mt-4 rounded-2xl border border-line bg-white p-5">
              <h2 className="text-sm font-bold text-ink">Conditions de réalisation</h2>
              <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-ink-muted">{listing.requirements}</p>
            </div>
          )}

          {listing.options.length > 0 && (
            <div className="mt-4 rounded-2xl border border-line bg-white p-5">
              <h2 className="text-sm font-bold text-ink">Options</h2>
              <ul className="mt-3 space-y-2">
                {listing.options.map((option) => (
                  <li key={option.name} className="flex items-center justify-between gap-3 text-sm">
                    <span className="inline-flex items-center gap-2 text-ink-muted">
                      <CheckCircle2 className="h-3.5 w-3.5 text-brand-500" aria-hidden="true" />
                      {option.name}
                    </span>
                    <span className="font-semibold text-brand-800">+ {formatPrice(option.priceCents)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-5 rounded-2xl border border-brand-100 bg-brand-50 p-5">
            <h2 className="text-sm font-bold text-ink">Coordonnées du commerçant</h2>
            <div className="mt-3 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl bg-brand-800 text-sm font-bold text-white">
                {listing.store.logoUrl ? (
                  <img src={assetUrl(listing.store.logoUrl) ?? ''} alt="" className="h-full w-full object-cover" />
                ) : (
                  listing.store.name.slice(0, 2).toUpperCase()
                )}
              </div>
              <div className="min-w-0">
                <Link
                  to="/boutique/$slug"
                  params={{ slug: listing.store.slug }}
                  className="truncate text-sm font-bold text-ink hover:text-brand-700"
                >
                  {listing.store.name}
                </Link>
                <p className="flex items-center gap-1 text-xs text-ink-muted">
                  <MapPin className="h-3 w-3" /> {siteLabel(listing.store.site)}
                </p>
              </div>
            </div>
            <p className="mt-3 text-[11px] leading-relaxed text-ink-muted">
              La localisation précise est communiquée lors de la commande.
            </p>
            {available && (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-white px-4 py-3">
                <span className="text-xs font-semibold text-ink">Quantité</span>
                <div className="inline-flex items-center rounded-xl border border-line bg-white">
                  <button
                    type="button"
                    aria-label="Diminuer la quantité"
                    disabled={quantity <= 1 || adding}
                    onClick={() => setQuantity((current) => Math.max(1, current - 1))}
                    className="flex h-9 w-9 items-center justify-center rounded-xl text-ink-muted transition-colors hover:bg-brand-50 hover:text-brand-800 disabled:opacity-40"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="w-9 text-center text-sm font-bold text-ink">{quantity}</span>
                  <button
                    type="button"
                    aria-label="Augmenter la quantité"
                    disabled={quantity >= maxQuantity || adding}
                    onClick={() => setQuantity((current) => Math.min(maxQuantity, current + 1))}
                    className="flex h-9 w-9 items-center justify-center rounded-xl text-ink-muted transition-colors hover:bg-brand-50 hover:text-brand-800 disabled:opacity-40"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
                <span className="text-[11px] text-ink-muted">Maximum : {maxQuantity}</span>
              </div>
            )}
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <Button
                fullWidth
                variant="accent"
                disabled={!available}
                loading={adding}
                onClick={() => void handleAdd()}
                iconLeft={<ShoppingCart className="h-4 w-4" />}
              >
                {available ? 'Ajouter au panier' : 'Indisponible'}
              </Button>
              <FavoriteButton listing={listing} className="h-11 w-full sm:col-span-2" />
            </div>
            <div className="mt-3 text-center">
              <ReportListingButton listingId={listing.id} />
            </div>
            <p className="mt-3 text-center text-[11px] leading-relaxed text-ink-muted">
              La commande et la remise s’organisent directement avec le commerçant. Aucun paiement en ligne.
            </p>
          </div>
        </section>
      </div>
    </main>
  )
}
