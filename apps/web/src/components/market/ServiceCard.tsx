import { ArrowUpRight } from 'lucide-react'
import { Card } from '../ui/Card'
import { Price } from '../ui/Price'
import { SiteChip } from '../ui/SiteChip'
import type { Listing, Vendor } from '../../lib/types'
import type { Tone } from '../../lib/types'

const toneStyles: Record<Tone, string> = {
  blue: 'bg-brand-50 text-brand-600',
  mint: 'bg-emerald-50 text-emerald-600',
  amber: 'bg-amber-50 text-amber-600',
  violet: 'bg-violet-50 text-violet-600',
  rose: 'bg-rose-50 text-rose-600',
  slate: 'bg-slate-100 text-slate-600',
}

export function ServiceCard({
  listing,
  vendor,
  onOpen,
}: {
  listing: Listing
  vendor?: Vendor
  onOpen?: () => void
}) {
  const Icon = listing.icon

  return (
    <Card hoverable className="group flex h-full flex-col p-5">
      <div className="flex items-start justify-between">
        <span className={`flex h-12 w-12 items-center justify-center rounded-2xl ${toneStyles[listing.tone]}`}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <span className="flex h-8 w-8 items-center justify-center rounded-full border border-line text-ink-soft transition-all duration-200 group-hover:border-brand-300 group-hover:bg-brand-50 group-hover:text-brand-700">
          <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
        </span>
      </div>

      <button type="button" onClick={onOpen} className="mt-5 text-left">
        <h3 className="text-sm font-bold leading-snug text-ink transition-colors group-hover:text-brand-700">
          {listing.title}
        </h3>
      </button>
      <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-ink-muted">
        Prestation proposée par {vendor?.storeName ?? 'un vendeur de la communauté'}
      </p>

      <div className="mt-auto pt-5">
        <SiteChip site={listing.site} />
        <div className="mt-3 border-t border-line pt-4">
          <Price cents={listing.priceCents} label="Tarif" size="lg" />
        </div>
      </div>
    </Card>
  )
}
