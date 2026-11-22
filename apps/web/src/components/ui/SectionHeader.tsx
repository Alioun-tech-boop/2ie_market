import { ArrowRight } from 'lucide-react'

export function SectionHeader({
  eyebrow,
  title,
  description,
  actionLabel,
  onAction,
}: {
  eyebrow?: string
  title: string
  description?: string
  actionLabel?: string
  onAction?: () => void
}) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && (
          <p className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.2em] text-accent-600">
            {eyebrow}
          </p>
        )}
        <h2 className="text-balance text-2xl font-extrabold tracking-tight text-brand-900 sm:text-3xl">
          {title}
        </h2>
        {description && <p className="mt-2 max-w-xl text-sm text-ink-muted">{description}</p>}
      </div>
      {actionLabel && (
        <button
          type="button"
          onClick={onAction}
          className="group inline-flex shrink-0 items-center gap-1.5 self-start text-sm font-bold text-brand-700 transition-colors hover:text-brand-900 sm:self-auto"
        >
          {actionLabel}
          <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" aria-hidden="true" />
        </button>
      )}
    </div>
  )
}
