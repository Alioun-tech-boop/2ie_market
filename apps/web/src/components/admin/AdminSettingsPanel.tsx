import { useEffect, useState, type FormEvent } from 'react'
import { ImagePlus, Save, ShieldCheck, Trash2 } from 'lucide-react'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { Skeleton } from '../ui/Skeleton'
import { useToast } from '../ui/Toast'
import { ApiError, assetUrl } from '../../lib/auth'
import { usePlatform } from '../../context/PlatformContext'
import { adminApi, type PlatformSettings } from '../../lib/admin'

const fieldClasses =
  'h-11 w-full rounded-xl border border-line bg-white px-3 text-sm font-medium text-ink outline-none focus:border-brand-300'

function errorMessage(cause: unknown) {
  return cause instanceof ApiError ? cause.message : 'Une erreur est survenue.'
}

export function AdminSettingsPanel() {
  const { showToast } = useToast()
  const { refresh: refreshPlatform } = usePlatform()
  const [settings, setSettings] = useState<PlatformSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [logoBusy, setLogoBusy] = useState(false)
  const [name, setName] = useState('')
  const [supportEmail, setSupportEmail] = useState('')
  const [maintenanceMessage, setMaintenanceMessage] = useState('')
  const [reviewsEnabled, setReviewsEnabled] = useState(true)

  useEffect(() => {
    let active = true
    adminApi
      .settings()
      .then((result) => {
        if (!active) return
        setSettings(result.settings)
        setName(result.settings.name)
        setSupportEmail(result.settings.supportEmail ?? '')
        setMaintenanceMessage(result.settings.maintenanceMessage ?? '')
        setReviewsEnabled(result.settings.reviewsEnabled)
      })
      .catch((cause) => {
        if (active) showToast({ tone: 'accent', title: 'Paramètres indisponibles', description: errorMessage(cause) })
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [showToast])

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    try {
      const result = await adminApi.updateSettings({
        platformName: name.trim(),
        supportEmail: supportEmail.trim() || null,
        maintenanceMessage: maintenanceMessage.trim() || null,
        reviewsEnabled,
      })
      setSettings(result.settings)
      void refreshPlatform()
      showToast({ tone: 'success', title: 'Paramètres enregistrés', description: 'Les réglages de la plateforme sont à jour.' })
    } catch (cause) {
      showToast({ tone: 'accent', title: 'Enregistrement impossible', description: errorMessage(cause) })
    } finally {
      setSaving(false)
    }
  }

  async function uploadLogo(file: File | undefined) {
    if (!file) return
    setLogoBusy(true)
    try {
      const result = await adminApi.uploadLogo(file)
      setSettings(result.settings)
      void refreshPlatform()
      showToast({ tone: 'success', title: 'Logo mis à jour', description: 'Le logo est publié sur la plateforme.' })
    } catch (cause) {
      showToast({ tone: 'accent', title: 'Upload impossible', description: errorMessage(cause) })
    } finally {
      setLogoBusy(false)
    }
  }

  async function removeLogo() {
    if (!window.confirm('Retirer le logo de la plateforme ?')) return
    setLogoBusy(true)
    try {
      const result = await adminApi.removeLogo()
      setSettings(result.settings)
      void refreshPlatform()
      showToast({ tone: 'success', title: 'Logo retiré' })
    } catch (cause) {
      showToast({ tone: 'accent', title: 'Action impossible', description: errorMessage(cause) })
    } finally {
      setLogoBusy(false)
    }
  }

  if (loading) {
    return <div className="space-y-4"><Skeleton className="h-36 rounded-2xl" /><Skeleton className="h-72 rounded-2xl" /></div>
  }

  const logo = assetUrl(settings?.logoUrl)

  return (
    <div className="space-y-5">
      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-sm font-extrabold text-ink">Identité de la plateforme</h2>
            <p className="mt-1 text-xs text-ink-muted">Nom public, logo et coordonnées de support.</p>
          </div>
          <Badge tone="success" dot>Paramètres persistés</Badge>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-4 rounded-2xl border border-line bg-canvas p-4">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-brand-800 text-white">
            {logo ? <img src={logo} alt="Logo de la plateforme" className="h-full w-full object-cover" /> : <span className="text-xl font-extrabold">2ie</span>}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-ink">{settings?.name}</p>
            <p className="mt-0.5 text-xs text-ink-muted">JPEG, PNG ou WebP · 2 Mo maximum · normalisation WebP.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <label className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-xl border border-line bg-white px-3 text-xs font-semibold text-ink hover:bg-brand-50">
                <ImagePlus className="h-4 w-4" /> {logoBusy ? 'Traitement…' : 'Changer le logo'}
                <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={logoBusy} onChange={(event) => void uploadLogo(event.target.files?.[0])} />
              </label>
              {settings?.logoUrl && (
                <Button size="sm" variant="ghost" loading={logoBusy} onClick={() => void removeLogo()} iconLeft={<Trash2 className="h-4 w-4" />}>
                  Retirer
                </Button>
              )}
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-5">
        <form onSubmit={(event) => void save(event)} className="space-y-4">
          <div>
            <h2 className="text-sm font-extrabold text-ink">Paramètres généraux</h2>
            <p className="mt-1 text-xs text-ink-muted">Ces valeurs sont lues par le site public et les tableaux de bord.</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-ink-muted">Nom de la plateforme</span>
              <input required minLength={2} maxLength={120} value={name} onChange={(event) => setName(event.target.value)} className={fieldClasses} />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-ink-muted">E-mail de support</span>
              <input type="email" maxLength={160} value={supportEmail} onChange={(event) => setSupportEmail(event.target.value)} placeholder="support@exemple.com" className={fieldClasses} />
            </label>
          </div>

          <label className="block">
            <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-ink-muted">Message d’information</span>
            <textarea
              maxLength={500}
              rows={3}
              value={maintenanceMessage}
              onChange={(event) => setMaintenanceMessage(event.target.value)}
              placeholder="Message affiché aux utilisateurs lorsque nécessaire."
              className="w-full rounded-xl border border-line bg-white px-3 py-2.5 text-sm font-medium text-ink outline-none focus:border-brand-300"
            />
          </label>

          <label className="flex items-start gap-3 rounded-xl border border-line p-3">
            <input type="checkbox" checked={reviewsEnabled} onChange={(event) => setReviewsEnabled(event.target.checked)} className="mt-0.5 h-4 w-4 rounded border-line text-brand-700" />
            <span>
              <span className="block text-xs font-bold text-ink">Avis publics activés</span>
              <span className="mt-0.5 block text-[11px] leading-relaxed text-ink-muted">
                Désactive l’affichage et l’agrégation des avis sur les boutiques publiques.
              </span>
            </span>
          </label>

          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" loading={saving} iconLeft={<Save className="h-4 w-4" />}>Enregistrer</Button>
            <p className="text-[11px] text-ink-soft">
              Dernière mise à jour : {settings ? new Date(settings.updatedAt).toLocaleString('fr-FR') : '—'}
            </p>
          </div>
        </form>
      </Card>

      <Card className="flex items-start gap-3 border-brand-100 bg-brand-50/60 p-4">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" />
        <p className="text-xs leading-relaxed text-brand-900">
          Les uploads sont limités en taille et en type, réencodés en WebP sans métadonnées, et chaque modification
          est enregistrée dans le journal d’audit avec l’identité de l’administrateur.
        </p>
      </Card>
    </div>
  )
}
