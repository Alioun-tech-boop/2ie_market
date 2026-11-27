import {
  Prisma,
  type DeliveryMode,
  type ListingType,
  type OrderStatus,
  type Site,
} from '@prisma/client'

export type { DeliveryMode, ListingType, OrderStatus, Site }

export const orderInclude = Prisma.validator<Prisma.OrderInclude>()({
  items: true,
  store: { include: { location: true } },
  orderGroup: true,
  meetingPoint: true,
})

export type OrderRecord = Prisma.OrderGetPayload<{ include: typeof orderInclude }>

export const orderGroupInclude = Prisma.validator<Prisma.OrderGroupInclude>()({
  meetingPoint: true,
  orders: { include: orderInclude },
})

export type OrderGroupRecord = Prisma.OrderGroupGetPayload<{ include: typeof orderGroupInclude }>

export const cartItemInclude = Prisma.validator<Prisma.CartItemInclude>()({
  listing: {
    include: {
      photos: { take: 1, orderBy: { position: 'asc' } },
      store: { include: { location: true } },
    },
  },
})

export type CartItemRecord = Prisma.CartItemGetPayload<{ include: typeof cartItemInclude }>

export interface OrderItemDto {
  listingId: string | null
  title: string
  type: ListingType
  quantity: number
  unitPriceCents: number
  lineTotalCents: number
}

export interface ClientSnapshotDto {
  name: string
  phone: string
  site: Site
  buildingNumber: string
  roomNumber: string
  floor: number
  locationRef: string
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

function clientFromOrder(order: OrderRecord): ClientSnapshotDto {
  return {
    name: order.snapshotClientName,
    phone: order.snapshotClientPhone || order.snapshotClientWhatsapp || '',
    site: order.snapshotSite,
    buildingNumber: order.snapshotBuildingNumber,
    roomNumber: order.snapshotRoomNumber,
    floor: order.snapshotFloor,
    locationRef: order.snapshotLocationRef,
  }
}

export function toOrderDto(order: OrderRecord): OrderDto {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    groupReference: order.orderGroup?.reference ?? '',
    status: order.status,
    statusUpdatedAt: order.statusUpdatedAt.toISOString(),
    createdAt: order.createdAt.toISOString(),
    totalCents: order.totalCents,
    currency: order.currency,
    deliveryMode: order.deliveryMode,
    meetingPointLabel: order.meetingPoint?.label ?? order.snapshotMeetingPointLabel,
    meetingNote: order.meetingNote,
    clientNote: order.clientNote,
    client: clientFromOrder(order),
    merchant: {
      id: order.store.id,
      name: order.store.name,
      slug: order.store.slug,
      logoUrl: order.store.logoUrl,
      site: order.store.location.site,
    },
    items: order.items.map((item) => ({
      listingId: item.listingId,
      title: item.snapshotTitle,
      type: item.snapshotType,
      quantity: item.quantity,
      unitPriceCents: item.unitPriceCents,
      lineTotalCents: item.lineTotalCents,
    })),
  }
}

export function toOrderGroupDto(group: OrderGroupRecord): OrderGroupDto {
  const client: ClientSnapshotDto = {
    name: group.snapshotClientName,
    phone: group.snapshotClientPhone,
    site: group.snapshotSite,
    buildingNumber: group.snapshotBuildingNumber,
    roomNumber: group.snapshotRoomNumber,
    floor: group.snapshotFloor,
    locationRef: group.snapshotLocationRef,
  }

  return {
    id: group.id,
    reference: group.reference,
    status: group.status,
    totalCents: group.totalCents,
    currency: group.currency,
    deliveryMode: group.deliveryMode,
    meetingPointLabel: group.meetingPoint?.label ?? group.orders[0]?.snapshotMeetingPointLabel ?? null,
    createdAt: group.createdAt.toISOString(),
    client,
    orders: group.orders.map(toOrderDto),
  }
}

export function buildCartDto(items: CartItemRecord[], notes: Array<{ storeId: string; note: string }>): CartDto {
  const noteMap = new Map(notes.map((note) => [note.storeId, note.note]))
  const groups = new Map<string, CartDto['groups'][number]>()

  for (const item of items) {
    const { listing } = item
    const store = listing.store
    let group = groups.get(store.id)
    if (!group) {
      group = {
        store: {
          id: store.id,
          name: store.name,
          slug: store.slug,
          logoUrl: store.logoUrl,
          site: store.location.site,
          deliveryModes: store.deliveryModes,
        },
        note: noteMap.get(store.id) ?? '',
        subtotalCents: 0,
        items: [],
      }
      groups.set(store.id, group)
    }

    const lineTotalCents = listing.priceCents * item.quantity
    const available =
      listing.status === 'PUBLISHED' && store.isActive && listing.availability === 'AVAILABLE'
    group.items.push({
      id: item.id,
      listingId: listing.id,
      title: listing.title,
      photoUrl: listing.photos[0]?.thumbUrl ?? listing.photos[0]?.url ?? null,
      type: listing.type,
      unitPriceCents: listing.priceCents,
      quantity: item.quantity,
      lineTotalCents,
      availableQuantity: listing.quantity,
      available,
    })
    group.subtotalCents += lineTotalCents
  }

  const result = [...groups.values()]
  return {
    currency: 'XOF',
    itemCount: result.reduce((sum, group) => sum + group.items.reduce((n, item) => n + item.quantity, 0), 0),
    totalCents: result.reduce((sum, group) => sum + group.subtotalCents, 0),
    groups: result,
  }
}
