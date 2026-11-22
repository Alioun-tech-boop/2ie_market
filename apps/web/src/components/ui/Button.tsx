import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '../../lib/cn'

type Variant = 'primary' | 'secondary' | 'ghost' | 'accent' | 'outline' | 'soft'
type Size = 'sm' | 'md' | 'lg'

const variants: Record<Variant, string> = {
  primary: 'bg-brand-800 text-white shadow-soft hover:bg-brand-700 hover:shadow-card',
  secondary: 'bg-brand-50 text-brand-800 hover:bg-brand-100',
  ghost: 'text-ink-muted hover:bg-brand-50 hover:text-brand-800',
  accent: 'bg-accent-600 text-white shadow-soft hover:bg-accent-700',
  outline: 'border border-line bg-white text-ink hover:border-brand-300 hover:bg-brand-50',
  soft: 'bg-white/[0.12] text-white ring-1 ring-inset ring-white/25 hover:bg-white/20',
}

const sizes: Record<Size, string> = {
  sm: 'h-9 gap-1.5 rounded-xl px-3.5 text-xs',
  md: 'h-11 gap-2 rounded-xl px-5 text-sm',
  lg: 'h-12 gap-2 rounded-2xl px-6 text-sm',
}

export function buttonStyles({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
}: { variant?: Variant; size?: Size; fullWidth?: boolean } = {}): string {
  return cn(
    'inline-flex items-center justify-center font-semibold transition-all duration-200 ease-premium',
    'active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50',
    'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-500/25',
    variants[variant],
    sizes[size],
    fullWidth && 'w-full',
  )
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  fullWidth?: boolean
  loading?: boolean
  iconLeft?: ReactNode
  iconRight?: ReactNode
}

export function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  iconLeft,
  iconRight,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(buttonStyles({ variant, size, fullWidth }), className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <span
          className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
          aria-hidden="true"
        />
      )}
      {!loading && iconLeft && <span aria-hidden="true">{iconLeft}</span>}
      {children}
      {iconRight && <span aria-hidden="true">{iconRight}</span>}
    </button>
  )
}
