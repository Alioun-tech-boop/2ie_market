import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  CheckCircle2,
  DoorOpen,
  Handshake,
  MapPin,
  Phone,
  ShoppingBag,
  Store as StoreIcon,
  UserRound,
} from 'lucide-react'
import { generateReference, SITES, type Site } from '@2ie/shared'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { EmptyState } from '../components/ui/EmptyState'
import { Input } from '../components/ui/Input'
import { Price } from '../components/ui/Price'
import { Skeleton } from '../components/ui/Skeleton'
import { useToast } from '../components/ui/Toast'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import { ApiError } from '../lib/auth'
import { formatPrice, siteLabel } from '../lib/format'
import { shortTypeLabels } from '../lib/listingLabels'
import { defaultSearchState } from '../lib/market'
import { deliveryModeLabels } from '../lib/orderLabels'
import type { DeliveryMode } from '../lib/auth'
import type { MeetingPointDto } from '../lib/orders'
import { ordersApi } from '../lib/orders'

const selectClasses =
  'h-11 w-full appearance-none rounded-xl border border-line bg-white px-4 pr-10 text-sm font-medium text-ink outline-none transition-all duration-200 focus:border-brand-400 focus:ring-4 focus:ring-brand-500/10 disabled:opacity-60'

function floorLabel(floor: number): string {
  if (floor === 0) return 'R0 — Rez-de-chaussée'
  return `R${floor} — ${floor}${floor === 1 ? 'er' : 'e'} étage`
}

export default function CheckoutPage() {
  const { user } = useAuth()
  const { cart, loading, refresh } = useCart()
  const { showToast } = useToast()
  const navigate = useNavigate()

  const [clientName, setClientName] = useState(
    [user?.firstName, user?.lastName].filter(Boolean).join(' '),
  )
  const [clientPhone, setClientPhone] = useState(user?.phone ?? '')
  const [site, setSite] = useState<Site>(user?.location.site ?? 'KAMBOINSIN')
  const [buildingNumber, setBuildingNumber] = useState(user?.location.buildingNumber ?? '')
  const [roomNumber, setRoomNumber] = useState(user?.location.roomNumber ?? '')
  const [floor, setFloor] = useState(user?.location.floor ?? 0)
  const [deliveryMode, setDeliveryMode] = useState<DeliveryMode>('HAND_DELIVERY')
  const [meetingPointId, setMeetingPointId] = useState('')
  const [meetingPoints, setMeetingPoints] = useState<MeetingPointDto[]>([])
  const [loadingPoints, setLoadingPoints] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const submittedRef = useRef(false)

  // Seuls les modes acceptés par toutes les boutiques du panier sont proposés.
  const availableModes = cart.groups.reduce<DeliveryMode[]>(
    (modes, group) => modes.filter((mode) => group.store.deliveryModes.includes(mode)),
    ['HAND_DELIVERY', 'MEETUP_POINT'],
  )
  const selectedMode = availableModes.includes(deliveryMode)
    ? deliveryMode
    : (availableModes[0] ?? deliveryMode)

  useEffect(() => {
    if (selectedMode !== 'MEETUP_POINT' || meetingPoints.length > 0) return
    let active = true
    setLoadingPoints(true)
    ;(async () => {
      try {
        const result = await ordersApi.meetingPoints()
        if (!active) return
        setMeetingPoints(result.meetingPoints)
      } catch {
        if (active) showToast({ tone: 'info', title: 'Points de rendez-vous indisponibles', description: 'Réessayez dans un instant.' })
      } finally {
        if (active) setLoadingPoints(false)
      }
    })()
    return () => {
      active = false
    }
  }, [selectedMode, meetingPoints.length, showToast])

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (submitting || submittedRef.current || cart.groups.length === 0) return
    setFieldErrors({})
    setFormError(null)
    submittedRef.current = true
    setSubmitting(true)

    try {
      const result = await ordersApi.checkout({
        clientName: clientName.trim(),
        clientPhone: clientPhone.trim(),
        site,
        buildingNumber: buildingNumber.trim(),
        roomNumber: roomNumber.trim(),
        floor,
        deliveryMode: selectedMode,
        meetingPointId: selectedMode === 'MEETUP_POINT' ? meetingPointId : null,
      })
      await refresh()
      showToast({
        tone: 'success',
        title: 'Commande enregistrée',
        description: `Référence ${result.group.reference} — accord direct avec le commerçant via WhatsApp.`,
      })
      await navigate({
        to: '/commande/$reference',
        params: { reference: result.group.reference },
        search: { created: true },
      })
    } catch (cause) {
      submittedRef.current = false
      if (cause instanceof ApiError) {
        setFieldErrors(cause.issues?.fieldErrors ?? {})
        setFormError(cause.issues?.formErrors?.[0] ?? cause.message)
      } else {
        setFormError('La commande n’a pas pu être enregistrée. Réessayez.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <main className="container-premium py-10">
        <Skeleton className="h-10 w-72" />
        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px]">
          <Skeleton className="h-[540px] rounded-2xl" />
          <Skeleton className="h-96 rounded-2xl" />
        </div>
      </main>
    )
  }

  if (cart.groups.length === 0) {
    return (
      <main className="min-h-[calc(100vh-4rem)] bg-canvas py-14">
        <div className="container-premium max-w-3xl">
          <EmptyState
            icon={ShoppingBag}
            title="Aucune commande à confirmer"
            description="Votre panier est vide. Ajoutez d'abord des annonces pour préparer votre commande."
            action={
              <Link to="/recherche" search={defaultSearchState} className="inline-flex items-center gap-2 text-sm font-bold text-brand-700 hover:underline">
                <ArrowLeft className="h-4 w-4" /> Explorer les annonces
              </Link>
            }
          />
        </div>
      </main>
    )
  }

  const locationRef = generateReference(buildingNumber, roomNumber, floor)
  const errorFor = (field: string) => fieldErrors[field]?.[0]

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-canvas py-10 lg:py-14">
      <div className="container-premium">
        <Link to="/panier" className="inline-flex items-center gap-2 text-xs font-semibold text-ink-muted hover:text-brand-700">
          <ArrowLeft className="h-3.5 w-3.5" /> Retour au panier
        </Link>

        <div className="mt-5">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-accent-600">Dernière étape</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-brand-900">Confirmer la commande</h1>
          <p className="mt-2 max-w-2xl text-sm text-ink-muted">
            Vérifiez vos coordonnées et le détail par boutique. Votre commande est ensuite enregistrée et l'accord
            sur la remise se fait directement avec le commerçant via WhatsApp.
          </p>
        </div>

        <form onSubmit={(event) => void submit(event)} className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="space-y-5">
            <Card className="p-5 sm:p-6">
              <div className="flex items-center gap-2">
                <UserRound className="h-4 w-4 text-brand-600" />
                <h2 className="text-sm font-bold text-ink">Vos coordonnées</h2>
              </div>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <Input
                  id="checkout-name"
                  label="Nom complet"
                  value={clientName}
                  onChange={(event) => setClientName(event.target.value)}
                  error={errorFor('clientName')}
                  icon={UserRound}
                  required
                />
                <Input
                  id="checkout-phone"
                  label="Numéro de téléphone"
                  type="tel"
                  value={clientPhone}
                  onChange={(event) => setClientPhone(event.target.value)}
                  error={errorFor('clientPhone')}
                  icon={Phone}
                  hint="Utilisé par le commerçant pour vous contacter."
                  required
                />
              </div>
            </Card>

            <Card className="p-5 sm:p-6">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-brand-600" />
                <h2 className="text-sm font-bold text-ink">Votre localisation</h2>
              </div>
              <p className="mt-1.5 text-xs text-ink-muted">
                Le site est visible publiquement ; le bâtiment, la chambre et l'étage ne sont communiqués qu'au
                commerçant concerné par la commande.
              </p>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="checkout-site" className="mb-2 block text-sm font-semibold text-ink">Site</label>
                  <div className="relative">
                    <select
                      id="checkout-site"
                      value={site}
                      onChange={(event) => setSite(event.target.value as Site)}
                      className={selectClasses}
                      required
                    >
                      {SITES.map((value) => <option key={value} value={value}>{siteLabel(value)}</option>)}
                    </select>
                    <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-ink-soft">▾</span>
                  </div>
                  {errorFor('site') && <p className="mt-1.5 text-xs font-medium text-rose-600">{errorFor('site')}</p>}
                </div>
                <Input
                  id="checkout-building"
                  label="Numéro du bâtiment"
                  value={buildingNumber}
                  onChange={(event) => setBuildingNumber(event.target.value)}
                  error={errorFor('buildingNumber')}
                  icon={Building2}
                  maxLength={10}
                  required
                />
                <Input
                  id="checkout-room"
                  label="Numéro de chambre"
                  value={roomNumber}
                  onChange={(event) => setRoomNumber(event.target.value)}
                  error={errorFor('roomNumber')}
                  icon={DoorOpen}
                  inputMode="numeric"
                  maxLength={10}
                  required
                />
                <div>
                  <label htmlFor="checkout-floor" className="mb-2 block text-sm font-semibold text-ink">Étage</label>
                  <div className="relative">
                    <select
                      id="checkout-floor"
                      value={floor}
                      onChange={(event) => setFloor(Number(event.target.value))}
                      className={selectClasses}
                      required
                    >
                      {Array.from({ length: 21 }, (_, value) => (
                        <option key={value} value={value}>{floorLabel(value)}</option>
                      ))}
                    </select>
                    <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-ink-soft">▾</span>
                  </div>
                  {errorFor('floor') && <p className="mt-1.5 text-xs font-medium text-rose-600">{errorFor('floor')}</p>}
                </div>
              </div>
              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand-100 bg-brand-50 px-4 py-3">
                <p className="text-xs text-brand-800">Référence de localisation calculée automatiquement</p>
                <span className="rounded-lg bg-white px-3 py-1.5 font-mono text-base font-bold text-brand-800 shadow-soft">
                  {locationRef || 'B… · R…'}
                </span>
              </div>
            </Card>

            <Card className="p-5 sm:p-6">
              <div className="flex items-center gap-2">
                <Handshake className="h-4 w-4 text-brand-600" />
                <h2 className="text-sm font-bold text-ink">Mode de remise</h2>
              </div>
              <fieldset className="mt-5 space-y-3">
                <legend className="sr-only">Choisissez le mode de remise</legend>
                {([
                  { value: 'HAND_DELIVERY' as const, description: 'Le commerçant vous remet la commande en main propre.' },
                  { value: 'MEETUP_POINT' as const, description: 'Vous convenez d’un point de rendez-vous avec le commerçant.' },
                ].filter((option) => availableModes.includes(option.value))).map((option) => (
                  <label
                    key={option.value}
                    className={`flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3.5 transition-all ${
                      selectedMode === option.value ? 'border-brand-400 bg-brand-50' : 'border-line bg-white hover:border-brand-200'
                    }`}
                  >
                    <input
                      type="radio"
                      name="deliveryMode"
                      value={option.value}
                      checked={selectedMode === option.value}
                      onChange={() => {
                        setDeliveryMode(option.value)
                        if (option.value !== 'MEETUP_POINT') setMeetingPointId('')
                      }}
                      className="mt-1 h-4 w-4 accent-[#163274]"
                    />
                    <span>
                      <span className="block text-sm font-bold text-ink">{deliveryModeLabels[option.value]}</span>
                      <span className="mt-0.5 block text-xs text-ink-muted">{option.description}</span>
                    </span>
                  </label>
                ))}
              </fieldset>

              {selectedMode === 'MEETUP_POINT' && (
                <div className="mt-4">
                  <label htmlFor="checkout-meeting-point" className="mb-2 block text-sm font-semibold text-ink">
                    Point de rendez-vous
                  </label>
                  <div className="relative">
                    <select
                      id="checkout-meeting-point"
                      value={meetingPointId}
                      onChange={(event) => setMeetingPointId(event.target.value)}
                      className={selectClasses}
                      disabled={loadingPoints}
                      required
                    >
                      <option value="">{loadingPoints ? 'Chargement…' : 'Choisissez un point de rendez-vous'}</option>
                      {meetingPoints.map((point) => (
                        <option key={point.id} value={point.id}>
                          {point.label} — {siteLabel(point.site)}
                        </option>
                      ))}
                    </select>
                    <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-ink-soft">▾</span>
                  </div>
                  {errorFor('meetingPointId') && (
                    <p className="mt-1.5 text-xs font-medium text-rose-600">{errorFor('meetingPointId')}</p>
                  )}
                  {!loadingPoints && meetingPoints.length === 0 && (
                    <p className="mt-1.5 text-xs text-ink-muted">Aucun point de rendez-vous n'est disponible pour le moment.</p>
                  )}
                </div>
              )}
            </Card>

            {formError && (
              <div className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> <span>{formError}</span>
              </div>
            )}
          </div>

          <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
            <Card className="p-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-bold text-ink">Récapitulatif</h2>
                <Badge tone="neutral">{cart.groups.length} boutique{cart.groups.length > 1 ? 's' : ''}</Badge>
              </div>

              <div className="mt-4 space-y-4">
                {cart.groups.map((group) => (
                  <div key={group.store.id} className="rounded-xl border border-line bg-canvas p-3.5">
                    <p className="flex items-center gap-1.5 text-xs font-bold text-ink">
                      <StoreIcon className="h-3.5 w-3.5 text-brand-600" /> {group.store.name}
                    </p>
                    <ul className="mt-3 space-y-2">
                      {group.items.map((item) => (
                        <li key={item.id} className="flex items-start justify-between gap-3 text-xs">
                          <span className="min-w-0 text-ink-muted">
                            <span className="font-semibold text-ink">{item.quantity} ×</span> {item.title}
                            <span className="block text-[11px]">
                              {shortTypeLabels[item.type]} · {formatPrice(item.unitPriceCents)} / unité
                            </span>
                          </span>
                          <span className="shrink-0 font-semibold text-ink">{formatPrice(item.lineTotalCents)}</span>
                        </li>
                      ))}
                    </ul>
                    {group.note && (
                      <p className="mt-3 rounded-lg bg-white px-3 py-2 text-[11px] text-ink-muted">
                        <span className="font-bold text-ink">Note :</span> {group.note}
                      </p>
                    )}
                    <div className="mt-3 flex justify-between border-t border-line pt-2 text-xs font-bold text-brand-900">
                      <span>Sous-total</span><span>{formatPrice(group.subtotalCents)}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 space-y-2 border-t border-line pt-4 text-xs text-ink-muted">
                <p className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-500" /> Livraison : {deliveryModeLabels[selectedMode]}</p>
                <p className="flex items-start gap-2"><MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-500" /> Site : {siteLabel(site)} · Réf. {locationRef || '—'}</p>
                {selectedMode === 'MEETUP_POINT' && meetingPointId && (
                  <p className="flex items-start gap-2"><MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-500" /> RDV : {meetingPoints.find((point) => point.id === meetingPointId)?.label ?? 'Point choisi'}</p>
                )}
              </div>

              <div className="mt-4 flex items-end justify-between border-t border-line pt-4">
                <span className="text-sm font-bold text-ink">Total</span>
                <Price cents={cart.totalCents} size="lg" />
              </div>

              <Button type="submit" fullWidth size="lg" className="mt-5" loading={submitting} iconLeft={<CheckCircle2 className="h-4 w-4" />}>
                Confirmer la commande
              </Button>
              <p className="mt-3 text-center text-[11px] leading-relaxed text-ink-muted">
                Votre commande est enregistrée. L'accord sur la remise se fait directement avec le commerçant via WhatsApp.
              </p>
            </Card>
          </aside>
        </form>
      </div>
    </main>
  )
}
