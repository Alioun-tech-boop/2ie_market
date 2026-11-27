import type { Site } from '@2ie/shared'
import { api, type DeliveryMode } from './auth'
import type { ListingType } from './market'
import type { OrderStatus } from './orderLabels'

export type { OrderStatus }

/** Réponse renvoyée par GET /cart et par toutes les mutations du panier. */
export interface CartDto {
  currency: string
  itemCount: number
  totalCents: number
  groups: Array<{
    store: {
      id: string
      name: string
      slug: string
      logoUrl: string | null
      site: Site
      deliveryModes: DeliveryMode[]
    }
    note: string
    subtotalCents: number
    items: Array<{
      id: string
      listingId: string
      title: string
      photoUrl: string | null
      type: ListingType
      unitPriceCents: number
      quantity: number
      lineTotalCents: number
      availableQuantity: number | null
      available: boolean
    }>
  }>
}

export interface ClientSnapshotDto {
  name: string
  phone: string
  site: Site
  buildingNumber: string
  roomNumber: string
  floor: number
  /** Référence lisible (B1.87 R0), communiquée uniquement au vendeur concerné. */
  locationRef: string
}

export interface OrderItemDto {
  listingId: string | null
  title: string
  type: ListingType
  quantity: number
  unitPriceCents: number
  lineTotalCents: number
}

export interface OrderDto {
  id: string
  orderNumber: string
  groupReference: string
  status: OrderStatus
  statusUpdatedAt: string
  createdAt: string
  totalCents: number
  currency: string
  deliveryMode: DeliveryMode
  meetingPointLabel: string | null
  meetingNote: string | null
  clientNote: string | null
  client: ClientSnapshotDto
  merchant: {
    id: string
    name: string
    slug: string
    logoUrl: string | null
    site: Site
  }
  items: OrderItemDto[]
}

export interface OrderGroupDto {
  id: string
  reference: string
  status: OrderStatus
  totalCents: number
  currency: string
  deliveryMode: DeliveryMode
  meetingPointLabel: string | null
  createdAt: string
  client: ClientSnapshotDto
  orders: OrderDto[]
}

export interface MeetingPointDto {
  id: string
  site: Site
  label: string
  description: string | null
}

export interface CheckoutPayload {
  clientName: string
  clientPhone: string
  site: Site
  buildingNumber: string
  roomNumber: string
  floor: number
  deliveryMode: DeliveryMode
  meetingPointId?: string | null
}

type CartResponse = { cart: CartDto }

const jsonBody = (method: 'POST' | 'PATCH' | 'DELETE', body?: unknown): RequestInit => ({
  method,
  ...(body === undefined ? {} : { body: JSON.stringify(body) }),
})

export const ordersApi = {
  get: () => api<CartResponse>('/cart'),
  add: (listingId: string, quantity: number) =>
    api<CartResponse>('/cart/items', jsonBody('POST', { listingId, quantity })),
  updateQuantity: (listingId: string, quantity: number) =>
    api<CartResponse>(`/cart/items/${encodeURIComponent(listingId)}`, jsonBody('PATCH', { quantity })),
  remove: (listingId: string) =>
    api<CartResponse>(`/cart/items/${encodeURIComponent(listingId)}`, jsonBody('DELETE')),
  setNote: (storeId: string, note: string) =>
    api<CartResponse>('/cart/notes', jsonBody('PATCH', { storeId, note })),
  clear: () => api<CartResponse>('/cart', jsonBody('DELETE')),
  meetingPoints: () => api<{ meetingPoints: MeetingPointDto[] }>('/meeting-points'),
  list: () => api<{ groups: OrderGroupDto[] }>('/orders'),
  getOrder: (reference: string) =>
    api<{ group: OrderGroupDto }>(`/orders/${encodeURIComponent(reference)}`),
  checkout: (payload: CheckoutPayload) => api<{ group: OrderGroupDto }>('/orders', jsonBody('POST', payload)),
  updateStatus: (id: string, status: OrderStatus) =>
    api<{ order: OrderDto }>(`/me/orders/${encodeURIComponent(id)}/status`, jsonBody('PATCH', { status })),
}
