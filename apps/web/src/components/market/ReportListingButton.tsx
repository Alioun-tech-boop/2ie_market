import { useState, type FormEvent } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Flag, X } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { ApiError } from '../../lib/auth'
import { marketApi } from '../../lib/market'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { useToast } from '../ui/Toast'

const REASONS = [
  { value: 'INAPPROPRIATE', label: 'Contenu inapproprié' },
  { value: 'FRAUD', label: 'Fraude ou arnaque' },
  { value: 'PROHIBITED', label: 'Produit interdit' },
  { value: 'MISLEADING', label: 'Annonce trompeuse' },
  { value: 'OTHER', label: 'Autre' },
] as const

type Reason = (typeof REASONS)[number]['value']

export function ReportListingButton({ listingId }: { listingId: string }) {
  const { status } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState<Reason>('INAPPROPRIATE')
  const [details, setDetails] = useState('')
  const [sending, setSending] = useState(false)

  function start() {
    if (status !== 'authenticated') {
      void navigate({ to: '/connexion' })
      return
    }
    setOpen(true)
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSending(true)
    try {
      await marketApi.reportListing(listingId, { reason, details: details.trim() || undefined })
      setOpen(false)
      setDetails('')
      showToast({
        tone: 'success',
        title: 'Signalement envoyé',
        description: 'Un administrateur va examiner cette annonce.',
      })
    } catch (cause) {
      showToast({
        tone: 'accent',
        title: 'Signalement impossible',
        description: cause instanceof ApiError ? cause.message : 'Réessayez dans un instant.',
      })
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={start}
        className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-ink-muted underline-offset-4 hover:text-rose-600 hover:underline"
      >
        <Flag className="h-3.5 w-3.5" /> Signaler cette annonce
      </button>

      {open && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/50 p-4" role="dialog" aria-modal="true" aria-labelledby="report-title">
          <Card className="w-full max-w-md p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id="report-title" className="text-sm font-extrabold text-ink">Signaler une annonce</h2>
                <p className="mt-1 text-xs leading-relaxed text-ink-muted">
                  Votre signalement est transmis aux administrateurs. Il n’est pas visible publiquement.
                </p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="rounded-lg p-1.5 text-ink-muted hover:bg-brand-50" aria-label="Fermer">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={(event) => void submit(event)} className="mt-4 space-y-3">
              <label className="block">
                <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-ink-muted">Motif</span>
                <select
                  value={reason}
                  onChange={(event) => setReason(event.target.value as Reason)}
                  className="h-10 w-full rounded-xl border border-line bg-white px-3 text-sm font-medium text-ink outline-none focus:border-brand-300"
                >
                  {REASONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-ink-muted">Précisions (facultatif)</span>
                <textarea
                  rows={3}
                  maxLength={1000}
                  value={details}
                  onChange={(event) => setDetails(event.target.value)}
                  placeholder="Décrivez le problème constaté."
                  className="w-full rounded-xl border border-line bg-white px-3 py-2.5 text-sm font-medium text-ink outline-none focus:border-brand-300"
                />
              </label>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>Annuler</Button>
                <Button type="submit" variant="accent" size="sm" loading={sending} iconLeft={<Flag className="h-4 w-4" />}>
                  Envoyer le signalement
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </>
  )
}
