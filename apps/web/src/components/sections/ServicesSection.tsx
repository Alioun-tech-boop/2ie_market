import { ServiceCard } from '../market/ServiceCard'
import { SectionHeader } from '../ui/SectionHeader'
import { services, vendorOf } from '../../data/demo'
import type { Listing } from '../../lib/types'

export function ServicesSection({
  onOpen,
  onSeeAll,
}: {
  onOpen: (listing: Listing) => void
  onSeeAll: () => void
}) {
  return (
    <section id="services" className="scroll-mt-24 bg-canvas py-14 lg:py-20">
      <div className="container-premium">
        <SectionHeader
          eyebrow="Services"
          title="Des compétences à portée de main"
          description="Cours, création, impression, retouche : les talents de l'école sont ici."
          actionLabel="Tous les services"
          onAction={onSeeAll}
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {services.map((service) => (
            <ServiceCard
              key={service.id}
              listing={service}
              vendor={vendorOf(service)}
              onOpen={() => onOpen(service)}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
