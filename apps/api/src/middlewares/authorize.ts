import type { Role } from '@prisma/client'
import type { FastifyRequest } from 'fastify'
import { HttpError } from '../lib/errors'

/** Contrôle d'accès basé sur le rôle lu en base (jamais sur une donnée du client). */
export function authorize(...allowed: Role[]) {
  return async (request: FastifyRequest) => {
    if (!request.user) throw new HttpError(401, 'UNAUTHENTICATED', 'Vous devez être connecté.')
    if (!allowed.includes(request.user.role)) {
      throw new HttpError(403, 'FORBIDDEN', 'Vous n’avez pas accès à cette ressource.')
    }
  }
}
