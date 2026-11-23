import { useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { Bell, ChevronDown, Heart, LayoutDashboard, LogOut, Package, Plus, Search, Settings, ShieldCheck, ShoppingCart, Store, UserRound } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useCart } from '../../context/CartContext'
import { useNotifications } from '../../context/NotificationsContext'
import { assetUrl } from '../../lib/auth'
import { NotificationsPanel } from '../notifications/NotificationsPanel'
import { Avatar } from '../ui/Avatar'
import { Button, buttonStyles } from '../ui/Button'
import { Logo } from '../ui/Logo'

export function Header({ onFocusSearch }: { onFocusSearch?: () => void }) {
  const { user, status, logout } = useAuth()
  const { itemCount } = useCart()
  const { unreadCount } = useNotifications()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)

  function handleSearch() {
    if (onFocusSearch) onFocusSearch()
    else document.getElementById('marketplace-search')?.focus()
  }

  async function handleLogout() {
    setMenuOpen(false)
    await logout()
    await navigate({ to: '/' })
  }

  return (
    <header className="sticky top-0 z-40 border-b border-line/80 bg-white/85 backdrop-blur-xl">
      <div className="container-premium flex h-16 min-w-0 items-center justify-between gap-2 sm:gap-3 lg:h-[72px]">
        <Link to="/" aria-label="2ie Market — accueil" className="shrink-0">
          <Logo />
        </Link>


        <div className="flex min-w-0 shrink-0 items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={handleSearch}
            aria-label="Rechercher"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-white text-ink-muted transition-colors hover:border-brand-300 hover:text-brand-700 lg:border-transparent lg:bg-transparent"
          >
            <Search className="h-4 w-4" />
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => setSettingsOpen((open) => !open)}
              aria-label="Paramètres et raccourcis"
              aria-expanded={settingsOpen}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-white text-ink-muted transition-colors hover:border-brand-300 hover:text-brand-700"
            >
              <Settings className="h-4 w-4" />
            </button>
            {settingsOpen && (
              <>
                <button type="button" aria-label="Fermer les paramètres" className="fixed inset-0 z-40 cursor-default" onClick={() => setSettingsOpen(false)} />
                <div className="absolute right-0 top-full z-50 mt-2 w-[min(19rem,calc(100vw-1.5rem))] rounded-2xl border border-line bg-white p-2 shadow-lift">
                  <p className="px-3 py-2 text-xs font-extrabold uppercase tracking-wide text-ink-soft">Accès rapides</p>
                  {[
                    { label: 'Explorer les annonces', href: '/recherche' },
                    { label: 'Voir les produits', href: '/recherche?type=PRODUCT' },
                    { label: 'Voir les services', href: '/recherche?type=SERVICE' },
                    { label: 'Mon profil', href: '/profil' },
                    { label: 'Mes commandes', href: '/commandes' },
                    { label: 'Mes favoris', href: '/espace-client?section=favoris' },
                    ...(user?.store ? [{ label: 'Tableau de bord', href: '/tableau-de-bord' }, { label: 'Publier une annonce', href: '/publier' }, { label: 'Ma boutique', href: user.store ? `/boutique/${user.store.slug}` : '/profil' }] : []),
                    ...(user?.role === 'ADMIN' ? [{ label: 'Administration', href: '/admin' }] : []),
                    ...(!user ? [{ label: 'Connexion', href: '/connexion' }, { label: 'Créer un compte', href: '/inscription' }] : []),
                  ].map((item) => (
                    <a key={item.href} href={item.href} onClick={() => setSettingsOpen(false)} className="block rounded-xl px-3 py-2.5 text-sm font-medium text-ink-muted transition-colors hover:bg-brand-50 hover:text-brand-800">
                      {item.label}
                    </a>
                  ))}
                </div>
              </>
            )}
          </div>

          {user && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setNotificationsOpen((open) => !open)}
                aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} non lue${unreadCount > 1 ? 's' : ''}` : ''}`}
                aria-expanded={notificationsOpen}
                className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-white text-ink-muted transition-colors hover:border-brand-300 hover:text-brand-700 lg:border-transparent lg:bg-transparent"
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent-600 px-1 text-[10px] font-bold text-white ring-2 ring-white">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>

              {notificationsOpen && (
                <>
                  <button
                    type="button"
                    aria-label="Fermer les notifications"
                    className="fixed inset-0 z-40 cursor-default"
                    onClick={() => setNotificationsOpen(false)}
                  />
                  <div
                    className="absolute right-0 top-full z-50 mt-2 w-[min(23rem,calc(100vw-2rem))] rounded-2xl border border-line bg-white p-2 shadow-lift"
                    onClick={() => setNotificationsOpen(false)}
                  >
                    <NotificationsPanel limit={3} />
                    <a
                      href={user.role === 'ADMIN' ? '/admin' : user.store ? '/tableau-de-bord' : '/espace-client?section=notifications'}
                      className="mt-2 block rounded-xl bg-brand-50 px-3 py-2.5 text-center text-xs font-bold text-brand-800 hover:bg-brand-100"
                    >
                      Voir toutes les notifications
                    </a>
                  </div>
                </>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={() => void navigate({ to: '/panier' })}
            aria-label={`Panier${itemCount > 0 ? `, ${itemCount} article${itemCount > 1 ? 's' : ''}` : ''}`}
            className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-white text-ink-muted transition-colors hover:border-brand-300 hover:text-brand-700 lg:border-transparent lg:bg-transparent"
          >
            <ShoppingCart className="h-4 w-4" />
            {itemCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent-600 px-1 text-[10px] font-bold text-white ring-2 ring-white">
                {itemCount > 99 ? '99+' : itemCount}
              </span>
            )}
          </button>

          {status === 'loading' ? (
            <span className="h-9 w-24 animate-pulse rounded-xl bg-brand-50" />
          ) : user ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((open) => !open)}
                className="flex items-center gap-2 rounded-xl border border-line bg-white p-1 pr-2 transition-colors hover:border-brand-300"
                aria-expanded={menuOpen}
                aria-label="Ouvrir le menu du compte"
              >
                <Avatar name={`${user.firstName} ${user.lastName}`} src={assetUrl(user.profilePhotoUrl)} tone={user.store ? 'blue' : 'violet'} size="sm" />
                <ChevronDown className="hidden h-4 w-4 text-ink-soft sm:block" />
              </button>

              {menuOpen && (
                <button
                  type="button"
                  aria-label="Fermer le menu"
                  className="fixed inset-0 z-40 cursor-default"
                  onClick={() => setMenuOpen(false)}
                />
              )}
              {menuOpen && (
                <div className="absolute right-0 top-full z-50 mt-2 w-60 rounded-2xl border border-line bg-white p-2 shadow-lift">
                  <div className="border-b border-line px-3 py-2.5">
                    <p className="truncate text-sm font-bold text-ink">{user.firstName} {user.lastName}</p>
                    <p className="truncate text-xs text-ink-muted">{user.email}</p>
                    <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-brand-600">
                      {user.role === 'ADMIN' ? 'Administrateur' : user.role === 'MERCHANT' ? 'Commerçant' : 'Client'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setMenuOpen(false); void navigate({ to: '/profil' }) }}
                    className="mt-1 flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-ink-muted hover:bg-brand-50 hover:text-brand-800"
                  >
                    <UserRound className="h-4 w-4" /> Mon profil
                  </button>
                  <button
                    type="button"
                    onClick={() => { setMenuOpen(false); void navigate({ to: '/commandes' }) }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-ink-muted hover:bg-brand-50 hover:text-brand-800"
                  >
                    <Package className="h-4 w-4" /> Mes commandes
                  </button>

                  <button
                    type="button"
                    onClick={() => { setMenuOpen(false); void navigate({ to: '/espace-client' }) }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-ink-muted hover:bg-brand-50 hover:text-brand-800"
                  >
                    <LayoutDashboard className="h-4 w-4" /> Mon espace client
                  </button>
                  <a
                    href="/espace-client?section=favoris"
                    onClick={() => setMenuOpen(false)}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-ink-muted hover:bg-brand-50 hover:text-brand-800"
                  >
                    <Heart className="h-4 w-4" /> Mes favoris
                  </a>
                  {user.store && (
                    <>
                      <button
                        type="button"
                        onClick={() => { setMenuOpen(false); void navigate({ to: '/tableau-de-bord' }) }}
                        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-ink-muted hover:bg-brand-50 hover:text-brand-800"
                      >
                        <LayoutDashboard className="h-4 w-4" /> Tableau de bord
                      </button>
                      <button
                        type="button"
                        onClick={() => { setMenuOpen(false); void navigate({ to: '/publier', search: { kind: 'product' } }) }}
                        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-ink-muted hover:bg-brand-50 hover:text-brand-800"
                      >
                        <Plus className="h-4 w-4" /> Publier une annonce
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setMenuOpen(false)
                          if (user.store) void navigate({ to: '/boutique/$slug', params: { slug: user.store.slug } })
                        }}
                        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-ink-muted hover:bg-brand-50 hover:text-brand-800"
                      >
                        <Store className="h-4 w-4" /> Voir ma boutique
                      </button>
                    </>
                  )}
                  {user.role === 'ADMIN' && (
                    <button
                      type="button"
                      onClick={() => { setMenuOpen(false); void navigate({ to: '/admin' }) }}
                      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-ink-muted hover:bg-brand-50 hover:text-brand-800"
                    >
                      <ShieldCheck className="h-4 w-4" /> Administration
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => { setMenuOpen(false); void navigate({ to: '/profil' }) }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-ink-muted hover:bg-brand-50 hover:text-brand-800 lg:hidden"
                  >
                    <LayoutDashboard className="h-4 w-4" /> Mon espace
                  </button>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold text-rose-600 hover:bg-rose-50"
                  >
                    <LogOut className="h-4 w-4" /> Se déconnecter
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Button variant="ghost" className="hidden sm:inline-flex" onClick={() => void navigate({ to: '/connexion' })}>
                Connexion
              </Button>
              <Link to="/inscription" className={buttonStyles({ variant: 'primary', size: 'md' })}>
                S'inscrire
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
