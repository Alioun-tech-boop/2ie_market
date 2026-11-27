import { useEffect, type ReactNode } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useAuth } from '../../context/AuthContext'
import type { Role } from '../../lib/auth'

/** Garde côté interface. L'autorisation réelle est revérifiée côté API à chaque requête. */
export function RequireAuth({
  roles,
  children,
}: {
  roles?: Role[]
  children: ReactNode
}) {
  const { status, user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (status === 'guest') void navigate({ to: '/connexion' })
    else if (status === 'authenticated' && user && roles && !roles.includes(user.role)) {
      void navigate({ to: '/profil' })
    } else if (status === 'authenticated' && user && roles?.includes('MERCHANT') && user.store?.approvalStatus !== 'APPROVED') {
      void navigate({ to: '/profil' })
    }
  }, [status, user, roles, navigate])

  if (status === 'loading') {
    return (
      <main className="flex min-h-[60vh] items-center justify-center">
        <span className="h-8 w-8 animate-spin rounded-full border-4 border-brand-100 border-t-brand-700" aria-label="Chargement" />
      </main>
    )
  }
  if (!user) return null
  if (roles && !roles.includes(user.role)) return null
  return <>{children}</>
}
