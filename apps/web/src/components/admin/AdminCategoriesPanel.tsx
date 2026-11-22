import { useEffect, useState, type FormEvent } from 'react'
import { LayoutGrid, Pencil, Plus, Power, Trash2 } from 'lucide-react'
import { useToast } from '../ui/Toast'
import { ApiError } from '../../lib/auth'
import { marketApi, type AdminCategory, type CategoryPayload } from '../../lib/market'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { Skeleton } from '../ui/Skeleton'

const ICON_OPTIONS = [
  'Laptop',
  'Smartphone',
  'Shirt',
  'BookOpen',
  'Salad',
  'Sparkles',
  'Armchair',
  'Code2',
  'GraduationCap',
  'Truck',
  'Wrench',
  'Package',
  'LayoutGrid',
]

const fieldClasses =
  'h-10 w-full rounded-xl border border-line bg-white px-3 text-sm font-medium text-ink outline-none focus:border-brand-300'

export function AdminCategoriesPanel() {
  const { showToast } = useToast()
  const [categories, setCategories] = useState<AdminCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [icon, setIcon] = useState(ICON_OPTIONS[0])
  const [position, setPosition] = useState(0)
  const [busy, setBusy] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editIcon, setEditIcon] = useState(ICON_OPTIONS[0])
  const [editPosition, setEditPosition] = useState(0)

  useEffect(() => {
    let active = true
    marketApi
      .adminCategories()
      .then((result) => {
        if (!active) return
        setCategories(result.categories)
        setPosition(Math.min(999, result.categories.reduce((max, item) => Math.max(max, item.position), -1) + 1))
      })
      .catch((cause) => {
        if (active) setError(cause instanceof ApiError ? cause.message : 'Chargement des catégories impossible.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  function message(cause: unknown): string | undefined {
    return cause instanceof ApiError ? cause.message : 'Une erreur est survenue.'
  }

  async function createCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    setBusy('create')
    try {
      const payload: CategoryPayload = { name: trimmed, icon, position }
      const result = await marketApi.createCategory(payload)
      setCategories((current) =>
        [...current, result.category].sort((a, b) => a.position - b.position || a.name.localeCompare(b.name)),
      )
      setPosition((current) => Math.min(999, current + 1))
      setName('')
      showToast({ tone: 'success', title: 'Catégorie créée', description: trimmed })
    } catch (cause) {
      showToast({ tone: 'accent', title: 'Création impossible', description: message(cause) })
    } finally {
      setBusy(null)
    }
  }

  function startEdit(category: AdminCategory) {
    setEditingId(category.id)
    setEditName(category.name)
    setEditIcon(category.icon && ICON_OPTIONS.includes(category.icon) ? category.icon : ICON_OPTIONS[0])
    setEditPosition(category.position)
  }

  async function saveEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!editingId) return
    const trimmed = editName.trim()
    if (!trimmed) return
    setBusy(editingId)
    try {
      const result = await marketApi.updateCategory(editingId, {
        name: trimmed,
        icon: editIcon,
        position: editPosition,
      })
      setCategories((current) =>
        current
          .map((item) => (item.id === editingId ? result.category : item))
          .sort((a, b) => a.position - b.position || a.name.localeCompare(b.name)),
      )
      setEditingId(null)
      showToast({ tone: 'success', title: 'Catégorie modifiée', description: trimmed })
    } catch (cause) {
      showToast({ tone: 'accent', title: 'Modification impossible', description: message(cause) })
    } finally {
      setBusy(null)
    }
  }

  async function toggleStatus(category: AdminCategory) {
    setBusy(category.id)
    try {
      const result = await marketApi.updateCategory(category.id, { isActive: !category.isActive })
      setCategories((current) => current.map((item) => (item.id === category.id ? result.category : item)))
      showToast({
        tone: 'success',
        title: result.category.isActive ? 'Catégorie activée' : 'Catégorie désactivée',
        description: result.category.name,
      })
    } catch (cause) {
      showToast({ tone: 'accent', title: 'Action impossible', description: message(cause) })
    } finally {
      setBusy(null)
    }
  }

  async function archiveCategory(category: AdminCategory) {
    if (!window.confirm(`Archiver la catégorie « ${category.name} » ?`)) return
    setBusy(category.id)
    try {
      await marketApi.archiveCategory(category.id)
      setCategories((current) =>
        current.map((item) => (item.id === category.id ? { ...item, isActive: false } : item)),
      )
      showToast({ tone: 'success', title: 'Catégorie archivée', description: category.name })
    } catch (cause) {
      showToast({ tone: 'accent', title: 'Archivage impossible', description: message(cause) })
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="space-y-5">
      <Card className="p-5">
        <form onSubmit={(event) => void createCategory(event)} className="space-y-4">
          <div className="flex items-center gap-2">
            <LayoutGrid className="h-4 w-4 text-brand-600" aria-hidden="true" />
            <h2 className="text-sm font-extrabold text-brand-900">Nouvelle catégorie</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-[1fr_160px_100px_auto] sm:items-end">
            <label className="block">
              <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-ink-muted">Nom</span>
              <input
                required
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Ex. Vélos"
                maxLength={120}
                className={fieldClasses}
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-ink-muted">Icône</span>
              <select value={icon} onChange={(event) => setIcon(event.target.value)} className={fieldClasses}>
                {ICON_OPTIONS.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-ink-muted">Position</span>
              <input
                type="number"
                min="0"
                max="999"
                value={position}
                onChange={(event) => setPosition(Number(event.target.value))}
                className={fieldClasses}
              />
            </label>
            <Button type="submit" size="md" loading={busy === 'create'} iconLeft={<Plus className="h-4 w-4" />}>
              Ajouter
            </Button>
          </div>
        </form>
      </Card>

      {editingId && (
        <Card className="border-brand-100 p-5">
          <form onSubmit={(event) => void saveEdit(event)} className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Pencil className="h-4 w-4 text-brand-600" aria-hidden="true" />
                <h2 className="text-sm font-extrabold text-brand-900">Modifier la catégorie</h2>
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={() => setEditingId(null)}>
                Fermer
              </Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-[1fr_160px_100px_auto] sm:items-end">
              <label className="block">
                <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-ink-muted">Nom</span>
                <input
                  required
                  value={editName}
                  onChange={(event) => setEditName(event.target.value)}
                  maxLength={120}
                  className={fieldClasses}
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-ink-muted">Icône</span>
                <select value={editIcon} onChange={(event) => setEditIcon(event.target.value)} className={fieldClasses}>
                  {ICON_OPTIONS.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-ink-muted">Position</span>
                <input
                  type="number"
                  min="0"
                  max="999"
                  value={editPosition}
                  onChange={(event) => setEditPosition(Number(event.target.value))}
                  className={fieldClasses}
                />
              </label>
              <Button type="submit" size="md" loading={busy === editingId} iconLeft={<Pencil className="h-4 w-4" />}>
                Enregistrer
              </Button>
            </div>
          </form>
        </Card>
      )}

      <Card className="divide-y divide-line overflow-hidden">
        {error && <p className="px-5 py-4 text-sm text-rose-700">{error}</p>}
        {loading ? (
          <div className="space-y-3 p-5">
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton key={index} className="h-12 rounded-xl" />
            ))}
          </div>
        ) : categories.length === 0 && !error ? (
          <p className="px-5 py-12 text-center text-sm text-ink-muted">Aucune catégorie enregistrée.</p>
        ) : (
          categories.map((category) => (
            <div key={category.id} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-bold text-ink">{category.name}</p>
                  <Badge tone={category.isActive ? 'success' : 'muted'} dot>
                    {category.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <p className="mt-0.5 truncate text-xs text-ink-muted">
                  /{category.slug} · {category.icon ?? 'aucune icône'} · {category.count} annonce(s) publiée(s) · position {category.position}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  loading={busy === category.id}
                  onClick={() => void toggleStatus(category)}
                  iconLeft={<Power className="h-4 w-4" />}
                >
                  {category.isActive ? 'Désactiver' : 'Activer'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={busy === category.id}
                  onClick={() => startEdit(category)}
                  iconLeft={<Pencil className="h-4 w-4" />}
                >
                  Modifier
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={busy === category.id}
                  onClick={() => void archiveCategory(category)}
                  iconLeft={<Trash2 className="h-4 w-4" />}
                  aria-label={`Archiver la catégorie ${category.name}`}
                >
                  Supprimer
                </Button>
              </div>
            </div>
          ))
        )}
      </Card>
    </div>
  )
}
