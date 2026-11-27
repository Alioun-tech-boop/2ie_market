import { useRef, useState, type FormEvent } from 'react'
import { Link } from '@tanstack/react-router'
import {
  AlertCircle,
  Bell,
  CalendarDays,
  CheckCircle2,
  ImagePlus,
  MapPin,
  ShieldCheck,
  Store,
  UserRound,
} from 'lucide-react'
import { LocationForm, type LocationValue } from '../components/location/LocationForm'
import { NotificationsPanel } from '../components/notifications/NotificationsPanel'
import { MerchantSubscriptionCard } from '../components/profile/MerchantSubscriptionCard'
import { Avatar } from '../components/ui/Avatar'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { useToast } from '../components/ui/Toast'
import { useAuth } from '../context/AuthContext'
import { ApiError, assetUrl, type DeliveryMode, type SelfUser } from '../lib/auth'
import { cn } from '../lib/cn'

type Tab = 'infos' | 'localisation' | 'notifications' | 'boutique'

const tabs: { id: Tab; label: string; icon: typeof UserRound; merchantOnly?: boolean }[] = [
  { id: 'infos', label: 'Informations', icon: UserRound },
  { id: 'localisation', label: 'Localisation', icon: MapPin },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'boutique', label: 'Boutique', icon: Store, merchantOnly: true },
]

function messageOf(cause: unknown): string {
  return cause instanceof ApiError ? cause.message : 'Une erreur est survenue.'
}

function fieldOf(cause: unknown, field: string): string | undefined {
  return cause instanceof ApiError ? cause.issues?.fieldErrors[field]?.[0] : undefined
}

export default function ProfilePage() {
  const { user, updateProfile, updateLocation, updateStore, uploadPhoto } = useAuth()
  const { showToast } = useToast()
  const [tab, setTab] = useState<Tab>(() => {
    const requested = new URLSearchParams(window.location.search).get('tab')
    return requested === 'notifications' ? 'notifications' : 'infos'
  })
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const profileFile = useRef<HTMLInputElement>(null)
  const logoFile = useRef<HTMLInputElement>(null)

  const [firstName, setFirstName] = useState(user?.firstName ?? '')
  const [lastName, setLastName] = useState(user?.lastName ?? '')
  const [phone, setPhone] = useState(user?.phone ?? '')
  const [location, setLocation] = useState<LocationValue>(
    user?.location ?? { site: 'KAMBOINSIN', buildingNumber: '', roomNumber: '', floor: 0 },
  )
  const [storeName, setStoreName] = useState(user?.store?.name ?? '')
  const [whatsapp, setWhatsapp] = useState(user?.store?.whatsapp ?? '')
  const [description, setDescription] = useState(user?.store?.description ?? '')
  const [deliveryModes, setDeliveryModes] = useState<DeliveryMode[]>(
    user?.store?.deliveryModes ?? ['HAND_DELIVERY', 'MEETUP_POINT'],
  )

  if (!user) return null

  async function withSave(action: () => Promise<SelfUser>, success: string) {
    setError(null)
    setSaving(true)
    try {
      const next = await action()
      setFirstName(next.firstName)
      setLastName(next.lastName)
      setPhone(next.phone)
      setLocation(next.location)
      if (next.store) {
        setStoreName(next.store.name)
        setWhatsapp(next.store.whatsapp)
        setDescription(next.store.description)
        setDeliveryModes(next.store.deliveryModes)
      }
      showToast({ tone: 'success', title: 'Modifications enregistrées', description: success })
    } catch (cause) {
      setError(messageOf(cause))
    } finally {
      setSaving(false)
    }
  }

  async function handlePhoto(file: File | undefined, kind: 'profile' | 'logo') {
    if (!file) return
    await withSave(() => uploadPhoto(file, kind), 'Photo mise à jour.')
  }

  async function submitInfos(event: FormEvent) {
    event.preventDefault()
    await withSave(() => updateProfile({ firstName, lastName, phone }), 'Vos coordonnées sont à jour.')
  }

  async function submitLocation(event: FormEvent) {
    event.preventDefault()
    await withSave(() => updateLocation(location), 'Votre référence a été recalculée.')
  }

  async function submitStore(event: FormEvent) {
    event.preventDefault()
    await withSave(
      () => updateStore({ name: storeName, whatsapp, description, deliveryModes }),
      'Votre boutique est à jour.',
    )
  }

  const joinedAt = new Date(user.createdAt).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric',
  })

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-canvas py-10 lg:py-14">
      <div className="container-premium max-w-5xl space-y-6">
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-accent-600">Mon espace</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-brand-900">Mon profil</h1>
        </div>

        <Card className="p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <Avatar name={`${user.firstName} ${user.lastName}`} src={assetUrl(user.profilePhotoUrl)} tone={user.store ? 'blue' : 'violet'} size="lg" />
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-lg font-bold text-ink">{user.firstName} {user.lastName}</h2>
              <p className="truncate text-sm text-ink-muted">{user.email}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Badge tone="brand" dot>
                  {user.role === 'ADMIN' ? 'Administrateur' : user.role === 'MERCHANT' ? 'Commerçant' : 'Client'}
                </Badge>
                <Badge tone={user.status === 'ACTIVE' ? 'success' : 'muted'}>
                  {user.status === 'ACTIVE' ? 'Compte actif' : 'Compte suspendu'}
                </Badge>
              </div>
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-ink-muted sm:flex-col">
              <span className="inline-flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5 text-brand-500" /> Inscrit le {joinedAt}</span>
              <span className="inline-flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-brand-500" /> Référence <strong className="font-mono text-brand-800">{user.location.reference}</strong></span>
            </div>
          </div>
        </Card>

        {user.role === 'MERCHANT' && user.store?.approvalStatus !== 'APPROVED' && (
          <Card className={user.store?.approvalStatus === 'REJECTED' ? 'border-rose-200 bg-rose-50 p-5' : 'border-amber-200 bg-amber-50 p-5'}>
            <div className="flex items-start gap-3">
              <AlertCircle className={user.store?.approvalStatus === 'REJECTED' ? 'mt-0.5 h-5 w-5 shrink-0 text-rose-600' : 'mt-0.5 h-5 w-5 shrink-0 text-amber-600'} />
              <div>
                <h2 className="text-sm font-extrabold text-ink">
                  {user.store?.approvalStatus === 'REJECTED' ? 'Votre demande vendeur a été refusée' : 'Votre demande vendeur est en cours de vérification'}
                </h2>
                <p className="mt-1 text-xs leading-relaxed text-ink-muted">
                  {user.store?.approvalStatus === 'REJECTED'
                    ? 'Votre boutique reste désactivée. Consultez le motif ci-dessous et contactez l’administration pour régulariser votre dossier.'
                    : 'Votre preuve de paiement de 1 000 FCFA a été transmise à l’administration. Vous pourrez accéder à votre espace vendeur et publier des annonces dès que votre demande sera validée.'}
                </p>
                {user.store?.reviewNote && <p className="mt-2 rounded-lg bg-white/70 p-3 text-xs font-semibold text-ink">Note de l’administration : {user.store.reviewNote}</p>}
                <p className="mt-2 text-[11px] font-bold text-ink-muted">Statut : {user.store?.approvalStatus === 'REJECTED' ? 'Refusée' : 'En attente'}</p>
              </div>
            </div>
          </Card>
        )}

        {user.role === 'MERCHANT' && user.store?.approvalStatus === 'APPROVED' && <MerchantSubscriptionCard />}

        <div className="flex gap-1 overflow-x-auto rounded-2xl border border-line bg-white p-1.5 scrollbar-none">
          {tabs.filter((item) => !item.merchantOnly || (user.role === 'MERCHANT' && user.store?.approvalStatus === 'APPROVED')).map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => { setTab(item.id); setError(null) }}
                className={cn(
                  'flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-semibold transition-all',
                  tab === item.id ? 'bg-brand-800 text-white shadow-soft' : 'text-ink-muted hover:bg-brand-50',
                )}
              >
                <Icon className="h-4 w-4" /> {item.label}
              </button>
            )
          })}
        </div>

        {error && (
          <div className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {tab === 'infos' && (
          <Card className="p-6 sm:p-8">
            <form onSubmit={submitInfos} className="space-y-6">
              <div className="flex flex-col gap-4 border-b border-line pb-6 sm:flex-row sm:items-center">
                <Avatar name={`${user.firstName} ${user.lastName}`} src={assetUrl(user.profilePhotoUrl)} tone={user.store ? 'blue' : 'violet'} size="lg" />
                <div className="flex-1">
                  <p className="text-sm font-bold text-ink">Photo de profil</p>
                  <p className="mt-1 text-xs text-ink-muted">JPEG, PNG ou WebP · 2 Mo maximum.</p>
                </div>
                <input ref={profileFile} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => void handlePhoto(e.target.files?.[0], 'profile')} />
                <Button type="button" variant="outline" iconLeft={<ImagePlus className="h-4 w-4" />} onClick={() => profileFile.current?.click()}>
                  Changer la photo
                </Button>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Input label="Prénom" value={firstName} onChange={(e) => setFirstName(e.target.value)} error={fieldOf(error, 'firstName')} required />
                <Input label="Nom" value={lastName} onChange={(e) => setLastName(e.target.value)} error={fieldOf(error, 'lastName')} required />
              </div>
              <Input label="Numéro de téléphone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} error={fieldOf(error, 'phone')} hint="Format international accepté (+226…)." required />
              <div className="flex justify-end">
                <Button type="submit" loading={saving}>Enregistrer</Button>
              </div>
            </form>
          </Card>
        )}

        {tab === 'localisation' && (
          <Card className="p-6 sm:p-8">
            <form onSubmit={submitLocation} className="space-y-6">
              <div className="flex items-start gap-2.5 rounded-xl border border-brand-100 bg-brand-50 px-4 py-3 text-xs text-brand-800">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
                Ces informations restent privées. Seul le vendeur concerné par une commande voit votre référence.
              </div>
              <LocationForm value={location} onChange={setLocation} errors={error ? {} : undefined} />
              <div className="flex justify-end">
                <Button type="submit" loading={saving}>Mettre à jour ma localisation</Button>
              </div>
            </form>
          </Card>
        )}

        {tab === 'notifications' && (
          <div className="space-y-4">
            <NotificationsPanel limit={20} />
            <Card className="p-5">
              <p className="text-sm font-bold text-ink">Suivi des commandes</p>
              <p className="mt-1 text-xs leading-relaxed text-ink-muted">
                La confirmation de chaque commande enregistrée et les changements de statut apparaissent ici.
                Le récapitulatif complet reste disponible dans votre espace commandes.
              </p>
              <Link to="/commandes" className="mt-3 inline-flex text-xs font-bold text-brand-700 hover:text-brand-900">
                Voir mes commandes →
              </Link>
            </Card>
          </div>
        )}

        {tab === 'boutique' && user.store && (
          <Card className="p-6 sm:p-8">
            <form onSubmit={submitStore} className="space-y-6">
              <div className="flex flex-col gap-4 border-b border-line pb-6 sm:flex-row sm:items-center">
                <Avatar name={storeName} src={assetUrl(user.store?.logoUrl)} tone="blue" size="lg" />
                <div className="flex-1">
                  <p className="text-sm font-bold text-ink">Logo de la boutique</p>
                  <p className="mt-1 text-xs text-ink-muted">Facultatif · JPEG, PNG ou WebP · 2 Mo maximum.</p>
                </div>
                <input ref={logoFile} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => void handlePhoto(e.target.files?.[0], 'logo')} />
                <Button type="button" variant="outline" iconLeft={<ImagePlus className="h-4 w-4" />} onClick={() => logoFile.current?.click()}>
                  Changer le logo
                </Button>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Input label="Nom de la boutique" value={storeName} onChange={(e) => setStoreName(e.target.value)} error={fieldOf(error, 'name')} required />
                <Input label="Numéro WhatsApp" type="tel" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} error={fieldOf(error, 'whatsapp')} required />
              </div>

              <div>
                <label htmlFor="store-description" className="mb-2 block text-sm font-semibold text-ink">Description de l'activité</label>
                <textarea
                  id="store-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className="w-full resize-none rounded-xl border border-line bg-white px-4 py-3 text-sm text-ink outline-none transition-all focus:border-brand-400 focus:ring-4 focus:ring-brand-500/10"
                />
                {fieldOf(error, 'description') && <p className="mt-1.5 text-xs font-medium text-rose-600">{fieldOf(error, 'description')}</p>}
              </div>

              <fieldset>
                <legend className="mb-2 text-sm font-semibold text-ink">Modes de remise acceptés</legend>
                <div className="flex flex-wrap gap-2">
                  {[
                    { value: 'HAND_DELIVERY' as const, label: 'Remise en main propre' },
                    { value: 'MEETUP_POINT' as const, label: 'Point de rendez-vous' },
                  ].map((mode) => {
                    const active = deliveryModes.includes(mode.value)
                    return (
                      <button
                        key={mode.value}
                        type="button"
                        onClick={() => setDeliveryModes(active ? deliveryModes.filter((m) => m !== mode.value) : [...deliveryModes, mode.value])}
                        className={cn(
                          'inline-flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-xs font-semibold transition-all',
                          active ? 'border-brand-400 bg-brand-50 text-brand-800' : 'border-line text-ink-muted hover:border-brand-200',
                        )}
                      >
                        {active && <CheckCircle2 className="h-3.5 w-3.5" />} {mode.label}
                      </button>
                    )
                  })}
                </div>
              </fieldset>

              <div className="grid gap-3 rounded-xl border border-line bg-canvas p-4 text-xs text-ink-muted sm:grid-cols-3">
                <span>Créée le <strong className="block text-ink">{new Date(user.store.createdAt).toLocaleDateString('fr-FR')}</strong></span>
                <span>Statut <strong className="block text-ink">{user.store.isActive ? 'Active' : 'Inactive'}</strong></span>
                <span>Localisation <strong className="block font-mono text-ink">{user.store.location.reference}</strong></span>
              </div>

              <div className="flex justify-end">
                <Button type="submit" loading={saving}>Enregistrer les modifications</Button>
              </div>
            </form>
          </Card>
        )}

        {tab === 'boutique' && !user.store && (
          <Card className="p-8 text-center">
            <Store className="mx-auto h-8 w-8 text-brand-500" />
            <h3 className="mt-4 text-base font-bold text-ink">Aucune boutique associée</h3>
            <p className="mx-auto mt-2 max-w-md text-sm text-ink-muted">
              Ce compte est un compte client. Inscrivez-vous comme commerçant pour obtenir votre boutique.
            </p>
            <Link to="/inscription" className="mt-5 inline-flex text-sm font-bold text-brand-700 hover:text-brand-900">
              Créer un compte commerçant
            </Link>
          </Card>
        )}
      </div>
    </main>
  )
}
