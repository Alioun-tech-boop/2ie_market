import { ArrowRight } from 'lucide-react'
import { Avatar } from '../ui/Avatar'
import { Badge } from '../ui/Badge'
import { Card } from '../ui/Card'
import { SiteChip } from '../ui/SiteChip'
import { WhatsappButton } from './WhatsappButton'
import type { Vendor } from '../../lib/types'

export function VendorCard({ vendor, onOpen }: { vendor: Vendor; onOpen?: () => void }) {
  return (
    <Card hoverable className="flex h-full flex-col p-5">
      <div className="flex items-center gap-3">
        <Avatar name={vendor.ownerName} tone={vendor.tone} size="lg" />
        <div className="min-w-0">
          <h3 className="truncate text-sm font-bold text-ink">{vendor.storeName}</h3>
          <p className="truncate text-xs text-ink-muted">{vendor.ownerName}</p>
        </div>
      </div>

      <p className="mt-4 line-clamp-2 min-h-[2.5rem] text-xs leading-relaxed text-ink-muted">
        {vendor.tagline}
      </p>

      <div className="mt-4 flex items-center justify-between gap-2">
        <SiteChip site={vendor.site} />
        <Badge tone="neutral">{vendor.listingsCount} annonces</Badge>
      </div>

      <div className="mt-5 flex items-center gap-2 border-t border-line pt-4">
        <button
          type="button"
          onClick={onOpen}
          className="group inline-flex flex-1 items-center gap-1.5 text-xs font-bold text-brand-700 transition-colors hover:text-brand-900"
        >
          Voir la boutique
          <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-1" aria-hidden="true" />
        </button>
        <WhatsappButton
          phone={vendor.whatsapp}
          compact
          message={`Bonjour ${vendor.storeName}, je découvre votre boutique sur 2ie Market.`}
        />
      </div>
    </Card>
  )
}
