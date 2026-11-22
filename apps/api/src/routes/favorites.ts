import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { HttpError } from '../lib/errors'
import { listingCardInclude, toListingCard } from '../lib/marketDto'
import { prisma } from '../lib/prisma'
import { authenticate } from '../middlewares/authenticate'

const listingParam = z.object({ listingId: z.string().uuid('Annonce invalide.') })

async function assertListable(listingId: string) {
  const listing = await prisma.listing.findFirst({
    where: { id: listingId, status: { notIn: ['ARCHIVED', 'DRAFT'] } },
    select: { id: true },
  })
  if (!listing) throw new HttpError(404, 'LISTING_NOT_FOUND', 'Annonce introuvable.')
}

export async function favoriteRoutes(app: FastifyInstance) {
  const guard = { preHandler: [authenticate] }

  app.get('/favorites', guard, async (request) => {
    const favorites = await prisma.favorite.findMany({
      where: { userId: request.user!.id, listing: { status: { not: 'ARCHIVED' } } },
      include: { listing: { include: listingCardInclude } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })

    return {
      favorites: favorites.map((favorite) => ({
        listing: toListingCard(favorite.listing),
        savedAt: favorite.createdAt.toISOString(),
      })),
    }
  })

  app.post('/favorites/:listingId', guard, async (request) => {
    const { listingId } = listingParam.parse(request.params)
    await assertListable(listingId)
    await prisma.favorite.upsert({
      where: { userId_listingId: { userId: request.user!.id, listingId } },
      create: { userId: request.user!.id, listingId },
      update: {},
    })
    return { ok: true, listingId }
  })

  app.delete('/favorites/:listingId', guard, async (request) => {
    const { listingId } = listingParam.parse(request.params)
    await prisma.favorite.deleteMany({
      where: { userId: request.user!.id, listingId },
    })
    return { ok: true, listingId }
  })
}
