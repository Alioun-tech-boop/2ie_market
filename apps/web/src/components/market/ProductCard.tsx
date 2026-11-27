import { Badge } from '../ui/Badge'
import { Card } from '../ui/Card'
import { Price } from '../ui/Price'
import { SiteChip } from '../ui/SiteChip'
import { ProductImage } from './ProductImage'
import type { Listing, Vendor } from '../../lib/types'

export function ProductCard({
  listing,
  vendor,
  onOpen,
}: {
  listing: Listing
  vendor?: Vendor
  onOpen?: () => void
}) {
  const isAccent = listing.tag === 'Bon plan'

  return (
    <Card hoverable className="group flex h-full flex-col overflow-hidden p-3">
      <div className="relative">
        <ProductImage icon={listing.icon} tone={listing.tone} alt={listing.title} />
        {listing.tag && (
          <div className="absolute left-2 top-2">
            <Badge tone={isAccent ? 'accent' : 'brand'} dot={isAccent}>
              {listing.tag}
            </Badge>
          </div>
        )}
        {listing.availability === 'OUT_OF_STOCK' && (
          <div className="absolute right-2 top-2">
            <Badge tone="muted">Indisponible</Badge>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col px-1 pb-1 pt-4">
        <button
          type="button"
          onClick={onOpen}
          className="text-left text-sm font-bold leading-snug text-ink transition-colors group-hover:text-brand-700"
        >
          <span className="line-clamp-2">{listing.title}</span>
        </button>
        <div className="mt-2 flex items-center justify-between gap-2">
          <SiteChip site={listing.site} />
          {vendor && <span className="truncate text-[11px] text-ink-soft">{vendor.storeName}</span>}
        </div>

        <div className="mt-4 flex items-end justify-between gap-2 border-t border-line pt-4">
          <Price cents={listing.priceCents} />
        </div>
      </div>
    </Card>
  )
}
