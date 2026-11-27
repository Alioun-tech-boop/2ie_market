import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useToast } from '../components/ui/Toast'
import { notificationStreamUrl, notificationsApi, type NotificationDto } from '../lib/notifications'
import { useAuth } from './AuthContext'

interface NotificationsContextValue {
  notifications: NotificationDto[]
  unreadCount: number
  loading: boolean
  refresh: () => Promise<void>
  markRead: (id: string) => Promise<void>
  markAllRead: () => Promise<void>
}

const NotificationsContext = createContext<NotificationsContextValue | null>(null)

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { status } = useAuth()
  const { showToast } = useToast()
  const [notifications, setNotifications] = useState<NotificationDto[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const seenIds = useRef(new Set<string>())

  const refresh = useCallback(async () => {
    try {
      const data = await notificationsApi.list()
      setNotifications(data.notifications)
      seenIds.current = new Set(data.notifications.map((item) => item.id))
      setUnreadCount(data.unreadCount)
    } catch {
      // Une perte réseau ne doit jamais casser la navigation.
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (status !== 'authenticated') {
      setNotifications([])
      seenIds.current.clear()
      setUnreadCount(0)
      return
    }
    setLoading(true)
    void refresh()
  }, [status, refresh])

  useEffect(() => {
    if (status !== 'authenticated') return

    const source = new EventSource(notificationStreamUrl(), { withCredentials: true })
    const onNotification = (event: MessageEvent<string>) => {
      try {
        const incoming = JSON.parse(event.data) as NotificationDto
        if (seenIds.current.has(incoming.id)) return
        seenIds.current.add(incoming.id)
        setNotifications((current) => [incoming, ...current].slice(0, 50))
        if (!incoming.read) setUnreadCount((count) => count + 1)
        if (incoming.type !== 'ORDER_PLACED') {
          showToast({ title: incoming.title, description: incoming.message, tone: 'info' })
        }
      } catch {
        // Message SSE ignoré s'il est mal formé.
      }
    }
    const onReady = (event: MessageEvent<string>) => {
      try {
        const data = JSON.parse(event.data) as { unreadCount?: number }
        if (typeof data.unreadCount === 'number') setUnreadCount(data.unreadCount)
      } catch {
        // Ignore.
      }
    }

    source.addEventListener('notification', onNotification as EventListener)
    source.addEventListener('ready', onReady as EventListener)
    // Relecture périodique : filet de sécurité si le flux SSE est coupé par un proxy.
    const fallback = window.setInterval(() => void refresh(), 90_000)

    return () => {
      source.removeEventListener('notification', onNotification as EventListener)
      source.removeEventListener('ready', onReady as EventListener)
      source.close()
      window.clearInterval(fallback)
    }
  }, [status, refresh, showToast])

  const markRead = useCallback(async (id: string) => {
    try {
      const wasUnread = notifications.some((item) => item.id === id && !item.read)
      const { notification } = await notificationsApi.markRead(id)
      setNotifications((current) =>
        current.map((item) => (item.id === id ? notification : item)),
      )
      if (wasUnread && notification.read) setUnreadCount((count) => Math.max(0, count - 1))
    } catch {
      // Le badge reste inchangé en cas d'échec.
    }
  }, [notifications])

  const markAllRead = useCallback(async () => {
    try {
      await notificationsApi.markAllRead()
      setNotifications((current) => current.map((item) => ({ ...item, read: true, readAt: item.readAt ?? new Date().toISOString() })))
      setUnreadCount(0)
    } catch {
      // Le badge reste inchangé en cas d'échec.
    }
  }, [])

  const value = useMemo(
    () => ({ notifications, unreadCount, loading, refresh, markRead, markAllRead }),
    [notifications, unreadCount, loading, refresh, markRead, markAllRead],
  )

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>
}

export function useNotifications() {
  const value = useContext(NotificationsContext)
  if (!value) throw new Error('useNotifications doit être utilisé dans NotificationsProvider')
  return value
}
