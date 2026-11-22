import {
  CheckCircle2,
  Info,
  Sparkles,
  X,
  type LucideIcon,
} from 'lucide-react'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'

type ToastTone = 'success' | 'info' | 'accent'

interface ToastMessage {
  id: number
  title: string
  description?: string
  tone: ToastTone
}

type ToastInput = Omit<ToastMessage, 'id'>

const ToastContext = createContext<{ showToast: (message: ToastInput) => void } | null>(null)

const tones: Record<ToastTone, { icon: LucideIcon; wrap: string; iconWrap: string }> = {
  success: {
    icon: CheckCircle2,
    wrap: 'text-emerald-700',
    iconWrap: 'bg-emerald-50 text-emerald-600',
  },
  info: {
    icon: Info,
    wrap: 'text-brand-800',
    iconWrap: 'bg-brand-50 text-brand-600',
  },
  accent: {
    icon: Sparkles,
    wrap: 'text-accent-700',
    iconWrap: 'bg-accent-50 text-accent-600',
  },
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([])
  const timers = useRef<number[]>([])

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const showToast = useCallback(
    (message: ToastInput) => {
      const id = Date.now() + Math.random()
      setToasts((current) => [...current, { ...message, id }])
      timers.current.push(window.setTimeout(() => dismiss(id), 3800))
    },
    [dismiss],
  )

  useEffect(() => {
    const activeTimers = timers.current
    return () => activeTimers.forEach((timer) => window.clearTimeout(timer))
  }, [])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-4 bottom-24 z-[60] flex flex-col gap-2 sm:inset-x-auto sm:bottom-auto sm:right-6 sm:top-6 sm:w-[380px]"
        aria-live="polite"
        aria-atomic="false"
      >
        {toasts.map((toast) => {
          const tone = tones[toast.tone]
          const Icon = tone.icon
          return (
            <div
              key={toast.id}
              className="pointer-events-auto flex animate-toast-in items-start gap-3 rounded-2xl border border-line bg-white p-4 shadow-lift"
            >
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${tone.iconWrap}`}>
                <Icon className="h-4 w-4" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className={`text-sm font-bold ${tone.wrap}`}>{toast.title}</p>
                {toast.description && (
                  <p className="mt-0.5 text-xs leading-relaxed text-ink-muted">{toast.description}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                className="rounded-lg p-1 text-ink-soft transition-colors hover:bg-brand-50 hover:text-brand-700"
                aria-label="Fermer la notification"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast doit être utilisé dans un ToastProvider')
  return context
}
