import { useState } from 'react'
import { Building2, DoorOpen, Layers3, MapPin } from 'lucide-react'
import { generateReference, locationSchema, SITES, type Site } from '@2ie/shared'
import { Input } from '../ui/Input'
import { cn } from '../../lib/cn'

export interface LocationValue {
  site: Site
  buildingNumber: string
  roomNumber: string
  floor: number
}

const floorLabels = Array.from({ length: 11 }, (_, index) => ({
  value: index,
  label: index === 0 ? 'R0 — Rez-de-chaussée' : `R${index} — ${index}${index === 1 ? 'er' : 'e'} étage`,
}))

const selectClasses =
  'h-11 w-full appearance-none rounded-xl border border-line bg-white px-4 pr-10 text-sm font-medium text-ink outline-none transition-all focus:border-brand-400 focus:ring-4 focus:ring-brand-500/10 disabled:opacity-60'

export function LocationForm({
  value,
  onChange,
  errors,
  disabled = false,
  compact = false,
}: {
  value: LocationValue
  onChange: (value: LocationValue) => void
  errors?: Record<string, string[]>
  disabled?: boolean
  compact?: boolean
}) {
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const validation = locationSchema.safeParse(value)
  const localErrors: Record<string, string[] | undefined> = validation.success
    ? {}
    : validation.error.flatten().fieldErrors
  const errorFor = (field: string) => errors?.[field]?.[0] ?? (touched[field] ? localErrors[field]?.[0] : undefined)

  const reference = validation.success
    ? generateReference(value.buildingNumber, value.roomNumber, value.floor)
    : null

  function update<K extends keyof LocationValue>(key: K, next: LocationValue[K]) {
    onChange({ ...value, [key]: next })
    setTouched((current) => ({ ...current, [key]: true }))
  }

  return (
    <div className={cn('space-y-5', compact && 'space-y-4')}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="location-site" className="mb-2 block text-sm font-semibold text-ink">
            Site de l'école
          </label>
          <div className="relative">
            <MapPin className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-500" aria-hidden="true" />
            <select
              id="location-site"
              value={value.site}
              onChange={(event) => update('site', event.target.value as Site)}
              onBlur={() => setTouched((current) => ({ ...current, site: true }))}
              disabled={disabled}
              className={cn(selectClasses, 'pl-10', errorFor('site') && 'border-rose-400')}
            >
              {SITES.map((site) => (
                <option key={site} value={site}>
                  {site === 'KAMBOINSIN' ? 'Kamboinsin' : 'Ouaga'}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-ink-soft">▾</span>
          </div>
          {errorFor('site') && <p className="mt-1.5 text-xs font-medium text-rose-600">{errorFor('site')}</p>}
        </div>

        <div>
          <Input
            id="location-building"
            label="Numéro du bâtiment"
            icon={Building2}
            value={value.buildingNumber}
            onChange={(event) => update('buildingNumber', event.target.value)}
            onBlur={() => setTouched((current) => ({ ...current, buildingNumber: true }))}
            placeholder="Ex. 1"
            maxLength={10}
            disabled={disabled}
            error={errorFor('buildingNumber')}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          id="location-room"
          label="Numéro de chambre"
          icon={DoorOpen}
          value={value.roomNumber}
          onChange={(event) => update('roomNumber', event.target.value)}
          onBlur={() => setTouched((current) => ({ ...current, roomNumber: true }))}
          placeholder="Ex. 87"
          inputMode="numeric"
          maxLength={10}
          disabled={disabled}
          error={errorFor('roomNumber')}
        />

        <div>
          <label htmlFor="location-floor" className="mb-2 block text-sm font-semibold text-ink">
            Étage
          </label>
          <div className="relative">
            <Layers3 className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-500" aria-hidden="true" />
            <select
              id="location-floor"
              value={value.floor}
              onChange={(event) => update('floor', Number(event.target.value))}
              onBlur={() => setTouched((current) => ({ ...current, floor: true }))}
              disabled={disabled}
              className={cn(selectClasses, 'pl-10', errorFor('floor') && 'border-rose-400')}
            >
              {floorLabels.map((floor) => (
                <option key={floor.value} value={floor.value}>
                  {floor.label}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-ink-soft">▾</span>
          </div>
          {errorFor('floor') && <p className="mt-1.5 text-xs font-medium text-rose-600">{errorFor('floor')}</p>}
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 rounded-2xl border border-brand-100 bg-brand-50 px-4 py-3.5">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-brand-600">
            Votre référence
          </p>
          <p className="mt-1 text-xs text-ink-muted">
            Générée automatiquement à partir de ces informations.
          </p>
        </div>
        <span className="shrink-0 rounded-xl bg-white px-3 py-2 font-mono text-lg font-bold tracking-tight text-brand-800 shadow-soft">
          {reference ?? 'B… · R…'}
        </span>
      </div>
    </div>
  )
}
