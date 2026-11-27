import type { DeliveryMode } from '@prisma/client'
import type { FastifyInstance, FastifyReply } from 'fastify'
import {
  generateReference,
  locationSchema,
  loginSchema,
  registerSchema,
  toE164,
  updateProfileSchema,
  updateStoreSchema,
} from '@2ie/shared'
import { config } from '../config'
import { authenticate } from '../middlewares/authenticate'
import { authorize } from '../middlewares/authorize'
import { clearAuthCookies, setAuthCookies } from '../lib/cookies'
import { toSelfUser, type SelfUser } from '../lib/dto'
import { HttpError } from '../lib/errors'
import { storeOptimizedImage, storePrivateImage } from '../lib/images'
import { hashPassword, verifyPassword } from '../lib/password'
import { prisma } from '../lib/prisma'
import { uniqueSlug } from '../lib/slug'
import { readMultipart } from '../lib/multipart'
import {
  hashRefreshToken,
  newRefreshToken,
  REFRESH_TTL_MS,
  signAccessToken,
  verifyAccessToken,
} from '../lib/tokens'

const DEFAULT_DELIVERY_MODES: DeliveryMode[] = ['HAND_DELIVERY', 'MEETUP_POINT']
const AUTH_RATE_LIMIT = { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } }

async function issueSession(reply: FastifyReply, userId: string) {
  const accessToken = signAccessToken(userId)
  const refreshToken = newRefreshToken()
  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash: hashRefreshToken(refreshToken),
      expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
    },
  })
  setAuthCookies(reply, accessToken, refreshToken)
}

async function currentUserDto(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { location: true, store: { include: { location: true } } },
  })
  if (!user) throw new HttpError(401, 'UNAUTHENTICATED', 'Compte introuvable.')
  return toSelfUser(user)
}

async function userFromAccess(reply: FastifyReply, token: string): Promise<SelfUser | null> {
  let userId: string
  try {
    userId = verifyAccessToken(token)
  } catch {
    return null
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { location: true, store: { include: { location: true } } },
  })
  if (!user || user.status !== 'ACTIVE') {
    clearAuthCookies(reply)
    return null
  }
  return toSelfUser(user)
}

async function rotateRefresh(reply: FastifyReply, token: string): Promise<SelfUser | null> {
  const record = await prisma.refreshToken.findUnique({
    where: { tokenHash: hashRefreshToken(token) },
    include: { user: true },
  })

  if (!record || record.revokedAt || record.expiresAt <= new Date() || record.user.status !== 'ACTIVE') {
    clearAuthCookies(reply)
    return null
  }

  const rotated = newRefreshToken()
  const now = new Date()
  // Rotation atomique : deux requêtes simultanées ne peuvent pas réutiliser le même refresh token.
  const claimed = await prisma.$transaction(async (tx) => {
    const result = await tx.refreshToken.updateMany({
      where: { id: record.id, revokedAt: null, expiresAt: { gt: now } },
      data: { revokedAt: now },
    })
    if (result.count !== 1) return false
    await tx.refreshToken.create({
      data: {
        userId: record.userId,
        tokenHash: hashRefreshToken(rotated),
        expiresAt: new Date(now.getTime() + REFRESH_TTL_MS),
      },
    })
    return true
  })

  if (!claimed) {
    clearAuthCookies(reply)
    return null
  }
  setAuthCookies(reply, signAccessToken(record.userId), rotated)
  return currentUserDto(record.userId)
}

export async function authRoutes(app: FastifyInstance) {
  app.post('/auth/register', AUTH_RATE_LIMIT, async (request, reply) => {
    let data: ReturnType<typeof registerSchema.parse>
    let paymentProofUrl: string | null = null
    let paymentProof: { buffer: Buffer; mimetype: string } | null = null
    if (request.isMultipart()) {
      const { fields, files } = await readMultipart(request, 1)
      if (!fields.payload) throw new HttpError(400, 'REGISTRATION_DATA_REQUIRED', 'Les informations du compte sont manquantes.')
      let payload: unknown
      try {
        payload = JSON.parse(fields.payload)
      } catch {
        throw new HttpError(400, 'INVALID_REGISTRATION_DATA', 'Les informations du compte sont invalides.')
      }
      data = registerSchema.parse(payload)
      if (data.role !== 'MERCHANT') throw new HttpError(400, 'INVALID_REGISTRATION_ROLE', 'Ce formulaire est réservé aux vendeurs.')
      if (!files[0]) throw new HttpError(400, 'PAYMENT_PROOF_REQUIRED', 'Téléversez la preuve de paiement des frais vendeur.')
      paymentProof = files[0]
    } else {
      data = registerSchema.parse(request.body)
      if (data.role === 'MERCHANT') {
        throw new HttpError(400, 'PAYMENT_PROOF_REQUIRED', 'Une preuve de paiement de 1 000 FCFA est obligatoire pour créer un compte vendeur.')
      }
    }

    const existing = await prisma.user.findUnique({ where: { email: data.email } })
    if (existing) {
      throw new HttpError(409, 'EMAIL_EXISTS', 'Un compte existe déjà avec cette adresse e-mail.')
    }

    if (paymentProof) {
      paymentProofUrl = await storePrivateImage(paymentProof.buffer, paymentProof.mimetype)
    }

    const phone = toE164(data.phone)!
    const reference = generateReference(data.buildingNumber, data.roomNumber, data.floor)
    const locationData = {
      site: data.site,
      buildingNumber: data.buildingNumber,
      roomNumber: data.roomNumber,
      floor: data.floor,
      reference,
    }

    const user = await prisma.user.create({
      data: {
        email: data.email,
        passwordHash: await hashPassword(data.password),
        role: data.role,
        firstName: data.firstName,
        lastName: data.lastName,
        phoneE164: phone,
        location: { create: locationData },
        store:
          data.role === 'MERCHANT'
            ? {
                create: {
                  name: data.storeName!,
                  slug: uniqueSlug(data.storeName!),
                  description: data.description!,
                  whatsappE164: phone,
                  location: { create: locationData },
                  deliveryModes: DEFAULT_DELIVERY_MODES,
                  isActive: data.role !== 'MERCHANT',
                  approvalStatus: data.role === 'MERCHANT' ? 'PENDING' : 'APPROVED',
                  paymentProofUrl,
                },
              }
            : undefined,
      },
      include: { location: true, store: { include: { location: true } } },
    })

    await issueSession(reply, user.id)
    return reply.code(201).send({ user: toSelfUser(user) })
  })

  app.post('/auth/login', AUTH_RATE_LIMIT, async (request, reply) => {
    const data = loginSchema.parse(request.body)
    const user = await prisma.user.findUnique({ where: { email: data.email } })

    if (!user || !(await verifyPassword(user.passwordHash, data.password))) {
      throw new HttpError(401, 'INVALID_CREDENTIALS', 'Adresse e-mail ou mot de passe incorrect.')
    }
    if (user.status !== 'ACTIVE') {
      throw new HttpError(403, 'ACCOUNT_SUSPENDED', 'Ce compte est suspendu.')
    }

    await issueSession(reply, user.id)
    return { user: await currentUserDto(user.id) }
  })

  app.post('/auth/refresh', { config: { rateLimit: { max: 30, timeWindow: '1 minute' } } }, async (request, reply) => {
    const token = request.cookies.refresh_token
    if (!token) throw new HttpError(401, 'NO_REFRESH_TOKEN', 'Session introuvable.')

    const user = await rotateRefresh(reply, token)
    if (!user) throw new HttpError(401, 'INVALID_REFRESH_TOKEN', 'Session expirée.')
    return { user }
  })

  /** Sonde de session silencieuse : 200 avec `user: null` pour un visiteur. */
  app.get('/auth/session', async (request, reply) => {
    const accessToken = request.cookies.access_token
    if (accessToken) {
      const user = await userFromAccess(reply, accessToken)
      if (user) return { user }
    }

    const refreshToken = request.cookies.refresh_token
    if (refreshToken) return { user: await rotateRefresh(reply, refreshToken) }

    clearAuthCookies(reply)
    return { user: null }
  })

  app.post('/auth/logout', async (request, reply) => {
    const token = request.cookies.refresh_token
    if (token) {
      await prisma.refreshToken.updateMany({
        where: { tokenHash: hashRefreshToken(token) },
        data: { revokedAt: new Date() },
      })
    }
    clearAuthCookies(reply)
    return { ok: true }
  })

  app.get('/auth/me', { preHandler: authenticate }, async (request) => {
    return { user: toSelfUser(request.user!) }
  })

  app.patch('/me', { preHandler: authenticate }, async (request) => {
    const data = updateProfileSchema.parse(request.body)
    const update: {
      firstName?: string
      lastName?: string
      phoneE164?: string
      profilePhotoUrl?: string | null
    } = {}

    if (data.firstName) update.firstName = data.firstName
    if (data.lastName) update.lastName = data.lastName
    if (data.phone) update.phoneE164 = toE164(data.phone)!
    if (data.profilePhotoUrl !== undefined) update.profilePhotoUrl = data.profilePhotoUrl

    await prisma.user.update({ where: { id: request.user!.id }, data: update })
    return { user: await currentUserDto(request.user!.id) }
  })

  app.patch('/me/location', { preHandler: authenticate }, async (request) => {
    const data = locationSchema.parse(request.body)
    const reference = generateReference(data.buildingNumber, data.roomNumber, data.floor)
    const locationData = {
      site: data.site,
      buildingNumber: data.buildingNumber,
      roomNumber: data.roomNumber,
      floor: data.floor,
      reference,
    }

    await prisma.location.update({ where: { id: request.user!.locationId }, data: locationData })
    if (request.user!.store) {
      await prisma.location.update({
        where: { id: request.user!.store.locationId },
        data: locationData,
      })
    }

    return { user: await currentUserDto(request.user!.id) }
  })

  app.patch('/me/store', { preHandler: [authenticate, authorize('MERCHANT')] }, async (request) => {
    const store = await prisma.store.findUnique({ where: { ownerId: request.user!.id }, select: { approvalStatus: true } })
    if (!store || store.approvalStatus !== 'APPROVED') {
      throw new HttpError(403, 'MERCHANT_NOT_APPROVED', 'La boutique sera modifiable après validation administrative.')
    }
    const data = updateStoreSchema.parse(request.body)
    const update: {
      name?: string
      description?: string
      logoUrl?: string | null
      deliveryModes?: DeliveryMode[]
    } = {}

    if (data.name) update.name = data.name
    if (data.description) update.description = data.description
    if (data.logoUrl !== undefined) update.logoUrl = data.logoUrl
    if (data.deliveryModes) update.deliveryModes = data.deliveryModes

    await prisma.store.update({ where: { ownerId: request.user!.id }, data: update })
    return { user: await currentUserDto(request.user!.id) }
  })

  app.post('/me/photo', { preHandler: authenticate }, async (request) => {
    const part = await request.file({ limits: { fileSize: config.maxPhotoBytes, files: 1 } })
    if (!part) throw new HttpError(400, 'MISSING_FILE', 'Aucune image reçue.')

    const fields = part.fields as Record<string, { value: string }> | undefined
    const kind = fields?.kind?.value ?? 'profile'
    if (kind === 'logo' && request.user!.role !== 'MERCHANT') {
      throw new HttpError(403, 'FORBIDDEN', 'Seul un commerçant peut modifier le logo de sa boutique.')
    }

    const stored = await storeOptimizedImage(await part.toBuffer(), part.mimetype)

    if (kind === 'logo') {
      const store = await prisma.store.findUnique({ where: { ownerId: request.user!.id }, select: { approvalStatus: true } })
      if (!store || store.approvalStatus !== 'APPROVED') {
        throw new HttpError(403, 'MERCHANT_NOT_APPROVED', 'Le logo de la boutique sera modifiable après validation administrative.')
      }
      await prisma.store.update({ where: { ownerId: request.user!.id }, data: { logoUrl: stored.url } })
    } else {
      await prisma.user.update({ where: { id: request.user!.id }, data: { profilePhotoUrl: stored.url } })
    }

    return { url: stored.url, user: await currentUserDto(request.user!.id) }
  })
}
