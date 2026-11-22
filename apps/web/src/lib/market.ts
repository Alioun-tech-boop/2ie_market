import type { Site } from '@2ie/shared'
import { api, type DeliveryMode } from './auth'
import type { OrderStatus } from './orderLabels'

export type ListingType = 'PHYSICAL' | 'SECOND_HAND' | 'SERVICE'
export type ListingStatus = 'DRAFT' | 'PUBLISHED' | 'PAUSED' | 'ARCHIVED'
export type Condition = 'NEW' | 'LIKE_NEW' | 'GOOD' | 'FAIR'
export type Availability = 'AVAILABLE' | 'OUT_OF_STOCK' | 'PAUSED'

export interface Category {
  id: string
  name: string
  slug: string
  icon: string | null
}

export type SearchType = 'ALL' | 'PRODUCT' | 'PHYSICAL' | 'SECOND_HAND' | 'SERVICE'
export type SearchSort = 'popular' | 'recent' | 'price-asc' | 'price-desc'
export type SiteFilter = 'ALL' | Site
export type AvailabilityFilter = 'ALL' | Availability

export const SEARCH_TYPE_FILTERS: SearchType[] = ['ALL', 'PRODUCT', 'PHYSICAL', 'SECOND_HAND', 'SERVICE']
export const SEARCH_SORT_FILTERS: SearchSort[] = ['popular', 'recent', 'price-asc', 'price-desc']
export const SITE_FILTERS: SiteFilter[] = ['ALL', 'KAMBOINSIN', 'OUAGA']
export const AVAILABILITY_FILTERS: AvailabilityFilter[] = ['ALL', 'AVAILABLE', 'OUT_OF_STOCK', 'PAUSED']

export interface PublicCategory extends Category {
  position: number
  count: number
}

export interface SearchState {
  q: string
  category: string
  type: SearchType
  site: SiteFilter
  availability: AvailabilityFilter
  minPriceCents?: number
  maxPriceCents?: number
  sort: SearchSort
  page: number
  limit: number
}

export const defaultSearchState: SearchState = {
  q: '',
  category: '',
  type: 'ALL',
  site: 'ALL',
  availability: 'ALL',
  sort: 'recent',
  page: 1,
  limit: 12,
}

export interface SearchResponse {
  listings: Listing[]
  pagination: { page: number; limit: number; total: number; pages: number; hasMore: boolean }
}

export interface AdminCategory extends Category {
  position: number
  isActive: boolean
  parentId: string | null
  parent: Pick<Category, 'id' | 'name' | 'slug'> | null
  count: number
  createdAt: string
}

export interface CategoryPayload {
  name: string
  slug?: string
  icon?: string | null
  position?: number
  isActive?: boolean
  parentId?: string | null
}

export interface ListingPhoto {
  id: string
  url: string
  thumbUrl: string
  width: number | null
  height: number | null
  alt: string | null
}

export interface ListingOption {
  name: string
  priceCents: number
}

export interface StoreSummary {
  id: string
  name: string
  slug: string
  logoUrl: string | null
  whatsapp: string
  site: Site
}

export interface Listing {
  id: string
  /** Référence lisible ANN-XXXXXX, utilisable dans les messages WhatsApp. */
  reference: string
  title: string
  description: string
  type: ListingType
  priceCents: number
  currency: string
  condition: Condition | null
  availability: Availability
  isFeatured: boolean
  quantity: number | null
  durationMinutes: number | null
  requirements: string | null
  options: ListingOption[]
  photos: ListingPhoto[]
  category: Pick<Category, 'id' | 'name' | 'slug'> | null
  store: StoreSummary
  createdAt: string
  publishedAt: string | null
}

export interface PlatformInfo {
  name: string
  logoUrl: string | null
  supportEmail: string | null
  maintenanceMessage: string | null
  reviewsEnabled: boolean
  updatedAt: string
}

export interface MerchantListing extends Listing {
  status: ListingStatus
  viewsCount: number
  updatedAt: string
}

export interface PublicStore extends StoreSummary {
  description: string
  deliveryModes: DeliveryMode[]
  isActive: boolean
  createdAt: string
  counts: { products: number; services: number }
  reviews: { enabled: boolean; count: number; average: number | null }
}

export interface MerchantOrder {
  id: string
  orderNumber: string
  status: OrderStatus
  statusUpdatedAt?: string
  groupReference?: string | null
  totalCents: number
  currency: string
  deliveryMode: DeliveryMode
  meetingPointLabel: string | null
  meetingNote: string | null
  clientNote: string | null
  client: {
    name: string
    whatsapp: string
    phone?: string
    locationRef: string | null
    site: Site
    buildingNumber?: string
    roomNumber?: string
    floor?: number
  }
  items: {
    title: string
    type: ListingType
    quantity: number
    unitPriceCents: number
    lineTotalCents: number
  }[]
  createdAt: string
}

export interface MerchantDashboard {
  stats: {
    listings: number
    published: number
    products: number
    services: number
    views: number
    orders: number
    pendingOrders: number
    completedOrders: number
    byStatus: Array<{ status: OrderStatus; count: number }>
  }
  listings: MerchantListing[]
  orders: MerchantOrder[]
}

export interface StoreReview {
  id: string
  rating: number
  comment: string | null
  createdAt: string
  author: { firstName: string; lastName: string; profilePhotoUrl: string | null }
}

export interface ListingPayload {
  title: string
  description: string
  categoryId: string
  type: ListingType
  priceCents: number
  quantity?: number | null
  condition?: Condition | null
  availability: Availability
  durationMinutes?: number | null
  requirements?: string | null
  options: ListingOption[]
  status: 'DRAFT' | 'PUBLISHED' | 'PAUSED'
}

function withQuery(path: string, params: Record<string, string | number | undefined>) {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') query.set(key, String(value))
  })
  const serialized = query.toString()
  return serialized ? `${path}?${serialized}` : path
}

export const marketApi = {
  platform: () => api<{ platform: PlatformInfo }>('/platform'),
  categories: () => api<{ categories: PublicCategory[] }>('/categories'),
  search: (filters: SearchState) =>
    api<SearchResponse>(withQuery('/listings', {
      q: filters.q,
      category: filters.category,
      type: filters.type !== 'ALL' ? filters.type : undefined,
      site: filters.site !== 'ALL' ? filters.site : undefined,
      availability: filters.availability !== 'ALL' ? filters.availability : undefined,
      minPriceCents: filters.minPriceCents,
      maxPriceCents: filters.maxPriceCents,
      sort: filters.sort,
      page: filters.page,
      limit: filters.limit,
    })),
  adminCategories: () => api<{ categories: AdminCategory[] }>('/admin/categories'),
  createCategory: (payload: CategoryPayload) =>
    api<{ category: AdminCategory }>('/admin/categories', { method: 'POST', body: JSON.stringify(payload) }),
  updateCategory: (id: string, payload: Partial<CategoryPayload>) =>
    api<{ category: AdminCategory }>(`/admin/categories/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  archiveCategory: (id: string) =>
    api<{ ok: boolean }>(`/admin/categories/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  store: (slug: string) => api<{ store: PublicStore }>(`/stores/${encodeURIComponent(slug)}`),
  storeListings: (
    slug: string,
    params: { type?: ListingType; q?: string; sort?: 'recent' | 'price-asc' | 'price-desc' } = {},
  ) =>
    api<{ listings: Listing[] }>(
      withQuery(`/stores/${encodeURIComponent(slug)}/listings`, {
        type: params.type,
        q: params.q,
        sort: params.sort,
      }),
    ),
  listing: (id: string) => api<{ listing: Listing }>(`/listings/${encodeURIComponent(id)}`),
  reportListing: (id: string, payload: { reason: 'INAPPROPRIATE' | 'FRAUD' | 'PROHIBITED' | 'MISLEADING' | 'OTHER'; details?: string }) =>
    api<{ ok: true; reportId: string }>(`/listings/${encodeURIComponent(id)}/reports`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  reviews: (slug: string) =>
    api<{ enabled: boolean; count: number; average: number | null; reviews: StoreReview[] }>(
      `/stores/${encodeURIComponent(slug)}/reviews`,
    ),
  dashboard: (status?: OrderStatus) =>
    api<MerchantDashboard>(`/me/dashboard${status ? `?status=${encodeURIComponent(status)}` : ''}`),
  merchantListing: (id: string) =>
    api<{ listing: MerchantListing }>(`/me/listings/${encodeURIComponent(id)}`),
  createListing: (form: FormData) =>
    api<{ listing: MerchantListing }>('/me/listings', { method: 'POST', body: form }),
  updateListing: (id: string, payload: Partial<ListingPayload>) =>
    api<{ listing: MerchantListing }>(`/me/listings/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  archiveListing: (id: string) =>
    api<{ ok: boolean }>(`/me/listings/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  addPhotos: (id: string, files: File[]) => {
    const form = new FormData()
    files.forEach((file) => form.append('photos', file))
    return api<{ listing: MerchantListing }>(`/me/listings/${encodeURIComponent(id)}/photos`, {
      method: 'POST',
      body: form,
    })
  },
  removePhoto: (id: string, photoId: string) =>
    api<{ ok: boolean }>(`/me/listings/${encodeURIComponent(id)}/photos/${encodeURIComponent(photoId)}`, {
      method: 'DELETE',
    }),
}
