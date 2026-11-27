import type { Site } from '@2ie/shared'
import { api, type DeliveryMode, type Role, type UserStatus } from './auth'
import type { OrderStatus } from './orderLabels'
import type { Availability, ListingStatus, ListingType } from './market'

export type ReportReason = 'INAPPROPRIATE' | 'FRAUD' | 'PROHIBITED' | 'MISLEADING' | 'OTHER'
export type ReportStatus = 'OPEN' | 'RESOLVED' | 'DISMISSED'
export type ModerationAction = 'HIDE' | 'RESTORE' | 'DELETE'

export interface AdminPagination {
  page: number
  limit: number
  total: number
  pages: number
}

export interface MerchantApplication {
  id: string
  status: 'PENDING' | 'REJECTED'
  storeName: string
  description: string
  paymentAmount: number
  paymentProofUrl: string | null
  reviewNote: string | null
  createdAt: string
  owner: { id: string; firstName: string; lastName: string; email: string; phone: string; createdAt: string }
  location: { site: Site; buildingNumber: string; roomNumber: string; floor: number; reference: string }
}

export interface SubscriptionRenewal {
  id: string
  amount: number
  status: 'PENDING'
  submittedAt: string
  proofUrl: string | null
  store: {
    id: string
    name: string
    expiresAt: string | null
    owner: { id: string; firstName: string; lastName: string; email: string; phoneE164: string; status: UserStatus }
  }
}

export interface OverdueSubscription {
  id: string
  name: string
  expiresAt: string
  owner: { id: string; firstName: string; lastName: string; email: string; phoneE164: string }
}

export interface AdminUserSummary {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  role: Role
  status: UserStatus
  site: Site
  createdAt: string
}

export interface AdminUserDetail extends AdminUserSummary {
  orders: number
  orderGroups: number
  reviews: number
  favorites: number
  reports: number
  listings: number
  reportsReceived: number
  store: {
    id: string
    name: string
    slug: string
    isActive: boolean
    site: Site
    createdAt: string
  } | null
}

export interface AdminListing {
  id: string
  reference: string
  title: string
  type: ListingType
  status: ListingStatus
  priceCents: number
  currency: string
  availability: Availability
  isFeatured: boolean
  viewsCount: number
  category: { id: string; name: string; slug: string } | null
  store: { id: string; name: string; slug: string; isActive: boolean; site: Site }
  photo: { url: string; thumbUrl: string } | null
  reports: number
  createdAt: string
  publishedAt: string | null
}

export interface AdminOrderGroup {
  id: string
  reference: string
  status: OrderStatus
  totalCents: number
  currency: string
  site: Site
  deliveryMode: DeliveryMode
  client: { id: string; firstName: string; lastName: string }
  createdAt: string
  orders: Array<{
    id: string
    orderNumber: string
    status: OrderStatus
    totalCents: number
    currency: string
    itemCount: number
    store: { id: string; name: string; slug: string; site: Site }
  }>
}

export interface AdminReport {
  id: string
  reason: ReportReason
  details: string | null
  status: ReportStatus
  resolutionNote: string | null
  resolvedAt: string | null
  createdAt: string
  listing: {
    id: string
    title: string
    status: ListingStatus
    store: { id: string; name: string; slug: string }
  }
  reporter: { id: string; firstName: string; lastName: string }
  resolvedBy: { id: string; firstName: string; lastName: string } | null
}

export interface AdminAuditEntry {
  id: string
  action: string
  targetType: string
  targetId: string | null
  meta: unknown
  createdAt: string
  actor: { id: string; firstName: string; lastName: string; email: string } | null
}

export interface PlatformSettings {
  name: string
  logoUrl: string | null
  supportEmail: string | null
  maintenanceMessage: string | null
  reviewsEnabled: boolean
  updatedAt: string
}

export interface AdminOverview {
  stats: {
    users: number
    activeUsers: number
    suspendedUsers: number
    clients: number
    merchants: number
    admins: number
    stores: number
    categories: number
    listings: number
    publishedListings: number
    pausedListings: number
    archivedListings: number
    featuredListings: number
    orderGroups: number
    orders: number
    pendingOrders: number
    completedOrders: number
    cancelledOrders: number
    gmvCents: number
    reports: number
    openReports: number
    resolvedReports: number
    dismissedReports: number
  }
  bySite: Array<{ site: Site; users: number; listings: number; orders: number; gmvCents: number }>
  byStatus: Array<{ status: OrderStatus; count: number }>
  recentAudit: AdminAuditEntry[]
}

function withQuery(path: string, params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') search.set(key, String(value))
  })
  const query = search.toString()
  return query ? `${path}?${query}` : path
}

export const adminApi = {
  overview: () => api<AdminOverview>('/admin/overview'),

  merchantApplications: () => api<{ applications: MerchantApplication[] }>('/admin/merchant-applications'),

  subscriptionRenewals: () => api<{ renewals: SubscriptionRenewal[]; overdue: OverdueSubscription[] }>('/admin/subscription-renewals'),

  decideSubscriptionRenewal: (id: string, decision: 'APPROVE' | 'REJECT', note?: string) =>
    api<{ ok: boolean; status: 'APPROVED' | 'REJECTED' }>(`/admin/subscription-renewals/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify({ decision, note }),
    }),

  decideMerchantApplication: (id: string, decision: 'APPROVE' | 'REJECT', note?: string) =>
    api<{ ok: boolean; status: 'APPROVED' | 'REJECTED' }>(`/admin/merchant-applications/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify({ decision, note }),
    }),

  users: (params: {
    q?: string
    role?: Role
    status?: UserStatus
    page?: number
    limit?: number
  } = {}) => api<{ users: AdminUserSummary[]; pagination: AdminPagination }>(withQuery('/admin/users', params)),

  user: (id: string) => api<{ user: AdminUserDetail }>(`/admin/users/${encodeURIComponent(id)}`),

  setUserStatus: (id: string, status: UserStatus) =>
    api<{ user: { id: string; status: UserStatus } }>(`/admin/users/${encodeURIComponent(id)}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  setUserRole: (id: string, role: 'CLIENT' | 'MERCHANT') =>
    api<{ user: { id: string; role: Role } }>(`/admin/users/${encodeURIComponent(id)}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    }),

  listings: (params: {
    q?: string
    status?: ListingStatus
    type?: ListingType
    site?: Site
    featured?: 'true' | 'false'
    page?: number
    limit?: number
  } = {}) =>
    api<{ listings: AdminListing[]; pagination: AdminPagination }>(withQuery('/admin/listings', params)),

  moderateListing: (id: string, action: ModerationAction) =>
    api<{ ok: boolean; status: ListingStatus }>(`/admin/listings/${encodeURIComponent(id)}/moderation`, {
      method: 'PATCH',
      body: JSON.stringify({ action }),
    }),

  setListingFeatured: (id: string, featured: boolean) =>
    api<{ listing: { id: string; isFeatured: boolean } }>(`/admin/listings/${encodeURIComponent(id)}/featured`, {
      method: 'PATCH',
      body: JSON.stringify({ featured }),
    }),

  orders: (params: {
    q?: string
    site?: Site
    status?: OrderStatus
    page?: number
    limit?: number
  } = {}) =>
    api<{
      groups: AdminOrderGroup[]
      stats: { pending: number; completed: number; gmvCents: number }
      pagination: AdminPagination
    }>(withQuery('/admin/orders', params)),

  reports: (params: { q?: string; status?: ReportStatus; page?: number; limit?: number } = {}) =>
    api<{ reports: AdminReport[]; pagination: AdminPagination }>(withQuery('/admin/reports', params)),

  updateReport: (id: string, status: Exclude<ReportStatus, 'OPEN'>, resolutionNote?: string) =>
    api<{ report: AdminReport }>(`/admin/reports/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify({ status, resolutionNote }),
    }),

  settings: () => api<{ settings: PlatformSettings }>('/admin/settings'),

  updateSettings: (payload: {
    platformName?: string
    supportEmail?: string | null
    maintenanceMessage?: string | null
    reviewsEnabled?: boolean
  }) =>
    api<{ settings: PlatformSettings }>('/admin/settings', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  uploadLogo: (file: File) => {
    const form = new FormData()
    form.append('photos', file)
    return api<{ settings: PlatformSettings }>('/admin/settings/logo', { method: 'POST', body: form })
  },

  removeLogo: () => api<{ settings: PlatformSettings }>('/admin/settings/logo', { method: 'DELETE' }),

  audit: (params: { page?: number; limit?: number } = {}) =>
    api<{ entries: AdminAuditEntry[]; pagination: AdminPagination }>(withQuery('/admin/audit', params)),
}
