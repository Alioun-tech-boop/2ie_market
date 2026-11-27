import { useEffect, useState, type MouseEvent } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Heart } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useFavorites } from '../../context/FavoritesContext'
import { cn } from '../../lib/cn'
import type { Listing } from '../../lib/market'

export function FavoriteButton({
  listing,
  compact = false,
  className,
}: {
  listing: Listing
  compact?: boolean
  className?: string
}) {
  const { status } = useAuth()
  const { isFavorite, toggle } = useFavorites()
  const navigate = useNavigate()
  const saved = isFavorite(listing.id)
  const [pending, setPending] = useState(false)
  const [waitingForAuth, setWaitingForAuth] = useState(false)

  useEffect(() => {
    if (!waitingForAuth || status === 'loading') return
    setWaitingForAuth(false)
    if (status !== 'authenticated') {
      setPending(false)
      void navigate({ to: '/connexion' })
      return
    }
    void toggle(listing).finally(() => setPending(false))
  }, [waitingForAuth, status, navigate, toggle, listing])

  async function handleClick(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault()
    event.stopPropagation()
    if (pending) return
    if (status === 'loading') {
      setPending(true)
      setWaitingForAuth(true)
      return
    }
    if (status !== 'authenticated') {
      void navigate({ to: '/connexion' })
      return
    }
    setPending(true)
    try { await toggle(listing) } finally { setPending(false) }
  }

  return (
    <button
      type="button"
      onClick={(event) => void handleClick(event)}
      aria-pressed={saved}
      disabled={pending}
      aria-label={saved ? `Retirer « ${listing.title} » des favoris` : `Enregistrer « ${listing.title} » dans les favoris`}
      title={pending && waitingForAuth ? 'Vérification de votre session…' : saved ? 'Retirer des favoris' : 'Ajouter aux favoris'}
      className={cn(
        'inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl border bg-white/95 text-xs font-semibold shadow-soft backdrop-blur transition-colors disabled:cursor-wait disabled:opacity-60',
        compact ? 'h-9 w-9' : 'h-11 px-4',
        saved
          ? 'border-rose-200 text-rose-600 hover:bg-rose-50'
          : 'border-line text-ink-muted hover:border-rose-200 hover:text-rose-600',
        className,
      )}
    >
      <Heart className={cn('h-4 w-4', saved && 'fill-current')} aria-hidden="true" />
      {!compact && (saved ? 'Enregistré' : 'Enregistrer')}
    </button>
  )
}
