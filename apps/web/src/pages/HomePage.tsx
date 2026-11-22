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
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const [categoryResult, popularResult, recentResult] = await Promise.all([
          marketApi.categories(),
          marketApi.search({ ...defaultSearchState, sort: 'popular', limit: 8 }),
          marketApi.search({ ...defaultSearchState, sort: 'recent', limit: 8 }),
        ])
        if (!active) return
        setCategories(categoryResult.categories)
        setPopular(popularResult.listings)
        setRecent(recentResult.listings)
      } catch {
        if (active) showToast({ tone: 'info', title: 'Chargement impossible', description: 'Réessayez dans un instant.' })
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
    </main>
  )
}
