import { mkdirSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { isIP } from 'node:net'
import { normalize, sep } from 'node:path'
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
  await app.register(cors, { origin: config.frontendUrls, credentials: true })
  await app.register(rateLimit, {
    global: true,
    max: 1000,
    timeWindow: '1 minute',
    hook: 'preHandler',
    // Ne jamais faire confiance à X-Forwarded-For. Sur Render, CF-Connecting-IP
    // est injecté par Cloudflare ; les routes d'authentification ajoutent aussi
    // l'e-mail ou le jeton de session à la clé pour éviter de partager le quota
    // entre tous les visiteurs passant par le proxy Netlify.
    keyGenerator: (request) => {
      const cloudflareIp = config.secureCookies
        ? request.headers['cf-connecting-ip']
        : undefined
      const ip = typeof cloudflareIp === 'string' && isIP(cloudflareIp)
        ? cloudflareIp
        : request.ip
      const path = request.url.split('?')[0] ?? request.url

      if (path.endsWith('/auth/login') || path.endsWith('/auth/register')) {
        const email = (request.body as { email?: unknown } | undefined)?.email
        if (typeof email === 'string' && email.trim()) {
          return `${ip}:auth:${email.trim().toLowerCase()}`
        }
      }

      if (path.endsWith('/auth/refresh')) {
        const token = request.cookies?.refresh_token
        if (typeof token === 'string' && token) {
          const digest = createHash('sha256').update(token).digest('hex')
          return `${ip}:refresh:${digest}`
        }
      }

      return ip
    },
  })
  await app.register(multipart, {
    limits: { fileSize: config.maxPhotoBytes, files: config.maxPhotosPerListing },
  })
  // En-têtes défensifs pour toutes les réponses de l'API.
  app.addHook('onSend', async (request, reply, payload) => {
    // Les réponses API peuvent contenir des données propres à un compte.
    // Ne jamais laisser le CDN ou le navigateur les réutiliser entre sessions.
    if (!request.url.startsWith('/uploads/')) {
      reply.header('Cache-Control', 'private, no-store, max-age=0')
      reply.header('Pragma', 'no-cache')
      reply.header('Vary', 'Origin, Cookie, Authorization')
    }
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
      // Deux décodages couvrent les séparateurs et segments encodés une fois
      // puis réencodés par un proxy ; normalize résout aussi les segments "..".
      pathname = decodeURIComponent(decodeURIComponent(pathname))
    } catch {
      throw new HttpError(400, 'INVALID_PATH', 'Chemin de ressource invalide.')
    }
    const normalizedPath = normalize(pathname)
    const privateProofPrefix = `/uploads/seller-proofs${sep}`
    if (normalizedPath === '/uploads/seller-proofs' || normalizedPath.startsWith(privateProofPrefix)) {
      throw new HttpError(404, 'NOT_FOUND', 'Ressource introuvable.')
    }
    if (!['POST', 'PATCH', 'PUT', 'DELETE'].includes(request.method)) return
    if (!request.headers.origin || !config.frontendUrls.includes(request.headers.origin)) {
      throw new HttpError(403, 'ORIGIN_FORBIDDEN', 'Origine de la requête non autorisée.')
    }
  })

  await app.register(fastifyStatic, {
    root: config.uploadsDir,
    prefix: '/uploads/',
    decorateReply: false,
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
