import { Bell, LogOut, MapPin, ShieldCheck, Store as StoreIcon, UserRound } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import type { SelfUser } from '../../lib/auth'
import { siteLabel } from '../../lib/format'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'

function roleLabel(role: SelfUser['role']): string {
  if (role === 'MERCHANT') return 'Commerçant'
  if (role === 'ADMIN') return 'Administrateur'
  return 'Client'
}

function dateLabel(value: string): string {
  return new Date(value).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line py-2.5 last:border-0">
      <dt className="text-xs text-ink-muted">{label}</dt>
      <dd className="text-xs font-semibold text-ink">{value}</dd>
    </div>
  )
}

export function ProfileSummaryPanel({ user }: { user: SelfUser }) {
  return (
    <Card className="p-5">
      <div className="flex items-center gap-2">
        <UserRound className="h-4 w-4 text-brand-600" aria-hidden="true" />
        <h2 className="text-sm font-bold text-ink">Mes informations personnelles</h2>
      </div>
      <dl className="mt-4">
        <InfoRow label="Nom complet" value={`${user.firstName} ${user.lastName}`} />
        <InfoRow label="Adresse e-mail" value={user.email} />
        <InfoRow label="Téléphone" value={user.phone} />
        <InfoRow label="Rôle" value={roleLabel(user.role)} />
        <InfoRow label="Statut du compte" value={user.status === 'ACTIVE' ? 'Actif' : 'Suspendu'} />
        <InfoRow label="Membre depuis" value={dateLabel(user.createdAt)} />
        <InfoRow
          label="Localisation"
          value={`${siteLabel(user.location.site)} · ${user.location.reference}`}
        />
        {user.store && <InfoRow label="Boutique" value={user.store.name} />}
      </dl>
    </Card>
  )
}

export function SettingsPanel({ user }: { user: SelfUser }) {
  const { logout } = useAuth()

  const links = [
    { href: '/profil?tab=infos', label: 'Modifier mes informations', icon: UserRound },
    { href: '/profil?tab=localisation', label: 'Modifier ma localisation', icon: MapPin },
    { href: '/profil?tab=notifications', label: 'Notifications', icon: Bell },
    ...(user.store
      ? [{ href: '/profil?tab=boutique', label: 'Paramètres de la boutique', icon: StoreIcon }]
      : []),
  ]

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 text-brand-600" aria-hidden="true" />
        <h2 className="text-sm font-bold text-ink">Paramètres du compte</h2>
      </div>
      <p className="mt-1 text-xs leading-relaxed text-ink-muted">
        Ces réglages utilisent les informations réellement enregistrées sur votre compte et votre boutique.
      </p>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {links.map((link) => {
          const Icon = link.icon
          return (
            <a
              key={link.href}
              href={link.href}
              className="flex items-center gap-2.5 rounded-xl border border-line px-3.5 py-3 text-xs font-semibold text-ink-muted transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-800"
            >
              <Icon className="h-4 w-4 text-brand-500" aria-hidden="true" />
              {link.label}
            </a>
          )
        })}
      </div>

      <dl className="mt-4 rounded-xl bg-canvas p-3">
        <InfoRow label="Rôle" value={roleLabel(user.role)} />
        <InfoRow label="Statut" value={user.status === 'ACTIVE' ? 'Actif' : 'Suspendu'} />
        {user.store && (
          <InfoRow label="Boutique" value={`${user.store.name} · ${user.store.isActive ? 'active' : 'inactive'}`} />
        )}
      </dl>

      <Button
        variant="outline"
        className="mt-4"
        iconLeft={<LogOut className="h-4 w-4" />}
        onClick={() => {
          void (async () => {
            await logout()
          })()
        }}
      >
        Se déconnecter
      </Button>
    </Card>
  )
}
