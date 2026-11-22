import { Card } from '../ui/Card'
import { Skeleton } from '../ui/Skeleton'

export function ProductCardSkeleton() {
  return (
    <Card className="p-3">
      <Skeleton className="aspect-[4/3] w-full rounded-xl" />
      <div className="space-y-2 px-1 pb-1 pt-4">
        <Skeleton className="h-3.5 w-4/5" />
        <Skeleton className="h-3 w-2/5" />
        <div className="mt-4 flex items-center justify-between border-t border-line pt-4">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-9 w-9 rounded-xl" />
        </div>
      </div>
    </Card>
  )
}
