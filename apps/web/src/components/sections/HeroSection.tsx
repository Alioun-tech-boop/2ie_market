import { SearchBar, type SiteFilter } from '../ui/SearchBar'

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
}: {
  query: string
  onQueryChange: (value: string) => void
  site: SiteFilter
  onSiteChange: (site: SiteFilter) => void
  onSubmit: () => void
  onBrowse: () => void
}) {
  return (
    <section id="accueil" className="bg-white">
      <div className="container-premium py-4 sm:py-6">
        <div className="mx-auto max-w-4xl">
          <SearchBar
            value={query}
            onChange={onQueryChange}
            onSubmit={onSubmit}
            site={site}
            onSiteChange={onSiteChange}
          />
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {sites.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => onSiteChange(item.value)}
                aria-pressed={site === item.value}
                className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                  site === item.value
                    ? 'bg-brand-800 text-white'
                    : 'border border-line bg-white text-ink-muted hover:border-brand-300 hover:text-brand-700'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
