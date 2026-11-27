import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, CheckCircle2, ExternalLink, FileImage, RefreshCw, XCircle } from 'lucide-react'
import { useToast } from '../ui/Toast'
import { ApiError, assetUrl } from '../../lib/auth'
import { adminApi, type OverdueSubscription, type SubscriptionRenewal } from '../../lib/admin'

export function AdminSubscriptionRenewalsPanel() {
  const { showToast } = useToast()
  const [renewals, setRenewals] = useState<SubscriptionRenewal[]>([])
  const [overdue, setOverdue] = useState<OverdueSubscription[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [notes, setNotes] = useState<Record<string, string>>({})

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const result = await adminApi.subscriptionRenewals()
      setRenewals(result.renewals)
      setOverdue(result.overdue)
    } catch (error) {
      showToast({ tone: 'accent', title: 'Renouvellements indisponibles', description: error instanceof ApiError ? error.message : 'Impossible de charger les renouvellements.' })
    } finally {
      setLoading(false)
    }
  }, [showToast])

  useEffect(() => { void load() }, [load])

  async function decide(payment: SubscriptionRenewal, decision: 'APPROVE' | 'REJECT') {
    const note = notes[payment.id]?.trim() ?? ''
    if (decision === 'REJECT' && !note) {
      showToast({ tone: 'accent', title: 'Motif obligatoire', description: 'Indiquez pourquoi la preuve est refusée.' })
      return
    }
    setBusyId(payment.id)
    try {
      await adminApi.decideSubscriptionRenewal(payment.id, decision, note || undefined)
      showToast({
        tone: 'success',
        title: decision === 'APPROVE' ? 'Abonnement renouvelé' : 'Preuve refusée',
        description: decision === 'APPROVE'
          ? 'Un mois supplémentaire a été accordé et la boutique réactivée si le compte est actif.'
          : 'Le vendeur a été informé et pourra transmettre une nouvelle preuve.',
      })
      await load()
    } catch (error) {
      showToast({ tone: 'accent', title: 'Décision non enregistrée', description: error instanceof ApiError ? error.message : 'Réessayez.' })
    } finally {
      setBusyId(null)
    }
  }

  if (loading && renewals.length === 0 && overdue.length === 0) {
    return <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">Chargement des abonnements…</div>
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-slate-900">Renouvellement mensuel : 1 000 FCFA</p>
          <p className="mt-1 text-xs text-slate-500">Contrôlez chaque justificatif avant de prolonger l’abonnement d’un mois.</p>
        </div>
        <button type="button" onClick={() => void load()} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50">
          <RefreshCw className="h-3.5 w-3.5" /> Actualiser
        </button>
      </div>

      {overdue.length > 0 && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
          <div className="flex items-center gap-2 text-sm font-extrabold text-rose-800">
            <AlertTriangle className="h-4 w-4" /> {overdue.length} abonnement{overdue.length > 1 ? 's' : ''} expiré{overdue.length > 1 ? 's' : ''}
          </div>
          <div className="mt-3 space-y-2">
            {overdue.map((store) => (
              <div key={store.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white/80 px-3 py-2 text-xs">
                <div>
                  <p className="font-bold text-slate-900">{store.name}</p>
                  <p className="text-slate-600">{store.owner.firstName} {store.owner.lastName} · {store.owner.email}</p>
                </div>
                <span className="font-semibold text-rose-700">Échu le {new Date(store.expiresAt).toLocaleDateString('fr-FR')}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {renewals.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500" />
          <p className="mt-3 text-sm font-bold text-slate-900">Aucun renouvellement à vérifier</p>
          <p className="mt-1 text-xs text-slate-500">Les preuves transmises par les vendeurs apparaîtront ici.</p>
        </div>
      ) : renewals.map((payment) => {
        const proof = assetUrl(payment.proofUrl)
        const busy = busyId === payment.id
        return (
          <article key={payment.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-950">{payment.store.name}</h3>
                <p className="mt-1 text-xs text-slate-500">Preuve reçue le {new Date(payment.submittedAt).toLocaleString('fr-FR')}</p>
              </div>
              <span className="rounded-xl bg-amber-50 px-3 py-2 text-sm font-black text-amber-800">1 000 FCFA · En attente</span>
            </div>
            <div className="mt-3 grid gap-3 text-xs text-slate-600 sm:grid-cols-2">
              <div>
                <p className="font-bold text-slate-900">{payment.store.owner.firstName} {payment.store.owner.lastName}</p>
                <p>{payment.store.owner.email}</p>
                <p>{payment.store.owner.phoneE164}</p>
                <p className="mt-2">Échéance actuelle : {payment.store.expiresAt ? new Date(payment.store.expiresAt).toLocaleDateString('fr-FR') : 'Non définie'}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="mb-2 flex items-center gap-2 font-bold text-slate-800"><FileImage className="h-4 w-4" /> Justificatif privé</p>
                {proof ? <a href={proof} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 font-bold text-brand-700 underline">Consulter la preuve <ExternalLink className="h-3.5 w-3.5" /></a> : <p className="text-rose-600">Preuve inaccessible.</p>}
              </div>
            </div>
            <div className="mt-4 border-t border-slate-100 pt-4">
              <label htmlFor={`subscription-note-${payment.id}`} className="mb-1.5 block text-xs font-bold text-slate-700">Motif de refus (obligatoire pour refuser)</label>
              <textarea
                id={`subscription-note-${payment.id}`}
                value={notes[payment.id] ?? ''}
                onChange={(event) => setNotes((current) => ({ ...current, [payment.id]: event.target.value }))}
                rows={2}
                maxLength={500}
                placeholder="Précisez le motif si la preuve n’est pas valide…"
                className="w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-800 outline-none focus:border-brand-500"
              />
              <div className="mt-3 flex flex-wrap justify-end gap-2">
                <button type="button" disabled={busy} onClick={() => void decide(payment, 'REJECT')} className="inline-flex items-center gap-2 rounded-xl border border-rose-200 px-4 py-2.5 text-xs font-bold text-rose-700 hover:bg-rose-50 disabled:opacity-50">
                  <XCircle className="h-4 w-4" /> Refuser
                </button>
                <button type="button" disabled={busy} onClick={() => void decide(payment, 'APPROVE')} className="inline-flex items-center gap-2 rounded-xl bg-brand-800 px-4 py-2.5 text-xs font-bold text-white hover:bg-brand-900 disabled:opacity-50">
                  <CheckCircle2 className="h-4 w-4" /> {busy ? 'Traitement…' : 'Valider et prolonger'}
                </button>
              </div>
            </div>
          </article>
        )
      })}
    </section>
  )
}
