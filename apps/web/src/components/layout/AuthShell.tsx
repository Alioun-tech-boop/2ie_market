import type { ReactNode } from 'react'
import { BadgeCheck, MapPin, MessageCircle, ShieldCheck } from 'lucide-react'
import { Card } from '../ui/Card'
import { Logo } from '../ui/Logo'

const points = [
  { icon: MapPin, label: 'Localisation claire', text: 'Votre référence est générée automatiquement.' },
  { icon: MessageCircle, label: 'Contact direct', text: 'Échangez avec les vendeurs sur WhatsApp.' },
  { icon: ShieldCheck, label: 'Données protégées', text: 'Vos coordonnées restent privées.' },
]

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string
  subtitle: string
  children: ReactNode
  footer?: ReactNode
}) {
  return (
    <main className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-brand-50/70 via-white to-white py-10 lg:py-16">
      <div className="container-premium grid items-center gap-10 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="hidden lg:block">
          <Logo />
          <h1 className="text-balance mt-10 text-4xl font-extrabold tracking-tight text-brand-950">
            La marketplace qui connaît votre campus.
          </h1>
          <p className="mt-4 max-w-md text-base leading-relaxed text-ink-muted">
            {subtitle}
          </p>
          <div className="mt-10 space-y-5">
            {points.map((point) => {
              const Icon = point.icon
              return (
                <div key={point.label} className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-brand-600 shadow-soft">
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-sm font-bold text-ink">{point.label}</p>
                    <p className="mt-0.5 text-xs text-ink-muted">{point.text}</p>
                  </div>
                </div>
              )
            })}
          </div>
          <p className="mt-10 inline-flex items-center gap-2 text-xs font-semibold text-accent-600">
            <BadgeCheck className="h-4 w-4" /> Communauté 2iE · Kamboinsin & Ouaga
          </p>
        </div>

        <Card className="mx-auto w-full max-w-xl p-6 sm:p-8">
          <div className="mb-7">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-accent-600">
              2ie Market
            </p>
            <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-brand-900">{title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-muted">{subtitle}</p>
          </div>
          {children}
          {footer && <div className="mt-7 border-t border-line pt-6 text-sm">{footer}</div>}
        </Card>
      </div>
    </main>
  )
}
