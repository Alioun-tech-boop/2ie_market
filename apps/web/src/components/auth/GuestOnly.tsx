import { useEffect, type ReactNode } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useAuth } from '../../context/AuthContext'

/** Empêche un utilisateur déjà connecté d'accéder aux écrans de connexion/inscription. */
export function GuestOnly({ children }: { children: ReactNode }) {
  const { status } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (status === 'authenticated') void navigate({ to: '/', replace: true })
  }, [status, navigate])

  if (status === 'loading' || status === 'authenticated') {
    return (
      <main className="flex min-h-[60vh] items-center justify-center">
        <span className="h-8 w-8 animate-spin rounded-full border-4 border-brand-100 border-t-brand-700" aria-label="Chargement" />
      </main>
    )
  }

  return <>{children}</>
}
