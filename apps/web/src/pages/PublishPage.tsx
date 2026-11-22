import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useSearch } from '@tanstack/react-router'
import { ArrowLeft, ImagePlus, Package, Plus, Sparkles, Trash2, Wrench, X } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Skeleton } from '../components/ui/Skeleton'
import { useToast } from '../components/ui/Toast'
import { ApiError, assetUrl } from '../lib/auth'
import { cn } from '../lib/cn'
import { formatPrice } from '../lib/format'
import { marketApi, type Availability, type Category, type Condition, type ListingPayload, type MerchantListing } from '../lib/market'

type Kind = 'product' | 'service'
type OptionRow = { id: string; name: string; priceXof: string }
type DraftFile = { id: string; file: File; preview: string }

const AVAILABILITY: Availability[] = ['AVAILABLE', 'OUT_OF_STOCK', 'PAUSED']
const CONDITIONS: Condition[] = ['NEW', 'LIKE_NEW', 'GOOD', 'FAIR']
const selectClass = 'h-11 w-full appearance-none rounded-xl border border-line bg-white px-4 pr-10 text-sm font-medium text-ink outline-none transition-all focus:border-brand-400 focus:ring-4 focus:ring-brand-500/10'
const uid = () => Math.random().toString(36).slice(2, 10)

export function NewListingPage() {
  const { kind } = useSearch({ from: '/publier' })
  return <PublishPage initialKind={kind} />
}
export function EditListingPage() {
  const { id } = useParams({ from: '/annonces/$id/modifier' })
  return <PublishPage listingId={id} />
}

function PublishPage({ listingId, initialKind = 'product' }: { listingId?: string; initialKind?: Kind }) {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(Boolean(listingId))
  const [saving, setSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [issues, setIssues] = useState<Record<string, string[]>>({})

  const [kind, setKind] = useState<Kind>(initialKind)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [priceXof, setPriceXof] = useState('')
  const [condition, setCondition] = useState<Condition>('NEW')
  const [quantity, setQuantity] = useState('1')
  const [duration, setDuration] = useState('')
  const [requirements, setRequirements] = useState('')
  const [availability, setAvailability] = useState<Availability>('AVAILABLE')
  const [status, setStatus] = useState<'DRAFT' | 'PUBLISHED' | 'PAUSED'>('PUBLISHED')
  const [options, setOptions] = useState<OptionRow[]>([])
  const [files, setFiles] = useState<DraftFile[]>([])
  const [existingPhotos, setExistingPhotos] = useState<MerchantListing['photos']>([])
  const [removedPhotoIds, setRemovedPhotoIds] = useState<string[]>([])

  useEffect(() => {
    let active = true
    Promise.all([marketApi.categories(), listingId ? marketApi.merchantListing(listingId) : Promise.resolve(null)])
      .then(([categoryResult, listingResult]) => {
        if (!active) return
        setCategories(categoryResult.categories)
        setCategoryId((current) => current || categoryResult.categories[0]?.id || '')
        if (!listingResult) return
        const listing = listingResult.listing
        const service = listing.type === 'SERVICE'
        setKind(service ? 'service' : 'product')
        setTitle(listing.title)
        setDescription(listing.description)
        setCategoryId(listing.category?.id ?? categoryResult.categories[0]?.id ?? '')
        setPriceXof(String(listing.priceCents / 100))
        setCondition(listing.condition ?? 'NEW')
        setQuantity(String(listing.quantity ?? 1))
        setDuration(listing.durationMinutes ? String(listing.durationMinutes) : '')
        setRequirements(listing.requirements ?? '')
        setAvailability(listing.availability)
        setStatus(listing.status === 'ARCHIVED' ? 'DRAFT' : listing.status)
        setOptions(listing.options.map((option) => ({ id: uid(), name: option.name, priceXof: String(option.priceCents / 100) })))
        setExistingPhotos(listing.photos)
      })
      .catch(() => active && showToast({ tone: 'info', title: 'Chargement impossible', description: 'Réessayez dans un instant.' }))
      .finally(() => active && setLoading(false))
    return () => { active = false }
  }, [listingId, showToast])

  useEffect(() => () => files.forEach((item) => URL.revokeObjectURL(item.preview)), [files])

  const totalPhotos = existingPhotos.length - removedPhotoIds.length + files.length
  const payload = useMemo<ListingPayload>(() => ({
    title: title.trim(),
    description: description.trim(),
    categoryId,
    type: kind === 'service' ? 'SERVICE' : condition === 'NEW' ? 'PHYSICAL' : 'SECOND_HAND',
    priceCents: Math.round(Number(priceXof || 0)) * 100,
    quantity: kind === 'service' ? null : Math.round(Number(quantity || 0)),
    condition: kind === 'service' ? null : condition,
    availability,
    durationMinutes: kind === 'service' && duration ? Math.round(Number(duration)) : null,
    requirements: kind === 'service' ? requirements.trim() || null : null,
    options: options.filter((o) => o.name.trim()).map((o) => ({ name: o.name.trim(), priceCents: Math.round(Number(o.priceXof || 0)) * 100 })),
    status,
  }), [kind, title, description, categoryId, condition, priceXof, quantity, availability, duration, requirements, options, status])

  function handleFiles(selected: FileList | null) {
    if (!selected) return
    const accepted = Array.from(selected)
      .filter((file) => ['image/jpeg', 'image/png', 'image/webp'].includes(file.type) && file.size <= 2 * 1024 * 1024)
      .slice(0, Math.max(0, 6 - totalPhotos))
    if (accepted.length < selected.length) showToast({ tone: 'info', title: 'Images ignorées', description: 'JPEG, PNG ou WebP · 2 Mo max · 6 photos au total.' })
    setFiles((current) => [...current, ...accepted.map((file) => ({ id: uid(), file, preview: URL.createObjectURL(file) }))])
  }

  async function submit() {
    setSaving(true)
    setErrorMessage(null)
    setIssues({})
    try {
      if (!listingId) {
        const form = new FormData()
        form.append('title', payload.title)
        form.append('description', payload.description)
        form.append('categoryId', payload.categoryId)
        form.append('type', payload.type)
        form.append('priceCents', String(payload.priceCents))
        form.append('availability', payload.availability)
        form.append('status', payload.status)
        form.append('options', JSON.stringify(payload.options))
        if (payload.condition) form.append('condition', payload.condition)
        if (payload.quantity !== null) form.append('quantity', String(payload.quantity))
        if (payload.durationMinutes) form.append('durationMinutes', String(payload.durationMinutes))
        if (payload.requirements) form.append('requirements', payload.requirements)
        files.forEach((item) => form.append('photos', item.file))
        await marketApi.createListing(form)
      } else {
        await marketApi.updateListing(listingId, payload)
        for (const photoId of removedPhotoIds) await marketApi.removePhoto(listingId, photoId)
        if (files.length) await marketApi.addPhotos(listingId, files.map((item) => item.file))
      }
      showToast({ tone: 'success', title: listingId ? 'Annonce mise à jour' : status === 'DRAFT' ? 'Brouillon enregistré' : 'Annonce publiée', description: 'Retrouvez-la dans votre tableau de bord.' })
      void navigate({ to: '/tableau-de-bord' })
    } catch (error: unknown) {
      if (error instanceof ApiError) {
        setIssues(error.issues?.fieldErrors ?? {})
        setErrorMessage(error.message || 'Vérifiez les informations saisies.')
      } else setErrorMessage('Une erreur est survenue. Réessayez.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <main className="container-premium py-10"><Skeleton className="h-12 w-72" /><Skeleton className="mt-8 h-96 w-full rounded-3xl" /></main>
  }

  const error = (field: string) => issues[field]?.[0]

  return (
    <main className="bg-canvas pb-16">
      <div className="container-premium pt-8 lg:pt-12">
        <button type="button" onClick={() => void navigate({ to: '/tableau-de-bord' })} className="inline-flex items-center gap-2 text-xs font-semibold text-ink-muted hover:text-brand-700">
          <ArrowLeft className="h-3.5 w-3.5" /> Tableau de bord
        </button>
        <p className="mt-5 text-[11px] font-extrabold uppercase tracking-[0.16em] text-brand-600">Publication</p>
        <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-ink lg:text-3xl">{listingId ? 'Modifier l’annonce' : 'Publier une annonce'}</h1>
        <p className="mt-2 max-w-xl text-sm text-ink-muted">Quelques champs seulement. Votre annonce est visible immédiatement par la communauté.</p>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="space-y-5">
            <section className="rounded-3xl border border-line bg-white p-5 shadow-soft lg:p-7">
              <h2 className="text-sm font-bold text-ink">1. Que souhaitez-vous publier ?</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {([{ key: 'product' as const, icon: Package, label: 'Un produit', hint: 'Neuf ou d’occasion' }, { key: 'service' as const, icon: Wrench, label: 'Un service', hint: 'Avec tarif obligatoire' }]).map((item) => {
                  const Icon = item.icon
                  return (
                    <button key={item.key} type="button" onClick={() => setKind(item.key)} className={cn('flex items-center gap-3 rounded-2xl border-2 p-4 text-left transition-all', kind === item.key ? 'border-brand-700 bg-brand-50 shadow-soft' : 'border-line bg-white hover:border-brand-300')}>
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-100 text-brand-700"><Icon className="h-5 w-5" /></span>
                      <span><span className="block text-sm font-bold text-ink">{item.label}</span><span className="block text-xs text-ink-muted">{item.hint}</span></span>
                    </button>
                  )
                })}
              </div>
            </section>

            <section className="space-y-5 rounded-3xl border border-line bg-white p-5 shadow-soft lg:p-7">
              <div>
                <h2 className="text-sm font-bold text-ink">2. Les informations essentielles</h2>
                <p className="mt-1 text-xs text-ink-muted">Un titre clair et une bonne photo font toute la différence.</p>
              </div>
              <Input label="Titre" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={kind === 'service' ? 'Ex. Cours de mathématiques niveau L2' : 'Ex. Calculatrice scientifique'} maxLength={140} error={error('title')} />
              <div>
                <label htmlFor="listing-description" className="mb-2 block text-sm font-semibold text-ink">Description</label>
                <textarea id="listing-description" value={description} onChange={(e) => setDescription(e.target.value)} rows={4} maxLength={4000} placeholder="Décrivez ce que vous proposez, l'état, ce qui est inclus…" className={cn('w-full resize-y rounded-xl border border-line bg-white px-4 py-3 text-sm text-ink outline-none transition-all placeholder:text-ink-soft focus:border-brand-400 focus:ring-4 focus:ring-brand-500/10', error('description') && 'border-rose-400')} />
                {error('description') && <p className="mt-1.5 text-xs font-medium text-rose-600">{error('description')}</p>}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="listing-category" className="mb-2 block text-sm font-semibold text-ink">Catégorie</label>
                  <div className="relative">
                    <select id="listing-category" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={selectClass}>
                      {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                    </select>
                    <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-ink-soft">▾</span>
                  </div>
                  {error('categoryId') && <p className="mt-1.5 text-xs font-medium text-rose-600">{error('categoryId')}</p>}
                </div>
                <Input label="Prix (F CFA)" value={priceXof} onChange={(e) => setPriceXof(e.target.value.replace(/\D/g, ''))} inputMode="numeric" placeholder="Ex. 1500" hint="Saisissez 0 pour indiquer « Gratuit »." error={error('priceCents')} />
              </div>

              {kind === 'product' ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="listing-condition" className="mb-2 block text-sm font-semibold text-ink">État</label>
                    <div className="relative">
                      <select id="listing-condition" value={condition} onChange={(e) => setCondition(e.target.value as Condition)} className={selectClass}>
                        {CONDITIONS.map((value) => <option key={value} value={value}>{value === 'NEW' ? 'Neuf' : value === 'LIKE_NEW' ? 'Comme neuf' : value === 'GOOD' ? 'Bon état' : 'État satisfaisant'}</option>)}
                      </select>
                      <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-ink-soft">▾</span>
                    </div>
                    {error('condition') && <p className="mt-1.5 text-xs font-medium text-rose-600">{error('condition')}</p>}
                  </div>
                  <Input label="Quantité disponible" value={quantity} onChange={(e) => setQuantity(e.target.value.replace(/\D/g, ''))} inputMode="numeric" error={error('quantity')} />
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input label="Durée (minutes, facultatif)" value={duration} onChange={(e) => setDuration(e.target.value.replace(/\D/g, ''))} inputMode="numeric" placeholder="Ex. 60" error={error('durationMinutes')} />
                  <div>
                    <label htmlFor="listing-requirements" className="mb-2 block text-sm font-semibold text-ink">Conditions de réalisation</label>
                    <textarea id="listing-requirements" value={requirements} onChange={(e) => setRequirements(e.target.value)} rows={2} maxLength={2000} placeholder="Ex. À domicile ou au point de rendez-vous du campus." className="w-full resize-y rounded-xl border border-line bg-white px-4 py-3 text-sm text-ink outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-500/10" />
                  </div>
                </div>
              )}

              <div>
                <label htmlFor="listing-availability" className="mb-2 block text-sm font-semibold text-ink">Disponibilité</label>
                <div className="relative max-w-xs">
                  <select id="listing-availability" value={availability} onChange={(e) => setAvailability(e.target.value as Availability)} className={selectClass}>
                    {AVAILABILITY.map((value) => <option key={value} value={value}>{value === 'AVAILABLE' ? 'Disponible' : value === 'OUT_OF_STOCK' ? 'Rupture de stock' : 'Suspendu'}</option>)}
                  </select>
                  <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-ink-soft">▾</span>
                </div>
              </div>
            </section>

            <section className="space-y-4 rounded-3xl border border-line bg-white p-5 shadow-soft lg:p-7">
              <div>
                <h2 className="text-sm font-bold text-ink">3. Photos</h2>
                <p className="mt-1 text-xs text-ink-muted">JPEG, PNG ou WebP · 2 Mo maximum par image · 6 photos maximum.</p>
              </div>
              <div className="flex flex-wrap gap-3">
                {existingPhotos.filter((photo) => !removedPhotoIds.includes(photo.id)).map((photo) => (
                  <div key={photo.id} className="group relative h-24 w-24 overflow-hidden rounded-xl border border-line">
                    <img src={assetUrl(photo.thumbUrl ?? photo.url) ?? ''} alt="" className="h-full w-full object-cover" />
                    <button type="button" onClick={() => setRemovedPhotoIds((current) => [...current, photo.id])} aria-label="Retirer la photo" className="absolute right-1 top-1 rounded-lg bg-white/90 p-1 text-rose-600 opacity-0 group-hover:opacity-100"><X className="h-3 w-3" /></button>
                  </div>
                ))}
                {files.map((item) => (
                  <div key={item.id} className="group relative h-24 w-24 overflow-hidden rounded-xl border border-brand-200">
                    <img src={item.preview} alt="" className="h-full w-full object-cover" />
                    <button type="button" onClick={() => setFiles((current) => { const target = current.find((entry) => entry.id === item.id); if (target) URL.revokeObjectURL(target.preview); return current.filter((entry) => entry.id !== item.id) })} aria-label="Retirer la photo" className="absolute right-1 top-1 rounded-lg bg-white/90 p-1 text-rose-600 opacity-0 group-hover:opacity-100"><X className="h-3 w-3" /></button>
                  </div>
                ))}
                {totalPhotos < 6 && (
                  <label className="flex h-24 w-24 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-line bg-brand-50/50 text-brand-600 transition-colors hover:border-brand-300 hover:bg-brand-50">
                    <ImagePlus className="h-5 w-5" /><span className="text-[10px] font-semibold">Ajouter</span>
                    <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" onChange={(e) => handleFiles(e.target.files)} />
                  </label>
                )}
              </div>
            </section>

            <section className="space-y-4 rounded-3xl border border-line bg-white p-5 shadow-soft lg:p-7">
              <div className="flex items-center justify-between gap-3">
                <div><h2 className="text-sm font-bold text-ink">4. Options (facultatif)</h2><p className="mt-1 text-xs text-ink-muted">Ex. « Livraison », « Couleur supplémentaire ».</p></div>
                <Button type="button" variant="secondary" size="sm" iconLeft={<Plus className="h-3.5 w-3.5" />} onClick={() => setOptions((current) => [...current, { id: uid(), name: '', priceXof: '' }])}>Ajouter</Button>
              </div>
              {options.length === 0 ? (
                <p className="rounded-xl border border-dashed border-line bg-canvas px-4 py-5 text-center text-xs text-ink-muted">Aucune option. Vous pouvez ajouter jusqu'à 8 options.</p>
              ) : (
                <div className="space-y-2">
                  {options.map((option) => (
                    <div key={option.id} className="flex gap-2">
                      <Input value={option.name} onChange={(e) => setOptions((current) => current.map((entry) => entry.id === option.id ? { ...entry, name: e.target.value } : entry))} placeholder="Nom de l'option" maxLength={80} />
                      <Input value={option.priceXof} onChange={(e) => setOptions((current) => current.map((entry) => entry.id === option.id ? { ...entry, priceXof: e.target.value.replace(/\D/g, '') } : entry))} placeholder="Prix" inputMode="numeric" className="max-w-28" />
                      <button type="button" onClick={() => setOptions((current) => current.filter((entry) => entry.id !== option.id))} aria-label="Supprimer l'option" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-line text-ink-soft hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-3xl border border-line bg-white p-5 shadow-soft">
              <div className="flex items-center gap-2 text-brand-700"><Sparkles className="h-4 w-4" /><h2 className="text-sm font-bold">Récapitulatif</h2></div>
              <dl className="mt-4 space-y-3 text-xs">
                <div className="flex justify-between gap-3"><dt className="text-ink-muted">Type</dt><dd className="font-semibold text-ink">{kind === 'service' ? 'Service' : condition === 'NEW' ? 'Produit neuf' : 'Occasion'}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-ink-muted">Tarif</dt><dd className="font-semibold text-ink">{formatPrice(payload.priceCents)}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-ink-muted">Photos</dt><dd className="font-semibold text-ink">{totalPhotos}/6</dd></div>
              </dl>
              <div className="mt-5 border-t border-line pt-5">
                <label htmlFor="listing-status" className="mb-2 block text-xs font-semibold text-ink">Visibilité</label>
                <div className="relative">
                  <select id="listing-status" value={status} onChange={(e) => setStatus(e.target.value as 'DRAFT' | 'PUBLISHED' | 'PAUSED')} className={selectClass}>
                    <option value="PUBLISHED">Publier maintenant</option>
                    <option value="DRAFT">Enregistrer en brouillon</option>
                    <option value="PAUSED">Désactiver temporairement</option>
                  </select>
                  <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-ink-soft">▾</span>
                </div>
              </div>
              {errorMessage && <p className="mt-4 rounded-xl border border-rose-100 bg-rose-50 px-3 py-2.5 text-xs font-medium text-rose-700">{errorMessage}</p>}
              <Button fullWidth size="lg" className="mt-5" loading={saving} onClick={() => void submit()}>
                {listingId ? 'Enregistrer les modifications' : status === 'DRAFT' ? 'Enregistrer le brouillon' : 'Publier l’annonce'}
              </Button>
              <p className="mt-3 text-center text-[11px] leading-relaxed text-ink-muted">Vous pourrez modifier, désactiver ou supprimer cette annonce à tout moment.</p>
            </div>
          </aside>
        </div>
      </div>
    </main>
  )
}
