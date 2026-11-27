import { useEffect, useId, useState } from 'react'
import { usePlatform } from '../../context/PlatformContext'
import { assetUrl } from '../../lib/auth'
import { cn } from '../../lib/cn'

export function Logo({ compact = false, className }: { compact?: boolean; className?: string }) {
  const gradientId = useId().replace(/:/g, '')
  const { platform } = usePlatform()
  const logo = assetUrl(platform.logoUrl)
  const [logoFailed, setLogoFailed] = useState(false)
  const words = platform.name.trim().split(/\s+/)
  const first = words[0] || '2ie'
  const rest = words.slice(1).join(' ')

  useEffect(() => {
    setLogoFailed(false)
  }, [logo])

  return (
    <span className={cn('inline-flex items-center gap-2.5', className)} aria-label={platform.name}>
      {logo && !logoFailed ? (
        <img
          src={logo}
          alt=""
          loading="eager"
          decoding="async"
          onError={() => setLogoFailed(true)}
          className="h-10 w-10 shrink-0 rounded-xl object-cover"
        />
      ) : (
        <svg className="h-10 w-10 shrink-0" viewBox="0 0 40 40" role="img" aria-label={platform.name}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
              <stop stopColor="#2F56B8" />
              <stop offset="1" stopColor="#122A5E" />
            </linearGradient>
          </defs>
          <rect width="40" height="40" rx="12" fill={`url(#${gradientId})`} />
          <path
            d="M11 15.5c0-3 2.4-5.2 5.4-5.2 2.7 0 4.8 1.7 4.8 4.1 0 2.1-1.5 3.4-4.4 5.9L12 26h10.5"
            fill="none"
            stroke="white"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="29" cy="11" r="2.6" fill="#C77A2E" />
        </svg>
      )}
      {!compact && (
        <span className="flex flex-col leading-none">
          <span className="text-[17px] font-extrabold tracking-tight text-brand-900">
            {first}
            {rest && <span className="text-accent-600"> {rest}</span>}
          </span>
          <span className="mt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-soft">
            La marketplace de l'école
          </span>
        </span>
      )}
    </span>
  )
}
