import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearch } from '@tanstack/react-router'
import { Bell, CheckCircle2, Clock3, Heart, Settings, ShoppingBag, ShoppingCart, Sparkles, Store as StoreIcon, UserRound } from 'lucide-react'
import { ProfileSummaryPanel, SettingsPanel } from '../components/dashboard/AccountPanels'
import { BarChart } from '../components/dashboard/BarChart'
import { DashboardSection } from '../components/dashboard/DashboardSection'
import { DashboardShell, type DashboardNavItem } from '../components/dashboard/DashboardShell'
import { StatCard } from '../components/dashboard/StatCard'
import { ListingCard } from '../components/market/ListingCard'
import { NotificationsPanel } from '../components/notifications/NotificationsPanel'
import { Badge } from '../components/ui/Badge'
import { buttonStyles } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { EmptyState } from '../components/ui/EmptyState'
import { Skeleton } from '../components/ui/Skeleton'
import { useToast } from '../components/ui/Toast'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import { useFavorites } from '../context/FavoritesContext'
import { useNotifications } from '../context/NotificationsContext'
import { formatPrice } from '../lib/format'
import { defaultSearchState } from '../lib/market'
import { ORDER_STATUSES, orderStatusLabels, orderStatusTones, type OrderStatus } from '../lib/orderLabels'
import { ordersApi, type OrderGroupDto } from '../lib/orders'

const IDS = ['commandes', 'historique', 'encours', 'favoris', 'panier', 'informations', 'notifications', 'parametres'] as const
type SectionId = (typeof IDS)[number]
const ONGOING: OrderStatus[] = ['PENDING', 'CONFIRMED', 'PREPARING', 'READY']
const BAR: Record<OrderStatus, string> = { PENDING: 'bg-accent-500', CONFIRMED: 'bg-brand-600', REJECTED: 'bg-slate-400', PREPARING: 'bg-violet-500', READY: 'bg-brand-500', COMPLETED: 'bg-emerald-500', CANCELLED: 'bg-slate-300' }
const isSection = (v: unknown): v is SectionId => typeof v === 'string' && (IDS as readonly string[]).includes(v)

function OrderList({ groups, title, empty }: { groups: OrderGroupDto[]; title: string; empty: string }) {
  if (!groups.length) return <EmptyState icon={ShoppingBag} title={title} description={empty} action={<Link to="/recherche" search={defaultSearchState} className={buttonStyles({ variant: 'primary' })}>Explorer les annonces</Link>} />
  return <div className="min-w-0 space-y-3">{groups.map((g) => (
    <Card key={g.id} className="min-w-0 overflow-hidden p-3 sm:p-4">
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-2 sm:gap-3">
        <div className="min-w-0 flex-1">
          <p className="break-all font-mono text-xs font-bold text-brand-900 sm:text-sm">{g.reference}</p>
          <p className="mt-1 text-[11px] text-ink-muted">{new Date(g.createdAt).toLocaleDateString('fr-FR')}</p>
        </div>
        <div className="flex max-w-full flex-wrap items-center justify-start gap-2 sm:justify-end">
          <Badge tone={orderStatusTones[g.status]} dot>{orderStatusLabels[g.status]}</Badge>
          <span className="whitespace-nowrap text-sm font-bold">{formatPrice(g.totalCents)}</span>
        </div>
      </div>
      <p className="mt-3 flex min-w-0 items-start gap-1.5 break-words text-xs text-ink-muted">
        <StoreIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-600" />
        <span className="min-w-0 break-words">{g.orders.map((o) => o.merchant.name).join(' · ')}</span>
      </p>
      <Link to="/commande/$reference" params={{ reference: g.reference }} search={{}} className="mt-3 inline-flex min-h-9 items-center text-xs font-bold text-brand-700">Voir le suivi →</Link>
    </Card>
  ))}</div>
}

export default function OrdersPage() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const { notifications, unreadCount } = useNotifications()
  const { cart, itemCount } = useCart()
  const { favorites, count: favoriteCount } = useFavorites()
  const search = useSearch({ strict: false }) as { section?: string }
  const [section, setSection] = useState<SectionId>(isSection(search.section) ? search.section : 'commandes')
  const [groups, setGroups] = useState<OrderGroupDto[]>([])
  const [filter, setFilter] = useState<OrderStatus | ''>('')
  const [loading, setLoading] = useState(true)
  const seen = useRef<string | null>(null)

  const load = useCallback(async () => {
    try { setGroups((await ordersApi.list()).groups) }
    catch { showToast({ tone: 'info', title: 'Commandes indisponibles', description: 'Réessayez.' }) }
    finally { setLoading(false) }
  }, [showToast])

  useEffect(() => { void load() }, [load])
  useEffect(() => {
    const latest = notifications[0]
    if (!latest || latest.id === seen.current) return
    seen.current = latest.id
    if (latest.type === 'ORDER_STATUS') void load()
  }, [notifications, load])

  const ongoing = useMemo(() => groups.filter((g) => ONGOING.includes(g.status)), [groups])
  const history = useMemo(() => groups.filter((g) => !ONGOING.includes(g.status)), [groups])
  const filtered = useMemo(() => filter === '' ? groups : groups.filter((g) => g.status === filter), [groups, filter])
  const rows = useMemo(() => ORDER_STATUSES.map((s) => ({ label: orderStatusLabels[s], value: groups.filter((g) => g.status === s).length, barClass: BAR[s] })), [groups])

  const nav: DashboardNavItem[] = [
    { id: 'commandes', label: 'Mes commandes', icon: ShoppingBag, badge: groups.length },
    { id: 'encours', label: 'Commandes en cours', icon: Clock3, badge: ongoing.length },
    { id: 'historique', label: 'Historique', icon: CheckCircle2 },
    { id: 'favoris', label: 'Mes favoris', icon: Heart, badge: favoriteCount },
    { id: 'panier', label: 'Mon panier', icon: ShoppingCart, badge: itemCount },
    { id: 'informations', label: 'Mes informations', icon: UserRound },
    { id: 'notifications', label: 'Notifications', icon: Bell, badge: unreadCount },
    { id: 'parametres', label: 'Paramètres', icon: Settings },
  ]
  const shell = {
    eyebrow: 'Espace client', title: 'Mon espace 2ie Market',
    description: 'Suivez vos commandes, retrouvez vos favoris et gérez vos informations.',
    items: nav, active: section,
    onSelect: (id: string) => setSection(isSection(id) ? id : 'commandes'),
    action: <Link to="/recherche" search={defaultSearchState} className={buttonStyles({ variant: 'primary' })}>Découvrir des annonces</Link>,
  }

  if (loading) return <DashboardShell {...shell}><div className="grid min-w-0 gap-4 sm:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}</div><Skeleton className="h-72 rounded-2xl" /></DashboardShell>

  return (
    <DashboardShell {...shell}>
      {section === 'commandes' && <>
        <DashboardSection title="Mes commandes" description="Indicateurs calculés à partir de vos commandes enregistrées.">
          <div className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-4 sm:gap-4">
            <StatCard label="Commandes passées" value={groups.length} icon={ShoppingBag} tone="bg-brand-50 text-brand-700" />
            <StatCard label="En cours" value={ongoing.length} icon={Clock3} tone="bg-accent-50 text-accent-700" />
            <StatCard label="Terminées" value={groups.filter((g) => g.status === 'COMPLETED').length} icon={CheckCircle2} tone="bg-emerald-50 text-emerald-700" />
            <StatCard label="Favoris" value={favoriteCount} icon={Heart} tone="bg-rose-50 text-rose-600" />
          </div>
        </DashboardSection>
        <BarChart title="Répartition de mes commandes" description="Statuts réels de vos commandes." rows={rows} emptyLabel="Aucune commande enregistrée." />
        <DashboardSection title="Toutes mes commandes" description="Filtrez par statut.">
          <div className="mb-4 flex max-w-full flex-wrap gap-2">
            <button type="button" onClick={() => setFilter('')} className={`rounded-full px-3 py-1.5 text-[11px] font-bold ${filter === '' ? 'bg-brand-800 text-white' : 'border border-line bg-white'}`}>Toutes ({groups.length})</button>
            {ORDER_STATUSES.map((s) => <button key={s} type="button" onClick={() => setFilter(s)} className={`rounded-full px-3 py-1.5 text-[11px] font-bold ${filter === s ? 'bg-brand-800 text-white' : 'border border-line bg-white'}`}>{orderStatusLabels[s]}</button>)}
          </div>
          <OrderList groups={filtered} title="Aucune commande pour ce filtre" empty="Choisissez un autre statut." />
        </DashboardSection>
      </>}
      {section === 'encours' && <DashboardSection title="Commandes en cours" description="En attente, confirmées, en préparation ou prêtes."><OrderList groups={ongoing} title="Aucune commande en cours" empty="Vos commandes en cours apparaîtront ici." /></DashboardSection>}
      {section === 'historique' && <DashboardSection title="Historique" description="Commandes terminées, refusées ou annulées."><OrderList groups={history} title="Aucune commande dans l'historique" empty="Les commandes closes apparaîtront ici." /></DashboardSection>}
      {section === 'favoris' && <DashboardSection title="Mes favoris" description="Annonces réellement enregistrées dans votre compte.">{favorites.length === 0 ? <EmptyState icon={Heart} title="Aucun favori" description="Enregistrez une annonce avec le cœur." action={<Link to="/recherche" search={defaultSearchState} className={buttonStyles({ variant: 'primary' })}>Parcourir les annonces</Link>} /> : <div className="grid min-w-0 gap-5 sm:grid-cols-2 xl:grid-cols-3">{favorites.map((f) => <ListingCard key={f.listing.id} listing={f.listing} />)}</div>}</DashboardSection>}
      {section === 'panier' && <DashboardSection title="Mon panier" description={`${itemCount} article(s) - ${cart.groups.length} boutique(s)`} action={<Link to="/panier" className={buttonStyles({ variant: 'secondary', size: 'sm' })}>Ouvrir le panier</Link>}>{cart.groups.length === 0 ? <EmptyState icon={ShoppingCart} title="Votre panier est vide" description="Ajoutez des annonces pour préparer une commande." /> : <Card className="min-w-0 p-5"><p className="text-xs text-ink-muted">Total du panier</p><p className="text-lg font-extrabold">{formatPrice(cart.totalCents)}</p><Link to="/commande/nouvelle" className={`${buttonStyles({ variant: 'primary', size: 'sm' })} mt-4`}>Confirmer la commande</Link></Card>}</DashboardSection>}
      {section === 'informations' && <DashboardSection title="Mes informations" description="Données enregistrées sur votre compte."><ProfileSummaryPanel user={user!} /></DashboardSection>}
      {section === 'notifications' && <DashboardSection title="Notifications" description="Confirmations et changements de statut en temps réel."><NotificationsPanel limit={20} /></DashboardSection>}
      {section === 'parametres' && <DashboardSection title="Paramètres" description="Gérez votre profil, votre localisation et vos notifications."><SettingsPanel user={user!} /></DashboardSection>}
      <p className="flex flex-wrap items-center justify-center gap-2 pb-4 text-center text-[11px] text-ink-soft"><Sparkles className="h-3.5 w-3.5 shrink-0" /> Statistiques issues de vos données enregistrées.</p>
    </DashboardShell>
  )
}
