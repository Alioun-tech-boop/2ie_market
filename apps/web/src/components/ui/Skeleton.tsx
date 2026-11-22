import { cn } from '../../lib/cn'

export function Skeleton({ className }: { className?: string }) {
  return (
    <span className={cn('relative block overflow-hidden rounded-lg bg-brand-50', className)}>
      <span className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/80 to-transparent" />
    </span>
  )
}
