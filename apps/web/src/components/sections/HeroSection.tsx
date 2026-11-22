import { ArrowRight, Handshake, MapPin, MessageCircle } from 'lucide-react'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { SearchBar, type SiteFilter } from '../ui/SearchBar'
import { cn } from '../../lib/cn'

const sites: { value: SiteFilter; label: string }[] = [
  { value: 'ALL', label: 'Tous les sites' },
  { value: 'KAMBOINSIN', label: 'Kamboinsin' },
  { value: 'OUAGA', label: 'Ouaga' },
]

export function HeroSection({
  query,
  onQueryChange,
  site,
  onSiteChange,
  onSubmit,
  onBrowse,
}: {
  query: string
  onQueryChange: (value: string) => void
  site: SiteFilter
  onSiteChange: (site: SiteFilter) => void
  onSubmit: () => void
  onBrowse: () => void
}) {
  return (
    <section id="accueil" className="relative overflow-hidden bg-gradient-to-b from-brand-50/80 via-white to-white">
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute -left-24 top-10 h-72 w-72 rounded-full bg-brand-200/40 blur-3xl" />
        <div className="absolute -right-16 top-32 h-80 w-80 rounded-full bg-accent-100/60 blur-3xl" />
        <div
          className="absolute inset-0 bg-dot-grid bg-[length:24px_24px] opacity-40"
          style={{ WebkitMaskImage: 'radial-gradient(ellipse at center, black 15%, transparent 72%)' }}
        />
      </div>

      <div className="container-premium relative py-16 sm:py-20 lg:py-28">
        <div className="mx-auto max-w-3xl text-center">
          <div className="animate-fade-up">
            <Badge tone="brand" dot className="px-3 py-1.5">
              La marketplace de la communauté 2iE
            </Badge>
          </div>

          <h1
            className="animate-fade-up text-balance mt-6 text-4xl font-extrabold tracking-[-0.035em] text-brand-950 sm:text-5xl lg:text-[64px] lg:leading-[1.08]"
            style={{ animationDelay: '70ms' }}
          >
            Tout ce qu'il vous faut,{' '}
            <span className="text-brand-600">juste à côté.</span>
          </h1>

          <p
            className="animate-fade-up text-balance mx-auto mt-5 max-w-2xl text-base leading-relaxed text-ink-muted sm:text-lg"
            style={{ animationDelay: '140ms' }}
          >
            Produits, bonnes affaires et services proposés par les vendeurs de votre école,
            à Kamboinsin et à Ouaga.
          </p>

          <div className="animate-fade-up mx-auto mt-8 max-w-2xl" style={{ animationDelay: '210ms' }}>
            <SearchBar
              value={query}
              onChange={onQueryChange}
              onSubmit={onSubmit}
              site={site}
              onSiteChange={onSiteChange}
            />
          </div>

          <div className="animate-fade-up mt-4 flex flex-wrap justify-center gap-2" style={{ animationDelay: '260ms' }}>
            {sites.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => onSiteChange(item.value)}
                className={cn(
                  'rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all duration-200',
                  site === item.value
                    ? 'bg-brand-800 text-white shadow-soft'
                    : 'border border-line bg-white text-ink-muted hover:border-brand-300 hover:text-brand-700',
                )}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="animate-fade-up mt-8 flex flex-wrap items-center justify-center gap-3" style={{ animationDelay: '310ms' }}>
            <Button size="lg" onClick={onBrowse} iconRight={<ArrowRight className="h-4 w-4" />}>
              Explorer les annonces
            </Button>
            <a
              href="#categories"
              className="inline-flex h-12 items-center rounded-2xl border border-line bg-white px-6 text-sm font-semibold text-ink-muted transition-all duration-200 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-800"
            >
              Comment ça marche
            </a>
          </div>

          <div
            className="animate-fade-up mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-xs font-medium text-ink-muted"
            style={{ animationDelay: '380ms' }}
          >
            <span className="inline-flex items-center gap-2">
              <Handshake className="h-4 w-4 text-brand-500" aria-hidden="true" />
              Remise en main propre
            </span>
            <span className="inline-flex items-center gap-2">
              <MapPin className="h-4 w-4 text-brand-500" aria-hidden="true" />
              Points de rendez-vous
            </span>
            <span className="inline-flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-[#128C7E]" aria-hidden="true" />
              Contact WhatsApp
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}
