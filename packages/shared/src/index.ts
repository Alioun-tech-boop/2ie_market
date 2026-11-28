import { z } from 'zod'

export const SITES = ['KAMBOINSIN', 'OUAGA'] as const
export const REGISTER_ROLES = ['CLIENT', 'MERCHANT'] as const
export const DELIVERY_MODES = ['HAND_DELIVERY', 'MEETUP_POINT'] as const
export const LISTING_TYPES = ['PHYSICAL', 'SECOND_HAND', 'SERVICE'] as const
export const LISTING_STATUSES = ['DRAFT', 'PUBLISHED', 'PAUSED', 'ARCHIVED'] as const
export const CONDITIONS = ['NEW', 'LIKE_NEW', 'GOOD', 'FAIR'] as const
export const AVAILABILITIES = ['AVAILABLE', 'OUT_OF_STOCK', 'PAUSED'] as const
export const SEARCH_SORTS = ['popular', 'recent', 'price-asc', 'price-desc'] as const

export type Site = (typeof SITES)[number]
export type RegisterRole = (typeof REGISTER_ROLES)[number]
export type ListingType = (typeof LISTING_TYPES)[number]
export type ListingStatus = (typeof LISTING_STATUSES)[number]
export type Condition = (typeof CONDITIONS)[number]
export type Availability = (typeof AVAILABILITIES)[number]
export type SearchSort = (typeof SEARCH_SORTS)[number]

export function slugify(value: unknown): string {
  // Les données historiques ou les réponses API peuvent contenir une valeur absente.
  // Normaliser ici évite qu'un undefined ne fasse planter .normalize()/.replace().
  const text = typeof value === 'string' ? value : value == null ? '' : String(value)
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120)
}

/** B1.87 R0 = bâtiment 1, chambre 87, rez-de-chaussée (RG-02). */
export function generateReference(buildingNumber: unknown, roomNumber: unknown, floor: unknown): string {
  const building = typeof buildingNumber === 'string' ? buildingNumber.trim().toUpperCase() : ''
  const room = typeof roomNumber === 'string' ? roomNumber.trim() : ''
  const safeFloor = typeof floor === 'number' && Number.isFinite(floor) ? floor : 0
  return `B${building}.${room} R${safeFloor}`
}

/** Numéro saisi → E.164. Accepte +226…, 0… et les formats locaux burkinabè. */
export function toE164(input: unknown, defaultCountryCode = '226'): string | null {
  if (typeof input !== 'string') return null
  const cleaned = input.replace(/[\s\-().]/g, '')
  if (/^\+\d{8,15}$/.test(cleaned)) return cleaned
  if (/^0\d{8,9}$/.test(cleaned)) return `+${defaultCountryCode}${cleaned.slice(1)}`
  if (/^\d{8,9}$/.test(cleaned)) return `+${defaultCountryCode}${cleaned}`
  return null
}

export const locationSchema = z.object({
  site: z.enum(SITES, { required_error: 'Sélectionnez le site de l’école.' }),
  buildingNumber: z
    .string({ required_error: 'Le numéro de bâtiment est obligatoire.' })
    .trim()
    .min(1, 'Le numéro de bâtiment est obligatoire.')
    .max(10, 'Le numéro de bâtiment ne doit pas dépasser 10 caractères.')
    .regex(/^[A-Za-z0-9]+$/, 'Utilisez uniquement des lettres et des chiffres.'),
  roomNumber: z
    .string({ required_error: 'Le numéro de chambre est obligatoire.' })
    .trim()
    .min(1, 'Le numéro de chambre est obligatoire.')
    .max(10, 'Le numéro de chambre ne doit pas dépasser 10 caractères.')
    .regex(/^\d+$/, 'Le numéro de chambre doit contenir uniquement des chiffres.'),
  floor: z.coerce
    .number({ invalid_type_error: 'Sélectionnez un étage valide.' })
    .int('L’étage doit être un nombre entier.')
    .min(0, 'Le rez-de-chaussée est 0.')
    .max(20, 'L’étage ne peut pas dépasser 20.'),
})

export const registerSchema = z
  .object({
    role: z.enum(REGISTER_ROLES, {
      required_error: 'Choisissez un type de compte.',
      invalid_type_error: 'Ce type de compte n’est pas autorisé.',
    }),
    firstName: z.string().trim().min(2, 'Le prénom doit contenir au moins 2 caractères.').max(80),
    lastName: z.string().trim().min(2, 'Le nom doit contenir au moins 2 caractères.').max(80),
    email: z
      .string()
      .trim()
      .email('Adresse e-mail invalide.')
      .max(160)
      .transform((value) => value.toLowerCase()),
    password: z
      .string()
      .min(12, 'Le mot de passe doit contenir au moins 12 caractères.')
      .max(128)
      .regex(/[a-z]/, 'Ajoutez au moins une minuscule.')
      .regex(/[A-Z]/, 'Ajoutez au moins une majuscule.')
      .regex(/[0-9]/, 'Ajoutez au moins un chiffre.'),
    phone: z.string().trim().refine((value) => toE164(value) !== null, 'Numéro de téléphone invalide.'),
    ...locationSchema.shape,
    storeName: z.string().trim().min(2).max(120).optional(),
    description: z.string().trim().min(20).max(2000).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.role !== 'MERCHANT') return
    if (!data.storeName || data.storeName.length < 2) {
      ctx.addIssue({ code: 'custom', path: ['storeName'], message: 'Le nom de la boutique est obligatoire.' })
    }
    if (!data.description || data.description.length < 20) {
      ctx.addIssue({
        code: 'custom',
        path: ['description'],
        message: 'Décrivez votre activité en au moins 20 caractères.',
      })
    }
  })

export const loginSchema = z.object({
  email: z.string().trim().email('Adresse e-mail invalide.').transform((value) => value.toLowerCase()),
  password: z.string().min(1, 'Le mot de passe est obligatoire.'),
})

export const updateProfileSchema = z
  .object({
    firstName: z.string().trim().min(2).max(80).optional(),
    lastName: z.string().trim().min(2).max(80).optional(),
    phone: z.string().trim().refine((value) => toE164(value) !== null, 'Numéro de téléphone invalide.').optional(),
    profilePhotoUrl: z.string().trim().max(500).optional().nullable(),
  })
  .strict('Champ non autorisé.')

export const updateStoreSchema = z
  .object({
    name: z.string().trim().min(2).max(120).optional(),
    description: z.string().trim().min(20).max(2000).optional(),
    logoUrl: z.string().trim().max(500).optional().nullable(),
    deliveryModes: z.array(z.enum(DELIVERY_MODES)).min(1).optional(),
  })
  .strict('Champ non autorisé.')

export const listingOptionSchema = z.object({
  name: z.string().trim().min(1, 'Nom de l’option requis.').max(80),
  priceCents: z.coerce.number().int().min(0).max(100_000_000),
})

const listingBaseSchema = z.object({
  title: z.string().trim().min(3, 'Le titre doit contenir au moins 3 caractères.').max(140),
  description: z.string().trim().min(10, 'Décrivez votre annonce en au moins 10 caractères.').max(4000),
  categoryId: z.string().uuid('Catégorie invalide.'),
  type: z.enum(LISTING_TYPES, { required_error: 'Choisissez un type d’annonce.' }),
  priceCents: z.coerce
    .number()
    .int('Le prix doit être un nombre entier.')
    .min(0, 'Le prix ne peut pas être négatif.')
    .max(100_000_000, 'Montant trop élevé.'),
  quantity: z.coerce.number().int().min(0).max(9999).optional().nullable(),
  condition: z.enum(CONDITIONS).optional().nullable(),
  availability: z.enum(AVAILABILITIES).default('AVAILABLE'),
  durationMinutes: z.coerce.number().int().min(15).max(10_080).optional().nullable(),
  requirements: z.string().trim().max(2000).optional().nullable(),
  options: z.array(listingOptionSchema).max(8, '8 options maximum.').default([]),
  status: z.enum(['DRAFT', 'PUBLISHED', 'PAUSED']).default('PUBLISHED'),
})

function validateListingShape(
  data: Partial<z.infer<typeof listingBaseSchema>>,
  ctx: z.RefinementCtx,
  partial = false,
) {
  if (data.type === 'SERVICE') {
    if (data.condition) {
      ctx.addIssue({ code: 'custom', path: ['condition'], message: 'Un service n’a pas d’état physique.' })
    }
    if (data.quantity) {
      ctx.addIssue({ code: 'custom', path: ['quantity'], message: 'Un service n’a pas de stock.' })
    }
    return
  }
  if (!partial || data.condition !== undefined) {
    if (!data.condition) {
      ctx.addIssue({
        code: 'custom',
        path: ['condition'],
        message: 'Précisez l’état : neuf ou occasion.',
      })
    }
  }
  if (!partial || data.quantity !== undefined) {
    if (data.quantity === undefined || data.quantity === null) {
      ctx.addIssue({
        code: 'custom',
        path: ['quantity'],
        message: 'Indiquez la quantité disponible.',
      })
    }
  }
}

export const createListingSchema = listingBaseSchema.superRefine((data, ctx) =>
  validateListingShape(data, ctx),
)

export const updateListingSchema = listingBaseSchema.partial().strict('Champ non autorisé.').superRefine(
  (data, ctx) => validateListingShape(data, ctx, true),
)

export const categorySchema = z.object({
  name: z.string().trim().min(2).max(120),
  slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(140).optional(),
  icon: z.string().trim().max(40).optional().nullable(),
  position: z.coerce.number().int().min(0).max(999).default(0),
  isActive: z.boolean().default(true),
  parentId: z.string().uuid().optional().nullable(),
})

export const updateCategorySchema = z
  .object({
    name: z.string().trim().min(2).max(120).optional(),
    slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(140).optional(),
    icon: z.string().trim().max(40).optional().nullable(),
    position: z.coerce.number().int().min(0).max(999).optional(),
    isActive: z.boolean().optional(),
    parentId: z.string().uuid().optional().nullable(),
  })
  .strict('Champ non autorisé.')

export const searchListingsQuerySchema = z
  .object({
    q: z.string().trim().max(100).optional(),
    category: z.string().trim().max(140).optional(),
    type: z.enum(['PRODUCT', 'PHYSICAL', 'SECOND_HAND', 'SERVICE']).optional(),
    site: z.enum(SITES).optional(),
    availability: z.enum(AVAILABILITIES).optional(),
    minPriceCents: z.coerce.number().int().min(0).optional(),
    maxPriceCents: z.coerce.number().int().min(0).optional(),
    sort: z.enum(SEARCH_SORTS).default('recent'),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(24).default(12),
  })
  .superRefine((data, ctx) => {
    if (
      data.minPriceCents !== undefined &&
      data.maxPriceCents !== undefined &&
      data.maxPriceCents < data.minPriceCents
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['maxPriceCents'],
        message: 'Le prix maximum doit être supérieur ou égal au prix minimum.',
      })
    }
  })

export const ORDER_STATUSES = [
  'PENDING',
  'CONFIRMED',
  'REJECTED',
  'PREPARING',
  'READY',
  'COMPLETED',
  'CANCELLED',
] as const
export type OrderStatus = (typeof ORDER_STATUSES)[number]

export const NOTIFICATION_TYPES = [
  'ORDER_PLACED',
  'NEW_ORDER',
  'ORDER_STATUS',
  'LISTING_ARCHIVED',
  'SUBSCRIPTION_REMINDER',
  'SUBSCRIPTION_EXPIRED',
  'SUBSCRIPTION_PAYMENT_SUBMITTED',
  'SUBSCRIPTION_PAYMENT_APPROVED',
  'SUBSCRIPTION_PAYMENT_REJECTED',
] as const
export type NotificationType = (typeof NOTIFICATION_TYPES)[number]

/** Transitions autorisées : un statut terminal ne peut plus évoluer. */
export const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ['CONFIRMED', 'REJECTED', 'CANCELLED'],
  CONFIRMED: ['PREPARING', 'CANCELLED'],
  REJECTED: [],
  PREPARING: ['READY', 'CANCELLED'],
  READY: ['COMPLETED', 'CANCELLED'],
  COMPLETED: ['CANCELLED'],
  CANCELLED: [],
}

export const cartItemSchema = z
  .object({
    listingId: z.string().uuid('Annonce invalide.'),
    quantity: z.coerce.number().int().min(1).max(99),
  })
  .strict('Champ non autorisé.')

export const cartNoteSchema = z
  .object({
    storeId: z.string().uuid('Boutique invalide.'),
    note: z.string().trim().max(500, 'La note ne peut pas dépasser 500 caractères.'),
  })
  .strict('Champ non autorisé.')

export const checkoutSchema = z
  .object({
    clientName: z.string().trim().min(2, 'Indiquez votre nom.').max(160),
    clientPhone: z.string().trim().min(8, 'Numéro de téléphone invalide.').max(20),
    site: z.enum(SITES),
    buildingNumber: z.string().trim().min(1, 'Indiquez le bâtiment.').max(10),
    roomNumber: z.string().trim().min(1, 'Indiquez la chambre.').max(10),
    floor: z.coerce.number().int().min(0).max(20),
    deliveryMode: z.enum(DELIVERY_MODES),
    meetingPointId: z.string().uuid().optional().nullable(),
  })
  .strict('Champ non autorisé.')
  .superRefine((data, ctx) => {
    if (data.deliveryMode === 'MEETUP_POINT' && !data.meetingPointId) {
      ctx.addIssue({
        code: 'custom',
        path: ['meetingPointId'],
        message: 'Choisissez un point de rendez-vous.',
      })
    }
    if (data.deliveryMode === 'HAND_DELIVERY' && data.meetingPointId) {
      ctx.addIssue({
        code: 'custom',
        path: ['meetingPointId'],
        message: 'Aucun point de rendez-vous ne doit être choisi pour une remise en main propre.',
      })
    }
  })

export const orderStatusSchema = z
  .object({ status: z.enum(ORDER_STATUSES) })
  .strict('Champ non autorisé.')
