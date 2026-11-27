import {
  Prisma,
  type Availability,
  type Category,
  type Condition,
  type DeliveryMode,
  type Listing,
  type ListingPhoto,
  type ListingStatus,
  type ListingType,
  type Location,
  type Order,
  type OrderItem,
  type Review,
  type Site,
  type Store,
} from '@prisma/client'

export type ListingWithRelations = Listing & {
  photos: ListingPhoto[]
  category: Category | null
  store: Store & { location: Location }
}

export type OrderWithRelations = Order & {
  items: OrderItem[]
  meetingPoint: { site: Site; label: string } | null
  orderGroup: { reference: string } | null
}

interface ListingOptionDto {
  name: string
  priceCents: number
}

/** Référence lisible et stable, dérivée de l'identifiant : aucune colonne supplémentaire. */
export function listingReference(id: string): string {
  return `ANN-${id.replace(/-/g, '').slice(0, 6).toUpperCase()}`
}

function parseOptions(value: Prisma.JsonValue | null): ListingOptionDto[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => {
    if (typeof item !== 'object' || item === null) return []
    const option = item as Record<string, unknown>
    if (typeof option.name !== 'string' || typeof option.priceCents !== 'number') return []
    return [{ name: option.name, priceCents: option.priceCents }]
  })
}

/** DTO public : aucun bâtiment, chambre ni étage (RG-17). */
export function toPublicListing(listing: ListingWithRelations) {
  return {
    id: listing.id,
    reference: listingReference(listing.id),
    title: listing.title,
    description: listing.description,
    type: listing.type as ListingType,
    priceCents: listing.priceCents,
    currency: listing.currency,
    condition: listing.condition as Condition | null,
    availability: listing.availability as Availability,
    isFeatured: listing.isFeatured,
    quantity: listing.quantity,
    durationMinutes: listing.durationMinutes,
    requirements: listing.requirements,
    options: parseOptions(listing.options),
    photos: [...listing.photos]
      .sort((a, b) => a.position - b.position)
      .map((photo) => ({
        id: photo.id,
        url: photo.url,
        thumbUrl: photo.thumbUrl ?? photo.url,
        width: photo.width,
        height: photo.height,
        alt: photo.alt,
      })),
    category: listing.category
      ? { id: listing.category.id, name: listing.category.name, slug: listing.category.slug }
      : null,
    store: {
      id: listing.store.id,
      name: listing.store.name,
      slug: listing.store.slug,
      logoUrl: listing.store.logoUrl,
      site: listing.store.location.site,
    },
    createdAt: listing.createdAt.toISOString(),
    publishedAt: listing.publishedAt?.toISOString() ?? null,
  }
}

export const listingCardInclude = {
  photos: { take: 1, orderBy: { position: 'asc' as const } },
  category: { select: { id: true, name: true, slug: true } },
  store: {
    select: {
      id: true,
      name: true,
      slug: true,
      logoUrl: true,
      location: { select: { site: true } },
    },
  },
} satisfies Prisma.ListingInclude

export type ListingCardRecord = Prisma.ListingGetPayload<{ include: typeof listingCardInclude }>

/** Carte d'annonce : même forme publique, avec au plus une photo. */
export function toListingCard(listing: ListingCardRecord) {
  return {
    id: listing.id,
    reference: listingReference(listing.id),
    title: listing.title,
    description: listing.description,
    type: listing.type as ListingType,
    priceCents: listing.priceCents,
    currency: listing.currency,
    condition: listing.condition as Condition | null,
    availability: listing.availability as Availability,
    isFeatured: listing.isFeatured,
    quantity: listing.quantity,
    durationMinutes: listing.durationMinutes,
    requirements: listing.requirements,
    options: parseOptions(listing.options),
    photos: listing.photos.map((photo) => ({
      id: photo.id,
      url: photo.url,
      thumbUrl: photo.thumbUrl ?? photo.url,
      width: photo.width,
      height: photo.height,
      alt: photo.alt,
    })),
    category: listing.category
      ? { id: listing.category.id, name: listing.category.name, slug: listing.category.slug }
      : null,
    store: {
      id: listing.store.id,
      name: listing.store.name,
      slug: listing.store.slug,
      logoUrl: listing.store.logoUrl,
      whatsapp: listing.store.whatsappE164,
      site: listing.store.location.site,
    },
    createdAt: listing.createdAt.toISOString(),
    publishedAt: listing.publishedAt?.toISOString() ?? null,
  }
}

export function toMerchantListing(listing: ListingWithRelations) {
  return {
    ...toPublicListing(listing),
    status: listing.status as ListingStatus,
    viewsCount: listing.viewsCount,
    updatedAt: listing.updatedAt.toISOString(),
  }
}

export function toPublicStore(
  store: Store & { location: Location },
  counts: { products: number; services: number },
  reviews: { enabled: boolean; count: number; average: number | null },
) {
  return {
    id: store.id,
    name: store.name,
    slug: store.slug,
    description: store.description,
    logoUrl: store.logoUrl,
    site: store.location.site,
    deliveryModes: store.deliveryModes,
    isActive: store.isActive,
    createdAt: store.createdAt.toISOString(),
    counts,
    reviews,
  }
}

export function toReviewDto(review: Review & { author: { firstName: string; lastName: string; profilePhotoUrl: string | null } }) {
  return {
    id: review.id,
    rating: review.rating,
    comment: review.comment,
    createdAt: review.createdAt.toISOString(),
    author: {
      firstName: review.author.firstName,
      lastName: review.author.lastName,
      profilePhotoUrl: review.author.profilePhotoUrl,
    },
  }
}

/** Vue marchand : la référence client est volontairement visible (RG-17). */
export function toMerchantOrder(order: OrderWithRelations) {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    groupReference: order.orderGroup?.reference ?? null,
    status: order.status,
    statusUpdatedAt: order.statusUpdatedAt.toISOString(),
    totalCents: order.totalCents,
    currency: order.currency,
    deliveryMode: order.deliveryMode as DeliveryMode,
    meetingPointLabel: order.meetingPoint?.label ?? order.snapshotMeetingPointLabel,
    meetingNote: order.meetingNote,
    clientNote: order.clientNote,
    client: {
      name: order.snapshotClientName,
      phone: order.snapshotClientPhone || order.snapshotClientWhatsapp,
      site: order.snapshotSite,
      buildingNumber: order.snapshotBuildingNumber,
      roomNumber: order.snapshotRoomNumber,
      floor: order.snapshotFloor,
      locationRef: order.snapshotLocationRef,
    },
    items: order.items.map((item) => ({
      title: item.snapshotTitle,
      type: item.snapshotType,
      quantity: item.quantity,
      unitPriceCents: item.unitPriceCents,
      lineTotalCents: item.lineTotalCents,
    })),
    createdAt: order.createdAt.toISOString(),
  }
}
