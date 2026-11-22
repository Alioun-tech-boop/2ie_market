import { cartItemSchema, cartNoteSchema } from '@2ie/shared'
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { authenticate } from '../middlewares/authenticate'
import { HttpError } from '../lib/errors'
import { buildCartDto, cartItemInclude, type CartDto } from '../lib/orderDto'
import { prisma } from '../lib/prisma'

const listingParam = z.object({ listingId: z.string().uuid('Annonce invalide.') })
const quantityBody = z
  .object({ quantity: z.coerce.number().int().min(1).max(99) })
  .strict('Champ non autorisé.')

async function loadCart(userId: string): Promise<CartDto> {
  const [items, notes] = await Promise.all([
    prisma.cartItem.findMany({
      where: { userId },
      include: cartItemInclude,
      orderBy: { createdAt: 'asc' },
    }),
    prisma.cartNote.findMany({
      where: { userId },
      select: { storeId: true, note: true },
    }),
  ])
  return buildCartDto(items, notes)
}

async function loadPublishedListing(listingId: string, userId: string) {
  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    include: { store: { select: { isActive: true, ownerId: true } } },
  })
  if (
    !listing ||
    listing.status !== 'PUBLISHED' ||
    !listing.store.isActive ||
    listing.availability !== 'AVAILABLE'
  ) {
    throw new HttpError(404, 'LISTING_UNAVAILABLE', 'Cette annonce n’est plus disponible.')
  }
  if (listing.store.ownerId === userId) {
    throw new HttpError(403, 'OWN_LISTING', 'Vous ne pouvez pas commander votre propre annonce.')
  }
  return listing
}

function cappedQuantity(listing: { quantity: number | null }, requested: number): number {
  const cap = Math.min(99, listing.quantity ?? 99)
  if (cap < 1) throw new HttpError(409, 'OUT_OF_STOCK', 'Le stock de cette annonce est épuisé.')
  return Math.min(requested, cap)
}

export async function cartRoutes(app: FastifyInstance) {
  const guard = { preHandler: [authenticate] }

  app.get('/cart', guard, async (request) => {
    return { cart: await loadCart(request.user!.id) }
  })

  app.post('/cart/items', guard, async (request) => {
    const { listingId, quantity } = cartItemSchema.parse(request.body)
    const listing = await loadPublishedListing(listingId, request.user!.id)
    const next = cappedQuantity(listing, quantity)

    await prisma.cartItem.upsert({
      where: { userId_listingId: { userId: request.user!.id, listingId } },
      create: { userId: request.user!.id, listingId, quantity: next },
      update: { quantity: next },
    })

    return { cart: await loadCart(request.user!.id) }
  })

  app.patch('/cart/items/:listingId', guard, async (request) => {
    const { listingId } = listingParam.parse(request.params)
    const { quantity } = quantityBody.parse(request.body)
    const existing = await prisma.cartItem.findUnique({
      where: { userId_listingId: { userId: request.user!.id, listingId } },
      include: { listing: true },
    })
    if (!existing) throw new HttpError(404, 'CART_ITEM_NOT_FOUND', 'Article introuvable dans le panier.')

    const next = cappedQuantity(existing.listing, quantity)
    await prisma.cartItem.update({
      where: { userId_listingId: { userId: request.user!.id, listingId } },
      data: { quantity: next },
    })
    return { cart: await loadCart(request.user!.id) }
  })

  app.delete('/cart/items/:listingId', guard, async (request) => {
    const { listingId } = listingParam.parse(request.params)
    const result = await prisma.cartItem.deleteMany({
      where: { userId: request.user!.id, listingId },
    })
    if (result.count === 0) throw new HttpError(404, 'CART_ITEM_NOT_FOUND', 'Article introuvable dans le panier.')
    return { cart: await loadCart(request.user!.id) }
  })

  app.patch('/cart/notes', guard, async (request) => {
    const { storeId, note } = cartNoteSchema.parse(request.body)
    const store = await prisma.store.findUnique({
      where: { id: storeId },
      select: { isActive: true },
    })
    if (!store || !store.isActive) throw new HttpError(404, 'STORE_NOT_FOUND', 'Boutique introuvable.')

    await prisma.cartNote.upsert({
      where: { userId_storeId: { userId: request.user!.id, storeId } },
      create: { userId: request.user!.id, storeId, note },
      update: { note },
    })
    return { cart: await loadCart(request.user!.id) }
  })

  app.delete('/cart', guard, async (request) => {
    await prisma.$transaction([
      prisma.cartItem.deleteMany({ where: { userId: request.user!.id } }),
      prisma.cartNote.deleteMany({ where: { userId: request.user!.id } }),
    ])
    return { cart: await loadCart(request.user!.id) }
  })
}
