import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Search, ShieldCheck, UserRound, X } from 'lucide-react'
import { Avatar } from '../ui/Avatar'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { Skeleton } from '../ui/Skeleton'
import { useToast } from '../ui/Toast'
import { ApiError, type Role, type UserStatus } from '../../lib/auth'
import { adminApi, type AdminPagination, type AdminUserDetail, type AdminUserSummary } from '../../lib/admin'
import { siteLabel } from '../../lib/format'

const fieldClasses =
  'h-10 w-full rounded-xl border border-line bg-white px-3 text-sm font-medium text-ink outline-none focus:border-brand-300'

function roleLabel(role: Role) {
  return role === 'ADMIN' ? 'Administrateur' : role === 'MERCHANT' ? 'Commerçant' : 'Client'
}

function roleTone(role: Role) {
  return role === 'ADMIN' ? 'accent' : role === 'MERCHANT' ? 'brand' : 'neutral'
}

function dateLabel(value: string) {
  return new Date(value).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function errorMessage(cause: unknown) {
  return cause instanceof ApiError ? cause.message : 'Une erreur est survenue.'
}

function UserDetailCard({
  user,
  busy,
  onClose,
  onStatus,
  onRole,
}: {
  user: AdminUserDetail
  busy: boolean
  onClose: () => void
  onStatus: (user: AdminUserDetail) => void
  onRole: (user: AdminUserDetail, role: 'CLIENT' | 'MERCHANT') => void
}) {
  return (
    <Card className="border-brand-100 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Avatar name={`${user.firstName} ${user.lastName}`} tone={user.role === 'ADMIN' ? 'violet' : 'blue'} />
          <div>
            <p className="text-sm font-extrabold text-ink">{user.firstName} {user.lastName}</p>
            <p className="text-xs text-ink-muted">{user.email}</p>
          </div>
        </div>
        <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-ink-muted hover:bg-brand-50" aria-label="Fermer le profil">
          <X className="h-4 w-4" />
        </button>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
        <div className="rounded-xl bg-canvas p-3">
          <dt className="text-[10px] uppercase tracking-wide text-ink-soft">Téléphone</dt>
          <dd className="mt-1 font-semibold text-ink">{user.phone}</dd>
        </div>
        <div className="rounded-xl bg-canvas p-3">
          <dt className="text-[10px] uppercase tracking-wide text-ink-soft">Site</dt>
          <dd className="mt-1 font-semibold text-ink">{siteLabel(user.site)}</dd>
        </div>
        <div className="rounded-xl bg-canvas p-3">
          <dt className="text-[10px] uppercase tracking-wide text-ink-soft">Inscription</dt>
          <dd className="mt-1 font-semibold text-ink">{dateLabel(user.createdAt)}</dd>
        </div>
        <div className="rounded-xl bg-canvas p-3">
          <dt className="text-[10px] uppercase tracking-wide text-ink-soft">Commandes</dt>
          <dd className="mt-1 font-semibold text-ink">{user.orderGroups} groupe(s) · {user.orders} sous-commande(s)</dd>
        </div>
        <div className="rounded-xl bg-canvas p-3">
          <dt className="text-[10px] uppercase tracking-wide text-ink-soft">Annonces</dt>
          <dd className="mt-1 font-semibold text-ink">{user.listings}</dd>
        </div>
        <div className="rounded-xl bg-canvas p-3">
          <dt className="text-[10px] uppercase tracking-wide text-ink-soft">Signalements reçus</dt>
          <dd className="mt-1 font-semibold text-ink">{user.reportsReceived}</dd>
        </div>
      </dl>

      {user.store && (
        <div className="mt-3 rounded-xl border border-line p-3">
          <p className="text-[10px] font-bold uppercase tracking-wide text-ink-soft">Boutique</p>
          <p className="mt-1 text-xs font-semibold text-ink">{user.store.name}</p>
          <p className="mt-0.5 text-[11px] text-ink-muted">
            {user.store.slug} · {user.store.isActive ? 'active' : 'inactive'} · {siteLabel(user.store.site)}
          </p>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <label className="text-[11px] font-bold uppercase tracking-wide text-ink-soft" htmlFor={`role-${user.id}`}>
          Rôle
        </label>
        <select
          id={`role-${user.id}`}
          value={user.role}
          disabled={busy || user.role === 'ADMIN'}
          onChange={(event) => onRole(user, event.target.value as 'CLIENT' | 'MERCHANT')}
          className="h-9 rounded-xl border border-line bg-white px-2.5 text-xs font-semibold text-ink disabled:bg-slate-100"
        >
          <option value="CLIENT">Client</option>
          <option value="MERCHANT">Commerçant</option>
          {user.role === 'ADMIN' && <option value="ADMIN">Administrateur</option>}
        </select>
        <Button
          size="sm"
          variant={user.status === 'ACTIVE' ? 'outline' : 'secondary'}
          loading={busy}
          onClick={() => onStatus(user)}
        >
          {user.status === 'ACTIVE' ? 'Suspendre le compte' : 'Réactiver le compte'}
        </Button>
      </div>
      {user.role === 'ADMIN' && (
        <p className="mt-3 flex items-start gap-2 rounded-xl bg-accent-50 p-3 text-[11px] leading-relaxed text-accent-800">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Le rôle administrateur est protégé : il ne peut pas être attribué ou retiré depuis cette API.
        </p>
      )}
    </Card>
  )
}

export function AdminUsersPanel() {
  const { showToast } = useToast()
  const [users, setUsers] = useState<AdminUserSummary[]>([])
  const [pagination, setPagination] = useState<AdminPagination>({ page: 1, limit: 20, total: 0, pages: 1 })
  const [searchInput, setSearchInput] = useState('')
  const [query, setQuery] = useState('')
  const [role, setRole] = useState<'' | Role>('')
  const [status, setStatus] = useState<'' | UserStatus>('')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [selected, setSelected] = useState<AdminUserDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await adminApi.users({
        q: query || undefined,
        role: role || undefined,
        status: status || undefined,
        page,
        limit: 20,
      })
      setUsers(result.users)
      setPagination(result.pagination)
    } catch (cause) {
      setError(errorMessage(cause))
    } finally {
      setLoading(false)
    }
  }, [page, query, role, status])

  useEffect(() => {
    void load()
  }, [load])

  function applySearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPage(1)
    setQuery(searchInput.trim())
  }

  async function openProfile(user: AdminUserSummary) {
    setDetailLoading(true)
    setSelected(null)
    try {
      const result = await adminApi.user(user.id)
      setSelected(result.user)
    } catch (cause) {
      showToast({ tone: 'accent', title: 'Profil indisponible', description: errorMessage(cause) })
    } finally {
      setDetailLoading(false)
    }
  }

  async function changeStatus(user: AdminUserSummary | AdminUserDetail) {
    const next: UserStatus = user.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE'
    if (next === 'SUSPENDED' && !window.confirm(`Suspendre le compte de ${user.firstName} ${user.lastName} ? Ses sessions seront révoquées.`)) {
      return
    }
    setBusy(user.id)
    try {
      await adminApi.setUserStatus(user.id, next)
      setUsers((current) => current.map((item) => (item.id === user.id ? { ...item, status: next } : item)))
      setSelected((current) => (current && current.id === user.id ? { ...current, status: next } : current))
      void load()
      showToast({
        tone: 'success',
        title: next === 'SUSPENDED' ? 'Compte suspendu' : 'Compte réactivé',
        description: `${user.firstName} ${user.lastName}`,
      })
    } catch (cause) {
      showToast({ tone: 'accent', title: 'Action impossible', description: errorMessage(cause) })
    } finally {
      setBusy(null)
    }
  }

  async function changeRole(user: AdminUserDetail, next: 'CLIENT' | 'MERCHANT') {
    if (next === user.role) return
    if (!window.confirm(`Attribuer le rôle « ${roleLabel(next)} » à ${user.firstName} ${user.lastName} ?`)) return
    setBusy(user.id)
    try {
      await adminApi.setUserRole(user.id, next)
      setUsers((current) => current.map((item) => (item.id === user.id ? { ...item, role: next } : item)))
      setSelected((current) =>
        current && current.id === user.id
          ? {
              ...current,
              role: next,
              store: current.store ? { ...current.store, isActive: next === 'MERCHANT' } : current.store,
            }
          : current,
      )
      void load()
      showToast({ tone: 'success', title: 'Rôle mis à jour', description: `${user.firstName} ${user.lastName} · ${roleLabel(next)}` })
    } catch (cause) {
      showToast({ tone: 'accent', title: 'Changement de rôle impossible', description: errorMessage(cause) })
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="space-y-5">
      <Card className="p-4">
        <form onSubmit={applySearch} className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_150px_150px_auto]">
          <label className="relative block">
            <span className="sr-only">Rechercher un utilisateur</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
            <input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Nom, e-mail ou téléphone"
              maxLength={100}
              className={`${fieldClasses} pl-9`}
            />
          </label>
          <select value={role} onChange={(event) => { setRole(event.target.value as '' | Role); setPage(1) }} className={fieldClasses} aria-label="Filtrer par rôle">
            <option value="">Tous les rôles</option>
            <option value="CLIENT">Clients</option>
            <option value="MERCHANT">Commerçants</option>
            <option value="ADMIN">Administrateurs</option>
          </select>
          <select value={status} onChange={(event) => { setStatus(event.target.value as '' | UserStatus); setPage(1) }} className={fieldClasses} aria-label="Filtrer par statut">
            <option value="">Tous les statuts</option>
            <option value="ACTIVE">Actifs</option>
            <option value="SUSPENDED">Suspendus</option>
          </select>
          <Button type="submit" size="md" iconLeft={<Search className="h-4 w-4" />}>Rechercher</Button>
        </form>
      </Card>

      {detailLoading && <Skeleton className="h-52 rounded-2xl" />}
      {selected && (
        <UserDetailCard
          user={selected}
          busy={busy === selected.id}
          onClose={() => setSelected(null)}
          onStatus={(user) => void changeStatus(user)}
          onRole={(user, next) => void changeRole(user, next)}
        />
      )}

      {error && <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}

      <Card className="divide-y divide-line overflow-hidden">
        {loading ? (
          <div className="space-y-3 p-5">
            {Array.from({ length: 5 }, (_, index) => <Skeleton key={index} className="h-16 rounded-xl" />)}
          </div>
        ) : users.length === 0 ? (
          <p className="px-5 py-12 text-center text-sm text-ink-muted">Aucun compte ne correspond à ces critères.</p>
        ) : (
          users.map((user) => (
            <div key={user.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
              <Avatar name={`${user.firstName} ${user.lastName}`} tone={user.role === 'ADMIN' ? 'violet' : 'blue'} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-ink">{user.firstName} {user.lastName}</p>
                <p className="truncate text-xs text-ink-muted">{user.email} · {user.phone}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Badge tone={roleTone(user.role)}>{roleLabel(user.role)}</Badge>
                  <Badge tone={user.status === 'ACTIVE' ? 'success' : 'muted'} dot>{user.status === 'ACTIVE' ? 'Actif' : 'Suspendu'}</Badge>
                  <span className="text-[11px] text-ink-soft">{siteLabel(user.site)} · inscrit le {dateLabel(user.createdAt)}</span>
                </div>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                <Button size="sm" variant="outline" iconLeft={<UserRound className="h-4 w-4" />} onClick={() => void openProfile(user)}>
                  Profil
                </Button>
                <Button
                  size="sm"
                  variant={user.status === 'ACTIVE' ? 'ghost' : 'secondary'}
                  loading={busy === user.id}
                  onClick={() => void changeStatus(user)}
                >
                  {user.status === 'ACTIVE' ? 'Suspendre' : 'Réactiver'}
                </Button>
              </div>
            </div>
          ))
        )}
      </Card>

      <div className="flex items-center justify-between gap-3 text-xs text-ink-muted">
        <span>{pagination.total} compte(s) · page {pagination.page} / {Math.max(1, pagination.pages)}</span>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" disabled={page <= 1 || loading} onClick={() => setPage((value) => Math.max(1, value - 1))}>Précédent</Button>
          <Button size="sm" variant="outline" disabled={page >= pagination.pages || loading} onClick={() => setPage((value) => value + 1)}>Suivant</Button>
        </div>
      </div>
    </div>
  )
}
