import type { NotificationType } from '@2ie/shared'
import { API_URL, api } from './auth'

export type { NotificationType }

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

export interface NotificationsResponse {
  notifications: NotificationDto[]
  unreadCount: number
}

/** EventSource ne peut pas poser d'en-tête : la session est transmise par cookie httpOnly. */
export function notificationStreamUrl(): string {
  return `${API_URL}/v1/notifications/stream`
}

export const notificationsApi = {
  list: () => api<NotificationsResponse>('/notifications'),
  markRead: (id: string) =>
    api<{ notification: NotificationDto }>(`/notifications/${encodeURIComponent(id)}/read`, {
      method: 'PATCH',
    }),
  markAllRead: () => api<{ ok: true; unreadCount: number }>('/notifications/read-all', {
    method: 'PATCH',
  }),
}
