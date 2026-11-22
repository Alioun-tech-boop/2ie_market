import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
try {
  process.loadEnvFile(join(here, '..', '.env'))
} catch {
  // En production, les variables sont fournies par l'environnement.
}

const jwtSecret = process.env.JWT_SECRET
if (!jwtSecret || jwtSecret.length < 32) {
  throw new Error('JWT_SECRET doit contenir au moins 32 caractères.')
}

export const config = {
  databaseUrl: process.env.DATABASE_URL ?? '',
  jwtSecret,
  frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:5173',
  // Render et les autres plateformes PaaS fournissent PORT. API_PORT reste
  // compatible avec le développement local existant.
  port: Number(process.env.PORT ?? process.env.API_PORT ?? 3000),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  secureCookies: process.env.NODE_ENV === 'production',
  uploadsDir: join(here, '..', 'uploads'),
  reviewsEnabled: process.env.REVIEWS_ENABLED === 'true',
  maxPhotoBytes: 2 * 1024 * 1024,
  maxPhotosPerListing: 6,
}
