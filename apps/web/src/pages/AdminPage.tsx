import { useCallback, useEffect, useState } from 'react'
import { Flag, LayoutDashboard, Package, RefreshCw, ScrollText, Settings, ShoppingBag, Tags, Users, Store } from 'lucide-react'
import { AdminAuditPanel } from '../components/admin/AdminAuditPanel'
import { AdminCategoriesPanel } from '../components/admin/AdminCategoriesPanel'
import { AdminListingsPanel } from '../components/admin/AdminListingsPanel'
import { AdminMerchantApplicationsPanel } from '../components/admin/AdminMerchantApplicationsPanel'
import { AdminSubscriptionRenewalsPanel } from '../components/admin/AdminSubscriptionRenewalsPanel'
import { AdminOrdersPanel } from '../components/admin/AdminOrdersPanel'
import { AdminOverviewPanel } from '../components/admin/AdminOverviewPanel'
import { AdminReportsPanel } from '../components/admin/AdminReportsPanel'
import { AdminSettingsPanel } from '../components/admin/AdminSettingsPanel'
import { AdminShell, type AdminNavItem } from '../components/admin/AdminShell'
import { AdminUsersPanel } from '../components/admin/AdminUsersPanel'
import { Button } from '../components/ui/Button'
import { useToast } from '../components/ui/Toast'
import { ApiError } from '../lib/auth'
import { adminApi, type AdminOverview } from '../lib/admin'

const SECTIONS = ['overview', 'merchant-applications', 'subscription-renewals', 'users', 'listings', 'orders', 'reports', 'categories', 'settings', 'audit'] as const
type SectionId = (typeof SECTIONS)[number]

const COPY: Record<SectionId, { title: string; description: string }> = {
  overview: {
    title: 'Vue d’ensemble',
    description: 'Indicateurs consolidés, activité par site et dernières opérations sensibles.',
  },
  'merchant-applications': {
    title: 'Demandes vendeurs',
    description: 'Vérifiez les justificatifs de paiement de 1 000 FCFA et validez ou refusez les ouvertures de boutiques.',
  },
  'subscription-renewals': {
    title: 'Abonnements vendeurs',
    description: 'Vérifiez les preuves mensuelles de 1 000 FCFA, traitez les renouvellements et surveillez les abonnements expirés.',
  },
  users: {
    title: 'Utilisateurs',
    description: 'Recherchez les comptes, consultez les profils, suspendez ou réactivez, gérez les rôles autorisés.',
  },
  listings: {
    title: 'Annonces',
    description: 'Modérez les publications, archivez les annonces non conformes et gérez la mise en avant.',
  },
  orders: {
    title: 'Commandes globales',
    description: 'Recherchez par référence, filtrez par site ou statut et consultez les statistiques générales.',
  },
  reports: {
    title: 'Signalements',
    description: 'Traitez les signalements envoyés par la communauté et conservez une trace des décisions.',
  },
  categories: {
    title: 'Catégories',
    description: 'Créez, activez ou archivez les catégories utilisées par les annonces.',
  },
  settings: {
    title: 'Plateforme',
    description: 'Modifiez le nom, le logo, le support et les paramètres généraux réellement appliqués.',
  },
  audit: {
    title: 'Journal d’audit',
    description: 'Consultez l’historique des opérations sensibles effectuées par les administrateurs.',
  },
}

function isSection(value: string): value is SectionId {
  return (SECTIONS as readonly string[]).includes(value)
}

export default function AdminPage() {
  const { showToast } = useToast()
  const [section, setSection] = useState<SectionId>(() => {
    const requested = new URLSearchParams(window.location.search).get('section')
    return requested && isSection(requested) ? requested : 'overview'
  })
  const [overview, setOverview] = useState<AdminOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)

  const loadOverview = useCallback(async () => {
    setLoading(true)
    try {
      setOverview(await adminApi.overview())
    } catch (cause) {
      showToast({
        tone: 'accent',
        title: 'Indicateurs indisponibles',
        description: cause instanceof ApiError ? cause.message : 'Réessayez dans un instant.',
      })
    } finally {
      setLoading(false)
    }
  }, [showToast])

  useEffect(() => {
    void loadOverview()
  }, [loadOverview])

  const nav: AdminNavItem[] = [
    { id: 'overview', label: 'Vue d’ensemble', icon: LayoutDashboard },
    { id: 'merchant-applications', label: 'Demandes vendeurs', icon: Store },
    { id: 'subscription-renewals', label: 'Abonnements vendeurs', icon: RefreshCw },
    { id: 'users', label: 'Utilisateurs', icon: Users, badge: overview?.stats.users },
    { id: 'listings', label: 'Annonces', icon: Package, badge: overview?.stats.listings },
    { id: 'orders', label: 'Commandes', icon: ShoppingBag, badge: overview?.stats.pendingOrders },
    { id: 'reports', label: 'Signalements', icon: Flag, badge: overview?.stats.openReports },
    { id: 'categories', label: 'Catégories', icon: Tags, badge: overview?.stats.categories },
    { id: 'settings', label: 'Plateforme', icon: Settings },
    { id: 'audit', label: 'Journal', icon: ScrollText },
  ]

  const copy = COPY[section]

  return (
    <AdminShell
      title={copy.title}
      description={copy.description}
      items={nav}
      active={section}
      onSelect={(id) => setSection(isSection(id) ? id : 'overview')}
      action={
        <Button
          size="sm"
          variant="outline"
          loading={loading}
          onClick={() => {
            void loadOverview()
            setRefreshKey((value) => value + 1)
          }}
          iconLeft={<RefreshCw className="h-4 w-4" />}
        >
          Actualiser
        </Button>
      }
    >
      {section === 'overview' && <AdminOverviewPanel overview={overview} loading={loading} />}
      {section === 'merchant-applications' && <AdminMerchantApplicationsPanel key={refreshKey} />}
      {section === 'subscription-renewals' && <AdminSubscriptionRenewalsPanel key={refreshKey} />}
      {section === 'users' && <AdminUsersPanel key={refreshKey} />
      {section === 'listings' && <AdminListingsPanel key={refreshKey} />}
      {section === 'orders' && <AdminOrdersPanel key={refreshKey} />}
      {section === 'reports' && <AdminReportsPanel key={refreshKey} />}
      {section === 'categories' && <AdminCategoriesPanel key={refreshKey} />}
      {section === 'settings' && <AdminSettingsPanel key={refreshKey} />}
      {section === 'audit' && <AdminAuditPanel key={refreshKey} />}
    </AdminShell>
  )
}
