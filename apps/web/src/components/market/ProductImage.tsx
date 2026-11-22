import type { LucideIcon } from 'lucide-react'
import { cn } from '../../lib/cn'
import type { Tone } from '../../lib/types'

const tones: Record<Tone, string> = {
  blue: 'from-brand-100 via-brand-50 to-white text-brand-600',
  mint: 'from-emerald-100 via-teal-50 to-white text-emerald-600',
  amber: 'from-amber-100 via-orange-50 to-white text-amber-600',
  violet: 'from-violet-100 via-indigo-50 to-white text-violet-600',
  rose: 'from-rose-100 via-pink-50 to-white text-rose-600',
  slate: 'from-slate-100 via-slate-50 to-white text-slate-500',
}

export function ProductImage({
  icon: Icon,
  tone,
  src,
  alt,
  className,
}: {
  icon: LucideIcon
  tone: Tone
  src?: string
  alt: string
  className?: string
}) {
  return (
    <div
      className={cn(
        'relative aspect-[4/3] overflow-hidden rounded-xl bg-gradient-to-br',
        tones[tone],
        className,
      )}
    >
      {src ? (
        <img src={src} alt={alt} loading="lazy" className="h-full w-full object-cover" />
      ) : (
        <>
          <span className="absolute -right-6 -top-8 h-28 w-28 rounded-full border-[14px] border-white/40" aria-hidden="true" />
          <span className="absolute -bottom-10 -left-6 h-24 w-24 rounded-full bg-white/30" aria-hidden="true" />
          <span className="absolute inset-0 flex items-center justify-center">
            <Icon className="h-14 w-14 opacity-80 drop-shadow-sm" strokeWidth={1.4} aria-hidden="true" />
          </span>
        </>
      )}
    </div>
  )
}
