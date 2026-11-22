import { formatPrice } from '../../lib/format'
import { cn } from '../../lib/cn'

export function Price({
  cents,
  label,
  size = 'md',
  className,
}: {
  cents: number
  label?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}) {
  return (
    <span className={cn('inline-flex flex-col leading-none', className)}>
      {label && (
        <span className="mb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-ink-soft">
          {label}
        </span>
      )}
      <span
        className={cn(
          'font-extrabold tracking-tight text-brand-900',
          size === 'sm' && 'text-sm',
          size === 'md' && 'text-base',
          size === 'lg' && 'text-2xl',
        )}
      >
        {formatPrice(cents)}
      </span>
    </span>
  )
}
