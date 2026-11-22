import { VendorCard } from '../market/VendorCard'
import { SectionHeader } from '../ui/SectionHeader'
import { vendors } from '../../data/demo'

export function NewVendorsSection({ onInfo }: { onInfo: (message: string) => void }) {
  return (
    <section id="vendeurs" className="container-premium scroll-mt-24 py-14 lg:py-20">
      <SectionHeader
        eyebrow="La communauté"
        title="Nouveaux vendeurs"
        description="Des boutiques tenues par les membres de votre école, sur les deux sites."
        actionLabel="Voir toutes les boutiques"
        onAction={() => onInfo('Toutes les boutiques — bientôt disponibles')}
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {vendors.map((vendor) => (
          <VendorCard
            key={vendor.id}
            vendor={vendor}
            onOpen={() => onInfo(`Boutique « ${vendor.storeName} » — bientôt disponible`)}
          />
        ))}
      </div>
    </section>
  )
}
