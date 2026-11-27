import { createRootRoute, createRoute, createRouter } from '@tanstack/react-router'
import { RequireAuth } from './components/auth/RequireAuth'
import { RootLayout } from './components/layout/RootLayout'
import AdminPage from './pages/AdminPage'
import CartPage from './pages/CartPage'
import CheckoutPage from './pages/CheckoutPage'
import DashboardPage from './pages/DashboardPage'
import HomePage from './pages/HomePage'
import ListingPage from './pages/ListingPage'
import LoginPage from './pages/LoginPage'
import OrderDetailPage from './pages/OrderDetailPage'
import OrdersPage from './pages/OrdersPage'
import { EditListingPage, NewListingPage } from './pages/PublishPage'
import ProfilePage from './pages/ProfilePage'
import RegisterPage from './pages/RegisterPage'
import SearchPage from './pages/SearchPage'
import StorePage from './pages/StorePage'
import type { Role } from './lib/auth'
import {
  AVAILABILITY_FILTERS,
  SEARCH_SORT_FILTERS,
  SEARCH_TYPE_FILTERS,
  SITE_FILTERS,
  defaultSearchState,
  type SearchState,
} from './lib/market'

const ALL_ROLES: Role[] = ['CLIENT', 'MERCHANT', 'ADMIN']
const ADMINS: Role[] = ['ADMIN']
const MERCHANTS: Role[] = ['MERCHANT']

const rootRoute = createRootRoute({ component: RootLayout })

const indexRoute = createRoute({ getParentRoute: () => rootRoute, path: '/', component: HomePage })
const loginRoute = createRoute({ getParentRoute: () => rootRoute, path: '/connexion', component: LoginPage })
const registerRoute = createRoute({ getParentRoute: () => rootRoute, path: '/inscription', component: RegisterPage })
const profileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/profil',
  component: () => (
    <RequireAuth roles={ALL_ROLES}>
      <ProfilePage />
    </RequireAuth>
  ),
})
const adminRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin',
  validateSearch: (search: Record<string, unknown>): { section?: string } => ({
    section: typeof search.section === 'string' ? search.section : undefined,
  }),
  component: () => (
    <RequireAuth roles={ADMINS}>
      <AdminPage />
    </RequireAuth>
  ),
})
const storeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/boutique/$slug',
  component: StorePage,
})
const listingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/annonce/$id',
  component: ListingPage,
})
const searchRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/recherche',
  validateSearch: (search: Record<string, unknown>): SearchState => {
    const str = (value: unknown): string | undefined => (typeof value === 'string' ? value : undefined)

    const oneOf = <T extends string,>(value: string | undefined, values: readonly T[], fallback: T): T =>
      value !== undefined && values.includes(value as T) ? (value as T) : fallback

    const optionalNumber = (value: unknown): number | undefined => {
      if (value === '' || value === null || value === undefined) return undefined
      const number = typeof value === 'number' ? value : Number(value)
      return Number.isFinite(number) && number >= 0 ? number : undefined
    }

    const pageNumber = (value: unknown): number => {
      const number = typeof value === 'number' ? value : Number(value)
      return Number.isInteger(number) && number >= 1 ? number : 1
    }

    return {
      q: str(search.q)?.trim() ?? '',
      category: str(search.category) ?? '',
      type: oneOf(str(search.type), SEARCH_TYPE_FILTERS, 'ALL'),
      site: oneOf(str(search.site), SITE_FILTERS, 'ALL'),
      availability: oneOf(str(search.availability), AVAILABILITY_FILTERS, 'ALL'),
      minPriceCents: optionalNumber(search.minPriceCents),
      maxPriceCents: optionalNumber(search.maxPriceCents),
      sort: oneOf(str(search.sort), SEARCH_SORT_FILTERS, 'recent'),
      page: pageNumber(search.page),
      limit: defaultSearchState.limit,
    }
  },
  component: SearchPage,
})
const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/tableau-de-bord',
  validateSearch: (search: Record<string, unknown>): { section?: string } => ({
    section: typeof search.section === 'string' ? search.section : undefined,
  }),
  component: () => (
    <RequireAuth roles={MERCHANTS}>
      <DashboardPage />
    </RequireAuth>
  ),
})
const publishRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/publier',
  validateSearch: (search: Record<string, unknown>): { kind: 'product' | 'service' } => ({
    kind: search.kind === 'service' ? 'service' : 'product',
  }),
  component: () => (
    <RequireAuth roles={MERCHANTS}>
      <NewListingPage />
    </RequireAuth>
  ),
})
const editListingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/annonces/$id/modifier',
  component: () => (
    <RequireAuth roles={MERCHANTS}>
      <EditListingPage />
    </RequireAuth>
  ),
})
const cartRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/panier',
  component: () => (
    <RequireAuth roles={ALL_ROLES}>
      <CartPage />
    </RequireAuth>
  ),
})
const checkoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/commande/nouvelle',
  component: () => (
    <RequireAuth roles={ALL_ROLES}>
      <CheckoutPage />
    </RequireAuth>
  ),
})
const ordersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/commandes',
  component: () => (
    <RequireAuth roles={ALL_ROLES}>
      <OrdersPage />
    </RequireAuth>
  ),
})
const clientDashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/espace-client',
  component: () => (
    <RequireAuth roles={ALL_ROLES}>
      <OrdersPage />
    </RequireAuth>
  ),
})
const orderDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/commande/$reference',
  validateSearch: (search: Record<string, unknown>): { created?: boolean } => ({
    created: search.created === '1' || search.created === 'true' || search.created === true ? true : undefined,
  }),
  component: () => (
    <RequireAuth roles={ALL_ROLES}>
      <OrderDetailPage />
    </RequireAuth>
  ),
})

export const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  registerRoute,
  profileRoute,
  adminRoute,
  storeRoute,
  listingRoute,
  searchRoute,
  dashboardRoute,
  publishRoute,
  editListingRoute,
  cartRoute,
  checkoutRoute,
  ordersRoute,
  clientDashboardRoute,
  orderDetailRoute,
])

export const router = createRouter({ routeTree, defaultPreload: 'intent' })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
