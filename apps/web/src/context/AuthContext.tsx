import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  authApi,
  type LoginPayload,
  type RegisterPayload,
  type Role,
  type SelfUser,
} from '../lib/auth'

type AuthStatus = 'loading' | 'authenticated' | 'guest'

interface AuthContextValue {
  user: SelfUser | null
  status: AuthStatus
  login: (payload: LoginPayload) => Promise<SelfUser>
  register: (payload: RegisterPayload) => Promise<SelfUser>
  logout: () => Promise<void>
  refresh: () => Promise<void>
  updateProfile: (payload: Parameters<typeof authApi.updateProfile>[0]) => Promise<SelfUser>
  updateLocation: (payload: Parameters<typeof authApi.updateLocation>[0]) => Promise<SelfUser>
  updateStore: (payload: Parameters<typeof authApi.updateStore>[0]) => Promise<SelfUser>
  uploadPhoto: (file: File, kind: 'profile' | 'logo') => Promise<SelfUser>
  hasRole: (...roles: Role[]) => boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SelfUser | null>(null)
  const [status, setStatus] = useState<AuthStatus>('loading')

  const apply = useCallback((next: SelfUser) => {
    setUser(next)
    setStatus('authenticated')
  }, [])

  const refresh = useCallback(async () => {
    const { user: next } = await authApi.refresh()
    apply(next)
  }, [apply])

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const { user: current } = await authApi.session()
        if (!active) return
        if (current) apply(current)
        else setStatus('guest')
      } catch {
        if (active) setStatus('guest')
      }
    })()
    return () => {
      active = false
    }
  }, [apply])

  const login = useCallback(
    async (payload: LoginPayload) => {
      const { user: next } = await authApi.login(payload)
      apply(next)
      return next
    },
    [apply],
  )

  const register = useCallback(
    async (payload: RegisterPayload) => {
      const { user: next } = await authApi.register(payload)
      apply(next)
      return next
    },
    [apply],
  )

  const logout = useCallback(async () => {
    await authApi.logout()
    setUser(null)
    setStatus('guest')
  }, [])

  const updateProfile = useCallback(
    async (payload: Parameters<typeof authApi.updateProfile>[0]) => {
      const { user: next } = await authApi.updateProfile(payload)
      apply(next)
      return next
    },
    [apply],
  )

  const updateLocation = useCallback(
    async (payload: Parameters<typeof authApi.updateLocation>[0]) => {
      const { user: next } = await authApi.updateLocation(payload)
      apply(next)
      return next
    },
    [apply],
  )

  const updateStore = useCallback(
    async (payload: Parameters<typeof authApi.updateStore>[0]) => {
      const { user: next } = await authApi.updateStore(payload)
      apply(next)
      return next
    },
    [apply],
  )

  const uploadPhoto = useCallback(
    async (file: File, kind: 'profile' | 'logo') => {
      const { user: next } = await authApi.uploadPhoto(file, kind)
      apply(next)
      return next
    },
    [apply],
  )

  const hasRole = useCallback((...roles: Role[]) => Boolean(user && roles.includes(user.role)), [user])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      status,
      login,
      register,
      logout,
      refresh,
      updateProfile,
      updateLocation,
      updateStore,
      uploadPhoto,
      hasRole,
    }),
    [user, status, login, register, logout, refresh, updateProfile, updateLocation, updateStore, uploadPhoto, hasRole],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth doit être utilisé dans un AuthProvider')
  return context
}
