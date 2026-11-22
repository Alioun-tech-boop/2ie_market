import { useNavigate } from '@tanstack/react-router'
import { Grid2X2, Home, Package, ShoppingBag, UserRound } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { cn } from '../../lib/cn'

const items = [
  { id: 'home', label: 'Accueil', icon: Home },
  { id: 'search', label: 'Explorer', icon: Grid2X2 },
  { id: 'cart', label: 'Panier', icon: ShoppingBag },
  { id: 'orders', label: 'Commandes', icon: Package },
  { id: 'profile', label: 'Profil', icon: UserRound },
] as const

export type MobileTab = (typeof items)[number]['id']

export function MobileBottomNav({
  active,
  onChange,
}: {
  active: MobileTab
  onChange: (tab: MobileTab) => void
}) {
  const { user } = useAuth()
  const navigate = useNavigate()

  function handle(tab: MobileTab) {
    onChange(tab)
    if (tab === 'cart') void navigate({ to: '/panier' })
    else if (tab === 'orders') void navigate({ to: '/commandes' })
    else if (tab === 'profile') void navigate({ to: user ? '/profil' : '/connexion' })
  }

  return (
    <nav
      className="fixed inset-x-4 bottom-3 z-40 rounded-[1.7rem] bg-ink px-1.5 pb-[env(safe-area-inset-bottom)] pt-1.5 shadow-[0_16px_38px_rgba(15,23,42,0.25)] md:hidden"
      aria-label="Navigation mobile"
    >
      <div className="mx-auto grid max-w-lg grid-cols-5">
        {items.map((item) => {
          const Icon = item.icon
          const isActive = active === item.id
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handle(item.id)}
              className="flex flex-col items-center gap-1 rounded-2xl py-1.5 text-white/55 transition-colors"
              aria-current={isActive ? 'page' : undefined}
            >
              <span
                className={cn(
                  'flex h-9 w-11 items-center justify-center rounded-2xl transition-all duration-200',
                  isActive && 'bg-white text-ink shadow-sm',
                )}
              >
                <Icon className="h-[18px] w-[18px]" strokeWidth={isActive ? 2.3 : 1.9} />
              </span>
              <span className={cn('text-[10px] font-semibold', isActive && 'text-white')}>
                {item.label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
