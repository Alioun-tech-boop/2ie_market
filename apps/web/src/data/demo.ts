import {
  BookOpen,
  BriefcaseBusiness,
  Camera,
  GraduationCap,
  Headphones,
  Laptop,
  Lamp,
  Printer,
  Shirt,
  ShoppingBag,
  Smartphone,
  Sparkles,
  Backpack,
  LayoutGrid,
} from 'lucide-react'
import type { Category, Listing, Vendor } from '../lib/types'

/**
 * Données de démonstration UI uniquement.
 * Aucune règle métier n'est implémentée ici : les prix sont en centimes (RG-05),
 * les numéros WhatsApp en E.164 (RG-04) et aucun emplacement détaillé n'est
 * exposé publiquement (RG-17) — seul le site élargi est affiché.
 */

export const vendors: Vendor[] = [
  {
    id: 'v1',
    ownerName: 'Aminata Diallo',
    storeName: 'Studio Kamboinsin',
    tagline: 'High-tech et accessoires sélectionnés pour les étudiants.',
    site: 'KAMBOINSIN',
    tone: 'blue',
    listingsCount: 24,
  },
  {
    id: 'v2',
    ownerName: 'Moussa Ouédraogo',
    storeName: 'Coin des Livres',
    tagline: 'Manuels, supports de cours et impressions de qualité.',
    site: 'OUAGA',
    tone: 'mint',
    listingsCount: 18,
  },
  {
    id: 'v3',
    ownerName: 'Fatima Traoré',
    storeName: 'Atelier Fatou',
    tagline: 'Mode, occasion et pièces uniques à prix doux.',
    site: 'KAMBOINSIN',
    tone: 'rose',
    listingsCount: 31,
  },
  {
    id: 'v4',
    ownerName: 'Jean-Baptiste Kaboré',
    storeName: 'Services 2iE',
    tagline: 'Cours, retouche, montage et accompagnement numérique.',
    site: 'OUAGA',
    tone: 'violet',
    listingsCount: 12,
  },
]

export const products: Listing[] = [
  { id: 'p1', title: 'Ordinateur portable 14"', type: 'PHYSICAL', priceCents: 25_000_000, site: 'KAMBOINSIN', vendorId: 'v1', tone: 'blue', icon: Laptop, tag: 'Occasion', availability: 'AVAILABLE' },
  { id: 'p2', title: 'Smartphone Android 128 Go', type: 'SECOND_HAND', priceCents: 15_000_000, site: 'OUAGA', vendorId: 'v2', tone: 'mint', icon: Smartphone, tag: 'Bon état', availability: 'AVAILABLE' },
  { id: 'p3', title: 'Sneakers blanches', type: 'SECOND_HAND', priceCents: 1_200_000, site: 'KAMBOINSIN', vendorId: 'v3', tone: 'rose', icon: Shirt, tag: 'Occasion', availability: 'AVAILABLE' },
  { id: 'p4', title: 'Sac à dos étudiant', type: 'PHYSICAL', priceCents: 800_000, site: 'KAMBOINSIN', vendorId: 'v1', tone: 'amber', icon: Backpack, tag: 'Neuf', availability: 'AVAILABLE' },
  { id: 'p5', title: 'Casque audio sans fil', type: 'PHYSICAL', priceCents: 1_800_000, site: 'OUAGA', vendorId: 'v2', tone: 'violet', icon: Headphones, tag: 'Neuf', availability: 'AVAILABLE' },
  { id: 'p6', title: 'Appareil photo compact', type: 'SECOND_HAND', priceCents: 9_000_000, site: 'KAMBOINSIN', vendorId: 'v3', tone: 'slate', icon: Camera, tag: 'Occasion', availability: 'AVAILABLE' },
  { id: 'p7', title: 'Lampe de bureau LED', type: 'PHYSICAL', priceCents: 400_000, site: 'OUAGA', vendorId: 'v2', tone: 'amber', icon: Lamp, tag: 'Neuf', availability: 'AVAILABLE' },
  { id: 'p8', title: 'Manuel de mathématiques', type: 'SECOND_HAND', priceCents: 500_000, site: 'KAMBOINSIN', vendorId: 'v3', tone: 'mint', icon: BookOpen, tag: 'Occasion', availability: 'AVAILABLE' },
]

export const services: Listing[] = [
  { id: 's1', title: 'Cours particuliers de maths', type: 'SERVICE', priceCents: 500_000, site: 'KAMBOINSIN', vendorId: 'v4', tone: 'blue', icon: GraduationCap, availability: 'AVAILABLE' },
  { id: 's2', title: 'Retouche & montage photo', type: 'SERVICE', priceCents: 300_000, site: 'OUAGA', vendorId: 'v4', tone: 'rose', icon: Sparkles, availability: 'AVAILABLE' },
  { id: 's3', title: 'Impression et reliure de mémoire', type: 'SERVICE', priceCents: 150_000, site: 'OUAGA', vendorId: 'v2', tone: 'mint', icon: Printer, availability: 'AVAILABLE' },
  { id: 's4', title: 'Création de site web étudiant', type: 'SERVICE', priceCents: 1_500_000, site: 'KAMBOINSIN', vendorId: 'v4', tone: 'violet', icon: BriefcaseBusiness, availability: 'AVAILABLE' },
]

export const deals: Listing[] = [
  { id: 'd1', title: 'Tablette 10"', type: 'SECOND_HAND', priceCents: 6_000_000, site: 'KAMBOINSIN', vendorId: 'v1', tone: 'blue', icon: LayoutGrid, tag: 'Bon plan', availability: 'AVAILABLE' },
  { id: 'd2', title: 'Veste universitaire', type: 'SECOND_HAND', priceCents: 900_000, site: 'KAMBOINSIN', vendorId: 'v3', tone: 'rose', icon: Shirt, tag: 'Bon plan', availability: 'AVAILABLE' },
  { id: 'd3', title: 'Lot de 4 cahiers', type: 'PHYSICAL', priceCents: 200_000, site: 'OUAGA', vendorId: 'v2', tone: 'amber', icon: BookOpen, tag: 'Bon plan', availability: 'AVAILABLE' },
  { id: 'd4', title: 'Clavier mécanique', type: 'PHYSICAL', priceCents: 1_400_000, site: 'KAMBOINSIN', vendorId: 'v1', tone: 'violet', icon: ShoppingBag, tag: 'Bon plan', availability: 'AVAILABLE' },
]

export const categories: Category[] = [
  { id: 'c1', label: 'Tout explorer', icon: LayoutGrid, tone: 'blue', count: 128 },
  { id: 'c2', label: 'High-tech', icon: Laptop, tone: 'violet', count: 32 },
  { id: 'c3', label: 'Mode & accessoires', icon: Shirt, tone: 'rose', count: 27 },
  { id: 'c4', label: 'Livres & cours', icon: BookOpen, tone: 'mint', count: 41 },
  { id: 'c5', label: 'Maison & bureau', icon: Lamp, tone: 'amber', count: 18 },
  { id: 'c6', label: 'Services', icon: BriefcaseBusiness, tone: 'slate', count: 12 },
]

export function vendorOf(listing: Listing): Vendor | undefined {
  return vendors.find((vendor) => vendor.id === listing.vendorId)
}
