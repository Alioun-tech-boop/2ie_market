import type { FastifyRequest } from 'fastify'
import { HttpError } from '../lib/errors'
import { prisma } from '../lib/prisma'
import { verifyAccessToken } from '../lib/tokens'

export async function authenticate(request: FastifyRequest) {
  const token = request.cookies.access_token
  if (!token) throw new HttpError(401, 'UNAUTHENTICATED', 'Vous devez être connecté.')

  let userId: string
  try {
    userId = verifyAccessToken(token)
  } catch {
    throw new HttpError(401, 'INVALID_SESSION', 'Votre session a expiré.')
  }

  // Le rôle est toujours relu depuis la base : un token ne peut pas élever les privilèges.
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { location: true, store: { include: { location: true } } },
  })
  if (!user) throw new HttpError(401, 'UNAUTHENTICATED', 'Compte introuvable.')
  if (user.status !== 'ACTIVE') {
    throw new HttpError(403, 'ACCOUNT_SUSPENDED', 'Ce compte est suspendu.')
  }

  request.user = user
}
