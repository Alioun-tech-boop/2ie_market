import { useCallback, useEffect, useState } from 'react'
import { Link, useParams, useSearch } from '@tanstack/react-router'
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  CalendarDays,
  CheckCircle2,
  DoorOpen,
  Layers3,
  MapPin,
  Package,
  ShoppingBag,
  Store as StoreIcon,
} from 'lucide-react'
import { Badge } from '../components/ui/Badge'
import { buttonStyles } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { EmptyState } from '../components/ui/EmptyState'
import { Price } from '../components/ui/Price'
import { Skeleton } from '../components/ui/Skeleton'
import { useToast } from '../components/ui/Toast'
import { formatPrice, siteLabel } from '../lib/format'
import { shortTypeLabels } from '../lib/listingLabels'
import {
  deliveryModeLabels,
  orderStatusLabels,
  orderStatusTones,
  statusTimeline,
} from '../lib/orderLabels'
import type { OrderGroupDto } from '../lib/orders'
import { ordersApi } from '../lib/orders'
import { ApiError } from '../lib/auth'

function dateLabel(value: string): string {
  return new Date(value).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

export default function OrderDetailPage() {
  const { reference } = useParams({ from: '/commande/$reference' })
  const { created } = useSearch({ from: '/commande/$reference' })
  const { showToast } = useToast()
  const [group, setGroup] = useState<OrderGroupDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setNotFound(false)
    try {
      if (typeof reference !== 'string' || !reference.trim()) {
        setNotFound(true)
        return
      }
      const result = await ordersApi.getOrder(reference)
      const candidate = result?.group
      // Un ancien déploiement API peut renvoyer un objet incomplet :
      // traiter cela comme une réponse invalide plutôt que de faire planter React.
      if (
        !candidate ||
        typeof candidate.reference !== 'string' ||
        !candidate.reference.trim() ||
        !candidate.client ||
        !Array.isArray(candidate.orders)
      ) {
        setNotFound(true)
        return
      }
      setGroup(candidate)
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 404) setNotFound(true)
      else showToast({ tone: 'info', title: 'Commande indisponible', description: 'Réessayez dans un instant.' })
    } finally {
      setLoading(false)
    }
  }, [reference, showToast])

  useEffect(() => {
    void load()
  }, [load])

  if (loading) {
    return (
      <main className="container-premium py-10">
        <Skeleton className="h-10 w-72" />
        <div className="mt-8 space-y-4">
          <Skeleton className="h-40 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      </main>
    )
  }

  if (notFound || !group) {
    return (
      <main className="container-premium py-16">
        <EmptyState
          icon={ShoppingBag}
          title="Commande introuvable"
          description="Cette référence ne correspond à aucune de vos commandes."
          action={
            <Link to="/commandes" className="inline-flex items-center gap-2 text-sm font-bold text-brand-700 hover:underline">
              <ArrowLeft className="h-4 w-4" /> Retour à mes commandes
            </Link>
          }
        />
      </main>
    )
  }

  const client = group.client
  const meetingNote = group.orders.find((order) => order.meetingNote)?.meetingNote

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-canvas py-10 lg:py-14">
      <div className="container-premium max-w-5xl">
        <Link to="/commandes" search={{}} className="inline-flex items-center gap-2 text-xs font-semibold text-ink-muted hover:text-brand-700">
          <ArrowLeft className="h-3.5 w-3.5" /> Mes commandes
        </Link>

        {created && (
          <div className="mt-5 flex items-start gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 px-5 py-4">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
            <div>
              <p className="text-sm font-bold text-emerald-800">Commande enregistrée</p>
              <p className="mt-1 text-xs leading-relaxed text-emerald-700">
                Votre commande est confirmée automatiquement sous la référence {group.reference}. Chaque commerçant concerné reçoit une notification et peut gérer la commande depuis son espace vendeur.
              </p>
            </div>
          </div>
        )}

        <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-accent-600">Détail de la commande</p>
            <h1 className="mt-2 font-mono text-2xl font-extrabold tracking-tight text-brand-900 sm:text-3xl">
              {group.reference}
            </h1>
            <p className="mt-2 flex items-center gap-1.5 text-sm text-ink-muted">
              <CalendarDays className="h-4 w-4" /> {dateLabel(group.createdAt)}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Badge tone={orderStatusTones[group.status]} dot>{orderStatusLabels[group.status]}</Badge>
            <Price cents={group.totalCents} size="lg" />
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Card className="p-5">
            <h2 className="text-sm font-bold text-ink">Informations de remise</h2>
            <div className="mt-4 space-y-2.5 text-xs text-ink-muted">
              <p className="flex items-start gap-2"><Package className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-500" /> {deliveryModeLabels[group.deliveryMode]}</p>
              {group.meetingPointLabel && <p className="flex items-start gap-2"><MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-500" /> Point de rendez-vous : {group.meetingPointLabel}</p>}
              {meetingNote && (
                <p className="flex items-start gap-2"><MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-500" /> Précision : {meetingNote}</p>
              )}
              <p className="flex items-start gap-2"><MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-500" /> Site : {siteLabel(client.site)}</p>
            </div>
          </Card>
          <Card className="p-5">
            <h2 className="text-sm font-bold text-ink">Localisation du client</h2>
            <p className="mt-1 text-[11px] text-ink-muted">Communiquée uniquement aux commerçants concernés par cette commande.</p>
            <div className="mt-4 grid gap-2 text-xs text-ink-muted sm:grid-cols-2">
              <p className="flex items-center gap-2"><Building2 className="h-3.5 w-3.5 text-brand-500" /> Bâtiment : <strong className="text-ink">{client.buildingNumber}</strong></p>
              <p className="flex items-center gap-2"><DoorOpen className="h-3.5 w-3.5 text-brand-500" /> Chambre : <strong className="text-ink">{client.roomNumber}</strong></p>
              <p className="flex items-center gap-2"><Layers3 className="h-3.5 w-3.5 text-brand-500" /> Étage : <strong className="text-ink">{client.floor === 0 ? 'R0 (rez-de-chaussée)' : `R${client.floor}`}</strong></p>
              <p className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5 text-brand-500" /> Référence : <strong className="font-mono text-ink">{client.locationRef}</strong></p>
            </div>
            <p className="mt-4 border-t border-line pt-3 text-xs text-ink-muted">Contact : <strong className="text-ink">{client.name}</strong> · {client.phone}</p>
          </Card>
        </div>

        <section className="mt-8 space-y-5">
          <h2 className="flex items-center gap-2 text-base font-bold text-ink">
            <ShoppingBag className="h-4 w-4 text-brand-600" /> Sous-commandes par boutique
          </h2>

          {group.orders.map((order) => {
            const steps = statusTimeline(order.status)
            return (
              <Card key={order.id} className="overflow-hidden">
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line bg-brand-50/50 px-5 py-4">
                  <div>
                    <p className="flex items-center gap-1.5 text-sm font-bold text-ink">
                      <StoreIcon className="h-4 w-4 text-brand-600" /> {order.merchant.name}
                    </p>
                    <p className="mt-0.5 font-mono text-xs text-ink-muted">{order.orderNumber} · {siteLabel(order.merchant.site)}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={orderStatusTones[order.status]} dot>{orderStatusLabels[order.status]}</Badge>
                  </div>
                </div>

                <div className="px-5 py-4">
                  <ul className="divide-y divide-line">
                    {order.items.map((item, index) => (
                      <li key={`${item.listingId ?? 'item'}-${index}`} className="flex flex-wrap items-start justify-between gap-3 py-2.5 text-sm">
                        <span className="min-w-0 text-ink">
                          <span className="font-semibold">{item.quantity} ×</span> {item.title}
                          <span className="block text-[11px] text-ink-muted">{shortTypeLabels[item.type]} · {formatPrice(item.unitPriceCents)} / unité</span>
                        </span>
                        <span className="font-bold text-brand-900">{formatPrice(item.lineTotalCents)}</span>
                      </li>
                    ))}
                  </ul>

                  {order.clientNote && (
                    <p className="mt-3 rounded-xl bg-canvas px-4 py-3 text-xs text-ink-muted">
                      <strong className="text-ink">Votre note :</strong> {order.clientNote}
                    </p>
                  )}

                  <div className="mt-4 flex justify-between border-t border-line pt-3 text-sm font-bold text-brand-900">
                    <span>Total de cette boutique</span><span>{formatPrice(order.totalCents)}</span>
                  </div>

                  <div className="mt-5 border-t border-line pt-4">
                    <p className="text-[11px] font-extrabold uppercase tracking-wide text-ink-soft">Suivi de la commande</p>
                    <ol className="mt-3 flex flex-wrap items-center gap-2">
                      {steps.map((step, index) => (
                        <li key={step} className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-bold ${
                              index === steps.length - 1 ? 'bg-brand-800 text-white' : 'bg-brand-50 text-brand-700'
                            }`}
                          >
                            <CheckCircle2 className="h-3 w-3" /> {orderStatusLabels[step]}
                          </span>
                          {index < steps.length - 1 && <span className="text-ink-soft">→</span>}
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>
              </Card>
            )
          })}
        </section>

        {group.orders.some((order) => order.status === 'REJECTED' || order.status === 'CANCELLED') && (
          <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-line bg-white px-4 py-3 text-xs text-ink-muted">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-accent-600" />
            Une sous-commande a été annulée. Son statut et son historique restent consultables dans votre suivi de commande.
          </div>
        )}

        <div className="mt-8 flex flex-wrap gap-3">
          <Link to="/commandes" search={{}} className={buttonStyles({ variant: 'primary' })}>
            Retour à mes commandes
          </Link>
          <Link to="/" className={buttonStyles({ variant: 'outline' })}>Retour à l'accueil</Link>
        </div>
      </div>
    </main>
  )
}
