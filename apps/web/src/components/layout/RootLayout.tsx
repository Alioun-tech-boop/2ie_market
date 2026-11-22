import { useState } from 'react'
import { Outlet, useLocation, useNavigate } from '@tanstack/react-router'
import { useToast } from '../ui/Toast'
import { usePlatform } from '../../context/PlatformContext'
import { defaultSearchState } from '../../lib/market'
import { Header } from './Header'
import { Footer } from './Footer'
import { MobileBottomNav, type MobileTab } from './MobileBottomNav'

export function RootLayout() {
  const { showToast } = useToast()
  const { platform } = usePlatform()
  const navigate = useNavigate()
  const location = useLocation()
  const [activeTab, setActiveTab] = useState<MobileTab>('home')

  function openSearch() {
    void navigate({ to: '/recherche', search: defaultSearchState })
  }

  function handleTab(tab: MobileTab) {
    setActiveTab(tab)
    if (tab === 'home') void navigate({ to: '/' })
    else if (tab === 'search') openSearch()
  }

  // L’administration dispose d’une coque distincte : aucun header, footer ni navigation publique.
  if (location.pathname.startsWith('/admin')) {
    return (
      <div className="min-h-screen bg-slate-950">
        <Outlet />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#fcfcfd] pb-24 md:pb-0">
      {platform.maintenanceMessage && (
        <div className="border-b border-accent-200 bg-accent-50 px-4 py-2.5 text-center text-xs font-semibold text-accent-800">
          {platform.maintenanceMessage}
        </div>
      )}
      <Header onFocusSearch={openSearch} />
      <Outlet />
      <Footer
        onInfo={(message) => showToast({ tone: 'info', title: 'Bientôt disponible', description: message })}
      />
      <MobileBottomNav active={activeTab} onChange={handleTab} />
    </div>
  )
}
