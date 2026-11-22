import {
  generateReference,
  ORDER_STATUS_TRANSITIONS,
  orderStatusSchema,
  checkoutSchema,
  toE164,
  type OrderStatus,
} from '@2ie/shared'
import { randomUUID } from 'node:crypto'
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { authenticate } from '../middlewares/authenticate'
import { authorize } from '../middlewares/authorize'
import { HttpError } from '../lib/errors'
import { publishNotification, toNotificationDto, type NotificationDto } from '../lib/notifications'
import {
  cartItemInclude,
  orderGroupInclude,
  orderInclude,
  toOrderDto,
  toOrderGroupDto,
} from '../lib/orderDto'
import { prisma } from '../lib/prisma'

const idParam = z.object({ id: z.string().uuid('Commande invalide.') })
const referenceParam = z.object({ reference: z.string().trim().min(5).max(32) })

function buildReference(): string {
  const now = new Date()
  const date = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`
  const suffix = randomUUID().replace(/-/g, '').slice(0, 6).toUpperCase()
  return `CMD-${date}-${suffix}`
}

function aggregateStatus(statuses: OrderStatus[]): OrderStatus {
  if (statuses.length === 0) return 'PENDING'
  if (statuses.every((status) => status === 'COMPLETED')) return 'COMPLETED'
  if (statuses.every((status) => status === 'CANCELLED')) return 'CANCELLED'
  if (statuses.includes('PENDING')) return 'PENDING'
  if (statuses.includes('REJECTED')) return 'REJECTED'
  if (statuses.includes('PREPARING')) return 'PREPARING'
  if (statuses.every((status) => status === 'READY')) return 'READY'
  return 'CONFIRMED'
}

export async function orderRoutes(app: FastifyInstance) {
  const clientGuard = { preHandler: [authenticate] }
  const merchantGuard = { preHandler: [authenticate, authorize('MERCHANT')] }

  app.get('/meeting-points', async () => {
    const meetingPoints = await prisma.meetingPoint.findMany({
      where: { isActive: true },
      select: { id: true, site: true, label: true, description: true },
      orderBy: [{ site: 'asc' }, { label: 'asc' }],
    })
    return { meetingPoints }
  })

  app.get('/orders', clientGuard, async (request) => {
    const groups = await prisma.orderGroup.findMany({
      where: { clientId: request.user!.id },
      include: orderGroupInclude,
      orderBy: { createdAt: 'desc' },
    })
    return { groups: groups.map(toOrderGroupDto) }
  })

  app.get('/orders/:reference', clientGuard, async (request) => {
    const { reference } = referenceParam.parse(request.params)
    const group = await prisma.orderGroup.findFirst({
      where: { reference, clientId: request.user!.id },
      include: orderGroupInclude,
    })
    if (!group) throw new HttpError(404, 'ORDER_NOT_FOUND', 'Commande introuvable.')
    return { group: toOrderGroupDto(group) }
  })

  app.post('/orders', clientGuard, async (request) => {
    const input = checkoutSchema.parse(request.body)
    const userId = request.user!.id

    const [items, noteRows] = await Promise.all([
      prisma.cartItem.findMany({ where: { userId }, include: cartItemInclude, orderBy: { createdAt: 'asc' } }),
      prisma.cartNote.findMany({ where: { userId }, select: { storeId: true, note: true } }),
    ])
    if (items.length === 0) throw new HttpError(400, 'EMPTY_CART', 'Votre panier est vide.')

    for (const item of items) {
      const listing = item.listing
      if (listing.store.ownerId === userId) {
        throw new HttpError(403, 'OWN_LISTING', 'Vous ne pouvez pas commander votre propre annonce.')
      }
      if (
        listing.status !== 'PUBLISHED' ||
        !listing.store.isActive ||
        listing.availability !== 'AVAILABLE' ||
        item.quantity > (listing.quantity ?? 99)
      ) {
        throw new HttpError(409, 'CART_CHANGED', `« ${listing.title} » n’est plus disponible dans cette quantité.`)
      }
    }

    const grouped = new Map<
      string,
      {
        store: (typeof items)[number]['listing']['store']
        items: (typeof items)[number][]
      }
    >()
    for (const item of items) {
      const storeId = item.listing.store.id
      const current = grouped.get(storeId)
      if (current) current.items.push(item)
      else grouped.set(storeId, { store: item.listing.store, items: [item] })
    }

    for (const group of grouped.values()) {
      if (!group.store.deliveryModes.includes(input.deliveryMode)) {
        throw new HttpError(
          400,
          'DELIVERY_MODE_UNAVAILABLE',
          `La boutique « ${group.store.name} » ne propose pas ce mode de remise.`,
        )
      }
    }

    let meetingPoint: { id: string; label: string } | null = null
    if (input.deliveryMode === 'MEETUP_POINT') {
      const point = await prisma.meetingPoint.findUnique({
        where: { id: input.meetingPointId! },
        select: { id: true, label: true, isActive: true, site: true },
      })
      if (!point || !point.isActive || point.site !== input.site) {
        throw new HttpError(400, 'MEETING_POINT_INVALID', 'Ce point de rendez-vous n’est pas disponible.')
      }
      meetingPoint = { id: point.id, label: point.label }
    }

    const phone = toE164(input.clientPhone, '226')
    if (!phone) throw new HttpError(400, 'PHONE_INVALID', 'Numéro de téléphone invalide.')
    const locationRef = generateReference(input.buildingNumber, input.roomNumber, input.floor)
    const groupReference = buildReference()
    const noteMap = new Map(noteRows.map((row) => [row.storeId, row.note]))
    const totalCents = items.reduce((sum, item) => sum + item.listing.priceCents * item.quantity, 0)
    const pendingNotifications: Array<{ userId: string; notification: NotificationDto }> = []

    const created = await prisma.$transaction(async (tx) => {
      const group = await tx.orderGroup.create({
        data: {
          reference: groupReference,
          clientId: userId,
          totalCents,
          currency: 'XOF',
          deliveryMode: input.deliveryMode,
          meetingPointId: meetingPoint?.id ?? null,
          snapshotClientName: input.clientName,
          snapshotClientPhone: phone,
          snapshotSite: input.site,
          snapshotBuildingNumber: input.buildingNumber,
          snapshotRoomNumber: input.roomNumber,
          snapshotFloor: input.floor,
          snapshotLocationRef: locationRef,
        },
      })

      const clientNotification = await tx.notification.create({
        data: {
          userId,
          type: 'ORDER_PLACED',
          payload: {
            groupReference,
            orderNumber: groupReference,
            totalCents,
            storeCount: grouped.size,
          },
        },
      })
      pendingNotifications.push({
        userId,
        notification: toNotificationDto(clientNotification),
      })

      let index = 1
      for (const [storeId, groupData] of grouped) {
        const orderNumber = `${groupReference}-${String(index).padStart(2, '0')}`
        const orderTotal = groupData.items.reduce(
          (sum, item) => sum + item.listing.priceCents * item.quantity,
          0,
        )

        await tx.order.create({
          data: {
            orderNumber,
            orderGroupId: group.id,
            clientId: userId,
            storeId,
            status: 'PENDING',
            totalCents: orderTotal,
            currency: 'XOF',
            clientNote: noteMap.get(storeId) || null,
            deliveryMode: input.deliveryMode,
            meetingPointId: meetingPoint?.id ?? null,
            snapshotClientName: input.clientName,
            snapshotClientWhatsapp: phone,
            snapshotClientPhone: phone,
            snapshotBuildingNumber: input.buildingNumber,
            snapshotRoomNumber: input.roomNumber,
            snapshotFloor: input.floor,
            snapshotLocationRef: locationRef,
            snapshotSite: input.site,
            snapshotMeetingPointLabel: meetingPoint?.label ?? null,
            items: {
              create: groupData.items.map((item) => ({
                listingId: item.listingId,
                snapshotTitle: item.listing.title,
                snapshotType: item.listing.type,
                unitPriceCents: item.listing.priceCents,
                quantity: item.quantity,
                lineTotalCents: item.listing.priceCents * item.quantity,
              })),
            },
          },
        })

        for (const item of groupData.items) {
          if (item.listing.quantity === null) continue
          const updated = await tx.listing.updateMany({
            where: { id: item.listingId, quantity: { gte: item.quantity } },
            data: { quantity: { decrement: item.quantity } },
          })
          if (updated.count !== 1) {
            throw new HttpError(409, 'CART_CHANGED', `Le stock de « ${item.listing.title} » a changé.`)
          }
          await tx.listing.updateMany({
            where: { id: item.listingId, quantity: 0 },
            data: { availability: 'OUT_OF_STOCK' },
          })
        }

        const merchantNotification = await tx.notification.create({
          data: {
            userId: groupData.store.ownerId,
            type: 'NEW_ORDER',
            payload: {
              groupReference,
              orderNumber,
              totalCents: orderTotal,
              storeName: groupData.store.name,
              clientName: input.clientName,
              locationRef,
              itemsCount: groupData.items.length,
            },
          },
        })
        pendingNotifications.push({
          userId: groupData.store.ownerId,
          notification: toNotificationDto(merchantNotification),
        })
        index += 1
      }

      await tx.cartItem.deleteMany({ where: { userId } })
      await tx.cartNote.deleteMany({ where: { userId } })
      return group
    })

    const full = await prisma.orderGroup.findUnique({
      where: { id: created.id },
      include: orderGroupInclude,
    })
    if (!full) throw new HttpError(500, 'ORDER_READ_FAILED', 'Commande enregistrée mais lecture impossible.')
    for (const pending of pendingNotifications) {
      publishNotification(pending.userId, pending.notification)
    }
    return { group: toOrderGroupDto(full) }
  })

  app.patch('/me/orders/:id/status', merchantGuard, async (request) => {
    const { id } = idParam.parse(request.params)
    const { status } = orderStatusSchema.parse(request.body)

    const existing = await prisma.order.findFirst({
      where: { id, store: { ownerId: request.user!.id } },
      include: orderInclude,
    })
    if (!existing) throw new HttpError(404, 'ORDER_NOT_FOUND', 'Commande introuvable.')
    if (!ORDER_STATUS_TRANSITIONS[existing.status].includes(status)) {
      throw new HttpError(400, 'INVALID_STATUS', `Transition impossible depuis « ${existing.status} ».`)
    }

    const pendingNotifications: Array<{ userId: string; notification: NotificationDto }> = []
    const updated = await prisma.$transaction(async (tx) => {
      // Transition conditionnelle : deux requêtes concurrentes ne peuvent pas
      // restaurer le stock deux fois pour la même commande.
      const transitioned = await tx.order.updateMany({
        where: { id, status: existing.status },
        data: { status, statusUpdatedAt: new Date() },
      })
      if (transitioned.count !== 1) {
        throw new HttpError(409, 'ORDER_CHANGED', 'Le statut de cette commande a déjà changé. Réessayez.')
      }

      const order = await tx.order.findUniqueOrThrow({ where: { id }, include: orderInclude })

      // Un refus ou une annulation libère les quantités réservées à la commande.
      if (status === 'REJECTED' || status === 'CANCELLED') {
        for (const item of existing.items) {
          if (!item.listingId) continue
          const listing = await tx.listing.findUnique({
            where: { id: item.listingId },
            select: { quantity: true },
          })
          if (!listing || listing.quantity === null) continue
          await tx.listing.update({
            where: { id: item.listingId },
            data: { quantity: { increment: item.quantity } },
          })
          await tx.listing.updateMany({
            where: { id: item.listingId, availability: 'OUT_OF_STOCK' },
            data: { availability: 'AVAILABLE' },
          })
        }
      }

      if (order.orderGroupId) {
        const siblings = await tx.order.findMany({
          where: { orderGroupId: order.orderGroupId },
          select: { status: true },
        })
        await tx.orderGroup.update({
          where: { id: order.orderGroupId },
          data: { status: aggregateStatus(siblings.map((row) => row.status)) },
        })
      }

      const statusNotification = await tx.notification.create({
        data: {
          userId: order.clientId,
          type: 'ORDER_STATUS',
          payload: {
            orderId: order.id,
            orderNumber: order.orderNumber,
            groupReference: order.orderGroup?.reference ?? '',
            status,
            storeName: order.store.name,
          },
        },
      })
      pendingNotifications.push({
        userId: order.clientId,
        notification: toNotificationDto(statusNotification),
      })
      return order
    })

    for (const pending of pendingNotifications) {
      publishNotification(pending.userId, pending.notification)
    }
    return { order: toOrderDto(updated) }
  })
}
