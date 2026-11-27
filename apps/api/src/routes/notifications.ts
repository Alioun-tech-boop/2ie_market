import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { config } from '../config'
import { HttpError } from '../lib/errors'
import { subscribeNotifications, toNotificationDto } from '../lib/notifications'
import { prisma } from '../lib/prisma'
import { authenticate } from '../middlewares/authenticate'
import { runSubscriptionReminders } from '../lib/subscriptionReminders'

const idParam = z.object({ id: z.string().uuid('Notification invalide.') })

export async function notificationRoutes(app: FastifyInstance) {
  const guard = { preHandler: [authenticate] }

  app.get('/notifications', guard, async (request) => {
    await runSubscriptionReminders()
    const userId = request.user!.id
    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      prisma.notification.count({ where: { userId, readAt: null } }),
    ])
    return { notifications: notifications.map(toNotificationDto), unreadCount }
  })

  app.patch('/notifications/read-all', guard, async (request) => {
    await prisma.notification.updateMany({
      where: { userId: request.user!.id, readAt: null },
      data: { readAt: new Date() },
    })
    return { ok: true, unreadCount: 0 }
  })

  app.patch('/notifications/:id/read', guard, async (request) => {
    const { id } = idParam.parse(request.params)
    const notification = await prisma.notification.findFirst({
      where: { id, userId: request.user!.id },
    })
    if (!notification) throw new HttpError(404, 'NOTIFICATION_NOT_FOUND', 'Notification introuvable.')

    const updated = notification.readAt
      ? notification
      : await prisma.notification.update({
          where: { id },
          data: { readAt: new Date() },
        })
    return { notification: toNotificationDto(updated) }
  })

  /** Server-Sent Events : temps réel dans cette instance, sans API externe. */
  app.get('/notifications/stream', guard, async (request, reply) => {
    const userId = request.user!.id
    const unreadCount = await prisma.notification.count({ where: { userId, readAt: null } })

    reply.hijack()
    const response = reply.raw
    response.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
      'Access-Control-Allow-Origin': config.frontendUrl,
      'Access-Control-Allow-Credentials': 'true',
    })

    const unsubscribe = subscribeNotifications(userId, (notification) => {
      response.write(`event: notification\ndata: ${JSON.stringify(notification)}\n\n`)
    })
    response.write(`event: ready\ndata: ${JSON.stringify({ unreadCount })}\n\n`)

    const heartbeat = setInterval(() => response.write(': ping\n\n'), 25_000)
    const cleanup = () => {
      clearInterval(heartbeat)
      unsubscribe()
    }
    response.on('close', cleanup)
    request.raw.on('error', cleanup)
  })
}
