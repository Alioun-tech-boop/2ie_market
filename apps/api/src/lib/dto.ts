import type {
  DeliveryMode,
  Location,
  Role,
  Site,
  Store,
  User,
  UserStatus,
} from '@prisma/client'

export type AuthUserRecord = User & {
  location: Location
  store: (Store & { location: Location }) | null
}

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
    approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED'
    paymentProofUrl: string | null
    reviewNote: string | null
    reviewedAt: string | null
    createdAt: string
    location: { site: Site; reference: string }
  } | null
}

/** DTO privé : contient les coordonnées et la localisation du propriétaire uniquement. */
export function toSelfUser(user: AuthUserRecord): SelfUser {
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    phone: user.phoneE164,
    role: user.role,
    status: user.status,
    profilePhotoUrl: user.profilePhotoUrl,
    createdAt: user.createdAt.toISOString(),
    location: {
      site: user.location.site,
      buildingNumber: user.location.buildingNumber,
      roomNumber: user.location.roomNumber,
      floor: user.location.floor,
      reference: user.location.reference,
    },
    store: user.store
      ? {
          id: user.store.id,
          name: user.store.name,
          slug: user.store.slug,
          description: user.store.description,
          whatsapp: user.store.whatsappE164,
          logoUrl: user.store.logoUrl,
          deliveryModes: user.store.deliveryModes,
          isActive: user.store.isActive,
          approvalStatus: user.store.approvalStatus,
          paymentProofUrl: user.store.paymentProofUrl,
          reviewNote: user.store.reviewNote,
          reviewedAt: user.store.reviewedAt?.toISOString() ?? null,
          createdAt: user.store.createdAt.toISOString(),
          location: {
            site: user.store.location.site,
            reference: user.store.location.reference,
          },
        }
      : null,
  }
}

/** DTO public : aucun email, téléphone ni localisation détaillée (RG-17). */
export function toPublicUser(user: Pick<User, 'id' | 'firstName' | 'lastName' | 'profilePhotoUrl'>) {
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    profilePhotoUrl: user.profilePhotoUrl,
  }
}

/** Vue admin : coordonnées utiles à la modération, mais jamais chambre/bâtiment/étage. */
export function toAdminUser(user: AuthUserRecord) {
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    phone: user.phoneE164,
    role: user.role,
    status: user.status,
    site: user.location.site,
    createdAt: user.createdAt.toISOString(),
  }
}
