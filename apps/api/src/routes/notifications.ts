import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { config } from '../config'
import { HttpError } from '../lib/errors'
import { subscribeNotifications, toNotificationDto } from '../lib/notifications'
import { prisma } from '../lib/prisma'
import { authenticate } from '../middlewares/authenticate'
import { runSubscriptionReminders } from '../lib/subscriptionReminders'

const idParam = z.object({ id: z.string().uuid('Notification invalide.') })
const activeStreams = new Map<string, number>()
const MAX_STREAMS_PER_USER = 5

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
  app.get('/notifications/stream', { ...guard, config: { rateLimit: { max: 10, timeWindow: '1 minute' } } }, async (request, reply) => {
    const userId = request.user!.id
    const active = activeStreams.get(userId) ?? 0
    if (active >= MAX_STREAMS_PER_USER) {
      throw new HttpError(429, 'TOO_MANY_NOTIFICATION_STREAMS', 'Trop de connexions de notifications sont déjà ouvertes.')
    }
    const unreadCount = await prisma.notification.count({ where: { userId, readAt: null } })
    // Recontrôle après l'await : plusieurs ouvertures simultanées ne doivent
    // pas dépasser la limite par utilisateur.
    const currentActive = activeStreams.get(userId) ?? 0
    if (currentActive >= MAX_STREAMS_PER_USER) {
      throw new HttpError(429, 'TOO_MANY_NOTIFICATION_STREAMS', 'Trop de connexions de notifications sont déjà ouvertes.')
    }
    activeStreams.set(userId, currentActive + 1)
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

    let cleaned = false
    let heartbeat: ReturnType<typeof setInterval> | undefined
    let unsubscribe = () => {}
    const cleanup = () => {
      if (cleaned) return
      cleaned = true
      if (heartbeat) clearInterval(heartbeat)
      unsubscribe()
      const remaining = Math.max(0, (activeStreams.get(userId) ?? 1) - 1)
      if (remaining === 0) activeStreams.delete(userId)
      else activeStreams.set(userId, remaining)
    }
    const send = (data: string) => {
      if (cleaned || response.destroyed || response.writableEnded) return
      if (!response.write(data)) {
        response.end()
        cleanup()
      }
    }
    unsubscribe = subscribeNotifications(userId, (notification) => {
      send(`event: notification\\ndata: ${JSON.stringify(notification)}\\n\\n`)
    })
    heartbeat = setInterval(() => send(': ping\\n\\n'), 25_000)
    send(`event: ready\\ndata: ${JSON.stringify({ unreadCount })}\\n\\n`)
    response.on('close', cleanup)
    request.raw.on('error', cleanup)
  })
}
