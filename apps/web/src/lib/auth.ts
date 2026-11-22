import type { Site } from '@2ie/shared'

export type Role = 'CLIENT' | 'MERCHANT' | 'ADMIN'
export type UserStatus = 'ACTIVE' | 'SUSPENDED'
export type DeliveryMode = 'HAND_DELIVERY' | 'MEETUP_POINT'

export interface SelfUser {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  role: Role
  status: UserStatus
  profilePhotoUrl: string | null
  createdAt: string
  location: {
    site: Site
    buildingNumber: string
    roomNumber: string
    floor: number
    reference: string
  }
  store: {
    id: string
    name: string
    slug: string
    description: string
    whatsapp: string
    logoUrl: string | null
    deliveryModes: DeliveryMode[]
    isActive: boolean
    createdAt: string
    location: { site: Site; reference: string }
  } | null
}

export interface FieldIssues {
  fieldErrors: Record<string, string[]>
  formErrors: string[]
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly issues?: FieldIssues,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

/** Les chemins `/uploads/...` renvoyés par l'API sont servis par le backend. */
export function assetUrl(path: string | null | undefined): string | null {
  if (!path) return null
  if (/^https?:\/\//i.test(path)) return path
  return `${API_URL}${path.startsWith('/') ? '' : '/'}${path}`
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const isFormData = options.body instanceof FormData
  const response = await fetch(`${API_URL}/v1${path}`, {
    credentials: 'include',
    ...options,
    headers: isFormData
      ? options.headers
      : { 'Content-Type': 'application/json', ...options.headers },
  })

  const data: Record<string, unknown> = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new ApiError(
      response.status,
      typeof data.error === 'string' ? data.error : 'UNKNOWN_ERROR',
      typeof data.message === 'string' ? data.message : 'Une erreur est survenue.',
      data.issues as FieldIssues | undefined,
    )
  }
  return data as T
}

export interface RegisterPayload {
  role: 'CLIENT' | 'MERCHANT'
  firstName: string
  lastName: string
  email: string
  password: string
  phone: string
  site: Site
  buildingNumber: string
  roomNumber: string
  floor: number
  storeName?: string
  description?: string
  whatsapp?: string
}

export interface LoginPayload {
  email: string
  password: string
}

type UserResponse = { user: SelfUser }

export const authApi = {
  session: () => api<{ user: SelfUser | null }>('/auth/session'),
  me: () => api<UserResponse>('/auth/me'),
  refresh: () => api<UserResponse>('/auth/refresh', { method: 'POST' }),
  login: (payload: LoginPayload) =>
    api<UserResponse>('/auth/login', { method: 'POST', body: JSON.stringify(payload) }),
  register: (payload: RegisterPayload) =>
    api<UserResponse>('/auth/register', { method: 'POST', body: JSON.stringify(payload) }),
  logout: () => api<{ ok: boolean }>('/auth/logout', { method: 'POST' }),
  updateProfile: (payload: {
    firstName?: string
    lastName?: string
    phone?: string
    profilePhotoUrl?: string | null
  }) => api<UserResponse>('/me', { method: 'PATCH', body: JSON.stringify(payload) }),
  updateLocation: (payload: {
    site: Site
    buildingNumber: string
    roomNumber: string
    floor: number
  }) => api<UserResponse>('/me/location', { method: 'PATCH', body: JSON.stringify(payload) }),
  updateStore: (payload: {
    name?: string
    description?: string
    whatsapp?: string
    logoUrl?: string | null
    deliveryModes?: DeliveryMode[]
  }) => api<UserResponse>('/me/store', { method: 'PATCH', body: JSON.stringify(payload) }),
  uploadPhoto: (file: File, kind: 'profile' | 'logo') => {
    const form = new FormData()
    form.append('file', file)
    form.append('kind', kind)
    return api<UserResponse>('/me/photo', { method: 'POST', body: form })
  },
  adminUsers: () => api<{ users: AdminUser[] }>('/admin/users'),
  setUserStatus: (id: string, status: 'ACTIVE' | 'SUSPENDED') =>
    api<{ user: { id: string; status: UserStatus } }>(`/admin/users/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
}

export interface AdminUser {
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
