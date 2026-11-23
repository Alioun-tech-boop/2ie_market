import type { Listing } from '../../lib/market'
import { ListingCard } from '../market/ListingCard'
import { Button } from '../ui/Button'
import { EmptyState } from '../ui/EmptyState'
import { SectionHeader } from '../ui/SectionHeader'
import { Skeleton } from '../ui/Skeleton'

export function PopularProductsSection({
  id,
  eyebrow,
  title,
  description,
  listings,
  loading,
  actionLabel = 'Voir toutes les annonces',
  onSeeAll,
}: {
  id: string
  eyebrow: string
  title: string
  description: string
  listings: Listing[]
  loading: boolean
  actionLabel?: string
  onSeeAll: () => void
}) {
  return (
    <section id={id} className="container-premium scroll-mt-24 py-14 lg:py-20">
      <SectionHeader
        eyebrow={eyebrow}
        title={title}
        description={description}
        actionLabel={actionLabel}
        onAction={onSeeAll}
      />

      {loading ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="aspect-square overflow-hidden rounded-2xl">
              <Skeleton className="h-full w-full rounded-2xl" />
            </div>
          ))}
        </div>
      ) : listings.length > 0 ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-4">
          {listings.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      ) : (
        <EmptyState
          title="Aucune annonce pour le moment"
          description="Revenez bientôt : de nouvelles annonces sont publiées chaque jour sur la marketplace."
          action={
            actionLabel ? (
              <Button variant="secondary" onClick={onSeeAll}>
                {actionLabel}
              </Button>
            ) : undefined
          }
        />
      )}
    </section>
  )
}
