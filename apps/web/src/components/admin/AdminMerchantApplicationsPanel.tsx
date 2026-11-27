import { useCallback, useEffect, useState } from 'react'
import { CheckCircle2, ExternalLink, FileImage, RefreshCw, XCircle } from 'lucide-react'
import { useToast } from '../ui/Toast'
import { ApiError, assetUrl } from '../../lib/auth'
import { adminApi, type MerchantApplication } from '../../lib/admin'

export function AdminMerchantApplicationsPanel() {
  const { showToast } = useToast()
  const [applications, setApplications] = useState<MerchantApplication[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [notes, setNotes] = useState<Record<string, string>>({})

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const result = await adminApi.merchantApplications()
      setApplications(result.applications)
    } catch (cause) {
      showToast({
        tone: 'accent',
        title: 'Demandes indisponibles',
        description: cause instanceof ApiError ? cause.message : 'Impossible de charger les demandes vendeurs.',
      })
    } finally {
      setLoading(false)
    }
  }, [showToast])

  useEffect(() => { void load() }, [load])

  async function decide(application: MerchantApplication, decision: 'APPROVE' | 'REJECT') {
    const note = notes[application.id]?.trim() ?? ''
    if (decision === 'REJECT' && !note) {
      showToast({ tone: 'accent', title: 'Motif obligatoire', description: 'Indiquez la raison du refus avant de continuer.' })
      return
    }
    setBusyId(application.id)
    try {
      await adminApi.decideMerchantApplication(application.id, decision, note || undefined)
      showToast({
        tone: 'success',
        title: decision === 'APPROVE' ? 'Vendeur validé' : 'Demande refusée',
        description: decision === 'APPROVE'
          ? 'Le compte vendeur et sa boutique sont maintenant activés.'
          : 'Le motif de refus a été enregistré.',
      })
      await load()
    } catch (cause) {
      showToast({
        tone: 'accent',
        title: 'Décision non enregistrée',
        description: cause instanceof ApiError ? cause.message : 'Réessayez dans un instant.',
      })
    } finally {
      setBusyId(null)
    }
  }

  if (loading && applications.length === 0) {
    return <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">Chargement des demandes vendeurs…</div>
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-slate-900">Frais d’ouverture : 1 000 FCFA</p>
          <p className="mt-1 text-xs text-slate-500">Vérifiez la preuve de paiement et les informations du candidat avant toute activation.</p>
        </div>
        <button type="button" onClick={() => void load()} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50">
          <RefreshCw className="h-3.5 w-3.5" /> Actualiser
        </button>
      </div>

      {applications.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500" />
          <p className="mt-3 text-sm font-bold text-slate-900">Aucune demande à traiter</p>
          <p className="mt-1 text-xs text-slate-500">Les nouvelles inscriptions vendeurs apparaîtront ici.</p>
        </div>
      ) : applications.map((application) => {
        const proofUrl = assetUrl(application.paymentProofUrl)
        const busy = busyId === application.id
        return (
          <article key={application.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base font-extrabold text-slate-950">{application.storeName}</h3>
                  <span className={application.status === 'PENDING' ? 'rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold text-amber-700' : 'rounded-full bg-rose-50 px-2.5 py-1 text-[10px] font-bold text-rose-700'}>
                    {application.status === 'PENDING' ? 'En attente' : 'Refusée'}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500">Demande du {new Date(application.createdAt).toLocaleString('fr-FR')}</p>
              </div>
              <span className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-black text-slate-900">1 000 FCFA</span>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="space-y-1 text-xs text-slate-600">
                <p className="font-bold text-slate-900">{application.owner.firstName} {application.owner.lastName}</p>
                <p>{application.owner.email}</p>
                <p>{application.owner.phone}</p>
                <p>{application.location.site} · Bâtiment {application.location.buildingNumber}, chambre {application.location.roomNumber}, étage {application.location.floor}</p>
                <p className="pt-2 leading-relaxed">{application.description}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="mb-2 flex items-center gap-2 text-xs font-bold text-slate-800"><FileImage className="h-4 w-4" /> Justificatif de paiement</p>
                {proofUrl ? (
                  <a href={proofUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-xs font-bold text-brand-700 underline">
                    Consulter la preuve <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                ) : <p className="text-xs text-rose-600">Aucune preuve enregistrée.</p>}
                {application.reviewNote && <p className="mt-2 text-xs text-rose-700">Motif précédent : {application.reviewNote}</p>}
              </div>
            </div>

            <div className="mt-4 border-t border-slate-100 pt-4">
              <label className="mb-1.5 block text-xs font-bold text-slate-700" htmlFor={`review-${application.id}`}>Note administrative / motif de refus</label>
              <textarea
                id={`review-${application.id}`}
                value={notes[application.id] ?? ''}
                onChange={(event) => setNotes((current) => ({ ...current, [application.id]: event.target.value }))}
                rows={2}
                maxLength={500}
                placeholder="Facultatif pour une validation, obligatoire en cas de refus…"
                className="w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-800 outline-none focus:border-brand-500"
              />
              <div className="mt-3 flex flex-wrap justify-end gap-2">
                <button type="button" disabled={busy} onClick={() => void decide(application, 'REJECT')} className="inline-flex items-center gap-2 rounded-xl border border-rose-200 px-4 py-2.5 text-xs font-bold text-rose-700 hover:bg-rose-50 disabled:opacity-50">
                  <XCircle className="h-4 w-4" /> Refuser
                </button>
                <button type="button" disabled={busy} onClick={() => void decide(application, 'APPROVE')} className="inline-flex items-center gap-2 rounded-xl bg-brand-800 px-4 py-2.5 text-xs font-bold text-white hover:bg-brand-900 disabled:opacity-50">
                  <CheckCircle2 className="h-4 w-4" /> {busy ? 'Traitement…' : 'Valider le vendeur'}
                </button>
              </div>
            </div>
          </article>
        )
      })}
    </section>
  )
}
