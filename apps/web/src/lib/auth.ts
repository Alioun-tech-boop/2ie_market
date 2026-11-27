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
    logoUrl: string | null
    deliveryModes: DeliveryMode[]
    isActive: boolean
    approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED'
    reviewNote: string | null
    reviewedAt: string | null
    subscriptionExpiresAt: string | null
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

export const API_URL = import.meta.env.VITE_API_URL ?? (import.meta.env.PROD ? '/api' : 'http://localhost:3000')

/** Résout les URL d'images historiques (/uploads) et les URL publiques Supabase. */
export function assetUrl(path: string | null | undefined): string | null {
  const value = path?.trim()
  if (!value) return null
  if (/^(https?:)?\/\//i.test(value) || /^(data:|blob:)/i.test(value)) return value
  const base = API_URL.replace(/\/+$/, '')
  const normalizedPath = value.startsWith('/') ? value : `/${value}`
  if (base.endsWith('/api') && normalizedPath.startsWith('/api/')) {
    return `${base}${normalizedPath.slice(4)}`
  }
  return `${base}${normalizedPath}`
}

let refreshInFlight: Promise<boolean> | null = null

async function refreshSessionOnce(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = fetch(`${API_URL}/v1/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    }).then((response) => response.ok).catch(() => false)
      .finally(() => { refreshInFlight = null })
  }
  return refreshInFlight
}

function publicErrorMessage(code: string, status: number): string {
  const messages: Record<string, string> = {
    UNAUTHENTICATED: 'Votre session a expiré. Connectez-vous à nouveau.',
    INVALID_SESSION: 'Votre session a expiré. Connectez-vous à nouveau.',
    INVALID_REFRESH_TOKEN: 'Votre session a expiré. Connectez-vous à nouveau.',
    ACCOUNT_SUSPENDED: 'Ce compte est temporairement indisponible.',
    MERCHANT_PENDING: 'Votre demande vendeur est encore en attente de validation.',
    MERCHANT_REJECTED: 'Votre demande vendeur a été refusée. Contactez l’administration.',
    MERCHANT_NOT_APPROVED: 'Cette fonction sera accessible après validation de votre compte vendeur.',
    SUBSCRIPTION_EXPIRED: 'Votre abonnement vendeur est expiré. Renouvelez-le pour réactiver votre boutique.',
    SUBSCRIPTION_PAYMENT_PENDING: 'Votre preuve de renouvellement est déjà en cours de vérification.',
    PAYMENT_PROOF_REQUIRED: 'La preuve de paiement des frais vendeur de 1 000 FCFA est obligatoire.',
    STORAGE_SIGN_FAILED: 'Le justificatif de paiement est temporairement inaccessible. Réessayez.',
    ORIGIN_FORBIDDEN: 'Cette action n’a pas pu être effectuée. Actualisez la page puis réessayez.',
    LISTING_NOT_FOUND: 'Cette annonce n’est plus disponible.',
    CONFLICT: 'Cette opération ne peut pas être effectuée avec ces informations.',
    FILE_TOO_LARGE: 'Le fichier est trop volumineux. Choisissez une image de moins de 2 Mo.',
    INVALID_IMAGE: 'Le fichier image ne peut pas être utilisé. Essayez un autre format.',
    STORAGE_NOT_CONFIGURED: 'Le stockage des images doit être configuré par l’administrateur.',
    STORAGE_UNAVAILABLE: 'Le stockage des images est temporairement indisponible. Réessayez.',
    STORAGE_UPLOAD_FAILED: 'L’image n’a pas pu être enregistrée. Réessayez dans quelques instants.',
    VALIDATION_ERROR: 'Certaines informations sont incorrectes. Vérifiez les champs indiqués.',
  }
  if (messages[code]) return messages[code]
  if (status === 401) return 'Votre session a expiré. Connectez-vous à nouveau.'
  if (status === 403) return 'Vous n’êtes pas autorisé à effectuer cette action.'
  if (status === 404) return 'Le contenu demandé est introuvable.'
  if (status === 409) return 'Cette opération est momentanément impossible.'
  if (status >= 500) return 'Le service rencontre un problème. Réessayez dans quelques instants.'
  return 'Une erreur est survenue. Vérifiez les informations puis réessayez.'
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const isFormData = options.body instanceof FormData
  const request = () => fetch(`${API_URL}/v1${path}`, {
    ...options,
    credentials: 'include',
    headers: isFormData
      ? options.headers
      : { 'Content-Type': 'application/json', ...options.headers },
  })

  let response = await request()
  const canRefresh = response.status === 401 &&
    !['/auth/refresh', '/auth/session', '/auth/login', '/auth/register', '/auth/logout'].includes(path)
  if (canRefresh && await refreshSessionOnce()) response = await request()

  const data: Record<string, unknown> = await response.json().catch(() => ({}))
  if (!response.ok) {
    const code = typeof data.error === 'string' ? data.error : 'UNKNOWN_ERROR'
    throw new ApiError(response.status, code, publicErrorMessage(code, response.status), data.issues as FieldIssues | undefined)
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
  register: (payload: RegisterPayload, paymentProof?: File) => {
    if (!paymentProof) {
      return api<UserResponse>('/auth/register', { method: 'POST', body: JSON.stringify(payload) })
    }
    const form = new FormData()
    form.append('payload', JSON.stringify(payload))
    form.append('photos', paymentProof)
    return api<UserResponse>('/auth/register', { method: 'POST', body: form })
  },
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
