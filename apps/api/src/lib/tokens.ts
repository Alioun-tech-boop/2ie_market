import { createHash, randomBytes } from 'node:crypto'
import jwt from 'jsonwebtoken'
import { config } from '../config'

const ISSUER = '2ie-market'

export function signAccessToken(userId: string): string {
  return jwt.sign({ sub: userId }, config.jwtSecret, {
    expiresIn: '15m',
    issuer: ISSUER,
  })
}

export function verifyAccessToken(token: string): string {
  const payload = jwt.verify(token, config.jwtSecret, { issuer: ISSUER })
  if (typeof payload === 'string' || !payload.sub) throw new Error('Token invalide')
  return payload.sub
}

export function newRefreshToken(): string {
  return randomBytes(48).toString('base64url')
}

/** Les refresh tokens sont stockés hachés : un vol de base ne donne pas de session. */
export function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000
