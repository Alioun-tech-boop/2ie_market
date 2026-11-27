import { prisma } from './prisma'

/**
 * Rappels idempotents : une notification par boutique et par jour.
 * Le job tourne au démarrage puis toutes les six heures dans le processus API.
 */
export async function runSubscriptionReminders(): Promise<void> {
  const now = new Date()
  const horizon = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
  const today = new Date(now)
  today.setHours(0, 0, 0, 0)
  const stores = await prisma.store.findMany({
    where: {
      approvalStatus: 'APPROVED',
      subscriptionExpiresAt: { lte: horizon },
      OR: [
        { lastSubscriptionReminderAt: null },
        { lastSubscriptionReminderAt: { lt: today } },
      ],
    },
    select: {
      id: true,
      name: true,
      ownerId: true,
      subscriptionExpiresAt: true,
    },
    take: 500,
  })
  if (!stores.length) return
  const admins = await prisma.user.findMany({
    where: { role: 'ADMIN', status: 'ACTIVE' },
    select: { id: true },
  })
  for (const store of stores) {
    const expired = !store.subscriptionExpiresAt || store.subscriptionExpiresAt <= now
    await prisma.$transaction(async (tx) => {
      await tx.store.update({
        where: { id: store.id },
        data: {
          ...(expired ? { isActive: false } : {}),
          lastSubscriptionReminderAt: now,
        },
      })
      await tx.notification.create({
        data: {
          userId: store.ownerId,
          type: expired ? 'SUBSCRIPTION_EXPIRED' : 'SUBSCRIPTION_REMINDER',
          payload: {
            storeId: store.id,
            storeName: store.name,
            expiresAt: store.subscriptionExpiresAt?.toISOString() ?? null,
            amount: 1000,
          },
        },
      })
      if (expired && admins.length) {
        await tx.notification.createMany({
          data: admins.map(({ id }) => ({
            userId: id,
            type: 'SUBSCRIPTION_EXPIRED',
            payload: {
              storeId: store.id,
              storeName: store.name,
              ownerId: store.ownerId,
              expiresAt: store.subscriptionExpiresAt?.toISOString() ?? null,
              amount: 1000,
            },
          })),
        })
      }
    })
  }
}
