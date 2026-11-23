import { useEffect, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { CategoriesSection } from '../components/sections/CategoriesSection'
import { HeroSection } from '../components/sections/HeroSection'
import { PopularProductsSection } from '../components/sections/PopularProductsSection'
import { useToast } from '../components/ui/Toast'
import type { SiteFilter } from '../components/ui/SearchBar'
import {
  defaultSearchState,
  marketApi,
  type Listing,
  type PublicCategory,
  type SearchState,
} from '../lib/market'

export default function HomePage() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [query, setQuery] = useState('')
  const [site, setSite] = useState<SiteFilter>('ALL')
  const [categories, setCategories] = useState<PublicCategory[]>([])
  const [popular, setPopular] = useState<Listing[]>([])
  const [recent, setRecent] = useState<Listing[]>([])
  const [services, setServices] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const [categoryResult, popularResult, recentResult, serviceResult] = await Promise.allSettled([
          marketApi.categories(),
          marketApi.search({ ...defaultSearchState, sort: 'popular', limit: 8 }),
          marketApi.search({ ...defaultSearchState, sort: 'recent', limit: 8 }),
          marketApi.search({ ...defaultSearchState, type: 'SERVICE', sort: 'popular', limit: 8 }),
        ])
        if (!active) return

        // Une panne des catégories ne doit pas masquer les annonces déjà disponibles.
        if (categoryResult.status === 'fulfilled') {
          setCategories(categoryResult.value.categories)
        }
        if (popularResult.status === 'fulfilled') {
          setPopular(popularResult.value.listings)
        }
        if (recentResult.status === 'fulfilled') {
          setRecent(recentResult.value.listings)
        }
        if (serviceResult.status === 'fulfilled') {
          setServices(serviceResult.value.listings)
        }

        if ([categoryResult, popularResult, recentResult, serviceResult].some((result) => result.status === 'rejected')) {
          showToast({
            tone: 'info',
            title: 'Chargement partiel',
            description: 'Certaines données sont momentanément indisponibles. Les autres annonces restent accessibles.',
          })
        }
      } finally {
        if (active) setLoading(false)
      }
    })()

    return () => {
      active = false
    }
  }, [showToast])

  function goSearch(patch: Partial<SearchState> = {}) {
    void navigate({ to: '/recherche', search: { ...defaultSearchState, ...patch, page: 1 } })
  }

  return (
    <main className="min-h-screen">
      <HeroSection
        query={query}
        onQueryChange={setQuery}
        site={site}
        onSiteChange={setSite}
        onSubmit={() => goSearch({ q: query, site })}
        onBrowse={() => goSearch()}
      />
      <CategoriesSection
        categories={categories}
        loading={loading}
        onSelect={(slug) => goSearch({ category: slug })}
      />
      <PopularProductsSection
        id="produits"
        eyebrow="Sélection de la communauté"
        title="Annonces populaires"
        description="Les annonces les plus consultées par la communauté."
        listings={popular}
        loading={loading}
        onSeeAll={() => goSearch({ sort: 'popular' })}
      />
      <PopularProductsSection
        id="nouveautes"
        eyebrow="Fraîchement publié"
        title="Nouveautés"
        description="Les dernières annonces déposées sur la marketplace."
        listings={recent}
        loading={loading}
        onSeeAll={() => goSearch({ sort: 'recent' })}
      />
      <PopularProductsSection
        id="services"
        eyebrow="Services de la communauté"
        title="Prestations disponibles"
        description="Cours, assistance, création, réparation et autres services proposés sur le campus."
        listings={services}
        loading={loading}
        onSeeAll={() => goSearch({ type: 'SERVICE' })}
      />
    </main>
  )
}
