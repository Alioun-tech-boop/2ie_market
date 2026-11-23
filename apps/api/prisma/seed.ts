import { randomBytes } from 'node:crypto'
import { generateReference } from '@2ie/shared'
import '../src/config'
import { hashPassword, verifyPassword } from '../src/lib/password'
import { prisma } from '../src/lib/prisma'

const email = (process.env.ADMIN_EMAIL ?? 'admin@2ie-market.local').toLowerCase()
const password = process.env.ADMIN_PASSWORD
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
  { name: 'Cours particuliers et formations', slug: 'cours-particuliers-formations', icon: 'GraduationCap', position: 9 },
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
  { id: '11111111-1111-4111-8111-111111111111', site: 'KAMBOINSIN' as const, label: 'Accueil 2iE — Hall principal', description: 'Devant le hall principal du campus de Kamboinsin.' },
  { id: '22222222-2222-4222-8222-222222222222', site: 'KAMBOINSIN' as const, label: 'Bibliothèque — Entrée', description: 'À l’entrée de la bibliothèque du campus.' },
  { id: '33333333-3333-4333-8333-333333333333', site: 'OUAGA' as const, label: 'Accueil campus — Hall', description: 'Au hall d’accueil du site de Ouaga.' },
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

const DEMO_STORES = [
  { slug: 'demo-tech-campus', name: 'Démo Tech Campus', description: 'Boutique de démonstration — informatique et accessoires pour la vie étudiante.', site: 'KAMBOINSIN' as const, building: 'B1', room: '12', first: 'Équipe', last: 'Tech Démo' },
  { slug: 'demo-mobile-shop', name: 'Démo Mobile Shop', description: 'Boutique de démonstration — téléphones, audio et accessoires.', site: 'OUAGA' as const, building: 'B2', room: '08', first: 'Équipe', last: 'Mobile Démo' },
  { slug: 'demo-campus-mode', name: 'Démo Campus Mode', description: 'Boutique de démonstration — vêtements, sacs et accessoires.', site: 'KAMBOINSIN' as const, building: 'B3', room: '21', first: 'Équipe', last: 'Mode Démo' },
  { slug: 'demo-librairie', name: 'Démo Librairie 2iE', description: 'Boutique de démonstration — livres, fournitures et impressions.', site: 'OUAGA' as const, building: 'B1', room: '04', first: 'Équipe', last: 'Librairie Démo' },
  { slug: 'demo-maison', name: 'Démo Maison & Bureau', description: 'Boutique de démonstration — équipements utiles pour logement et bureau.', site: 'KAMBOINSIN' as const, building: 'B4', room: '15', first: 'Équipe', last: 'Maison Démo' },
  { slug: 'demo-services', name: 'Démo Services Étudiants', description: 'Catalogue de démonstration — prestations et compétences disponibles à titre illustratif.', site: 'OUAGA' as const, building: 'B2', room: '16', first: 'Équipe', last: 'Services Démo' },
]

const PHOTO = {
  laptop: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=1000&q=85',
  phone: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=1000&q=85',
  headphones: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1000&q=85',
  shoes: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=1000&q=85',
  backpack: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=1000&q=85',
  books: 'https://images.unsplash.com/photo-1507842217343-583bb7270b66?auto=format&fit=crop&w=1000&q=85',
  desk: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1000&q=85',
  watch: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1000&q=85',
  camera: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=1000&q=85',
  tablet: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?auto=format&fit=crop&w=1000&q=85',
  chair: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1000&q=85',
  printer: 'https://images.unsplash.com/photo-1612815154858-60aa4c59eaa6?auto=format&fit=crop&w=1000&q=85',
  food: 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&w=1000&q=85',
  skincare: 'https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?auto=format&fit=crop&w=1000&q=85',
  shirt: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=1000&q=85',
  keyboard: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=1000&q=85',
  mouse: 'https://images.unsplash.com/photo-1527814050087-3793815479db?auto=format&fit=crop&w=1000&q=85',
  lamp: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=1000&q=85',
  plant: 'https://images.unsplash.com/photo-1485955900006-10f4d324d411?auto=format&fit=crop&w=1000&q=85',
  web: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1000&q=85',
  design: 'https://images.unsplash.com/photo-1545235617-9465d2a55698?auto=format&fit=crop&w=1000&q=85',
  tutoring: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=1000&q=85',
  repair: 'https://images.unsplash.com/photo-1581092921461-eab62e97a780?auto=format&fit=crop&w=1000&q=85',
  delivery: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1000&q=85',
  photo: 'https://images.unsplash.com/photo-1452587925148-ce544e77e70d?auto=format&fit=crop&w=1000&q=85',
  print: 'https://images.unsplash.com/photo-1568667256549-094345857637?auto=format&fit=crop&w=1000&q=85',
  fitness: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=1000&q=85',
}

type DemoListing = { slug: string; title: string; description: string; type: 'PHYSICAL' | 'SECOND_HAND' | 'SERVICE'; price: number; category: string; photo: string; store: string; quantity?: number; duration?: number; featured?: boolean; condition?: 'NEW' | 'LIKE_NEW' | 'GOOD' | 'FAIR' }

const DEMO_LISTINGS: DemoListing[] = [
  { slug: 'pc-portable-etudiant', title: 'PC portable pour étudiant', description: 'Ordinateur de démonstration pour les cours, la programmation et la bureautique. Donnée fictive de catalogue.', type: 'SECOND_HAND', price: 185000, category: 'informatique-electronique', photo: PHOTO.laptop, store: 'demo-tech-campus', quantity: 2, featured: true, condition: 'GOOD' },
  { slug: 'smartphone-android-128-go', title: 'Smartphone Android 128 Go', description: 'Téléphone de démonstration avec grand écran, appareil photo et stockage 128 Go.', type: 'PHYSICAL', price: 95000, category: 'telephones-accessoires', photo: PHOTO.phone, store: 'demo-mobile-shop', quantity: 5, featured: true, condition: 'NEW' },
  { slug: 'casque-audio-bluetooth', title: 'Casque audio Bluetooth', description: 'Casque sans fil illustratif pour musique, visioconférence et cours en ligne.', type: 'PHYSICAL', price: 18000, category: 'telephones-accessoires', photo: PHOTO.headphones, store: 'demo-mobile-shop', quantity: 8, condition: 'NEW' },
  { slug: 'sneakers-urbaines', title: 'Sneakers urbaines', description: 'Paire de chaussures de démonstration, style quotidien.', type: 'SECOND_HAND', price: 22000, category: 'vetements-chaussures', photo: PHOTO.shoes, store: 'demo-campus-mode', quantity: 3, condition: 'LIKE_NEW' },
  { slug: 'sac-a-dos-campus', title: 'Sac à dos campus', description: 'Sac à dos illustratif pour ordinateur et fournitures.', type: 'PHYSICAL', price: 14500, category: 'vetements-chaussures', photo: PHOTO.backpack, store: 'demo-campus-mode', quantity: 7, condition: 'NEW' },
  { slug: 'lot-livres-scientifiques', title: 'Lot de livres scientifiques', description: 'Sélection de livres de démonstration pour les sciences et la technologie.', type: 'SECOND_HAND', price: 12000, category: 'livres-fournitures', photo: PHOTO.books, store: 'demo-librairie', quantity: 4, condition: 'GOOD' },
  { slug: 'montre-connectee', title: 'Montre connectée', description: 'Montre connectée de démonstration avec suivi quotidien.', type: 'PHYSICAL', price: 26000, category: 'telephones-accessoires', photo: PHOTO.watch, store: 'demo-mobile-shop', quantity: 4, condition: 'NEW' },
  { slug: 'appareil-photo-numerique', title: 'Appareil photo numérique', description: 'Appareil photo illustratif pour les projets et événements.', type: 'SECOND_HAND', price: 78000, category: 'informatique-electronique', photo: PHOTO.camera, store: 'demo-tech-campus', quantity: 1, condition: 'GOOD' },
  { slug: 'tablette-etudes', title: 'Tablette pour les études', description: 'Tablette de démonstration pour lecture, notes et visioconférence.', type: 'PHYSICAL', price: 89000, category: 'informatique-electronique', photo: PHOTO.tablet, store: 'demo-tech-campus', quantity: 3, condition: 'NEW' },
  { slug: 'chaise-bureau', title: 'Chaise de bureau', description: 'Chaise illustrative pour un espace de travail étudiant.', type: 'PHYSICAL', price: 42000, category: 'maison-decoration', photo: PHOTO.chair, store: 'demo-maison', quantity: 3, condition: 'NEW' },
  { slug: 'imprimante-compacte', title: 'Imprimante compacte', description: 'Imprimante de démonstration pour les documents et travaux.', type: 'PHYSICAL', price: 65000, category: 'informatique-electronique', photo: PHOTO.printer, store: 'demo-tech-campus', quantity: 2, condition: 'NEW' },
  { slug: 'produits-bien-etre', title: 'Coffret bien-être', description: 'Coffret illustratif de produits de soin et de bien-être.', type: 'PHYSICAL', price: 12500, category: 'beaute-soins', photo: PHOTO.skincare, store: 'demo-campus-mode', quantity: 6, condition: 'NEW' },
  { slug: 't-shirt-campus', title: 'T-shirt casual', description: 'Vêtement de démonstration, coupe quotidienne.', type: 'PHYSICAL', price: 8500, category: 'vetements-chaussures', photo: PHOTO.shirt, store: 'demo-campus-mode', quantity: 10, condition: 'NEW' },
  { slug: 'clavier-mecanique', title: 'Clavier mécanique', description: 'Clavier de démonstration pour travail et gaming.', type: 'PHYSICAL', price: 24000, category: 'informatique-electronique', photo: PHOTO.keyboard, store: 'demo-tech-campus', quantity: 4, condition: 'NEW' },
  { slug: 'souris-sans-fil', title: 'Souris sans fil', description: 'Souris de démonstration ergonomique.', type: 'PHYSICAL', price: 6500, category: 'informatique-electronique', photo: PHOTO.mouse, store: 'demo-tech-campus', quantity: 12, condition: 'NEW' },
  { slug: 'lampe-bureau', title: 'Lampe de bureau LED', description: 'Lampe de démonstration pour espace de lecture.', type: 'PHYSICAL', price: 9500, category: 'maison-decoration', photo: PHOTO.plant, store: 'demo-maison', quantity: 5, condition: 'NEW' },
  { slug: 'panier-repas', title: 'Panier repas étudiant', description: 'Exemple de panier repas. Produit fictif de démonstration, aucune commande réelle.', type: 'PHYSICAL', price: 3500, category: 'alimentation', photo: PHOTO.food, store: 'demo-librairie', quantity: 12, condition: 'NEW' },
  { slug: 'lot-cahiers', title: 'Lot de cahiers et fournitures', description: 'Lot de fournitures scolaires illustratif.', type: 'PHYSICAL', price: 4500, category: 'livres-fournitures', photo: PHOTO.books, store: 'demo-librairie', quantity: 15, condition: 'NEW' },
  { slug: 'bureau-etudiant', title: 'Bureau compact', description: 'Bureau de démonstration pour chambre ou espace de travail.', type: 'PHYSICAL', price: 55000, category: 'maison-decoration', photo: PHOTO.desk, store: 'demo-maison', quantity: 2, condition: 'NEW' },
  { slug: 'plante-decorative', title: 'Plante décorative', description: 'Plante illustrative pour décoration intérieure.', type: 'PHYSICAL', price: 7500, category: 'maison-decoration', photo: PHOTO.plant, store: 'demo-maison', quantity: 8, condition: 'NEW' },
  { slug: 'cours-mathematiques', title: 'Cours particuliers de mathématiques', description: 'Exemple de prestation : accompagnement en algèbre, analyse et préparation aux examens.', type: 'SERVICE', price: 5000, category: 'cours-particuliers-formations', photo: PHOTO.tutoring, store: 'demo-services', duration: 60 },
  { slug: 'cours-programmation', title: 'Initiation à la programmation', description: 'Exemple de prestation : bases de Python, algorithmique et projets encadrés.', type: 'SERVICE', price: 7500, category: 'cours-particuliers-formations', photo: PHOTO.laptop, store: 'demo-services', duration: 90 },
  { slug: 'creation-site-web', title: 'Création de site web', description: 'Exemple de prestation : conception de site vitrine et intégration responsive.', type: 'SERVICE', price: 75000, category: 'services-informatiques', photo: PHOTO.web, store: 'demo-services', duration: 1440 },
  { slug: 'design-graphique', title: 'Design graphique et affiches', description: 'Exemple de prestation : visuels pour associations, événements et projets étudiants.', type: 'SERVICE', price: 15000, category: 'services-informatiques', photo: PHOTO.design, store: 'demo-services', duration: 180 },
  { slug: 'retouche-photo', title: 'Retouche photo', description: 'Exemple de prestation : correction colorimétrique et retouche de portraits.', type: 'SERVICE', price: 5000, category: 'services-informatiques', photo: PHOTO.photo, store: 'demo-services', duration: 60 },
  { slug: 'impression-reliure', title: 'Impression et reliure', description: 'Exemple de prestation : impression de rapports, mémoires et supports de cours.', type: 'SERVICE', price: 2500, category: 'livres-fournitures', photo: PHOTO.print, store: 'demo-librairie', duration: 30 },
  { slug: 'reparation-ordinateur', title: 'Diagnostic et réparation ordinateur', description: 'Exemple de prestation : diagnostic logiciel et matériel, nettoyage et optimisation.', type: 'SERVICE', price: 10000, category: 'reparation-maintenance', photo: PHOTO.repair, store: 'demo-tech-campus', duration: 90 },
  { slug: 'installation-logiciels', title: 'Installation et configuration logicielle', description: 'Exemple de prestation : installation, paramétrage et assistance bureautique.', type: 'SERVICE', price: 5000, category: 'reparation-maintenance', photo: PHOTO.laptop, store: 'demo-tech-campus', duration: 45 },
  { slug: 'livraison-campus', title: 'Livraison sur le campus', description: 'Exemple de prestation : livraison locale et remise en main propre.', type: 'SERVICE', price: 1500, category: 'transport-livraison', photo: PHOTO.backpack, store: 'demo-services', duration: 30 },
  { slug: 'photographie-evenement', title: 'Photographie événementielle', description: 'Exemple de prestation : couverture photo de réunions et événements étudiants.', type: 'SERVICE', price: 25000, category: 'autres', photo: PHOTO.photo, store: 'demo-services', duration: 120 },
  { slug: 'coaching-sportif', title: 'Coaching sportif individuel', description: 'Exemple de prestation : séance d’initiation et accompagnement sportif.', type: 'SERVICE', price: 6000, category: 'autres', photo: PHOTO.fitness, store: 'demo-services', duration: 60 },
  { slug: 'assistance-informatique', title: 'Assistance informatique', description: 'Exemple de prestation : aide à la configuration et dépannage courant.', type: 'SERVICE', price: 4000, category: 'services-informatiques', photo: PHOTO.repair, store: 'demo-tech-campus', duration: 45 },
]

async function seedDemoMarketplace() {
  const categories = await prisma.category.findMany({ where: { isActive: true }, select: { id: true, slug: true } })
  const categoryIds = new Map(categories.map((category) => [category.slug, category.id]))
  const stores = new Map<string, string>()

  for (let index = 0; index < DEMO_STORES.length; index += 1) {
    const demo = DEMO_STORES[index]
    const email = `demo-vendor-${String(index + 1).padStart(2, '0')}@2ie-market.local`
    let user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      const location = await prisma.location.create({
        data: {
          site: demo.site,
          buildingNumber: demo.building,
          roomNumber: demo.room,
          floor: 0,
          reference: generateReference(demo.building, demo.room, 0),
        },
      })
      user = await prisma.user.create({
        data: {
          email,
          passwordHash: await hashPassword(randomBytes(32).toString('hex')),
          role: 'MERCHANT',
          firstName: demo.first,
          lastName: demo.last,
          phoneE164: '+22600000000',
          locationId: location.id,
        },
      })
    }

    let store = await prisma.store.findUnique({ where: { slug: demo.slug } })
    if (!store) {
      const location = await prisma.location.findUnique({ where: { id: user.locationId } })
      if (!location) throw new Error(`Emplacement manquant pour ${demo.slug}`)
      store = await prisma.store.create({
        data: {
          ownerId: user.id,
          name: demo.name,
          slug: demo.slug,
          description: demo.description,
          whatsappE164: '+22600000000',
          locationId: location.id,
          deliveryModes: ['HAND_DELIVERY', 'MEETUP_POINT'],
          isActive: true,
        },
      })
    } else if (!store.isActive) {
      await prisma.store.update({ where: { id: store.id }, data: { isActive: true } })
    }
    stores.set(demo.slug, store.id)
  }

  for (const demo of DEMO_LISTINGS) {
    const storeId = stores.get(demo.store)
    const categoryId = categoryIds.get(demo.category)
    if (!storeId || !categoryId) throw new Error(`Données de démonstration incomplètes : ${demo.slug}`)
    const now = new Date()
    const listing = await prisma.listing.upsert({
      where: { storeId_slug: { storeId, slug: demo.slug } },
      update: {
        availability: 'AVAILABLE',
        status: 'PUBLISHED',
        publishedAt: now,
        categoryId,
        isFeatured: Boolean(demo.featured),
      },
      create: {
        storeId,
        categoryId,
        type: demo.type,
        title: demo.title,
        slug: demo.slug,
        description: `${demo.description} Catalogue de démonstration 2IE Market.`,
        priceCents: demo.price * 100,
        currency: 'XOF',
        condition: demo.condition ?? null,
        availability: 'AVAILABLE',
        quantity: demo.quantity ?? null,
        durationMinutes: demo.duration ?? null,
        status: 'PUBLISHED',
        isFeatured: Boolean(demo.featured),
        publishedAt: now,
      },
    })
    const existingPhoto = await prisma.listingPhoto.findFirst({ where: { listingId: listing.id } })
    if (!existingPhoto) {
      await prisma.listingPhoto.create({
        data: {
          listingId: listing.id,
          url: demo.photo,
          thumbUrl: demo.photo,
          alt: `Photo illustrative — ${demo.title}`,
          position: 0,
        },
      })
    }
  }

  const restored = await prisma.listing.updateMany({
    where: { type: 'SERVICE', availability: { not: 'AVAILABLE' } },
    data: { availability: 'AVAILABLE' },
  })
  console.log(`${DEMO_LISTINGS.length} annonces de démonstration publiées avec photos ; ${restored.count} services remis en disponibilité.`)
}

async function seedAdminIfConfigured() {
  const configuredEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase()
  const password = process.env.ADMIN_PASSWORD
  if (!configuredEmail && !password) return
  if (!configuredEmail || !password) {
    throw new Error('ADMIN_EMAIL et ADMIN_PASSWORD doivent être définis ensemble.')
  }
  if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(configuredEmail)) {
    throw new Error('ADMIN_EMAIL doit être une adresse e-mail valide.')
  }
  if (password.length < 14) {
    throw new Error('ADMIN_PASSWORD doit contenir au moins 14 caractères.')
  }

  const firstName = process.env.ADMIN_FIRST_NAME ?? 'Admin'
  const lastName = process.env.ADMIN_LAST_NAME ?? '2IE Market'
  const existing = await prisma.user.findUnique({ where: { email: configuredEmail } })

  if (existing) {
    const passwordMatches = await verifyPassword(existing.passwordHash, password)
    if (existing.role === 'ADMIN' && existing.status === 'ACTIVE' && passwordMatches) {
      console.log(`Compte administrateur vérifié : ${configuredEmail}`)
      return
    }

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: existing.id },
        data: {
          role: 'ADMIN',
          status: 'ACTIVE',
          passwordHash: await hashPassword(password),
          firstName,
          lastName,
        },
      })
      await tx.refreshToken.updateMany({
        where: { userId: existing.id, revokedAt: null },
        data: { revokedAt: new Date() },
      })
      await tx.auditLog.create({
        data: {
          action: 'ADMIN_BOOTSTRAPPED',
          targetType: 'User',
          targetId: existing.id,
          meta: { email: configuredEmail, previousRole: existing.role },
        },
      })
    })
    console.log(`Compte administrateur sécurisé : ${configuredEmail}`)
    return
  }

  const reference = generateReference('A', '0', 0)
  const admin = await prisma.user.create({
    data: {
      email: configuredEmail,
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
  await prisma.auditLog.create({
    data: {
      action: 'ADMIN_BOOTSTRAPPED',
      targetType: 'User',
      targetId: admin.id,
      meta: { email: configuredEmail },
    },
  })
  console.log(`Compte administrateur créé : ${configuredEmail}`)
}

async function main() {
  await seedCategories()
  await seedMeetingPoints()
  await seedAdminIfConfigured()

  if (process.argv.includes('--reference-only')) {
    await seedDemoMarketplace()
  }
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
