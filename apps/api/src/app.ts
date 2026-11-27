import { mkdirSync } from 'node:fs'
import { isIP } from 'node:net'
import cookie from '@fastify/cookie'
import cors from '@fastify/cors'
import multipart from '@fastify/multipart'
import rateLimit from '@fastify/rate-limit'
import fastifyStatic from '@fastify/static'
import { Prisma } from '@prisma/client'
import Fastify, { type FastifyError } from 'fastify'
import { ZodError } from 'zod'
import { config } from './config'
import { HttpError } from './lib/errors'
import { adminRoutes } from './routes/admin'
import { authRoutes } from './routes/auth'
import { cartRoutes } from './routes/cart'
import { catalogRoutes } from './routes/catalog'
import { favoriteRoutes } from './routes/favorites'
import { merchantRoutes } from './routes/merchant'
import { notificationRoutes } from './routes/notifications'
import { orderRoutes } from './routes/orders'
import { subscriptionRoutes } from './routes/subscriptions'
import { runSubscriptionReminders } from './lib/subscriptionReminders'

export async function buildApp() {
  const app = Fastify({
    logger: { level: config.nodeEnv === 'production' ? 'info' : 'warn' },
  })

  mkdirSync(config.uploadsDir, { recursive: true })

  await app.register(cookie)
  await app.register(cors, { origin: config.frontendUrl, credentials: true })
  await app.register(rateLimit, {
    global: true,
    max: 200,
    timeWindow: '1 minute',
    // Render transmet CF-Connecting-IP depuis Cloudflare. On ne fait jamais
    // confiance à X-Forwarded-For, qui peut contenir des valeurs fournies par le client.
    keyGenerator: (request) => {
      const cloudflareIp = config.nodeEnv === 'production'
        ? request.headers['cf-connecting-ip']
        : undefined
      return typeof cloudflareIp === 'string' && isIP(cloudflareIp) ? cloudflareIp : request.ip
    },
  })
  await app.register(multipart, {
    limits: { fileSize: config.maxPhotoBytes, files: config.maxPhotosPerListing },
  })
  await app.register(fastifyStatic, {
    root: config.uploadsDir,
    prefix: '/uploads/',
    decorateReply: false,
  })

  // En-têtes défensifs pour toutes les réponses de l'API.
  app.addHook('onSend', async (_request, reply, payload) => {
    reply.header('X-Content-Type-Options', 'nosniff')
    reply.header('X-Frame-Options', 'DENY')
    reply.header('Referrer-Policy', 'strict-origin-when-cross-origin')
    reply.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
    reply.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
    return payload
  })

  // Protection CSRF : toute mutation issue du navigateur doit provenir du frontend officiel.
  // Les requêtes sans Origin sont également refusées afin d'éviter le contournement du contrôle.
  app.addHook('onRequest', async (request) => {
    // Les justificatifs vendeur ne doivent jamais être servis par le dossier
    // statique public, même si un ancien enregistrement pointe vers ce chemin.
    let pathname = request.url.split('?')[0] ?? request.url
    try {
      pathname = decodeURIComponent(pathname)
    } catch {
      throw new HttpError(400, 'INVALID_PATH', 'Chemin de ressource invalide.')
    }
    if (pathname.startsWith('/uploads/seller-proofs/')) {
      throw new HttpError(404, 'NOT_FOUND', 'Ressource introuvable.')
    }
    if (!['POST', 'PATCH', 'PUT', 'DELETE'].includes(request.method)) return
    if (request.headers.origin !== config.frontendUrl) {
      throw new HttpError(403, 'ORIGIN_FORBIDDEN', 'Origine de la requête non autorisée.')
    }
  })

  app.setErrorHandler((unknownError, request, reply) => {
    const error = unknownError as FastifyError
    if (error instanceof ZodError) {
      reply.code(400).send({ error: 'VALIDATION_ERROR', issues: error.flatten() })
      return
    }
    if (error instanceof HttpError) {
      reply.code(error.status).send({ error: error.code, message: error.message })
      return
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      reply.code(409).send({ error: 'CONFLICT', message: 'Cette valeur est déjà utilisée.' })
      return
    }
    if (error.code === 'FST_REQ_FILE_TOO_LARGE') {
      reply.code(413).send({ error: 'FILE_TOO_LARGE', message: 'L’image ne doit pas dépasser 2 Mo.' })
      return
    }
    const statusCode = 'statusCode' in error ? error.statusCode : undefined
    if (typeof statusCode === 'number' && statusCode < 500) {
      reply.code(statusCode).send({
        error: error.code ?? 'BAD_REQUEST',
        message: error.message,
      })
      return
    }

    request.log.error(error)
    reply.code(500).send({ error: 'INTERNAL_ERROR', message: 'Une erreur est survenue.' })
  })

  app.get('/health', async () => ({ status: 'ok', service: '2ie-market-api' }))

  await app.register(authRoutes, { prefix: '/v1' })
  await app.register(catalogRoutes, { prefix: '/v1' })
  await app.register(cartRoutes, { prefix: '/v1' })
  await app.register(favoriteRoutes, { prefix: '/v1' })
  await app.register(orderRoutes, { prefix: '/v1' })
  await app.register(notificationRoutes, { prefix: '/v1' })
  await app.register(subscriptionRoutes, { prefix: '/v1' })
  await app.register(merchantRoutes, { prefix: '/v1' })
  await app.register(adminRoutes, { prefix: '/v1/admin' })

  let subscriptionReminderTimer: ReturnType<typeof setInterval> | undefined
  app.addHook('onReady', async () => {
    void runSubscriptionReminders().catch((error) => app.log.error(error, 'Subscription reminder job failed'))
    subscriptionReminderTimer = setInterval(() => {
      void runSubscriptionReminders().catch((error) => app.log.error(error, 'Subscription reminder job failed'))
    }, 6 * 60 * 60 * 1000)
  })
  app.addHook('onClose', async () => {
    if (subscriptionReminderTimer) clearInterval(subscriptionReminderTimer)
  })

  return app
}
