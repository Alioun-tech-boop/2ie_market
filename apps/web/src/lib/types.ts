import type { LucideIcon } from 'lucide-react'

export type Site = 'KAMBOINSIN' | 'OUAGA'
export type ListingType = 'PHYSICAL' | 'SECOND_HAND' | 'SERVICE'
export type Tone = 'blue' | 'mint' | 'amber' | 'violet' | 'rose' | 'slate'

export interface Vendor {
  id: string
  ownerName: string
  storeName: string
  tagline: string
  site: Site
  tone: Tone
  listingsCount: number
}

export interface Listing {
  id: string
  title: string
  type: ListingType
  priceCents: number
  site: Site
  vendorId: string
  tone: Tone
  icon: LucideIcon
  tag?: string
  availability: 'AVAILABLE' | 'OUT_OF_STOCK'
}

export interface Category {
  id: string
  label: string
  icon: LucideIcon
  tone: Tone
  count: number
}
