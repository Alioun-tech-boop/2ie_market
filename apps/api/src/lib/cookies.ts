import type { FastifyReply } from 'fastify'
import { config } from '../config'

const base = {
  httpOnly: true,
  secure: config.secureCookies,
  sameSite: 'lax' as const,
  path: '/',
}

export function setAuthCookies(reply: FastifyReply, accessToken: string, refreshToken: string) {
  reply.setCookie('access_token', accessToken, { ...base, maxAge: 15 * 60 })
  reply.setCookie('refresh_token', refreshToken, { ...base, maxAge: 7 * 24 * 60 * 60 })
}

export function clearAuthCookies(reply: FastifyReply) {
  reply.clearCookie('access_token', { path: '/' })
  reply.clearCookie('refresh_token', { path: '/' })
}
