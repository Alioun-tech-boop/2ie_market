import { generateReference } from '@2ie/shared'
import '../src/config'
import { hashPassword } from '../src/lib/password'
import { prisma } from '../src/lib/prisma'

const email = (process.env.ADMIN_EMAIL ?? 'admin@2ie-market.local').toLowerCase()
const password = process.env.ADMIN_PASSWORD ?? 'Admin1234!'
const firstName = process.env.ADMIN_FIRST_NAME ?? 'Admin'
const lastName = process.env.ADMIN_LAST_NAME ?? '2ie Market'

const DEFAULT_CATEGORIES = [
  { name: 'Informatique et électronique', slug: 'informatique-electronique', icon: 'Laptop', position: 1 },
  { name: 'Téléphones et accessoires', slug: 'telephones-accessoires', icon: 'Smartphone', position: 2 },
  { name: 'Vêtements et chaussures', slug: 'vetements-chaussures', icon: 'Shirt', position: 3 },
  { name: 'Livres et fournitures', slug: 'livres-fournitures', icon: 'BookOpen', position: 4 },
  { name: 'Alimentation', slug: 'alimentation', icon: 'Salad', position: 5 },
  { name: 'Beauté et soins', slug: 'beaute-soins', icon: 'Sparkles', position: 6 },
  { name: 'Maison et décoration', slug: 'maison-decoration', icon: 'Armchair', position: 7 },
  { name: 'Services informatiques', slug: 'services-informatiques', icon: 'Code2', position: 8 },
  {
    name: 'Cours particuliers et formations',
    slug: 'cours-particuliers-formations',
    icon: 'GraduationCap',
    position: 9,
  },
  { name: 'Transport et livraison', slug: 'transport-livraison', icon: 'Truck', position: 10 },
  { name: 'Réparation et maintenance', slug: 'reparation-maintenance', icon: 'Wrench', position: 11 },
  { name: 'Autres', slug: 'autres', icon: 'Package', position: 12 },
]

async function seedCategories() {
  for (const category of DEFAULT_CATEGORIES) {
    await prisma.category.upsert({
      where: { slug: category.slug },
      update: { name: category.name, icon: category.icon, position: category.position, isActive: true },
      create: category,
    })
  }
  console.log(`${DEFAULT_CATEGORIES.length} catégories disponibles.`)
}

const DEFAULT_MEETING_POINTS = [
  {
    id: '11111111-1111-4111-8111-111111111111',
    site: 'KAMBOINSIN' as const,
    label: 'Accueil 2ie — Hall principal',
    description: 'Devant le hall principal du campus de Kamboinsin.',
  },
  {
    id: '22222222-2222-4222-8222-222222222222',
    site: 'KAMBOINSIN' as const,
    label: 'Bibliothèque — Entrée',
    description: 'À l’entrée de la bibliothèque du campus.',
  },
  {
    id: '33333333-3333-4333-8333-333333333333',
    site: 'OUAGA' as const,
    label: 'Accueil campus — Hall',
    description: 'Au hall d’accueil du site de Ouaga.',
  },
]

async function seedMeetingPoints() {
  for (const point of DEFAULT_MEETING_POINTS) {
    await prisma.meetingPoint.upsert({
      where: { id: point.id },
      update: { ...point, isActive: true },
      create: point,
    })
  }
  console.log(`${DEFAULT_MEETING_POINTS.length} points de rendez-vous disponibles.`)
}

async function main() {
  await seedCategories()
  await seedMeetingPoints()
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    console.log(`Compte administrateur déjà présent : ${email}`)
    return
  }

  const reference = generateReference('A', '0', 0)
  const admin = await prisma.user.create({
    data: {
      email,
      passwordHash: await hashPassword(password),
      role: 'ADMIN',
      firstName,
      lastName,
      phoneE164: '+22600000000',
      location: {
        create: {
          site: 'OUAGA',
          buildingNumber: 'A',
          roomNumber: '0',
          floor: 0,
          reference,
        },
      },
    },
  })

  console.log(`Administrateur créé : ${admin.email} (${reference})`)
  console.log('Changez ADMIN_PASSWORD dans .env avant de lancer ce script en production.')
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
