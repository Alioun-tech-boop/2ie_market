import { mkdirSync } from 'node:fs'
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

export async function buildApp() {
  const app = Fastify({
    logger: { level: config.nodeEnv === 'production' ? 'info' : 'warn' },
    trustProxy: true,
  })

  mkdirSync(config.uploadsDir, { recursive: true })

  await app.register(cookie)
  await app.register(cors, { origin: config.frontendUrl, credentials: true })
  await app.register(rateLimit, { global: true, max: 200, timeWindow: '1 minute' })
  await app.register(multipart, {
    limits: { fileSize: config.maxPhotoBytes, files: config.maxPhotosPerListing },
  })
  await app.register(fastifyStatic, {
    root: config.uploadsDir,
    prefix: '/uploads/',
    decorateReply: false,
  })

  // Protection CSRF complémentaire : SameSite=Lax + contrôle de l'origine.
  app.addHook('onRequest', async (request) => {
    if (!['POST', 'PATCH', 'PUT', 'DELETE'].includes(request.method)) return
    const origin = request.headers.origin
    if (origin && origin !== config.frontendUrl) {
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
  await app.register(merchantRoutes, { prefix: '/v1' })
  await app.register(adminRoutes, { prefix: '/v1/admin' })

  return app
}
