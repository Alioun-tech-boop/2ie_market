import { EventEmitter } from 'node:events'
import { Prisma, type Notification as NotificationRecord, type NotificationType } from '@prisma/client'

const amountFormatter = new Intl.NumberFormat('fr-FR')

const statusLabels: Record<string, string> = {
  PENDING: 'En attente',
  CONFIRMED: 'Confirmée',
  REJECTED: 'Refusée',
  PREPARING: 'En préparation',
  READY: 'Prête',
  COMPLETED: 'Terminée',
  CANCELLED: 'Annulée',
}

export interface NotificationDto {
  id: string
  type: NotificationType
  title: string
  message: string
  href: string
  read: boolean
  readAt: string | null
  createdAt: string
  payload: Record<string, unknown>
}

function asObject(value: Prisma.JsonValue): Record<string, unknown> {
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  return {}
}

function text(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function cents(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

function amount(value: unknown): string {
  const valueCents = cents(value)
  return valueCents === 0 ? 'Gratuit' : `${amountFormatter.format(valueCents / 100)} XOF`
}

function contentFor(type: NotificationType, payload: Record<string, unknown>) {
  const reference = text(payload.groupReference) || text(payload.orderNumber)
  const total = amount(payload.totalCents)

  switch (type) {
    case 'ORDER_PLACED':
      return {
        title: 'Commande enregistrée',
        message: `Votre commande ${reference} est enregistrée (${total}). Suivez son statut dans votre espace.`,
        href: `/commande/${encodeURIComponent(reference)}`,
      }
    case 'NEW_ORDER':
      return {
        title: 'Nouvelle commande',
        message: `${text(payload.clientName) || 'Un client'} a commandé ${text(payload.orderNumber) || reference} — ${total}.`,
        href: '/tableau-de-bord',
      }
    case 'ORDER_STATUS': {
      const status = statusLabels[text(payload.status)] ?? text(payload.status)
      return {
        title: 'Statut de commande mis à jour',
        message: `${text(payload.orderNumber) || reference} : ${status}.`,
        href: `/commande/${encodeURIComponent(reference)}`,
      }
    }
    case 'LISTING_ARCHIVED':
      return {
        title: 'Annonce archivée',
        message: `${text(payload.listingTitle) || 'Une annonce'} n’est plus visible par les clients.`,
        href: '/tableau-de-bord',
      }
  }
}

export function toNotificationDto(notification: NotificationRecord): NotificationDto {
  const payload = asObject(notification.payload)
  return {
    id: notification.id,
    type: notification.type,
    ...contentFor(notification.type, payload),
    read: notification.readAt !== null,
    readAt: notification.readAt?.toISOString() ?? null,
    createdAt: notification.createdAt.toISOString(),
    payload,
  }
}

/**
 * Bus en mémoire pour le temps réel (SSE). Ce monolithe fonctionne avec une seule
 * instance ; derrière plusieurs instances, brancher sur Redis Pub/Sub.
 */
const emitter = new EventEmitter()
emitter.setMaxListeners(0)

export function publishNotification(userId: string, notification: NotificationDto): void {
  emitter.emit(userId, notification)
}

export function subscribeNotifications(
  userId: string,
  listener: (notification: NotificationDto) => void,
): () => void {
  emitter.on(userId, listener)
  return () => emitter.off(userId, listener)
}
