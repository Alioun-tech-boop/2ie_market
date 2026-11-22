import type { HTMLAttributes } from 'react'
import { cn } from '../../lib/cn'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean
}

export function Card({ hoverable = false, className, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-line bg-white shadow-card',
        hoverable &&
          'transition-all duration-300 ease-premium hover:-translate-y-1 hover:border-brand-200 hover:shadow-lift',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}
