import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from '@tanstack/react-router'
import {
  BarChart3,
  Bell,
  Boxes,
  CheckCircle2,
  Clock3,
  Copy,
  Facebook,
  Send,
  Share2,
  Eye,
  FileEdit,
  MapPin,
  Package,
  PauseCircle,
  PlayCircle,
  Plus,
  Settings,
  ShoppingBag,
  Sparkles,
  Store as StoreIcon,
  Trash2,
  UserRound,
  Wrench,
} from 'lucide-react'
import { BarChart } from '../components/dashboard/BarChart'
import { DashboardSection } from '../components/dashboard/DashboardSection'
import { DashboardShell, type DashboardNavItem } from '../components/dashboard/DashboardShell'
import { ProfileSummaryPanel, SettingsPanel } from '../components/dashboard/AccountPanels'
import { StatCard } from '../components/dashboard/StatCard'
import { NotificationsPanel } from '../components/notifications/NotificationsPanel'
import { Badge } from '../components/ui/Badge'
import { Button, buttonStyles } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { EmptyState } from '../components/ui/EmptyState'
import { Price } from '../components/ui/Price'
import { Skeleton } from '../components/ui/Skeleton'
import { useToast } from '../components/ui/Toast'
import { useAuth } from '../context/AuthContext'
import { useNotifications } from '../context/NotificationsContext'
import { assetUrl } from '../lib/auth'
import { cn } from '../lib/cn'
import { formatPrice, siteLabel } from '../lib/format'
import { availabilityLabels, shortTypeLabels, statusLabels } from '../lib/listingLabels'
import {
  marketApi,
  type ListingStatus,
  type MerchantDashboard,
  type MerchantListing,
  type MerchantOrder,
} from '../lib/market'
import {
  nextStatuses,
  ORDER_STATUSES,
  orderStatusLabels,
  orderStatusTones,
  type OrderStatus,
} from '../lib/orderLabels'
import { ordersApi } from '../lib/orders'

const ORDER_ACTION_LABELS: Partial<Record<OrderStatus, string>> = {
  CONFIRMED: 'Accepter',
  REJECTED: 'Refuser',
  PREPARING: 'Préparer',
  READY: 'Marquer prêt',
  COMPLETED: 'Terminer',
  CANCELLED: 'Annuler',
}

const STATUS_BAR_CLASSES: Record<OrderStatus, string> = {
  PENDING: 'bg-accent-500',
  CONFIRMED: 'bg-brand-600',
  REJECTED: 'bg-slate-400',
  PREPARING: 'bg-violet-500',
  READY: 'bg-brand-500',
  COMPLETED: 'bg-emerald-500',
  CANCELLED: 'bg-slate-300',
}

export default function DashboardPage() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const { notifications, unreadCount } = useNotifications()
  const [data, setData] = useState<MerchantDashboard | null>(null)
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [activeSection, setActiveSection] = useState('overview')
  const [statusFilter, setStatusFilter] = useState<OrderStatus | ''>('')
  const [listingFilter, setListingFilter] = useState<ListingStatus | 'ALL'>('ALL')
  const [stockDrafts, setStockDrafts] = useState<Record<string, string>>({})
  const lastSeenNotification = useRef<string | null>(null)

  const [shareCopied, setShareCopied] = useState(false)

  const load = useCallback(async () => {
    try {
      setData(await marketApi.dashboard(statusFilter || undefined))
    } catch {
      showToast({ tone: 'info', title: 'Chargement impossible', description: 'Réessayez dans un instant.' })
    } finally {
      setLoading(false)
    }
  }, [showToast, statusFilter])

  useEffect(() => {
    void load()
  }, [load])

  // Une nouvelle commande reçue en SSE rafraîchit immédiatement les commandes
  // et le compteur « en attente » du tableau de bord.
  useEffect(() => {
    const latest = notifications[0]
    if (!latest || latest.id === lastSeenNotification.current) return
    lastSeenNotification.current = latest.id
    if (latest.type === 'NEW_ORDER') void load()
  }, [notifications, load])

  async function updateStock(listing: MerchantListing) {
    const raw = stockDrafts[listing.id] ?? String(listing.quantity ?? 0)
    const quantity = Number(raw)
    if (!Number.isInteger(quantity) || quantity < 0 || quantity > 9999) {
      showToast({ tone: 'info', title: 'Stock invalide', description: 'Saisissez un nombre entier entre 0 et 9 999.' })
      return
    }
    setBusyId(listing.id)
    try {
      await marketApi.updateListing(listing.id, { quantity })
      showToast({ tone: 'success', title: 'Stock actualisé', description: `${listing.title} : ${quantity} unité(s)` })
      await load()
    } catch {
      showToast({ tone: 'info', title: 'Mise à jour impossible', description: 'Réessayez.' })
    } finally {
      setBusyId(null)
    }
  }

  async function toggleStatus(listing: MerchantListing) {
    setBusyId(listing.id)
    try {
      const next = listing.status === 'PAUSED' ? 'PUBLISHED' : 'PAUSED'
      await marketApi.updateListing(listing.id, { status: next })
      showToast({ tone: 'success', title: next === 'PAUSED' ? 'Annonce désactivée' : 'Annonce réactivée', description: listing.title })
      await load()
    } catch {
      showToast({ tone: 'info', title: 'Action impossible', description: 'Réessayez.' })
    } finally {
      setBusyId(null)
    }
  }

  async function changeOrderStatus(order: MerchantOrder, next: OrderStatus) {
    setBusyId(order.id)
    try {
      await ordersApi.updateStatus(order.id, next)
      showToast({
        tone: 'success',
        title: 'Statut mis à jour',
        description: `${order.orderNumber} : ${orderStatusLabels[next]}`,
      })
      await load()
    } catch {
      showToast({ tone: 'info', title: 'Action impossible', description: 'Réessayez.' })
    } finally {
      setBusyId(null)
    }
  }

  async function remove(listing: MerchantListing) {
    if (!window.confirm(`Supprimer définitivement « ${listing.title} » de vos annonces actives ?`)) return
    setBusyId(listing.id)
    try {
      await marketApi.archiveListing(listing.id)
      showToast({ tone: 'success', title: 'Annonce supprimée', description: 'Elle n’est plus visible par les clients.' })
      await load()
    } catch {
      showToast({ tone: 'info', title: 'Action impossible', description: 'Réessayez.' })
    } finally {
      setBusyId(null)
    }
  }

  const navItems: DashboardNavItem[] = [
    { id: 'overview', label: 'Vue d’ensemble', icon: BarChart3 },
    { id: 'listings', label: 'Mes annonces', icon: Boxes, badge: data?.stats.listings },
    { id: 'add', label: 'Ajouter une annonce', icon: Plus },
    { id: 'orders', label: 'Mes commandes', icon: ShoppingBag, badge: data?.stats.pendingOrders },
    { id: 'notifications', label: 'Notifications', icon: Bell, badge: unreadCount },
    { id: 'store', label: 'Ma boutique', icon: StoreIcon },
    { id: 'profile', label: 'Mes informations', icon: UserRound },
    { id: 'settings', label: 'Paramètres', icon: Settings },
  ]

  const shellProps = {
    eyebrow: 'Espace marchand',
    title: 'Tableau de bord',
    description: 'Pilotez votre boutique, vos annonces et vos commandes à partir de données enregistrées.',
    items: navItems,
    active: activeSection,
    onSelect: setActiveSection,
    action: (
      <Link to="/publier" search={{ kind: 'product' }} className={buttonStyles({ variant: 'primary' })}>
        <Plus className="h-4 w-4" /> Nouvelle annonce
      </Link>
    ),
  }

  if (loading) {
    return (
      <DashboardShell {...shellProps}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} className="h-28 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-80 rounded-2xl" />
      </DashboardShell>
    )
  }

  const store = user?.store
  const publicStoreUrl = store && typeof window !== 'undefined'
    ? `${window.location.origin}/boutique/${encodeURIComponent(store.slug)}`
    : ''
  const shareText = store ? `Découvrez la boutique ${store.name} sur 2iE Market` : ''
  const encodedStoreUrl = encodeURIComponent(publicStoreUrl)
  const encodedShareText = encodeURIComponent(shareText)

  async function copyStoreLink() {
    if (!publicStoreUrl) return
    try {
      await navigator.clipboard.writeText(publicStoreUrl)
      setShareCopied(true)
      showToast({ tone: 'success', title: 'Lien copié', description: 'Vous pouvez maintenant le partager à vos clients.' })
      window.setTimeout(() => setShareCopied(false), 2500)
    } catch {
      window.prompt('Copiez le lien de votre boutique :', publicStoreUrl)
    }
  }

  if (!data || !store) {
    return (
      <main className="container-premium py-16">
        <EmptyState
          icon={StoreIcon}
          title="Boutique indisponible"
          description="Votre compte marchand n'est associé à aucune boutique active."
        />
      </main>
    )
  }

  const stats = [
    { label: 'Produits publiés', value: data.stats.products, icon: Package, tone: 'bg-brand-50 text-brand-700' },
    { label: 'Services proposés', value: data.stats.services, icon: Wrench, tone: 'bg-violet-50 text-violet-700' },
    { label: 'Commandes reçues', value: data.stats.orders, icon: ShoppingBag, tone: 'bg-brand-50 text-brand-700' },
    { label: 'Commandes en attente', value: data.stats.pendingOrders, icon: Clock3, tone: 'bg-accent-50 text-accent-700' },
    { label: 'Commandes terminées', value: data.stats.completedOrders, icon: CheckCircle2, tone: 'bg-emerald-50 text-emerald-700' },
    { label: 'Vues des annonces', value: data.stats.views, icon: Eye, tone: 'bg-slate-100 text-slate-700' },
  ]

  const visibleListings = data.listings.filter(
    (listing) => listingFilter === 'ALL' || listing.status === listingFilter,
  )
  const topViews = [...data.listings]
    .sort((a, b) => b.viewsCount - a.viewsCount)
    .slice(0, 5)
    .map((listing) => ({ label: listing.title, value: listing.viewsCount }))
  const statusBars = data.stats.byStatus.map((item) => ({
    label: orderStatusLabels[item.status],
    value: item.count,
    barClass: STATUS_BAR_CLASSES[item.status],
  }))

  return (
    <DashboardShell {...shellProps}>
      {activeSection === 'overview' && (
        <>
          <DashboardSection title="Indicateurs de la boutique" description="Calculés sur l’ensemble de vos données enregistrées.">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {stats.map((stat) => (
                <StatCard key={stat.label} {...stat} />
              ))}
            </div>
          </DashboardSection>

          <div className="grid gap-4 lg:grid-cols-2">
            <BarChart
              title="Commandes par statut"
              description="Répartition réelle de toutes les commandes reçues."
              rows={statusBars}
              emptyLabel="Aucune commande enregistrée."
            />
            <BarChart
              title="Annonces les plus vues"
              description="Vues cumulées enregistrées sur vos annonces actives."
              rows={topViews}
              emptyLabel="Aucune annonce active pour le moment."
            />
          </div>

          <DashboardSection
            title="Dernières commandes"
            action={
              <button type="button" onClick={() => setActiveSection('orders')} className="text-xs font-bold text-brand-700 hover:text-brand-900">
                Voir toutes les commandes →
              </button>
            }
          >
            {data.orders.length === 0 ? (
              <EmptyState icon={ShoppingBag} title="Aucune commande" description="Les commandes clients apparaîtront ici." />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {data.orders.slice(0, 4).map((order) => (
                  <Card key={order.id} className="flex items-center justify-between gap-3 p-4">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold text-ink">{order.orderNumber}</p>
                      <p className="mt-0.5 truncate text-[11px] text-ink-muted">{order.client.name}</p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      <Badge tone={orderStatusTones[order.status]}>{orderStatusLabels[order.status]}</Badge>
                      <span className="text-xs font-bold text-brand-900">{formatPrice(order.totalCents)}</span>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </DashboardSection>
        </>
      )}

      {activeSection === 'listings' && (
        <DashboardSection
          title="Mes annonces"
          description={`${data.listings.length} annonce(s) active(s), ${data.stats.published} publiée(s).`}
          action={
            <Link to="/publier" search={{ kind: 'product' }} className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-700 hover:text-brand-900">
              <Plus className="h-4 w-4" /> Nouvelle annonce
            </Link>
          }
        >
          <div className="mb-4 flex flex-wrap gap-2">
            {(['ALL', 'PUBLISHED', 'PAUSED', 'DRAFT'] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setListingFilter(value)}
                className={cn(
                  'rounded-full px-3 py-1.5 text-[11px] font-bold transition-colors',
                  listingFilter === value
                    ? 'bg-brand-800 text-white'
                    : 'border border-line bg-white text-ink-muted hover:border-brand-300 hover:text-brand-800',
                )}
              >
                {value === 'ALL' ? 'Toutes' : statusLabels[value]}
              </button>
            ))}
          </div>

          {visibleListings.length === 0 ? (
            <EmptyState
              icon={Package}
              title="Aucune annonce dans ce filtre"
              description="Publiez une annonce ou choisissez un autre statut."
              action={
                <Link to="/publier" search={{ kind: 'product' }} className={buttonStyles({ variant: 'primary' })}>
                  Publier une annonce
                </Link>
              }
            />
          ) : (
            <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-soft">
              <div className="hidden grid-cols-[2fr_1fr_0.8fr_0.7fr_1.3fr] gap-4 border-b border-line bg-brand-50/60 px-5 py-3 text-[10px] font-bold uppercase tracking-wide text-ink-muted md:grid">
                <span>Annonce</span><span>Type / État</span><span>Prix</span><span>Vues</span><span className="text-right">Actions</span>
              </div>
              <div className="divide-y divide-line">
                {visibleListings.map((listing) => {
                  const photo = assetUrl(listing.photos[0]?.thumbUrl ?? listing.photos[0]?.url)
                  const busy = busyId === listing.id
                  return (
                    <div key={listing.id} className="grid gap-4 px-5 py-4 md:grid-cols-[2fr_1fr_0.8fr_0.7fr_1.3fr] md:items-center">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-brand-50">
                          {photo ? <img src={photo} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-brand-300"><Package className="h-5 w-5" /></div>}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-ink">{listing.title}</p>
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            <Badge tone={listing.status === 'PUBLISHED' ? 'success' : 'muted'}>{statusLabels[listing.status]}</Badge>
                            <span className="text-[11px] text-ink-muted">{availabilityLabels[listing.availability]}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-xs text-ink-muted">
                        <p className="font-semibold text-ink">{shortTypeLabels[listing.type]}</p>
                        {listing.condition && (
                          <>
                            <p className="mt-0.5">{listing.quantity ?? 0} en stock</p>
                            <div className="mt-2 flex items-center gap-1.5">
                              <input
                                aria-label={`Nouveau stock pour ${listing.title}`}
                                type="number"
                                min="0"
                                max="9999"
                                value={stockDrafts[listing.id] ?? String(listing.quantity ?? 0)}
                                onChange={(event) => setStockDrafts((current) => ({ ...current, [listing.id]: event.target.value }))}
                                className="h-8 w-20 rounded-lg border border-line px-2 text-xs"
                              />
                              <button type="button" disabled={busy} onClick={() => void updateStock(listing)} className="h-8 rounded-lg bg-brand-800 px-2.5 text-[10px] font-bold text-white disabled:opacity-50">Actualiser</button>
                            </div>
                          </>
                        )}
                      </div>
                      <div><Price cents={listing.priceCents} size="sm" /></div>
                      <div className="flex items-center gap-1 text-sm font-semibold text-ink"><Eye className="h-3.5 w-3.5 text-ink-soft" /> {listing.viewsCount}</div>
                      <div className="flex flex-wrap items-center justify-start gap-1.5 md:justify-end">
                        <Link to="/annonce/$id" params={{ id: listing.id }} className="flex h-9 items-center gap-1.5 rounded-xl border border-line px-3 text-xs font-semibold text-ink-muted hover:border-brand-300 hover:text-brand-800"><Eye className="h-3.5 w-3.5" /> Voir</Link>
                        <Link to="/annonces/$id/modifier" params={{ id: listing.id }} className="flex h-9 items-center gap-1.5 rounded-xl border border-line px-3 text-xs font-semibold text-ink-muted hover:border-brand-300 hover:text-brand-800"><FileEdit className="h-3.5 w-3.5" /> Modifier</Link>
                        <button type="button" disabled={busy} onClick={() => void toggleStatus(listing)} className="flex h-9 items-center gap-1.5 rounded-xl border border-line px-3 text-xs font-semibold text-ink-muted hover:border-brand-300 hover:text-brand-800 disabled:opacity-50">
                          {listing.status === 'PAUSED' ? <PlayCircle className="h-3.5 w-3.5" /> : <PauseCircle className="h-3.5 w-3.5" />}
                          {listing.status === 'PAUSED' ? 'Activer' : 'Désactiver'}
                        </button>
                        <button type="button" disabled={busy} onClick={() => void remove(listing)} aria-label={`Supprimer ${listing.title}`} className="flex h-9 w-9 items-center justify-center rounded-xl border border-line text-ink-soft hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </DashboardSection>
      )}

      {activeSection === 'add' && (
        <DashboardSection title="Ajouter un produit ou un service" description="Choisissez le type d’annonce à publier dans votre boutique.">
          <div className="grid gap-4 sm:grid-cols-2">
            <Link to="/publier" search={{ kind: 'product' }} className="group rounded-2xl border border-line bg-white p-6 shadow-card transition-all duration-300 ease-premium hover:-translate-y-1 hover:border-brand-300 hover:shadow-lift">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-700"><Package className="h-6 w-6" /></span>
              <h3 className="mt-4 text-base font-bold text-ink">Ajouter un produit</h3>
              <p className="mt-2 text-xs leading-relaxed text-ink-muted">Objet neuf ou occasion, avec prix, quantité, photos et disponibilité.</p>
              <span className="mt-5 inline-flex items-center gap-1.5 text-xs font-bold text-brand-700">Créer le produit <Plus className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" /></span>
            </Link>
            <Link to="/publier" search={{ kind: 'service' }} className="group rounded-2xl border border-line bg-white p-6 shadow-card transition-all duration-300 ease-premium hover:-translate-y-1 hover:border-accent-200 hover:shadow-lift">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-50 text-accent-700"><Wrench className="h-6 w-6" /></span>
              <h3 className="mt-4 text-base font-bold text-ink">Ajouter un service</h3>
              <p className="mt-2 text-xs leading-relaxed text-ink-muted">Prestation avec durée, prérequis, tarif et options éventuelles.</p>
              <span className="mt-5 inline-flex items-center gap-1.5 text-xs font-bold text-accent-700">Créer le service <Plus className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" /></span>
            </Link>
          </div>
        </DashboardSection>
      )}

      {activeSection === 'orders' && (
        <DashboardSection title="Mes commandes" description="Filtrez par statut et faites évoluer chaque sous-commande reçue.">
          <div className="mb-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setStatusFilter('')}
              className={cn(
                'rounded-full px-3 py-1.5 text-[11px] font-bold transition-colors',
                statusFilter === ''
                  ? 'bg-brand-800 text-white'
                  : 'border border-line bg-white text-ink-muted hover:border-brand-300 hover:text-brand-800',
              )}
            >
              Toutes ({data.stats.orders})
            </button>
            {ORDER_STATUSES.map((status) => {
              const count = data.stats.byStatus.find((item) => item.status === status)?.count ?? 0
              return (
                <button
                  key={status}
                  type="button"
                  onClick={() => setStatusFilter(status)}
                  className={cn(
                    'rounded-full px-3 py-1.5 text-[11px] font-bold transition-colors',
                    statusFilter === status
                      ? 'bg-brand-800 text-white'
                      : 'border border-line bg-white text-ink-muted hover:border-brand-300 hover:text-brand-800',
                  )}
                >
                  {orderStatusLabels[status]} ({count})
                </button>
              )
            })}
          </div>

          {data.orders.length === 0 ? (
            <EmptyState icon={ShoppingBag} title="Aucune commande pour ce statut" description="Les commandes apparaîtront ici dès qu’un client en enregistrera une." />
          ) : (
            <>
              <div className="grid gap-4 lg:grid-cols-2">
                {data.orders.map((order) => (
                  <article key={order.id} className="rounded-2xl border border-line bg-white p-5 shadow-soft">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold text-ink">{order.orderNumber}</p>
                        <p className="mt-0.5 text-xs text-ink-muted">
                          {new Date(order.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                          {order.groupReference && ` · ${order.groupReference}`}
                        </p>
                      </div>
                      <Badge tone={orderStatusTones[order.status]} dot>{orderStatusLabels[order.status]}</Badge>
                    </div>

                    <div className="mt-4 space-y-2 rounded-xl bg-canvas p-3">
                      {order.items.map((item, index) => (
                        <div key={index} className="flex items-start justify-between gap-3 text-xs">
                          <span className="text-ink-muted">{item.quantity} × {item.title}</span>
                          <span className="font-semibold text-ink">{formatPrice(item.lineTotalCents)}</span>
                        </div>
                      ))}
                      <div className="flex justify-between border-t border-line pt-2 text-sm font-bold text-brand-900"><span>Total</span><span>{formatPrice(order.totalCents)}</span></div>
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-xs font-bold text-ink">{order.client.name}</p>
                        <p className="mt-0.5 text-[11px] text-ink-muted">Tél. : {order.client.phone}</p>
                        <p className="mt-0.5 text-[11px] text-ink-muted">{siteLabel(order.client.site)}</p>
                        {(order.client.buildingNumber || order.client.roomNumber || order.client.floor !== undefined) && (
                          <p className="mt-0.5 text-[11px] text-ink-muted">
                            Bât. {order.client.buildingNumber ?? '—'} · Chambre {order.client.roomNumber ?? '—'} · Étage {order.client.floor ?? '—'}
                          </p>
                        )}
                        {order.client.locationRef && <p className="flex items-center gap-1 text-[11px] text-ink-muted"><MapPin className="h-3 w-3" /> {order.client.locationRef}</p>}
                        {order.meetingPointLabel && <p className="mt-0.5 text-[11px] text-ink-muted">RDV : {order.meetingPointLabel}</p>}
                        {order.clientNote && <p className="mt-2 rounded-lg bg-accent-50 px-2 py-1.5 text-[11px] leading-relaxed text-accent-700"><span className="font-bold">Instructions :</span> {order.clientNote}</p>}
                      </div>
                    </div>

                    <div className="mt-4 border-t border-line pt-3">
                      <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-ink-soft">Faire évoluer la commande</p>
                      {nextStatuses(order.status).length === 0 ? (
                        <p className="text-[11px] text-ink-muted">Statut final : {orderStatusLabels[order.status]}. Aucune autre étape disponible.</p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {nextStatuses(order.status).map((next) => (
                            <Button
                              key={next}
                              size="sm"
                              variant={next === 'REJECTED' || next === 'CANCELLED' ? 'outline' : next === 'COMPLETED' ? 'accent' : 'primary'}
                              loading={busyId === order.id}
                              onClick={() => void changeOrderStatus(order, next)}
                            >
                              {ORDER_ACTION_LABELS[next] ?? orderStatusLabels[next]}
                            </Button>
                          ))}
                        </div>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}
        </DashboardSection>
      )}

      {activeSection === 'notifications' && (
        <DashboardSection title="Notifications" description="Nouvelles commandes et changements de statut, reçus en temps réel.">
          <NotificationsPanel limit={20} />
        </DashboardSection>
      )}

      {activeSection === 'store' && (
        <DashboardSection title="Ma boutique" description="Informations publiques de votre boutique, enregistrées dans votre profil marchand.">
          <Card className="overflow-hidden">
            <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-brand-50 text-brand-700">
                {store.logoUrl ? (
                  <img src={assetUrl(store.logoUrl) ?? ''} alt="" className="h-full w-full object-cover" />
                ) : (
                  <StoreIcon className="h-8 w-8" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg font-extrabold text-ink">{store.name}</h3>
                  <Badge tone={store.isActive ? 'success' : 'muted'}>{store.isActive ? 'Active' : 'Inactive'}</Badge>
                </div>
                <p className="mt-2 whitespace-pre-line text-xs leading-relaxed text-ink-muted">{store.description}</p>
                <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-[11px] text-ink-muted">
                  <span className="inline-flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-brand-500" /> {siteLabel(store.location.site)} · {store.location.reference}</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {store.deliveryModes.map((mode) => (
                    <Badge key={mode} tone="neutral">{mode === 'HAND_DELIVERY' ? 'Remise en main propre' : 'Point de rendez-vous'}</Badge>
                  ))}
                </div>
              </div>
            </div>
            <div className="border-t border-line bg-canvas px-6 py-5">
              <p className="text-xs font-extrabold text-ink">Partager ma boutique</p>
              <p className="mt-1 text-xs text-ink-muted">Envoyez ce lien à vos clients pour leur permettre de consulter directement vos produits et services.</p>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <input
                  aria-label="Lien public de ma boutique"
                  readOnly
                  value={publicStoreUrl}
                  onFocus={(event) => event.currentTarget.select()}
                  className="h-11 min-w-0 flex-1 rounded-xl border border-line bg-white px-3 text-xs font-medium text-ink"
                />
                <Button type="button" size="sm" onClick={() => void copyStoreLink()}>
                  {shareCopied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {shareCopied ? 'Lien copié' : 'Copier le lien'}
                </Button>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <a
                  href={`https://wa.me/?text=${encodedShareText}%20${encodedStoreUrl}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={buttonStyles({ variant: 'outline', size: 'sm' })}
                >
                  <Share2 className="h-4 w-4" /> WhatsApp
                </a>
                <a
                  href={`https://www.facebook.com/sharer/sharer.php?u=${encodedStoreUrl}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={buttonStyles({ variant: 'outline', size: 'sm' })}
                >
                  <Facebook className="h-4 w-4" /> Facebook
                </a>
                <a
                  href={`https://t.me/share/url?url=${encodedStoreUrl}&text=${encodedShareText}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={buttonStyles({ variant: 'outline', size: 'sm' })}
                >
                  <Send className="h-4 w-4" /> Telegram
                </a>
                <a
                  href={`https://twitter.com/intent/tweet?url=${encodedStoreUrl}&text=${encodedShareText}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={buttonStyles({ variant: 'outline', size: 'sm' })}
                >
                  X
                </a>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link to="/boutique/$slug" params={{ slug: store.slug }} className={buttonStyles({ variant: 'outline', size: 'sm' })}>
                  Voir ma boutique publique
                </Link>
                <a href="/profil?tab=boutique" className={buttonStyles({ variant: 'secondary', size: 'sm' })}>
                  Modifier ma boutique
                </a>
              </div>
            </div>
          </Card>
        </DashboardSection>
      )}

      {activeSection === 'profile' && (
        <DashboardSection title="Mes informations personnelles" description="Données enregistrées sur votre compte.">
          <ProfileSummaryPanel user={user!} />
        </DashboardSection>
      )}

      {activeSection === 'settings' && (
        <DashboardSection title="Paramètres" description="Gérez les informations et préférences liées à votre compte.">
          <SettingsPanel user={user!} />
        </DashboardSection>
      )}

      {activeSection === 'overview' && (
        <p className="flex items-center justify-center gap-2 pb-4 text-[11px] text-ink-soft">
          <Sparkles className="h-3.5 w-3.5" /> Toutes les statistiques affichées proviennent de votre base de données.
        </p>
      )}
    </DashboardShell>
  )
}
