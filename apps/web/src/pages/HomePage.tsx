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
        if (categoryResult.status === 'fulfilled') setCategories(categoryResult.value.categories)
        if (popularResult.status === 'fulfilled') setPopular(popularResult.value.listings)
        if (recentResult.status === 'fulfilled') setRecent(recentResult.value.listings)
        if (serviceResult.status === 'fulfilled') setServices(serviceResult.value.listings)

        if ([categoryResult, popularResult, recentResult, serviceResult].some((result) => result.status === 'rejected')) {
          showToast({
            tone: 'info',
            title: 'Chargement partiel',
            description: 'Certaines annonces sont momentanément indisponibles.',
          })
        }
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => { active = false }
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
        eyebrow=""
        title="Annonces populaires"
        description=""
        listings={popular}
        loading={loading}
        onSeeAll={() => goSearch({ sort: 'popular' })}
      />
      <PopularProductsSection
        id="nouveautes"
        eyebrow=""
        title="Nouveautés"
        description=""
        listings={recent}
        loading={loading}
        onSeeAll={() => goSearch({ sort: 'recent' })}
      />
      <PopularProductsSection
        id="services"
        eyebrow=""
        title="Services"
        description=""
        listings={services}
        loading={loading}
        onSeeAll={() => goSearch({ type: 'SERVICE' })}
      />
    </main>
  )
}
