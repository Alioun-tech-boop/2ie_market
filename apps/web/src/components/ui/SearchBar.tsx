import { MapPin, Search, X } from 'lucide-react'
import type { FormEvent } from 'react'
import { cn } from '../../lib/cn'
import type { Site } from '../../lib/types'

export type SiteFilter = Site | 'ALL'

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  site: SiteFilter
  onSiteChange: (site: SiteFilter) => void
  variant?: 'hero' | 'compact'
  className?: string
}

export function SearchBar({
  value,
  onChange,
  onSubmit,
  site,
  onSiteChange,
  variant = 'hero',
  className,
}: SearchBarProps) {
  const isHero = variant === 'hero'

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSubmit()
  }

  return (
    <form
      onSubmit={handleSubmit}
      role="search"
      className={cn(
        'flex w-full items-center gap-2 rounded-2xl border border-line bg-white shadow-card transition-shadow duration-200 focus-within:border-brand-300 focus-within:shadow-lift',
        isHero ? 'p-2 pl-4' : 'h-11 p-1 pl-3',
        className,
      )}
    >
      <Search className={cn('shrink-0 text-brand-500', isHero ? 'h-5 w-5' : 'h-4 w-4')} aria-hidden="true" />
      <label htmlFor="marketplace-search" className="sr-only">
        Rechercher un produit ou un service
      </label>
      <input
        id="marketplace-search"
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={isHero ? 'Un produit, un service, une boutique…' : 'Rechercher…'}
        className="min-w-0 flex-1 bg-transparent text-sm font-medium text-ink outline-none placeholder:font-normal placeholder:text-ink-soft [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="rounded-full p-1.5 text-ink-soft transition-colors hover:bg-brand-50 hover:text-brand-700"
          aria-label="Effacer la recherche"
        >
          <X className="h-4 w-4" />
        </button>
      )}
      {isHero && (
        <label className="hidden items-center gap-1.5 rounded-xl bg-canvas px-3 py-2 sm:inline-flex">
          <MapPin className="h-4 w-4 text-brand-500" aria-hidden="true" />
          <span className="sr-only">Filtrer par site</span>
          <select
            value={site}
            onChange={(event) => onSiteChange(event.target.value as SiteFilter)}
            className="cursor-pointer bg-transparent text-xs font-semibold text-brand-800 outline-none"
          >
            <option value="ALL">Tous les sites</option>
            <option value="KAMBOINSIN">Kamboinsin</option>
            <option value="OUAGA">Ouaga</option>
          </select>
        </label>
      )}
      <button
        type="submit"
        className={cn(
          'inline-flex shrink-0 items-center justify-center rounded-xl bg-brand-800 font-semibold text-white transition-all duration-200 ease-premium hover:bg-brand-700 active:scale-[0.98]',
          isHero ? 'h-11 px-5 text-sm' : 'h-9 w-9',
        )}
        aria-label="Lancer la recherche"
      >
        {isHero ? (
          'Rechercher'
        ) : (
          <Search className="h-4 w-4" aria-hidden="true" />
        )}
      </button>
    </form>
  )
}
