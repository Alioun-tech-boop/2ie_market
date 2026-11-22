import { ArrowRight, Handshake, MapPin, MessageCircle, SlidersHorizontal, Sparkles } from 'lucide-react'
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
    <section id="accueil" className="relative overflow-hidden bg-[#f7f8fc]">
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute -left-24 top-10 h-72 w-72 rounded-full bg-brand-200/50 blur-3xl" />
        <div className="absolute -right-16 top-32 h-80 w-80 rounded-full bg-violet-100/70 blur-3xl" />
        <div
          className="absolute inset-0 bg-dot-grid bg-[length:24px_24px] opacity-40"
          style={{ WebkitMaskImage: 'radial-gradient(ellipse at center, black 15%, transparent 72%)' }}
        />
      </div>

      <div className="container-premium relative py-7 sm:py-12 lg:py-20">
        <div className="mx-auto max-w-5xl rounded-[2rem] border border-white/90 bg-white/75 px-5 py-9 shadow-[0_18px_55px_rgba(30,63,145,0.10)] backdrop-blur sm:px-10 sm:py-14 lg:grid lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:gap-14">
          <div className="text-center lg:text-left">
            <div className="animate-fade-up flex justify-center lg:justify-start">
              <Badge tone="brand" dot className="px-3 py-1.5">
                La marketplace 2iE
              </Badge>
            </div>

          <h1
            className="animate-fade-up text-balance mt-5 text-4xl font-extrabold tracking-[-0.05em] text-ink sm:text-5xl lg:text-6xl lg:leading-[1.04]"
            style={{ animationDelay: '70ms' }}
          >
            Tout ce qu'il vous faut,{' '}
            <span className="text-brand-600">près de vous.</span>
          </h1>

          <p
            className="animate-fade-up text-balance mx-auto mt-5 max-w-2xl text-base leading-relaxed text-ink-muted sm:text-lg"
            style={{ animationDelay: '140ms' }}
          >
            Produits, bonnes affaires et services proposés par les vendeurs de votre école,
            à Kamboinsin et à Ouaga.
          </p>

          <div className="animate-fade-up mx-auto mt-7 max-w-2xl lg:mx-0" style={{ animationDelay: '210ms' }}>
            <SearchBar
              value={query}
              onChange={onQueryChange}
              onSubmit={onSubmit}
              site={site}
              onSiteChange={onSiteChange}
            />
          </div>

          <div className="animate-fade-up mt-4 flex flex-nowrap justify-start gap-2 overflow-x-auto pb-1 scrollbar-none lg:justify-start" style={{ animationDelay: '260ms' }}>
            {sites.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => onSiteChange(item.value)}
                className={cn(
                  'shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all duration-200',
                  site === item.value
                    ? 'bg-brand-800 text-white shadow-soft'
                    : 'border border-line bg-white text-ink-muted hover:border-brand-300 hover:text-brand-700',
                )}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="animate-fade-up mt-7 flex flex-wrap items-center justify-center gap-3 lg:justify-start" style={{ animationDelay: '310ms' }}>
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
            className="animate-fade-up mt-8 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs font-medium text-ink-muted lg:justify-start"
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

          <div className="animate-fade-up relative mx-auto mt-10 hidden w-full max-w-sm lg:mt-0 lg:block" style={{ animationDelay: '220ms' }}>
            <div className="rounded-[2rem] bg-gradient-to-br from-brand-800 via-brand-700 to-violet-700 p-6 text-left text-white shadow-[0_24px_50px_rgba(22,50,116,0.32)]">
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-white/15 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.16em]">À découvrir</span>
                <Sparkles className="h-5 w-5 text-amber-200" />
              </div>
              <p className="mt-10 text-3xl font-extrabold tracking-tight">Trouvez la bonne affaire du campus.</p>
              <p className="mt-3 text-sm leading-relaxed text-white/75">Produits, services et occasions sélectionnés par votre communauté.</p>
              <button type="button" onClick={onBrowse} className="mt-7 inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-bold text-brand-800 transition-transform hover:scale-[1.02]">
                Voir les annonces <ArrowRight className="h-4 w-4" />
              </button>
            </div>
            <div className="absolute -bottom-5 -left-5 flex items-center gap-2 rounded-2xl bg-white px-4 py-3 shadow-card">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-700"><SlidersHorizontal className="h-4 w-4" /></span>
              <span><strong className="block text-xs text-ink">Recherche simple</strong><span className="text-[10px] text-ink-muted">par site et catégorie</span></span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
