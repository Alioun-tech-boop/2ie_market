import { MapPin } from 'lucide-react'
import { siteLabel } from '../../lib/format'
import type { Site } from '../../lib/types'
import { cn } from '../../lib/cn'

/** Affiche uniquement le site élargi : jamais bâtiment/chambre/étage (RG-17). */
export function SiteChip({ site, className }: { site: Site; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1 text-xs font-medium text-ink-muted', className)}>
      <MapPin className="h-3.5 w-3.5 text-brand-500" aria-hidden="true" />
      {siteLabel(site)}
    </span>
  )
}
