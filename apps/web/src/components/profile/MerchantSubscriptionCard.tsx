import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { AlertCircle, CalendarClock, CheckCircle2, Clock3, UploadCloud } from 'lucide-react'
import { api, ApiError } from '../../lib/auth'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { useToast } from '../ui/Toast'

interface SubscriptionState {
  amount: number
  expiresAt: string | null
  pending: { submittedAt: string } | null
  expired: boolean
}

export function MerchantSubscriptionCard() {
  const { showToast } = useToast()
  const [state, setState] = useState<SubscriptionState | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setState(await api<SubscriptionState>('/me/subscription'))
    } catch (error) {
      showToast({ tone: 'accent', title: 'Abonnement indisponible', description: error instanceof ApiError ? error.message : 'Réessayez plus tard.' })
    } finally {
      setLoading(false)
    }
  }, [showToast])

  useEffect(() => { void load() }, [load])

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!file) {
      showToast({ tone: 'accent', title: 'Justificatif obligatoire', description: 'Sélectionnez la preuve de paiement de 1 000 FCFA.' })
      return
    }
    const form = new FormData()
    form.append('photos', file)
    setSending(true)
    try {
      await api('/me/subscription/renewal', { method: 'POST', body: form })
      setFile(null)
      if (fileRef.current) fileRef.current.value = ''
      showToast({ tone: 'success', title: 'Preuve transmise', description: 'Votre renouvellement sera activé après vérification administrative.' })
      await load()
    } catch (error) {
      showToast({ tone: 'accent', title: 'Envoi impossible', description: error instanceof ApiError ? error.message : 'Réessayez dans un instant.' })
    } finally {
      setSending(false)
    }
  }

  const expiry = state?.expiresAt ? new Date(state.expiresAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Non définie'
  const expired = state?.expired ?? false

  return (
    <Card className={expired ? 'border-rose-200 bg-rose-50 p-5' : 'border-brand-100 p-5'}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className={expired ? 'rounded-xl bg-rose-100 p-2.5 text-rose-700' : 'rounded-xl bg-brand-50 p-2.5 text-brand-700'}>
            <CalendarClock className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-extrabold text-ink">Abonnement vendeur</h2>
            <p className="mt-1 text-xs text-ink-muted">Renouvellement mensuel : <strong className="text-ink">1 000 FCFA</strong></p>
          </div>
        </div>
        {loading ? <span className="text-xs text-ink-muted">Chargement…</span> : (
          <span className={expired ? 'rounded-full bg-rose-100 px-3 py-1 text-[11px] font-bold text-rose-700' : 'rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-bold text-emerald-700'}>
            {expired ? 'Expiré' : 'Actif'}
          </span>
        )}
      </div>
      <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-xs text-ink-muted">
        <span className="inline-flex items-center gap-1.5"><Clock3 className="h-3.5 w-3.5" /> Échéance : <strong className="text-ink">{expiry}</strong></span>
        {state?.pending && <span className="inline-flex items-center gap-1.5 text-amber-700"><AlertCircle className="h-3.5 w-3.5" /> Preuve en cours de vérification</span>}
      </div>
      {state?.pending ? (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
          Votre justificatif a été reçu le {new Date(state.pending.submittedAt).toLocaleString('fr-FR')}. L’abonnement sera prolongé après validation par l’administration.
        </div>
      ) : (
        <form onSubmit={(event) => void submit(event)} className="mt-4 space-y-3 border-t border-line pt-4">
          <p className="text-xs leading-relaxed text-ink-muted">
            Effectuez le paiement de 1 000 FCFA, puis transmettez le reçu. Si votre abonnement est déjà expiré, votre boutique sera réactivée après validation.
          </p>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            className="block w-full text-xs text-ink-muted file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-2 file:text-xs file:font-bold file:text-brand-800"
          />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-[11px] text-ink-muted">{file ? file.name : 'JPEG, PNG, WebP ou PDF · 2 Mo maximum'}</span>
            <Button type="submit" loading={sending} disabled={loading || !file} iconLeft={<UploadCloud className="h-4 w-4" />}>
              Renouveler
            </Button>
          </div>
        </form>
      )}
      <div className="mt-3 flex items-center gap-2 text-[11px] text-ink-muted">
        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" /> La validation administrative confirme le renouvellement.
      </div>
    </Card>
  )
}
