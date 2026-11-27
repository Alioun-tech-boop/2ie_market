import { randomUUID } from 'node:crypto'
import { unlink } from 'node:fs/promises'
import { basename, join } from 'node:path'
import { Prisma } from '@prisma/client'
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { createListingSchema, updateListingSchema, ORDER_STATUSES } from '@2ie/shared'
import { config } from '../config'
import { authenticate } from '../middlewares/authenticate'
import { authorize } from '../middlewares/authorize'
import { HttpError } from '../lib/errors'
import { storeOptimizedImage } from '../lib/images'
import { parseJsonField, readMultipart } from '../lib/multipart'
import { toMerchantListing, toMerchantOrder, type ListingWithRelations } from '../lib/marketDto'
import { prisma } from '../lib/prisma'

const listingInclude = {
  photos: true,
  category: true,
  store: { include: { location: true } },
} satisfies Prisma.ListingInclude

const idParam = z.object({ id: z.string().uuid('Identifiant invalide.') })
const dashboardQuery = z.object({ status: z.enum(ORDER_STATUSES).optional() })
const photoParam = z.object({
  id: z.string().uuid('Identifiant invalide.'),
  photoId: z.string().uuid('Identifiant invalide.'),
})

function slugifyListing(title: string): string {
  const base = title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
  return `${base || 'annonce'}-${randomUUID().slice(0, 8)}`
}

async function ownedListing(userId: string, id: string): Promise<ListingWithRelations> {
  const listing = await prisma.listing.findFirst({
    where: { id, store: { ownerId: userId } },
    include: listingInclude,
  })
  if (!listing) throw new HttpError(404, 'LISTING_NOT_FOUND', 'Annonce introuvable.')
  return listing
}

async function assertCategory(categoryId: string) {
  const category = await prisma.category.findFirst({
    where: { id: categoryId, isActive: true },
    select: { id: true },
  })
  if (!category) throw new HttpError(400, 'INVALID_CATEGORY', 'Catégorie invalide.')
}

async function removeFiles(urls: (string | null)[]) {
  await Promise.all(
    urls.map((url) => {
      if (!url) return Promise.resolve()
      const name = basename(url)
      if (!/^[a-zA-Z0-9-]+\.webp$/.test(name)) return Promise.resolve()
      return unlink(join(config.uploadsDir, name)).catch(() => undefined)
    }),
  )
}

export async function merchantRoutes(app: FastifyInstance) {
  const requireApprovedMerchant = async (request: Parameters<NonNullable<FastifyInstance['addHook']>>[1] extends never ? never : any) => {
    const store = await prisma.store.findUnique({
      where: { ownerId: request.user!.id },
      select: { approvalStatus: true },
    })
    if (!store) throw new HttpError(404, 'STORE_NOT_FOUND', 'Boutique introuvable.')
    if (store.approvalStatus !== 'APPROVED') {
      throw new HttpError(
        403,
        store.approvalStatus === 'PENDING' ? 'MERCHANT_PENDING' : 'MERCHANT_REJECTED',
        store.approvalStatus === 'PENDING'
          ? 'Votre demande vendeur est en attente de validation administrative.'
          : 'Votre demande vendeur a été refusée. Contactez l’administration.',
      )
    }
  }
  const guard = { preHandler: [authenticate, authorize('MERCHANT'), requireApprovedMerchant] }

  app.get('/me/dashboard', guard, async (request) => {
    const { status } = dashboardQuery.parse(request.query ?? {})
    const store = await prisma.store.findUnique({
      where: { ownerId: request.user!.id },
      select: { id: true },
    })
    if (!store) throw new HttpError(404, 'STORE_NOT_FOUND', 'Boutique introuvable.')

    // Les indicateurs sont agrégés sur TOUTES les données de la boutique ;
    // seules les listes affichées sont limitées pour la performance.
    const [listings, listingCount, orders, listingTypes, orderStatuses, viewsAggregate] = await Promise.all([
      prisma.listing.findMany({
        where: { storeId: store.id, status: { not: 'ARCHIVED' } },
        include: listingInclude,
        orderBy: { updatedAt: 'desc' },
        take: 50,
      }),
      prisma.listing.count({ where: { storeId: store.id, status: { not: 'ARCHIVED' } } }),
      prisma.order.findMany({
        where: { storeId: store.id, ...(status ? { status } : {}) },
        include: { items: true, meetingPoint: true, orderGroup: { select: { reference: true } } },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      prisma.listing.groupBy({
        by: ['type'],
        where: { storeId: store.id, status: 'PUBLISHED' },
        _count: { _all: true },
      }),
      prisma.order.groupBy({
        by: ['status'],
        where: { storeId: store.id },
        _count: { _all: true },
      }),
      prisma.listing.aggregate({
        where: { storeId: store.id, status: { not: 'ARCHIVED' } },
        _sum: { viewsCount: true },
      }),
    ])

    const typeCounts = Object.fromEntries(
      listingTypes.map((row) => [row.type, row._count._all]),
    ) as Partial<Record<'PHYSICAL' | 'SECOND_HAND' | 'SERVICE', number>>
    const statusCounts = Object.fromEntries(
      orderStatuses.map((row) => [row.status, row._count._all]),
    ) as Partial<Record<(typeof ORDER_STATUSES)[number], number>>

    return {
      stats: {
        listings: listingCount,
        published: (typeCounts.PHYSICAL ?? 0) + (typeCounts.SECOND_HAND ?? 0) + (typeCounts.SERVICE ?? 0),
        products: (typeCounts.PHYSICAL ?? 0) + (typeCounts.SECOND_HAND ?? 0),
        services: typeCounts.SERVICE ?? 0,
        views: viewsAggregate._sum.viewsCount ?? 0,
        orders: ORDER_STATUSES.reduce((total, key) => total + (statusCounts[key] ?? 0), 0),
        pendingOrders: statusCounts.PENDING ?? 0,
        completedOrders: statusCounts.COMPLETED ?? 0,
        byStatus: ORDER_STATUSES.map((key) => ({ status: key, count: statusCounts[key] ?? 0 })),
      },
      listings: listings.map(toMerchantListing),
      orders: orders.map(toMerchantOrder),
    }
  })

  app.get('/me/listings', guard, async (request) => {
    const listings = await prisma.listing.findMany({
      where: { store: { ownerId: request.user!.id }, status: { not: 'ARCHIVED' } },
      include: listingInclude,
      orderBy: { updatedAt: 'desc' },
    })
    return { listings: listings.map(toMerchantListing) }
  })

  app.get('/me/listings/:id', guard, async (request) => {
    const { id } = idParam.parse(request.params)
    return { listing: toMerchantListing(await ownedListing(request.user!.id, id)) }
  })

  app.post('/me/listings', guard, async (request, reply) => {
    const store = await prisma.store.findUnique({
      where: { ownerId: request.user!.id },
      select: { id: true },
    })
    if (!store) throw new HttpError(404, 'STORE_NOT_FOUND', 'Boutique introuvable.')

    const { fields, files } = await readMultipart(request)
    if (files.length > config.maxPhotosPerListing) {
      throw new HttpError(400, 'TOO_MANY_PHOTOS', '6 photos maximum.')
    }

    const data = createListingSchema.parse({
      ...fields,
      options: parseJsonField(fields.options, []),
    })
    await assertCategory(data.categoryId)

    const optimized = await Promise.all(
      files.map(async (file, index) => ({
        ...(await storeOptimizedImage(file.buffer, file.mimetype)),
        position: index,
        alt: file.filename,
      })),
    )

    const listing = await prisma.listing.create({
      data: {
        storeId: store.id,
        categoryId: data.categoryId,
        type: data.type,
        title: data.title,
        slug: slugifyListing(data.title),
        description: data.description,
        priceCents: data.priceCents,
        currency: 'XOF',
        quantity: data.quantity ?? null,
        condition: data.condition ?? null,
        availability: data.availability,
        durationMinutes: data.durationMinutes ?? null,
        requirements: data.requirements ?? null,
        options: data.options as unknown as Prisma.InputJsonValue,
        status: data.status,
        publishedAt: data.status === 'PUBLISHED' ? new Date() : null,
        photos: {
          create: optimized.map(({ url, thumbUrl, width, height, bytes, position, alt }) => ({
            url,
            thumbUrl,
            width,
            height,
            bytes,
            position,
            alt,
          })),
        },
      },
      include: listingInclude,
    })

    return reply.code(201).send({ listing: toMerchantListing(listing) })
  })

  app.patch('/me/listings/:id', guard, async (request) => {
    const { id } = idParam.parse(request.params)
    const current = await ownedListing(request.user!.id, id)
    const data = updateListingSchema.parse(request.body)

    // Une annonce conservée dans une catégorie archivée reste modifiable tant
    // que le commerçant ne la déplace pas vers une autre catégorie.
    if (data.categoryId && data.categoryId !== current.categoryId) {
      await assertCategory(data.categoryId)
    }

    const update: Prisma.ListingUpdateInput = {}
    if (data.title) update.title = data.title
    if (data.description) update.description = data.description
    if (data.categoryId) update.category = { connect: { id: data.categoryId } }
    if (data.type) update.type = data.type
    if (data.priceCents !== undefined) update.priceCents = data.priceCents
    if (data.availability) update.availability = data.availability
    if (data.durationMinutes !== undefined) update.durationMinutes = data.durationMinutes
    if (data.requirements !== undefined) update.requirements = data.requirements
    if (data.options) update.options = data.options as unknown as Prisma.InputJsonValue
    if (data.status) {
      update.status = data.status
      if (data.status === 'PUBLISHED' && !current.publishedAt) update.publishedAt = new Date()
    }

    if (data.type === 'SERVICE') {
      update.condition = null
      update.quantity = null
    } else {
      if (data.condition) update.condition = data.condition
      if (data.quantity !== undefined) update.quantity = data.quantity
    }

    await prisma.listing.update({ where: { id }, data: update })
    return { listing: toMerchantListing(await ownedListing(request.user!.id, id)) }
  })

  app.delete('/me/listings/:id', guard, async (request) => {
    const { id } = idParam.parse(request.params)
    await ownedListing(request.user!.id, id)

    // Suppression "métier" : archivage, pour préserver l'historique des commandes.
    await prisma.listing.update({ where: { id }, data: { status: 'ARCHIVED' } })
    return { ok: true }
  })

  app.post('/me/listings/:id/photos', guard, async (request, reply) => {
    const { id } = idParam.parse(request.params)
    const current = await ownedListing(request.user!.id, id)
    const remaining = config.maxPhotosPerListing - current.photos.length
    if (remaining <= 0) throw new HttpError(400, 'TOO_MANY_PHOTOS', '6 photos maximum.')

    const { files } = await readMultipart(request, remaining)
    if (files.length === 0) throw new HttpError(400, 'MISSING_FILE', 'Aucune image reçue.')
    if (files.length > remaining) throw new HttpError(400, 'TOO_MANY_PHOTOS', '6 photos maximum.')

    const optimized = await Promise.all(
      files.map(async (file, index) => ({
        ...(await storeOptimizedImage(file.buffer, file.mimetype)),
        position: current.photos.length + index,
        alt: file.filename,
      })),
    )

    await prisma.listingPhoto.createMany({
      data: optimized.map(({ url, thumbUrl, width, height, bytes, position, alt }) => ({
        listingId: id,
        url,
        thumbUrl,
        width,
        height,
        bytes,
        position,
        alt,
      })),
    })

    return reply.code(201).send({ listing: toMerchantListing(await ownedListing(request.user!.id, id)) })
  })

  app.delete('/me/listings/:id/photos/:photoId', guard, async (request) => {
    const { id, photoId } = photoParam.parse(request.params)
    await ownedListing(request.user!.id, id)

    const photo = await prisma.listingPhoto.findFirst({ where: { id: photoId, listingId: id } })
    if (!photo) throw new HttpError(404, 'PHOTO_NOT_FOUND', 'Photo introuvable.')

    await prisma.listingPhoto.delete({ where: { id: photoId } })
    await removeFiles([photo.url, photo.thumbUrl])
    return { ok: true }
  })
}
