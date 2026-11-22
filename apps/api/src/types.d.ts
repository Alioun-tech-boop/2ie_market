import 'fastify'
import type { AuthUserRecord } from './lib/dto'

declare module 'fastify' {
  interface FastifyRequest {
    user?: AuthUserRecord
  }
}
