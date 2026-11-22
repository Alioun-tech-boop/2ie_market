import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  MapPin,
  Minus,
  Plus,
  ShoppingBag,
  Store as StoreIcon,
  Trash2,
} from 'lucide-react'
import { Badge } from '../components/ui/Badge'
import { Button, buttonStyles } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { EmptyState } from '../components/ui/EmptyState'
import { Price } from '../components/ui/Price'
import { Skeleton } from '../components/ui/Skeleton'
import { useToast } from '../components/ui/Toast'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import { assetUrl } from '../lib/auth'
import { formatPrice, siteLabel } from '../lib/format'
import { shortTypeLabels } from '../lib/listingLabels'
import { defaultSearchState } from '../lib/market'

function maxQuantity(availableQuantity: number | null): number {
  return Math.max(1, Math.min(99, availableQuantity ?? 99))
}

export default function CartPage() {
  const { status } = useAuth()
  const { cart, loading, itemCount, updateQuantity, removeItem, setNote, clear } = useCart()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [busyKey, setBusyKey] = useState<string | null>(null)
  const savingNoteRef = useRef<string | null>(null)

  useEffect(() => {
    setNotes(Object.fromEntries(cart.groups.map((group) => [group.store.id, group.note])))
  }, [cart])

  async function changeQuantity(listingId: string, quantity: number) {
    setBusyKey(listingId)
    try {
      await updateQuantity(listingId, quantity)
    } catch {
      // Le contexte affiche déjà la notification d'erreur.
    } finally {
      setBusyKey(null)
    }
  }

  async function remove(listingId: string) {
    setBusyKey(listingId)
    try {
      await removeItem(listingId)
      showToast({ tone: 'success', title: 'Article retiré du panier' })
    } catch {
      // Le contexte affiche déjà la notification d'erreur.
    } finally {
      setBusyKey(null)
    }
  }

  async function saveNote(storeId: string) {
    if (savingNoteRef.current === storeId) return
    const note = notes[storeId] ?? ''
    const saved = cart.groups.find((group) => group.store.id === storeId)?.note ?? ''
    if (note === saved) return
    savingNoteRef.current = storeId
    setBusyKey(`note-${storeId}`)
    try {
      await setNote(storeId, note)
      showToast({ tone: 'success', title: 'Note enregistrée', description: 'Elle sera jointe à votre commande.' })
    } catch {
      // Le contexte affiche déjà la notification d'erreur.
    } finally {
      savingNoteRef.current = null
      setBusyKey(null)
    }
  }

  async function clearCart() {
    if (!window.confirm('Vider tous les articles de votre panier ?')) return
    setBusyKey('clear')
    try {
      await clear()
      showToast({ tone: 'success', title: 'Panier vidé' })
    } catch {
      // Le contexte affiche déjà la notification d'erreur.
    } finally {
      setBusyKey(null)
    }
  }

  if (loading) {
    return (
      <main className="container-premium py-10">
        <Skeleton className="h-10 w-64" />
        <div className="mt-8 grid gap-5 lg:grid-cols-[1fr_320px]">
          <Skeleton className="h-96 rounded-2xl" />
          <Skeleton className="h-52 rounded-2xl" />
        </div>
      </main>
    )
  }

  const hasUnavailable = cart.groups.some((group) => group.items.some((item) => !item.available))

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-canvas py-10 lg:py-14">
      <div className="container-premium">
        <Link to="/recherche" search={defaultSearchState} className="inline-flex items-center gap-2 text-xs font-semibold text-ink-muted hover:text-brand-700">
          <ArrowLeft className="h-3.5 w-3.5" /> Retour à la recherche
        </Link>

        <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-accent-600">Votre sélection</p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-brand-900">Mon panier</h1>
            <p className="mt-2 text-sm text-ink-muted">
              {itemCount} article{itemCount > 1 ? 's' : ''} · regroupé{itemCount > 1 ? 's' : ''} par boutique
            </p>
          </div>
          {cart.groups.length > 0 && (
            <Button variant="ghost" disabled={busyKey === 'clear'} onClick={() => void clearCart()} iconLeft={<Trash2 className="h-4 w-4" />}>
              Vider le panier
            </Button>
          )}
        </div>

        {cart.groups.length === 0 ? (
          <div className="mt-8">
            <EmptyState
              icon={ShoppingBag}
              title="Votre panier est vide"
              description="Ajoutez des annonces depuis la marketplace pour préparer votre commande."
              action={
                status === 'authenticated' ? (
                  <Link to="/recherche" search={defaultSearchState} className={buttonStyles({ variant: 'primary' })}>
                    Découvrir les annonces
                  </Link>
                ) : (
                  <Button onClick={() => void navigate({ to: '/connexion' })}>Se connecter</Button>
                )
              }
            />
          </div>
        ) : (
          <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_320px]">
            <div className="space-y-5">
              {hasUnavailable && (
                <div className="flex items-start gap-3 rounded-2xl border border-accent-200 bg-accent-50 px-4 py-3 text-sm text-accent-700">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>
                    Certains articles ne sont plus disponibles. Retirez-les avant de confirmer votre commande.
                  </p>
                </div>
              )}

              {cart.groups.map((group) => (
                <Card key={group.store.id} className="overflow-hidden">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-brand-50/50 px-5 py-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-brand-800 text-xs font-bold text-white">
                        {group.store.logoUrl ? (
                          <img src={assetUrl(group.store.logoUrl) ?? ''} alt="" className="h-full w-full object-cover" />
                        ) : (
                          group.store.name.slice(0, 2).toUpperCase()
                        )}
                      </div>
                      <div className="min-w-0">
                        <Link
                          to="/boutique/$slug"
                          params={{ slug: group.store.slug }}
                          className="flex items-center gap-1.5 text-sm font-bold text-ink hover:text-brand-700"
                        >
                          <StoreIcon className="h-3.5 w-3.5 text-brand-600" /> {group.store.name}
                        </Link>
                        <p className="mt-0.5 flex items-center gap-1 text-[11px] text-ink-muted">
                          <MapPin className="h-3 w-3" /> {siteLabel(group.store.site)}
                        </p>
                      </div>
                    </div>
                    <Badge tone="neutral">{group.items.length} article{group.items.length > 1 ? 's' : ''}</Badge>
                  </div>

                  <div className="divide-y divide-line">
                    {group.items.map((item) => {
                      const cap = maxQuantity(item.availableQuantity)
                      const disabled = busyKey === item.id
                      return (
                        <div key={item.id} className="flex gap-4 px-5 py-4">
                          <Link to="/annonce/$id" params={{ id: item.listingId }} className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-brand-50">
                            {item.photoUrl ? (
                              <img src={assetUrl(item.photoUrl) ?? ''} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <span className="flex h-full items-center justify-center text-brand-300"><ShoppingBag className="h-5 w-5" /></span>
                            )}
                          </Link>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <div className="min-w-0">
                                <Link to="/annonce/$id" params={{ id: item.listingId }} className="line-clamp-2 text-sm font-bold text-ink hover:text-brand-700">
                                  {item.title}
                                </Link>
                                <p className="mt-1 text-[11px] text-ink-muted">
                                  {shortTypeLabels[item.type]} · {siteLabel(group.store.site)} · {item.available ? formatUnit(item.unitPriceCents) : 'indisponible'}
                                </p>
                              </div>
                              <Price cents={item.lineTotalCents} size="sm" />
                            </div>

                            {!item.available && (
                              <p className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-accent-50 px-2.5 py-1 text-[11px] font-semibold text-accent-700">
                                <AlertTriangle className="h-3 w-3" /> Article indisponible
                              </p>
                            )}

                            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                              <div className="inline-flex items-center rounded-xl border border-line bg-white">
                                <button
                                  type="button"
                                  aria-label={`Diminuer la quantité de ${item.title}`}
                                  disabled={disabled || item.quantity <= 1}
                                  onClick={() => void changeQuantity(item.listingId, item.quantity - 1)}
                                  className="flex h-9 w-9 items-center justify-center rounded-xl text-ink-muted transition-colors hover:bg-brand-50 hover:text-brand-800 disabled:opacity-40"
                                >
                                  <Minus className="h-3.5 w-3.5" />
                                </button>
                                <span className="w-9 text-center text-sm font-bold text-ink">{item.quantity}</span>
                                <button
                                  type="button"
                                  aria-label={`Augmenter la quantité de ${item.title}`}
                                  disabled={disabled || item.quantity >= cap}
                                  onClick={() => void changeQuantity(item.listingId, item.quantity + 1)}
                                  className="flex h-9 w-9 items-center justify-center rounded-xl text-ink-muted transition-colors hover:bg-brand-50 hover:text-brand-800 disabled:opacity-40"
                                >
                                  <Plus className="h-3.5 w-3.5" />
                                </button>
                              </div>
                              <button
                                type="button"
                                disabled={disabled}
                                onClick={() => void remove(item.listingId)}
                                className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-muted transition-colors hover:text-rose-600 disabled:opacity-40"
                              >
                                <Trash2 className="h-3.5 w-3.5" /> Retirer
                              </button>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  <div className="border-t border-line bg-canvas px-5 py-4">
                    <label htmlFor={`note-${group.store.id}`} className="block text-xs font-bold text-ink">
                      Note pour {group.store.name} <span className="font-medium text-ink-soft">(facultatif)</span>
                    </label>
                    <textarea
                      id={`note-${group.store.id}`}
                      value={notes[group.store.id] ?? ''}
                      onChange={(event) => setNotes((current) => ({ ...current, [group.store.id]: event.target.value }))}
                      onBlur={() => void saveNote(group.store.id)}
                      maxLength={500}
                      rows={2}
                      placeholder="Précisez un détail pour le commerçant…"
                      className="mt-2 w-full resize-none rounded-xl border border-line bg-white px-4 py-3 text-sm text-ink outline-none transition-all placeholder:text-ink-soft focus:border-brand-400 focus:ring-4 focus:ring-brand-500/10"
                    />
                    <div className="mt-2 flex items-center justify-between gap-3">
                      <span className="text-[11px] text-ink-muted">Enregistrée automatiquement quand vous quittez le champ.</span>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        disabled={busyKey === `note-${group.store.id}`}
                        onClick={() => void saveNote(group.store.id)}
                        iconLeft={<Check className="h-3.5 w-3.5" />}
                      >
                        Enregistrer
                      </Button>
                    </div>
                    <div className="mt-4 flex justify-between border-t border-line pt-3 text-sm">
                      <span className="font-semibold text-ink-muted">Sous-total</span>
                      <Price cents={group.subtotalCents} size="sm" />
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            <aside className="lg:sticky lg:top-24 lg:self-start">
              <Card className="p-5">
                <h2 className="text-sm font-bold text-ink">Récapitulatif</h2>
                <div className="mt-4 space-y-2 text-sm">
                  <div className="flex justify-between text-ink-muted">
                    <span>Articles</span>
                    <span className="font-semibold text-ink">{itemCount}</span>
                  </div>
                  <div className="flex justify-between text-ink-muted">
                    <span>Boutiques</span>
                    <span className="font-semibold text-ink">{cart.groups.length}</span>
                  </div>
                  <div className="flex items-end justify-between border-t border-line pt-4">
                    <span className="text-sm font-bold text-ink">Total</span>
                    <Price cents={cart.totalCents} size="lg" />
                  </div>
                </div>

                {status === 'authenticated' ? (
                  <Button
                    className="mt-5"
                    fullWidth
                    size="lg"
                    disabled={hasUnavailable || busyKey !== null}
                    onClick={() => void navigate({ to: '/commande/nouvelle' })}
                    iconRight={<span aria-hidden="true">→</span>}
                  >
                    Continuer
                  </Button>
                ) : (
                  <Button className="mt-5" fullWidth size="lg" onClick={() => void navigate({ to: '/connexion' })}>
                    Se connecter pour commander
                  </Button>
                )}
                <p className="mt-3 text-center text-[11px] leading-relaxed text-ink-muted">
                  L'accord sur la remise se fait directement avec le commerçant via WhatsApp.
                </p>
              </Card>
            </aside>
          </div>
        )}
      </div>
    </main>
  )
}

function formatUnit(cents: number): string {
  const price = formatPrice(cents)
  return price === 'Gratuit' ? price : `${price} / unité`
}
