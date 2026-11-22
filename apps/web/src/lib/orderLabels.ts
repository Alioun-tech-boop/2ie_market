import {
  ORDER_STATUS_TRANSITIONS,
  ORDER_STATUSES,
  type OrderStatus,
} from '@2ie/shared'
import type { DeliveryMode } from './auth'

export { ORDER_STATUSES }
export type { OrderStatus }

/** Correspond aux tones acceptées par components/ui/Badge.tsx. */
export type OrderBadgeTone = 'brand' | 'accent' | 'neutral' | 'success' | 'muted'

export const orderStatusLabels: Record<OrderStatus, string> = {
  PENDING: 'En attente',
  CONFIRMED: 'Confirmée',
  REJECTED: 'Refusée',
  PREPARING: 'En préparation',
  READY: 'Prête',
  COMPLETED: 'Terminée',
  CANCELLED: 'Annulée',
}

export const orderStatusTones: Record<OrderStatus, OrderBadgeTone> = {
  PENDING: 'accent',
  CONFIRMED: 'brand',
  REJECTED: 'muted',
  PREPARING: 'accent',
  READY: 'brand',
  COMPLETED: 'success',
  CANCELLED: 'muted',
}

export const deliveryModeLabels: Record<DeliveryMode, string> = {
  HAND_DELIVERY: 'Remise en main propre',
  MEETUP_POINT: 'Point de rendez-vous',
}

/** Statuts autorisés après le statut courant (les statuts terminaux renvoient []). */
export function nextStatuses(status: OrderStatus): OrderStatus[] {
  return ORDER_STATUS_TRANSITIONS[status] ?? []
}

/** Étapes parcourues, affichées dans la chronologie d'une sous-commande. */
export function statusTimeline(status: OrderStatus): OrderStatus[] {
  if (status === 'REJECTED' || status === 'CANCELLED') return ['PENDING', status]
  const order: OrderStatus[] = ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'COMPLETED']
  const index = order.indexOf(status)
  return index === -1 ? [status] : order.slice(0, index + 1)
}
