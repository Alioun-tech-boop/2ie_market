import {
  Armchair, BookOpen, Code2, GraduationCap, Laptop, LayoutGrid, Package,
  Salad, Shirt, Smartphone, Sparkles, Truck, Wrench, type LucideIcon,
} from 'lucide-react'
import type { PublicCategory } from '../../lib/market'
import { SectionHeader } from '../ui/SectionHeader'
import { Skeleton } from '../ui/Skeleton'

const iconMap: Record<string, LucideIcon> = {
  Laptop, Smartphone, Shirt, BookOpen, Salad, Sparkles, Armchair, Code2,
  GraduationCap, Truck, Wrench, Package,
}
const tones = [
  'bg-brand-50 text-brand-600', 'bg-emerald-50 text-emerald-600',
  'bg-amber-50 text-amber-600', 'bg-violet-50 text-violet-600',
  'bg-rose-50 text-rose-600', 'bg-slate-100 text-slate-600',
]

export function CategoriesSection({
  categories, loading, onSelect,
}: {
  categories: PublicCategory[]
  loading: boolean
  onSelect: (slug: string) => void
}) {
  return (
    <section id="categories" className="container-premium py-5 lg:py-8">
      <SectionHeader title="Catégories" />
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none lg:grid lg:grid-cols-6 lg:overflow-visible">
        {loading
          ? Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-28 w-32 shrink-0 rounded-2xl lg:h-32 lg:w-auto" />
            ))
          : categories.map((category, index) => {
              const Icon = iconMap[category.icon ?? ''] ?? LayoutGrid
              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => onSelect(category.slug)}
                  className="group flex w-32 shrink-0 flex-col items-start gap-2 rounded-2xl border border-line bg-white p-3 text-left shadow-soft transition-all duration-300 hover:border-brand-200 hover:shadow-card lg:w-auto"
                >
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tones[index % tones.length]}`}>
                    <Icon className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
                  </span>
                  <span className="min-w-0 w-full">
                    <span className="line-clamp-2 block text-sm font-bold text-ink">{category.name}</span>
                    <span className="mt-1 block text-[11px] text-ink-soft">{category.count} annonce(s)</span>
                  </span>
                </button>
              )
            })}
      </div>
    </section>
  )
}
