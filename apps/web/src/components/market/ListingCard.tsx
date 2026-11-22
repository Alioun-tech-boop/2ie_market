import { Link } from '@tanstack/react-router'
import { ArrowUpRight, ImageOff, MapPin } from 'lucide-react'
import { assetUrl } from '../../lib/auth'
import { siteLabel } from '../../lib/format'
import { availabilityLabels, shortTypeLabels } from '../../lib/listingLabels'
import type { Listing } from '../../lib/market'
import { listingWhatsappMessage } from '../../lib/whatsapp'
import { Badge } from '../ui/Badge'
import { Price } from '../ui/Price'
import { FavoriteButton } from './FavoriteButton'
import { WhatsappButton } from './WhatsappButton'

export function ListingCard({ listing }: { listing: Listing }) {
  const photo = assetUrl(listing.photos[0]?.thumbUrl ?? listing.photos[0]?.url)
  const available = listing.availability === 'AVAILABLE'

  return (
    <div className="group relative flex h-full flex-col overflow-hidden rounded-[1.35rem] border border-line bg-white shadow-soft transition-all duration-300 ease-premium hover:-translate-y-1 hover:border-brand-200 hover:shadow-card">
      <Link
        to="/annonce/$id"
        params={{ id: listing.id }}
        className="flex h-full flex-col focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-500/20"
      >
        <div className="relative aspect-[4/3] overflow-hidden bg-brand-50 sm:aspect-[5/4]">
          {photo ? (
            <img
              src={photo}
              alt={listing.title}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-500 ease-premium group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-brand-300">
              <ImageOff className="h-9 w-9" aria-hidden="true" />
            </div>
          )}
          <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
            {listing.isFeatured && <Badge tone="accent" dot>À la une</Badge>}
            <Badge tone="brand">{shortTypeLabels[listing.type]}</Badge>
            {available ? (
              <Badge tone="success">Disponible</Badge>
            ) : (
              <Badge tone="muted">{availabilityLabels[listing.availability]}</Badge>
            )}
          </div>
        </div>

        <div className="flex flex-1 flex-col p-3.5 sm:p-4">
          <Price cents={listing.priceCents} size="md" />
          <h3 className="mt-2.5 line-clamp-2 text-sm font-bold leading-snug text-ink transition-colors group-hover:text-brand-800">
            {listing.title}
          </h3>

          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-medium text-ink-muted">
            {listing.category && <span>{listing.category.name}</span>}
            {listing.durationMinutes && <span>{listing.durationMinutes} min</span>}
            {listing.quantity !== null && <span>{listing.quantity} en stock</span>}
          </div>

          <div className="mt-auto flex items-center justify-between gap-2 border-t border-line/80 pt-3.5">
            <div className="flex min-w-0 items-center gap-2">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-brand-50 text-[10px] font-bold text-brand-700">
                {listing.store.logoUrl ? (
                  <img src={assetUrl(listing.store.logoUrl) ?? ''} alt="" className="h-full w-full object-cover" />
                ) : (
                  listing.store.name.slice(0, 2).toUpperCase()
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-ink">{listing.store.name}</p>
                <p className="flex items-center gap-1 text-[10px] text-ink-muted">
                  <MapPin className="h-2.5 w-2.5" aria-hidden="true" />
                  {siteLabel(listing.store.site)}
                </p>
              </div>
            </div>
            <ArrowUpRight className="h-4 w-4 shrink-0 text-ink-soft transition-colors group-hover:text-brand-700" aria-hidden="true" />
          </div>
        </div>
      </Link>

      <FavoriteButton listing={listing} compact className="absolute right-3 top-3 z-10" />

      <WhatsappButton
        phone={listing.store.whatsapp}
        message={listingWhatsappMessage(listing, listing.store.name)}
        compact
        title="Poser une question sur WhatsApp"
        className="absolute right-3 top-14 z-10 shadow-soft"
      />
    </div>
  )
}
