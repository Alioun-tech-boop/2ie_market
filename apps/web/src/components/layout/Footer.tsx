import { usePlatform } from '../../context/PlatformContext'
import { Logo } from '../ui/Logo'
import { SiteChip } from '../ui/SiteChip'

const columns = [
  {
    title: 'Marketplace',
    links: ['Comment ça marche', 'Devenir vendeur', 'Nos boutiques', 'Foire aux questions'],
  },
  {
    title: 'Découvrir',
    links: ['Produits', 'Articles d’occasion', 'Services', 'Bonnes affaires'],
  },
  {
    title: 'Aide',
    links: ['Commandes', 'Remise & rendez-vous', 'Contacter un vendeur', 'Signaler une annonce'],
  },
]

export function Footer({ onInfo }: { onInfo: (message: string) => void }) {
  const { platform } = usePlatform()

  return (
    <footer id="inscription" className="border-t border-line bg-canvas">
      <div className="container-premium py-14 lg:py-16">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_2fr]">
          <div>
            <Logo />
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-ink-muted">
              La marketplace de la communauté 2iE. Achetez, vendez et échangez entre étudiants,
              simplement et en toute confiance.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2">
              <SiteChip site="KAMBOINSIN" />
              <SiteChip site="OUAGA" />
            </div>
            {platform.supportEmail && (
              <a href={`mailto:${platform.supportEmail}`} className="mt-4 inline-block text-xs font-semibold text-brand-700 hover:underline">
                Support : {platform.supportEmail}
              </a>
            )}
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            {columns.map((column) => (
              <div key={column.title}>
                <h3 className="text-xs font-extrabold uppercase tracking-[0.14em] text-brand-900">
                  {column.title}
                </h3>
                <ul className="mt-4 space-y-3">
                  {column.links.map((link) => (
                    <li key={link}>
                      <button
                        type="button"
                        onClick={() => onInfo(`${link} — contenu disponible prochainement`)}
                        className="text-left text-sm text-ink-muted transition-colors hover:text-brand-700"
                      >
                        {link}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-line pt-6 text-xs text-ink-soft sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 {platform.name}. Conçu pour la communauté de l'école.</p>
          <p>Aucun paiement en ligne — remise en main propre ou point de rendez-vous.</p>
        </div>
      </div>
    </footer>
  )
}
