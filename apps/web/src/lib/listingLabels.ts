import type { Availability, Condition, ListingStatus, ListingType } from './market'

export const typeLabels: Record<ListingType, string> = {
  PHYSICAL: 'Produit neuf',
  SECOND_HAND: 'Occasion',
  SERVICE: 'Service',
}

export const shortTypeLabels: Record<ListingType, string> = {
  PHYSICAL: 'Produit',
  SECOND_HAND: 'Occasion',
  SERVICE: 'Service',
}

export const conditionLabels: Record<Condition, string> = {
  NEW: 'Neuf',
  LIKE_NEW: 'Comme neuf',
  GOOD: 'Bon état',
  FAIR: 'État satisfaisant',
}

export const availabilityLabels: Record<Availability, string> = {
  AVAILABLE: 'Disponible',
  OUT_OF_STOCK: 'Rupture de stock',
  PAUSED: 'Suspendu',
}

export const statusLabels: Record<ListingStatus, string> = {
  DRAFT: 'Brouillon',
  PUBLISHED: 'Publié',
  PAUSED: 'Désactivé',
  ARCHIVED: 'Archivé',
}

export function isService(type: ListingType): boolean {
  return type === 'SERVICE'
}

export function durationLabel(minutes: number | null): string | null {
  if (!minutes) return null
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (hours < 24) return rest ? `${hours} h ${rest} min` : `${hours} h`
  return `${Math.floor(hours / 24)} j`
}
