import { searchListingsQuerySchema } from '@2ie/shared'
import type { Prisma } from '@prisma/client'
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { authenticate } from '../middlewares/authenticate'
import { HttpError } from '../lib/errors'
import { listingCardInclude, toListingCard, toPublicListing, toPublicStore, toReviewDto } from '../lib/marketDto'
import { getPlatformSettings, toPlatformDto } from '../lib/platform'
import { prisma } from '../lib/prisma'

const listingInclude = {
  photos: true,
  category: true,
  store: { include: { location: true } },
} satisfies Prisma.ListingInclude

const slugParam = z.object({ slug: z.string().trim().min(1).max(160) })
const idParam = z.object({ id: z.string().uuid('Identifiant invalide.') })

const listQuery = z.object({
  type: z.enum(['PHYSICAL', 'SECOND_HAND', 'SERVICE']).optional(),
  q: z.string().trim().max(100).optional(),
  sort: z.enum(['recent', 'price-asc', 'price-desc']).default('recent'),
})

const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(1000).optional().nullable(),
}).strict()

const reportSchema = z
  .object({
    reason: z.enum(['INAPPROPRIATE', 'FRAUD', 'PROHIBITED', 'MISLEADING', 'OTHER']),
    details: z.string().trim().max(1000).optional(),
  })
  .strict()

async function findActiveStore(slug: string) {
  const store = await prisma.store.findUnique({
    where: {
      slug,
      isActive: true,
      approvalStatus: 'APPROVED',
      owner: { is: { status: 'ACTIVE' } },
    },
    include: { location: true },
  })
  if (!store) throw new HttpError(404, 'STORE_NOT_FOUND', 'Boutique introuvable.')
  return store
}

export async function catalogRoutes(app: FastifyInstance) {
  app.get('/platform', async () => {
    const settings = await getPlatformSettings()
    return { platform: toPlatformDto(settings) }
  })

  app.get('/categories', async () => {
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      orderBy: [{ position: 'asc' }, { name: 'asc' }],
      select: {
        id: true,
        name: true,
        slug: true,
        icon: true,
        position: true,
        _count: {
          select: {
            listings: { where: { status: 'PUBLISHED', store: { isActive: true, approvalStatus: 'APPROVED', owner: { is: { status: 'ACTIVE' } } } } },
          },
        },
      },
    })
    return {
      categories: categories.map(({ _count, ...category }) => ({
        ...category,
        count: _count.listings,
      })),
    }
  })

  app.get('/stores/:slug', async (request) => {
    const { slug } = slugParam.parse(request.params)
    const store = await findActiveStore(slug)
    const settings = await getPlatformSettings()

    const [products, services, aggregate] = await Promise.all([
      prisma.listing.count({
        where: { storeId: store.id, status: 'PUBLISHED', type: { in: ['PHYSICAL', 'SECOND_HAND'] } },
      }),
      prisma.listing.count({ where: { storeId: store.id, status: 'PUBLISHED', type: 'SERVICE' } }),
      settings.reviewsEnabled
        ? prisma.review.aggregate({ where: { storeId: store.id }, _avg: { rating: true }, _count: true })
        : Promise.resolve(null),
    ])

    return {
      store: toPublicStore(
        store,
        { products, services },
        {
          enabled: settings.reviewsEnabled,
          count: aggregate?._count ?? 0,
          average: aggregate?._avg.rating ? Math.round(aggregate._avg.rating * 10) / 10 : null,
        },
      ),
    }
  })

  app.get('/stores/:slug/listings', async (request) => {
    const { slug } = slugParam.parse(request.params)
    const { type, q, sort } = listQuery.parse(request.query)
    const store = await findActiveStore(slug)

    const orderBy: Prisma.ListingOrderByWithRelationInput[] =
      sort === 'price-asc'
        ? [{ isFeatured: 'desc' }, { priceCents: 'asc' }]
        : sort === 'price-desc'
          ? [{ isFeatured: 'desc' }, { priceCents: 'desc' }]
          : [{ isFeatured: 'desc' }, { publishedAt: 'desc' }]

    const listings = await prisma.listing.findMany({
      where: {
        storeId: store.id,
        status: 'PUBLISHED',
        ...(type ? { type } : {}),
        ...(q ? { title: { contains: q, mode: 'insensitive' as const } } : {}),
      },
      include: listingInclude,
      orderBy,
      take: 60,
    })

    return { listings: listings.map(toPublicListing) }
  })

  app.get('/listings', async (request) => {
    const { q, category, type, site, availability, minPriceCents, maxPriceCents, sort, page, limit } =
      searchListingsQuerySchema.parse(request.query)

    const priceCents: Prisma.IntFilter = {}
    if (minPriceCents !== undefined) priceCents.gte = minPriceCents
    if (maxPriceCents !== undefined) priceCents.lte = maxPriceCents

    const where: Prisma.ListingWhereInput = {
      status: 'PUBLISHED',
      store: {
        isActive: true,
        approvalStatus: 'APPROVED',
        owner: { is: { status: 'ACTIVE' } },
        ...(site ? { location: { is: { site } } } : {}),
      },
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: 'insensitive' as const } },
              { description: { contains: q, mode: 'insensitive' as const } },
              { store: { name: { contains: q, mode: 'insensitive' as const } } },
            ],
          }
        : {}),
      ...(category ? { category: { is: { slug: category } } } : {}),
      ...(type
        ? {
            type:
              type === 'PRODUCT'
                ? ({ in: ['PHYSICAL', 'SECOND_HAND'] } satisfies Prisma.EnumListingTypeFilter)
                : type,
          }
        : {}),
      ...(Object.keys(priceCents).length > 0 ? { priceCents } : {}),
      ...(availability ? { availability } : {}),
    }

    const orderBy: Prisma.ListingOrderByWithRelationInput[] =
      sort === 'popular'
        ? [{ isFeatured: 'desc' }, { viewsCount: 'desc' }, { publishedAt: 'desc' }]
        : sort === 'price-asc'
          ? [{ isFeatured: 'desc' }, { priceCents: 'asc' }, { publishedAt: 'desc' }]
          : sort === 'price-desc'
            ? [{ isFeatured: 'desc' }, { priceCents: 'desc' }, { publishedAt: 'desc' }]
            : [{ isFeatured: 'desc' }, { publishedAt: 'desc' }, { createdAt: 'desc' }]

    const [total, listings] = await prisma.$transaction([
      prisma.listing.count({ where }),
      prisma.listing.findMany({
        where,
        include: listingCardInclude,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
    ])

    return {
      listings: listings.map(toListingCard),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    }
  })

  app.get('/listings/:id', async (request) => {
    const { id } = idParam.parse(request.params)

    const existing = await prisma.listing.findFirst({
      where: { id, status: 'PUBLISHED', store: { isActive: true, approvalStatus: 'APPROVED', owner: { is: { status: 'ACTIVE' } } } },
      select: { id: true },
    })
    if (!existing) throw new HttpError(404, 'LISTING_NOT_FOUND', 'Annonce introuvable.')

    const listing = await prisma.listing.update({
      where: { id },
      data: { viewsCount: { increment: 1 } },
      include: listingInclude,
    })

    return { listing: toPublicListing(listing) }
  })

  app.post('/listings/:id/reports', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = idParam.parse(request.params)
    const payload = reportSchema.parse(request.body)

    const listing = await prisma.listing.findFirst({
      where: { id, status: 'PUBLISHED', store: { isActive: true } },
      select: { id: true, store: { select: { ownerId: true } } },
    })
    if (!listing) throw new HttpError(404, 'LISTING_NOT_FOUND', 'Annonce introuvable.')
    if (listing.store.ownerId === request.user!.id) {
      throw new HttpError(400, 'OWN_LISTING_REPORT', 'Vous ne pouvez pas signaler votre propre annonce.')
    }

    const existing = await prisma.report.findFirst({
      where: { listingId: id, reporterId: request.user!.id, status: 'OPEN' },
      select: { id: true },
    })
    if (existing) {
      throw new HttpError(409, 'REPORT_ALREADY_OPEN', 'Vous avez déjà signalé cette annonce.')
    }

    const report = await prisma.report.create({
      data: {
        listingId: id,
        reporterId: request.user!.id,
        reason: payload.reason,
        details: payload.details ?? null,
      },
      select: { id: true },
    })

    reply.code(201)
    return { ok: true, reportId: report.id }
  })

  app.get('/stores/:slug/reviews', async (request) => {
    const { slug } = slugParam.parse(request.params)
    const store = await findActiveStore(slug)
    const settings = await getPlatformSettings()

    if (!settings.reviewsEnabled) {
      return { enabled: false, reviews: [], count: 0, average: null }
    }

    const [aggregate, reviews] = await Promise.all([
      prisma.review.aggregate({ where: { storeId: store.id }, _avg: { rating: true }, _count: true }),
      prisma.review.findMany({
        where: { storeId: store.id },
        include: { author: { select: { firstName: true, lastName: true, profilePhotoUrl: true } } },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
    ])

    return {
      enabled: true,
      count: aggregate._count,
      average: aggregate._avg.rating ? Math.round(aggregate._avg.rating * 10) / 10 : null,
      reviews: reviews.map(toReviewDto),
    }
  })
  app.post('/stores/:slug/reviews', { preHandler: [authenticate] }, async (request, reply) => {
    const { slug } = slugParam.parse(request.params)
    const payload = reviewSchema.parse(request.body)
    const store = await findActiveStore(slug)
    const authorId = request.user!.id
    if (store.ownerId === authorId) {
      throw new HttpError(403, 'OWN_STORE_REVIEW', 'Vous ne pouvez pas noter votre propre boutique.')
    }
    const settings = await getPlatformSettings()
    if (!settings.reviewsEnabled) {
      throw new HttpError(403, 'REVIEWS_DISABLED', 'Les avis sont temporairement désactivés.')
    }
    const completedOrder = await prisma.order.findFirst({
      where: { storeId: store.id, clientId: authorId, status: 'COMPLETED' },
      select: { id: true },
    })
    if (!completedOrder) {
      throw new HttpError(403, 'PURCHASE_REQUIRED', 'Vous pourrez laisser un avis après une commande terminée auprès de cette boutique.')
    }
    const review = await prisma.review.upsert({
      where: { storeId_authorId: { storeId: store.id, authorId } },
      create: { storeId: store.id, authorId, rating: payload.rating, comment: payload.comment?.trim() || null },
      update: { rating: payload.rating, comment: payload.comment?.trim() || null },
      include: { author: { select: { firstName: true, lastName: true, profilePhotoUrl: true } } },
    })
    reply.code(201)
    return { review: toReviewDto(review) }
  })
}
