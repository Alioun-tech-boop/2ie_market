import type { PlatformSettings } from '@prisma/client'
import { prisma } from './prisma'

const DEFAULT_SETTINGS = {
  id: 'default',
  platformName: '2ie Market',
  logoUrl: null,
  supportEmail: null,
  maintenanceMessage: null,
  reviewsEnabled: true,
} as const

/** Paramètres uniques de la plateforme. La ligne est créée à la première lecture. */
export async function getPlatformSettings(): Promise<PlatformSettings> {
  return prisma.platformSettings.upsert({
    where: { id: 'default' },
    update: {},
    create: DEFAULT_SETTINGS,
  })
}

export function toPlatformDto(settings: PlatformSettings) {
  return {
    name: settings.platformName,
    logoUrl: settings.logoUrl,
    supportEmail: settings.supportEmail,
    maintenanceMessage: settings.maintenanceMessage,
    reviewsEnabled: settings.reviewsEnabled,
    updatedAt: settings.updatedAt.toISOString(),
  }
}
