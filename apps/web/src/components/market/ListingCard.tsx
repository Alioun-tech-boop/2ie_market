import { Link } from '@tanstack/react-router'
import { ImageOff } from 'lucide-react'
import { assetUrl } from '../../lib/auth'
import type { Listing } from '../../lib/market'
import { FavoriteButton } from './FavoriteButton'
import { WhatsappButton } from './WhatsappButton'

export function ListingCard({ listing }: { listing: Listing }) {
  const photo = assetUrl(listing.photos[0]?.thumbUrl ?? listing.photos[0]?.url)
  const available = listing.availability === 'AVAILABLE'

  return (
    <article className="group relative aspect-square min-w-0 overflow-hidden rounded-2xl bg-slate-100 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-card">
      <Link
        to="/annonce/$id"
        params={{ id: listing.id }}
        aria-label={`${listing.title}, ${new Intl.NumberFormat('fr-FR').format(listing.priceCents / 100)} FCFA`}
        className="absolute inset-0 block focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-brand-500/40"
      >
        {photo ? (
          <img
            src={photo}
            alt={listing.title}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition-transform duration-500 ease-premium group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-slate-400">
            <ImageOff className="h-9 w-9" aria-hidden="true" />
          </div>
        )}

        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/45 to-transparent px-3 pb-3 pt-16 sm:px-4 sm:pb-4">
          <p className="line-clamp-2 text-sm font-bold leading-snug text-white drop-shadow sm:text-base">
            {listing.title}
          </p>
          <p className="mt-1.5 text-sm font-extrabold text-white drop-shadow sm:text-base">
            {new Intl.NumberFormat('fr-FR').format(listing.priceCents / 100)} FCFA
          </p>
        </div>

        {listing.isFeatured && (
          <span className="absolute left-2.5 top-2.5 rounded-full bg-amber-400 px-2.5 py-1 text-[10px] font-bold text-amber-950 shadow-sm">
            À la une
          </span>
        )}
        {!available && (
          <span className="absolute bottom-[5.8rem] left-2.5 rounded-full bg-black/65 px-2.5 py-1 text-[10px] font-semibold text-white backdrop-blur">
            Indisponible
          </span>
        )}
      </Link>

      <FavoriteButton listing={listing} compact className="absolute right-2.5 top-2.5 z-10 border-0 shadow-md" />
      <WhatsappButton
        phone={listing.store.whatsapp}
        message={`Bonjour, je souhaite avoir des informations sur « ${listing.title} » sur 2ie Market.`}
        compact
        title="Contacter le vendeur sur WhatsApp"
        className="absolute bottom-2.5 right-2.5 z-10 border-0 shadow-md"
      />
    </article>
  )
}
