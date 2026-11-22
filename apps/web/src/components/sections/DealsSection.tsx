import { deals, vendorOf } from '../../data/demo'
import { ProductCard } from '../market/ProductCard'
import { SectionHeader } from '../ui/SectionHeader'
import type { Listing } from '../../lib/types'

export function DealsSection({ onOpen }: { onOpen: (listing: Listing) => void }) {
  return (
    <section className="scroll-mt-24 bg-accent-50/50 py-14 lg:py-20">
      <div className="container-premium">
        <SectionHeader
          eyebrow="À ne pas manquer"
          title="Les bonnes affaires"
          description="De belles trouvailles à prix doux, disponibles encore peu de temps."
        />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {deals.map((deal) => (
            <ProductCard
              key={deal.id}
              listing={deal}
              vendor={vendorOf(deal)}
              onOpen={() => onOpen(deal)}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
