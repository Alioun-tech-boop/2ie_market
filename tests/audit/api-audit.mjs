/**
 * Audit d'intégration réel de l'API 2ie Market.
 *
 * Prérequis :
 *   - PostgreSQL accessible et migrations appliquées ;
 *   - seed exécuté avec un compte administrateur ;
 *   - API démarrée avec AUDIT_API_URL (par défaut http://127.0.0.1:3100).
 *
 * Variables :
 *   AUDIT_API_URL, AUDIT_ADMIN_EMAIL, AUDIT_ADMIN_PASSWORD, AUDIT_STRICT=1
 *
 * Le script crée des comptes et des données de test uniques. Il ne doit jamais
 * être lancé contre une base de production.
 */
import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import { PrismaClient } from '@prisma/client'

const HERE = dirname(fileURLToPath(import.meta.url))
const BASE = (process.env.AUDIT_API_URL ?? 'http://127.0.0.1:3100').replace(/\/$/, '')
const ORIGIN = process.env.AUDIT_ORIGIN ?? 'http://localhost:5173'
const ADMIN_EMAIL = process.env.AUDIT_ADMIN_EMAIL ?? 'admin.audit@2ie.local'
const ADMIN_PASSWORD = process.env.AUDIT_ADMIN_PASSWORD ?? 'Audit-Admin-2026!Strong'
const RUN = Date.now().toString(36)
const PASSWORD = 'Audit-Password-2026!'
const results = []

class ApiClient {
  constructor(label) {
    this.label = label
    this.cookies = new Map()
  }

  async request(path, options = {}) {
    const {
      method = 'GET',
      body,
      form,
      headers = {},
      origin = ORIGIN,
    } = options
    const requestHeaders = new Headers(headers)
    if (origin !== null) requestHeaders.set('origin', origin)
    const cookie = [...this.cookies.entries()].map(([name, value]) => `${name}=${value}`).join('; ')
    if (cookie) requestHeaders.set('cookie', cookie)

    let payload
    if (form) {
      payload = form
    } else if (body !== undefined) {
      requestHeaders.set('content-type', 'application/json')
      payload = JSON.stringify(body)
    }

    const response = await fetch(`${BASE}${path}`, {
      method,
      headers: requestHeaders,
      body: payload,
      redirect: 'manual',
    })

    const setCookies = response.headers.getSetCookie?.() ?? []
    for (const setCookie of setCookies) {
      const [pair] = setCookie.split(';')
      const separator = pair.indexOf('=')
      if (separator < 0) continue
      const name = pair.slice(0, separator)
      const value = pair.slice(separator + 1)
      if (/max-age=0/i.test(setCookie)) this.cookies.delete(name)
      else this.cookies.set(name, value)
    }

    const text = await response.text()
    let data = text
    try {
      data = text ? JSON.parse(text) : null
    } catch {
      // Réponse non JSON conservée telle quelle.
    }
    return { status: response.status, data, headers: response.headers, setCookies, text }
  }

  get(path, options = {}) {
    return this.request(path, { ...options, method: 'GET' })
  }

  post(path, body, options = {}) {
    return this.request(path, { ...options, method: 'POST', body })
  }

  patch(path, body, options = {}) {
    return this.request(path, { ...options, method: 'PATCH', body })
  }

  delete(path, options = {}) {
    return this.request(path, { ...options, method: 'DELETE' })
  }
}

async function check(name, fn) {
  try {
    await fn()
    results.push({ name, status: 'PASS' })
    console.log(`PASS  ${name}`)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    results.push({ name, status: 'FAIL', error: message })
    console.log(`FAIL  ${name}\n      ${message.replace(/\n/g, '\n      ')}`)
  }
}

function expectStatus(response, expected, context = '') {
  assert.equal(
    response.status,
    expected,
    `${context}: statut ${expected} attendu, reçu ${response.status} — ${JSON.stringify(response.data)}`,
  )
}

function expectOk(response, context = '') {
  assert.ok(
    response.status >= 200 && response.status < 300,
    `${context}: succès attendu, reçu ${response.status} — ${JSON.stringify(response.data)}`,
  )
}

function formWithFields(fields, files = []) {
  const form = new FormData()
  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined && value !== null) form.append(key, String(value))
  }
  for (const file of files) {
    const blob = file.blob instanceof Blob
      ? file.blob
      : new Blob([file.blob], { type: file.type ?? 'image/png' })
    form.append('photos', blob, file.name)
  }
  return form
}

async function register(client, payload) {
  const response = await client.post('/v1/auth/register', payload)
  expectStatus(response, 201, `inscription ${payload.email}`)
  return response.data.user
}

async function login(client, email, password = PASSWORD) {
  const response = await client.post('/v1/auth/login', { email, password })
  expectStatus(response, 200, `connexion ${email}`)
  return response.data.user
}

async function createListing(client, { title, description, categoryId, type, priceCents, quantity, condition, durationMinutes, requirements, photos = [] }) {
  const fields = {
    title,
    description,
    categoryId,
    type,
    priceCents,
    availability: 'AVAILABLE',
    status: 'PUBLISHED',
    options: '[]',
  }
  if (quantity !== undefined) fields.quantity = quantity
  if (condition !== undefined) fields.condition = condition
  if (durationMinutes !== undefined) fields.durationMinutes = durationMinutes
  if (requirements !== undefined) fields.requirements = requirements
  const form = formWithFields(fields, photos.map((blob, index) => ({ blob, name: `audit-${index}.png` })))
  const response = await client.request('/v1/me/listings', { method: 'POST', form })
  expectStatus(response, 201, `création annonce ${title}`)
  return response.data.listing
}

const validPng = await sharp({
  create: { width: 160, height: 120, channels: 3, background: { r: 26, g: 67, b: 132 } },
})
  .png()
  .toBuffer()

const htmlBuffer = Buffer.from('<html><script>alert(1)</script></html>')
const svgBuffer = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>')

const admin = new ApiClient('admin')
const client = new ApiClient('client')
const merchant1 = new ApiClient('merchant1')
const merchant2 = new ApiClient('merchant2')

let adminUser
let clientUser
let merchant1User
let merchant2User
let categoryId
let product1
let product2
let service1
let orderGroup
let merchant1Order
let merchant2Order
let secondAdminId

await check('Santé de l’API', async () => {
  const response = await admin.get('/health')
  expectStatus(response, 200, 'health')
  assert.equal(response.data.status, 'ok')
})

await check('Préparation d’un second administrateur (fixture base)', async () => {
  assert.ok(process.env.DATABASE_URL, 'DATABASE_URL requis pour la fixture du second administrateur')
  const prisma = new PrismaClient()
  try {
    const location = await prisma.location.create({
      data: {
        site: 'OUAGA',
        buildingNumber: 'Z',
        roomNumber: '999',
        floor: 9,
        reference: `BZ.999 R9 ${RUN}`.slice(0, 32),
      },
    })
    const user = await prisma.user.create({
      data: {
        email: `admin2.${RUN}@audit.local`,
        passwordHash: 'fixture-not-a-real-hash',
        role: 'ADMIN',
        firstName: 'Second',
        lastName: 'Admin',
        phoneE164: '+22670000008',
        locationId: location.id,
      },
    })
    secondAdminId = user.id
  } finally {
    await prisma.$disconnect()
  }
})

await check('Accès admin sans session refusé (401)', async () => {
  const anonymous = new ApiClient('anonymous')
  const response = await anonymous.get('/v1/admin/overview')
  expectStatus(response, 401, 'admin sans session')
})

await check('Inscription client réelle', async () => {
  clientUser = await register(client, {
    role: 'CLIENT',
    firstName: 'Client',
    lastName: `Audit${RUN}`,
    email: `client.${RUN}@audit.local`,
    password: PASSWORD,
    phone: '+22670000001',
    site: 'KAMBOINSIN',
    buildingNumber: 'B1',
    roomNumber: '101',
    floor: 0,
  })
  assert.equal(clientUser.role, 'CLIENT')
  assert.equal(clientUser.status, 'ACTIVE')
})

await check('Inscription commerçant 1 avec boutique', async () => {
  merchant1User = await register(merchant1, {
    role: 'MERCHANT',
    firstName: 'Marchand',
    lastName: `Un${RUN}`,
    email: `merchant1.${RUN}@audit.local`,
    password: PASSWORD,
    phone: '+22670000002',
    site: 'KAMBOINSIN',
    buildingNumber: 'B2',
    roomNumber: '202',
    floor: 1,
    storeName: `Boutique Audit 1 ${RUN}`,
    description: 'Boutique de test créée pour l’audit complet de la marketplace 2ie Market.',
    whatsapp: '+22670000002',
  })
  assert.equal(merchant1User.role, 'MERCHANT')
  assert.ok(merchant1User.store?.id, 'boutique attendue')
})

await check('Inscription commerçant 2 avec boutique', async () => {
  merchant2User = await register(merchant2, {
    role: 'MERCHANT',
    firstName: 'Marchand',
    lastName: `Deux${RUN}`,
    email: `merchant2.${RUN}@audit.local`,
    password: PASSWORD,
    phone: '+22670000003',
    site: 'OUAGA',
    buildingNumber: 'C3',
    roomNumber: '303',
    floor: 2,
    storeName: `Boutique Audit 2 ${RUN}`,
    description: 'Seconde boutique de test pour vérifier la répartition multi-commerçants.',
    whatsapp: '+22670000003',
  })
  assert.equal(merchant2User.role, 'MERCHANT')
  assert.ok(merchant2User.store?.id, 'boutique attendue')
})

await check('Connexion administrateur et cookies de session', async () => {
  adminUser = await login(admin, ADMIN_EMAIL, ADMIN_PASSWORD)
  assert.equal(adminUser.role, 'ADMIN')
  const lastLogin = await admin.post('/v1/auth/login', { email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
  expectStatus(lastLogin, 200, 'seconde connexion admin pour inspecter les cookies')
  const cookies = lastLogin.setCookies.join('\n')
  assert.match(cookies, /access_token=/)
  assert.match(cookies, /refresh_token=/)
  assert.match(cookies, /HttpOnly/i)
  assert.match(cookies, /SameSite=Lax/i)
})

await check('Session courante et déconnexion', async () => {
  const session = await merchant1.get('/v1/auth/session')
  expectStatus(session, 200, 'session')
  assert.equal(session.data.user?.id, merchant1User.id)
  const logout = await merchant1.post('/v1/auth/logout')
  expectStatus(logout, 200, 'déconnexion')
  const afterLogout = await merchant1.get('/v1/auth/me')
  expectStatus(afterLogout, 401, 'me après déconnexion')
  merchant1User = await login(merchant1, `merchant1.${RUN}@audit.local`)
})

await check('Modification du profil', async () => {
  const response = await client.patch('/v1/me', { firstName: 'ClientModifié', lastName: 'Audit' })
  expectStatus(response, 200, 'modification profil')
  assert.equal(response.data.user.firstName, 'ClientModifié')
})

await check('Enregistrement de la localisation', async () => {
  const response = await client.patch('/v1/me/location', {
    site: 'OUAGA',
    buildingNumber: 'D4',
    roomNumber: '404',
    floor: 3,
  })
  expectStatus(response, 200, 'localisation')
  assert.equal(response.data.user.location.reference, 'BD4.404 R3')
})

await check('Modification de la boutique', async () => {
  const response = await merchant1.patch('/v1/me/store', {
    name: `Boutique Audit 1 modifiée ${RUN}`,
    description: 'Description mise à jour pour vérifier la modification de la boutique marchande.',
    whatsapp: '+22670000012',
    deliveryModes: ['HAND_DELIVERY', 'MEETUP_POINT'],
  })
  expectStatus(response, 200, 'modification boutique')
  assert.equal(response.data.user.store.whatsapp, '+22670000012')
})

await check('Chargement des catégories publiques', async () => {
  const response = await client.get('/v1/categories')
  expectStatus(response, 200, 'catégories')
  assert.ok(Array.isArray(response.data.categories) && response.data.categories.length > 0)
  categoryId = response.data.categories[0].id
})

await check('Publication d’un produit avec image réelle', async () => {
  product1 = await createListing(merchant1, {
    title: `Produit audit ${RUN}`,
    description: 'Produit neuf publié automatiquement pour les tests fonctionnels et de sécurité.',
    categoryId,
    type: 'PHYSICAL',
    priceCents: 150000,
    quantity: 3,
    condition: 'NEW',
    photos: [validPng],
  })
  assert.equal(product1.status, 'PUBLISHED')
  assert.equal(product1.priceCents, 150000)
  assert.ok(product1.photos[0]?.url.endsWith('.webp'), 'image normalisée en WebP attendue')
})

await check('Publication d’un service', async () => {
  service1 = await createListing(merchant1, {
    title: `Service audit ${RUN}`,
    description: 'Prestation de test avec durée et conditions de réalisation obligatoires.',
    categoryId,
    type: 'SERVICE',
    priceCents: 500000,
    durationMinutes: 90,
    requirements: 'Disponible au campus de Kamboinsin.',
  })
  assert.equal(service1.type, 'SERVICE')
  assert.equal(service1.durationMinutes, 90)
})

await check('Publication du produit du second commerçant', async () => {
  product2 = await createListing(merchant2, {
    title: `Produit multi-boutique ${RUN}`,
    description: 'Produit du second commerçant pour vérifier la répartition des commandes.',
    categoryId,
    type: 'PHYSICAL',
    priceCents: 200000,
    quantity: 2,
    condition: 'LIKE_NEW',
  })
  assert.equal(product2.priceCents, 200000)
})

await check('Recherche par mot-clé', async () => {
  const response = await client.get(`/v1/listings?q=${encodeURIComponent(`Produit audit ${RUN}`)}&limit=24`)
  expectStatus(response, 200, 'recherche')
  assert.ok(response.data.listings.some((listing) => listing.id === product1.id))
})

await check('Recherche par site et filtre de prix', async () => {
  const response = await client.get('/v1/listings?site=KAMBOINSIN&minPriceCents=100000&maxPriceCents=200000&limit=24')
  expectStatus(response, 200, 'recherche filtrée')
  assert.ok(response.data.listings.some((listing) => listing.id === product1.id))
  assert.ok(response.data.listings.every((listing) => listing.store.site === 'KAMBOINSIN'))
})

await check('Détail public d’une annonce', async () => {
  const response = await client.get(`/v1/listings/${product1.id}`)
  expectStatus(response, 200, 'détail annonce')
  assert.equal(response.data.listing.id, product1.id)
  assert.equal(response.data.listing.store.whatsapp, '+22670000012')
  assert.equal(response.data.listing.store.site, 'KAMBOINSIN')
  assert.equal(response.data.listing.quantity, 3)
})

await check('Ajout au panier multi-boutiques', async () => {
  const first = await client.post('/v1/cart/items', { listingId: product1.id, quantity: 2 })
  expectStatus(first, 200, 'ajout produit 1')
  const second = await client.post('/v1/cart/items', { listingId: product2.id, quantity: 1 })
  expectStatus(second, 200, 'ajout produit 2')
  assert.equal(second.data.cart.groups.length, 2)
  assert.equal(second.data.cart.itemCount, 3)
  assert.equal(second.data.cart.totalCents, 500000)
})

await check('Note de panier par boutique', async () => {
  const response = await client.patch('/v1/cart/notes', {
    storeId: merchant1User.store.id,
    note: 'Merci de préparer le produit avant 18h.',
  })
  expectStatus(response, 200, 'note panier')
  assert.equal(response.data.cart.groups.find((group) => group.store.id === merchant1User.store.id)?.note, 'Merci de préparer le produit avant 18h.')
})

await check('Commande et répartition multi-commerçants', async () => {
  const response = await client.post('/v1/orders', {
    clientName: 'ClientModifié Audit',
    clientPhone: '+22670000001',
    site: 'OUAGA',
    buildingNumber: 'D4',
    roomNumber: '404',
    floor: 3,
    deliveryMode: 'HAND_DELIVERY',
  })
  expectStatus(response, 200, 'commande')
  orderGroup = response.data.group
  assert.equal(orderGroup.orders.length, 2, 'deux sous-commandes attendues')
  assert.equal(orderGroup.totalCents, 500000)
  assert.equal(orderGroup.orders.reduce((sum, order) => sum + order.totalCents, 0), 500000)
  merchant1Order = orderGroup.orders.find((order) => order.merchant.id === merchant1User.store.id)
  merchant2Order = orderGroup.orders.find((order) => order.merchant.id === merchant2User.store.id)
  assert.ok(merchant1Order && merchant2Order)
  assert.equal(merchant1Order.items[0].unitPriceCents, 150000)
  assert.equal(merchant2Order.items[0].unitPriceCents, 200000)
})

await check('Stock décrémenté après commande', async () => {
  const first = await client.get(`/v1/listings/${product1.id}`)
  const second = await client.get(`/v1/listings/${product2.id}`)
  assert.equal(first.data.listing.quantity, 1)
  assert.equal(second.data.listing.quantity, 1)
})

await check('Panier vidé après commande', async () => {
  const response = await client.get('/v1/cart')
  expectStatus(response, 200, 'panier après commande')
  assert.equal(response.data.cart.itemCount, 0)
})

await check('Notifications client et commerçants', async () => {
  const clientNotifications = await client.get('/v1/notifications')
  expectStatus(clientNotifications, 200, 'notifications client')
  assert.ok(clientNotifications.data.notifications.some((item) => item.type === 'ORDER_PLACED'))
  const merchantNotifications = await merchant1.get('/v1/notifications')
  expectStatus(merchantNotifications, 200, 'notifications commerçant')
  assert.ok(merchantNotifications.data.notifications.some((item) => item.type === 'NEW_ORDER'))
})

await check('Tableau de bord marchand et commande visible', async () => {
  const response = await merchant1.get('/v1/me/dashboard')
  expectStatus(response, 200, 'dashboard marchand')
  assert.ok(response.data.orders.some((order) => order.id === merchant1Order.id))
  assert.equal(response.data.stats.pendingOrders, 1)
})

await check('Consultation de la commande par le client', async () => {
  const response = await client.get(`/v1/orders/${encodeURIComponent(orderGroup.reference)}`)
  expectStatus(response, 200, 'détail commande client')
  assert.equal(response.data.group.reference, orderGroup.reference)
  assert.equal(response.data.group.orders.length, 2)
})

await check('Modification du statut de commande par le commerçant', async () => {
  const steps = ['CONFIRMED', 'PREPARING', 'READY', 'COMPLETED']
  for (const status of steps) {
    const response = await merchant1.patch(`/v1/me/orders/${merchant1Order.id}/status`, { status })
    expectStatus(response, 200, `transition ${status}`)
    assert.equal(response.data.order.status, status)
  }
  const group = await client.get(`/v1/orders/${encodeURIComponent(orderGroup.reference)}`)
  expectStatus(group, 200, 'commande après transitions')
  const updated = group.data.group.orders.find((order) => order.id === merchant1Order.id)
  assert.equal(updated.status, 'COMPLETED')
})

await check('Notification de changement de statut', async () => {
  const response = await client.get('/v1/notifications')
  expectStatus(response, 200, 'notifications statut')
  assert.ok(response.data.notifications.some((item) => item.type === 'ORDER_STATUS'))
})

await check('Annulation d’une commande et restauration du stock', async () => {
  const stockListing = await createListing(merchant2, {
    title: `Stock remboursé ${RUN}`,
    description: 'Annonce dédiée au contrôle de la restauration du stock après refus.',
    categoryId,
    type: 'PHYSICAL',
    priceCents: 100000,
    quantity: 2,
    condition: 'GOOD',
  })
  const add = await client.post('/v1/cart/items', { listingId: stockListing.id, quantity: 1 })
  expectStatus(add, 200, 'ajout stock')
  const order = await client.post('/v1/orders', {
    clientName: 'ClientModifié Audit',
    clientPhone: '+22670000001',
    site: 'OUAGA',
    buildingNumber: 'D4',
    roomNumber: '404',
    floor: 3,
    deliveryMode: 'HAND_DELIVERY',
  })
  expectStatus(order, 200, 'commande stock')
  const subOrder = order.data.group.orders[0]
  const cancel = await merchant2.patch(`/v1/me/orders/${subOrder.id}/status`, { status: 'CANCELLED' })
  expectStatus(cancel, 200, 'annulation commande stock')
  const after = await client.get(`/v1/listings/${stockListing.id}`)
  assert.equal(after.data.listing.quantity, 2, 'stock restauré attendu après refus')
  assert.equal(after.data.listing.availability, 'AVAILABLE')
})

await check('Un client ne peut pas publier une annonce (403)', async () => {
  const response = await client.post('/v1/me/listings', {})
  expectStatus(response, 403, 'publication client')
})

await check('Un commerçant ne peut pas modifier l’annonce d’un autre (404)', async () => {
  const response = await merchant1.patch(`/v1/me/listings/${product2.id}`, { title: 'Tentative de modification' })
  expectStatus(response, 404, 'modification annonce tierce')
})

await check('Un commerçant ne peut pas modifier la commande d’un autre (404)', async () => {
  const response = await merchant1.patch(`/v1/me/orders/${merchant2Order.id}/status`, { status: 'CONFIRMED' })
  expectStatus(response, 404, 'modification commande tierce')
})

await check('Un utilisateur ne peut pas lire la commande d’un autre (404)', async () => {
  const response = await admin.get(`/v1/orders/${encodeURIComponent(orderGroup.reference)}`)
  expectStatus(response, 404, 'commande d’un autre utilisateur')
})

await check('Escalade de privilèges par le profil refusée (400)', async () => {
  const response = await client.patch('/v1/me', { role: 'ADMIN' })
  expectStatus(response, 400, 'escalade profil')
})

await check('Inscription avec rôle ADMIN refusée (400)', async () => {
  const response = await new ApiClient('role-test').post('/v1/auth/register', {
    role: 'ADMIN',
    firstName: 'Test',
    lastName: 'Role',
    email: `role.${RUN}@audit.local`,
    password: PASSWORD,
    phone: '+22670000009',
    site: 'OUAGA',
    buildingNumber: 'E5',
    roomNumber: '505',
    floor: 1,
  })
  expectStatus(response, 400, 'inscription admin')
})

await check('Auto-modification du rôle admin refusée (400)', async () => {
  const response = await admin.patch(`/v1/admin/users/${adminUser.id}/role`, { role: 'CLIENT' })
  expectStatus(response, 400, 'auto rôle admin')
})

await check('Auto-suspension administrateur refusée (400)', async () => {
  const response = await admin.patch(`/v1/admin/users/${adminUser.id}/status`, { status: 'SUSPENDED' })
  expectStatus(response, 400, 'auto suspension admin')
})

await check('Suspension d’un autre administrateur protégée (400)', async () => {
  assert.ok(secondAdminId, 'second administrateur fixture absent')
  const response = await admin.patch(`/v1/admin/users/${secondAdminId}/status`, { status: 'SUSPENDED' })
  expectStatus(response, 403, 'suspension autre admin')
})

await check('Modification du rôle d’un autre administrateur protégée (403)', async () => {
  assert.ok(secondAdminId, 'second administrateur fixture absent')
  const response = await admin.patch(`/v1/admin/users/${secondAdminId}/role`, { role: 'CLIENT' })
  expectStatus(response, 403, 'rôle autre admin')
})

await check('Contrôle admin interdit à un client (403)', async () => {
  const response = await client.get('/v1/admin/users')
  expectStatus(response, 403, 'admin avec rôle client')
})

await check('Suspension et réactivation d’un client', async () => {
  const suspend = await admin.patch(`/v1/admin/users/${clientUser.id}/status`, { status: 'SUSPENDED' })
  expectStatus(suspend, 200, 'suspension client')
  const blocked = await client.get('/v1/auth/me')
  expectStatus(blocked, 403, 'session client suspendu')
  const loginBlocked = await new ApiClient('suspended').post('/v1/auth/login', {
    email: `client.${RUN}@audit.local`,
    password: PASSWORD,
  })
  expectStatus(loginBlocked, 403, 'connexion client suspendu')
  const reactivate = await admin.patch(`/v1/admin/users/${clientUser.id}/status`, { status: 'ACTIVE' })
  expectStatus(reactivate, 200, 'réactivation client')
  clientUser = await login(client, `client.${RUN}@audit.local`)
})

await check('Suspension d’un commerçant : boutique et annonces masquées', async () => {
  const suspend = await admin.patch(`/v1/admin/users/${merchant2User.id}/status`, { status: 'SUSPENDED' })
  expectStatus(suspend, 200, 'suspension commerçant')
  const store = await client.get(`/v1/stores/${merchant2User.store.slug}`)
  expectStatus(store, 404, 'boutique suspendue')
  const search = await client.get(`/v1/listings?q=${encodeURIComponent(`Produit multi-boutique ${RUN}`)}&limit=24`)
  expectStatus(search, 200, 'recherche boutique suspendue')
  assert.ok(!search.data.listings.some((listing) => listing.id === product2.id), 'annonce suspendue encore visible')
  const reactivate = await admin.patch(`/v1/admin/users/${merchant2User.id}/status`, { status: 'ACTIVE' })
  expectStatus(reactivate, 200, 'réactivation commerçant')
})

await check('Signalement d’une annonce et traitement admin', async () => {
  const report = await client.post(`/v1/listings/${product1.id}/reports`, {
    reason: 'MISLEADING',
    details: 'Signalement automatique de test.',
  })
  expectStatus(report, 201, 'création signalement')
  const duplicate = await client.post(`/v1/listings/${product1.id}/reports`, {
    reason: 'FRAUD',
  })
  expectStatus(duplicate, 409, 'signalement en double')
  const list = await admin.get('/v1/admin/reports?status=OPEN&limit=100')
  expectStatus(list, 200, 'liste signalements')
  const created = list.data.reports.find((item) => item.id === report.data.reportId)
  assert.ok(created, 'signalement absent de la liste admin')
  assert.equal(created.reporter.id, clientUser.id)
  assert.equal(created.reporter.email, undefined, 'e-mail du signaleur exposé')
  const resolved = await admin.patch(`/v1/admin/reports/${created.id}`, {
    status: 'RESOLVED',
    resolutionNote: 'Vérifié par l’audit.',
  })
  expectStatus(resolved, 200, 'résolution signalement')
  assert.equal(resolved.data.report.status, 'RESOLVED')
})

await check('Masquage, restauration et archivage d’une annonce', async () => {
  const hide = await admin.patch(`/v1/admin/listings/${product1.id}/moderation`, { action: 'HIDE' })
  expectStatus(hide, 200, 'masquage')
  const hidden = await client.get(`/v1/listings/${product1.id}`)
  expectStatus(hidden, 404, 'annonce masquée')
  const restore = await admin.patch(`/v1/admin/listings/${product1.id}/moderation`, { action: 'RESTORE' })
  expectStatus(restore, 200, 'restauration')
  const visible = await client.get(`/v1/listings/${product1.id}`)
  expectStatus(visible, 200, 'annonce restaurée')
  const archive = await admin.patch(`/v1/admin/listings/${product1.id}/moderation`, { action: 'DELETE' })
  expectStatus(archive, 200, 'archivage')
  const archived = await client.get(`/v1/listings/${product1.id}`)
  expectStatus(archived, 404, 'annonce archivée')
})

await check('Mise en avant d’une annonce et tri public', async () => {
  const featuredListing = await createListing(merchant1, {
    title: `Annonce mise en avant ${RUN}`,
    description: 'Annonce utilisée pour vérifier le badge et le tri prioritaire de la mise en avant.',
    categoryId,
    type: 'PHYSICAL',
    priceCents: 90000,
    quantity: 1,
    condition: 'NEW',
  })
  const feature = await admin.patch(`/v1/admin/listings/${featuredListing.id}/featured`, { featured: true })
  expectStatus(feature, 200, 'mise en avant')
  const search = await client.get('/v1/listings?sort=recent&limit=24')
  expectStatus(search, 200, 'recherche mise en avant')
  assert.equal(search.data.listings[0]?.id, featuredListing.id, 'annonce mise en avant non prioritaire')
  assert.equal(search.data.listings[0]?.isFeatured, true)
  const unfeature = await admin.patch(`/v1/admin/listings/${featuredListing.id}/featured`, { featured: false })
  expectStatus(unfeature, 200, 'retrait mise en avant')
})

await check('Création, modification et archivage d’une catégorie', async () => {
  const created = await admin.post('/v1/admin/categories', {
    name: `Catégorie audit ${RUN}`,
    slug: `categorie-audit-${RUN}`,
    position: 90,
    isActive: true,
  })
  expectOk(created, 'création catégorie')
  assert.ok(created.data.category?.id)
  const id = created.data.category.id
  const updated = await admin.patch(`/v1/admin/categories/${id}`, { name: `Catégorie audit modifiée ${RUN}` })
  expectStatus(updated, 200, 'modification catégorie')
  assert.equal(updated.data.category.name, `Catégorie audit modifiée ${RUN}`)
  const archived = await admin.delete(`/v1/admin/categories/${id}`)
  expectStatus(archived, 200, 'archivage catégorie')
  const publicCategories = await client.get('/v1/categories')
  assert.ok(!publicCategories.data.categories.some((category) => category.id === id), 'catégorie archivée encore publique')
})

await check('Modification d’une annonce dont la catégorie a été archivée', async () => {
  const category = await admin.post('/v1/admin/categories', {
    name: `Catégorie éphémère ${RUN}`,
    slug: `categorie-ephemere-${RUN}`,
    position: 91,
    isActive: true,
  })
  expectOk(category, 'création catégorie éphémère')
  assert.ok(category.data.category?.id)
  const categoryId2 = category.data.category.id
  const listing = await createListing(merchant1, {
    title: `Annonce catégorie archivée ${RUN}`,
    description: 'Annonce conservée après archivage de sa catégorie pour tester la modification.',
    categoryId: categoryId2,
    type: 'PHYSICAL',
    priceCents: 120000,
    quantity: 1,
    condition: 'GOOD',
  })
  const archive = await admin.delete(`/v1/admin/categories/${categoryId2}`)
  expectStatus(archive, 200, 'archivage catégorie éphémère')
  const update = await merchant1.patch(`/v1/me/listings/${listing.id}`, {
    title: `Annonce catégorie archivée modifiée ${RUN}`,
    categoryId: categoryId2,
  })
  expectStatus(update, 200, 'modification annonce catégorie archivée')
  assert.equal(update.data.listing.title, `Annonce catégorie archivée modifiée ${RUN}`)
})

await check('Upload du logo marchand avec le formulaire réel', async () => {
  const before = await merchant1.get('/v1/auth/me')
  expectStatus(before, 200, 'profil avant logo')
  const form = new FormData()
  // Ordre reproduisant le client web : fichier puis champ kind.
  form.append('file', new Blob([validPng], { type: 'image/png' }), 'logo.png')
  form.append('kind', 'logo')
  const upload = await merchant1.request('/v1/me/photo', { method: 'POST', form })
  expectStatus(upload, 200, 'upload logo')
  const after = await merchant1.get('/v1/auth/me')
  expectStatus(after, 200, 'profil après logo')
  assert.ok(after.data.user.store.logoUrl, 'logo de boutique non enregistré')
  assert.ok(after.data.user.store.logoUrl.endsWith('.webp'))
})

await check('Upload d’un SVG refusé (415)', async () => {
  const form = new FormData()
  form.append('photos', new Blob([svgBuffer], { type: 'image/svg+xml' }), 'danger.svg')
  const response = await merchant1.request(`/v1/me/listings/${service1.id}/photos`, { method: 'POST', form })
  expectStatus(response, 415, 'upload SVG')
})

await check('Fichier HTML déguisé en PNG refusé (415)', async () => {
  const form = new FormData()
  form.append('photos', new Blob([htmlBuffer], { type: 'image/png' }), 'danger.png')
  const response = await merchant1.request(`/v1/me/listings/${service1.id}/photos`, { method: 'POST', form })
  expectStatus(response, 415, 'upload HTML déguisé')
})

await check('Image de plus de 2 Mo refusée (413)', async () => {
  const form = new FormData()
  form.append('photos', new Blob([Buffer.alloc(2 * 1024 * 1024 + 128)], { type: 'image/png' }), 'large.png')
  const response = await merchant1.request(`/v1/me/listings/${service1.id}/photos`, { method: 'POST', form })
  expectStatus(response, 413, 'upload volumineux')
})

await check('Validation des prix et des catégories (400)', async () => {
  const negativeForm = formWithFields({
    title: 'Prix négatif',
    description: 'Tentative de prix négatif pour vérifier la validation serveur.',
    categoryId,
    type: 'PHYSICAL',
    priceCents: -1,
    quantity: 1,
    condition: 'NEW',
    availability: 'AVAILABLE',
    status: 'PUBLISHED',
    options: '[]',
  })
  const negative = await merchant1.request('/v1/me/listings', {
    method: 'POST',
    form: negativeForm,
  })
  expectStatus(negative, 400, 'prix négatif')
  const invalidCategoryForm = formWithFields({
    title: `Catégorie invalide ${RUN}`,
    description: 'Tentative de publication avec une catégorie inexistante.',
    categoryId: '00000000-0000-4000-8000-000000000000',
    type: 'PHYSICAL',
    priceCents: 1000,
    quantity: 1,
    condition: 'NEW',
    availability: 'AVAILABLE',
    status: 'PUBLISHED',
    options: '[]',
  })
  const invalidCategory = await merchant1.request('/v1/me/listings', {
    method: 'POST',
    form: invalidCategoryForm,
  })
  expectStatus(invalidCategory, 400, 'catégorie inexistante')
})

await check('Protection CSRF par origine (403)', async () => {
  const response = await client.post(
    '/v1/cart/items',
    { listingId: product2.id, quantity: 1 },
    { origin: 'https://evil.example' },
  )
  expectStatus(response, 403, 'origine externe')
})

await check('Injection SQL dans la recherche et la connexion', async () => {
  const search = await client.get(`/v1/listings?q=${encodeURIComponent("' OR 1=1 --")}&limit=24`)
  expectStatus(search, 200, 'recherche injection')
  assert.ok(Array.isArray(search.data.listings))
  const loginAttempt = await new ApiClient('sqli').post('/v1/auth/login', {
    email: `client.${RUN}@audit.local`,
    password: "' OR 1=1 --",
  })
  expectStatus(loginAttempt, 401, 'connexion injection')
  const invalidEmail = await new ApiClient('sqli-email').post('/v1/auth/login', {
    email: "' OR 1=1 --",
    password: 'x',
  })
  expectStatus(invalidEmail, 400, 'validation e-mail injection')
})

await check('Données personnelles absentes des DTO admin commandes', async () => {
  const response = await admin.get('/v1/admin/orders?limit=100')
  expectStatus(response, 200, 'commandes admin')
  const group = response.data.groups.find((item) => item.reference === orderGroup.reference)
  assert.ok(group, 'commande absente de l’admin')
  const serialized = JSON.stringify(group)
  for (const forbidden of ['clientPhone', 'snapshotClientPhone', 'buildingNumber', 'roomNumber', 'floor']) {
    assert.ok(!serialized.includes(forbidden), `champ sensible exposé: ${forbidden}`)
  }
})

await check('Données personnelles absentes des DTO admin utilisateurs', async () => {
  const response = await admin.get(`/v1/admin/users/${clientUser.id}`)
  expectStatus(response, 200, 'détail utilisateur admin')
  const serialized = JSON.stringify(response.data.user)
  for (const forbidden of ['buildingNumber', 'roomNumber', 'floor', 'passwordHash']) {
    assert.ok(!serialized.includes(forbidden), `champ sensible exposé: ${forbidden}`)
  }
})

await check('Journal d’audit alimenté par les actions admin', async () => {
  const response = await admin.get('/v1/admin/audit?limit=100')
  expectStatus(response, 200, 'journal audit')
  const actions = response.data.entries.map((entry) => entry.action)
  for (const action of ['USER_SUSPENDED', 'USER_ACTIVATED', 'LISTING_HIDDEN', 'REPORT_RESOLVED', 'CATEGORY_CREATED']) {
    assert.ok(actions.includes(action), `action absente du journal: ${action}`)
  }
})

await check('Paramètres plateforme réellement appliqués', async () => {
  const name = `2ie Market Audit ${RUN}`
  const update = await admin.patch('/v1/admin/settings', {
    platformName: name,
    supportEmail: 'support.audit@2ie.local',
    maintenanceMessage: 'Maintenance de test.',
    reviewsEnabled: false,
  })
  expectStatus(update, 200, 'mise à jour paramètres')
  const platform = await client.get('/v1/platform')
  expectStatus(platform, 200, 'plateforme publique')
  assert.equal(platform.data.platform.name, name)
  assert.equal(platform.data.platform.reviewsEnabled, false)
  const reviews = await client.get(`/v1/stores/${merchant1User.store.slug}/reviews`)
  expectStatus(reviews, 200, 'avis désactivés')
  assert.equal(reviews.data.enabled, false)
  const restore = await admin.patch('/v1/admin/settings', {
    platformName: '2ie Market',
    supportEmail: null,
    maintenanceMessage: null,
    reviewsEnabled: true,
  })
  expectStatus(restore, 200, 'restauration paramètres')
})

await check('Limitation des tentatives de connexion', async () => {
  const statuses = []
  for (let index = 0; index < 12; index += 1) {
    const response = await new ApiClient(`rate-${index}`).post(
      '/v1/auth/login',
      { email: `absent.${RUN}@audit.local`, password: 'Wrong-Password-1' },
      { headers: { 'x-forwarded-for': `203.0.113.${index + 1}` } },
    )
    statuses.push(response.status)
  }
  assert.ok(statuses.includes(429), `aucune limitation détectée: ${statuses.join(',')}`)
})

const summary = {
  run: RUN,
  api: BASE,
  startedAt: new Date().toISOString(),
  total: results.length,
  passed: results.filter((item) => item.status === 'PASS').length,
  failed: results.filter((item) => item.status === 'FAIL').length,
  results,
}

await mkdir(HERE, { recursive: true })
await writeFile(join(HERE, 'last-run.json'), `${JSON.stringify(summary, null, 2)}\n`, 'utf8')
console.log(`\n${summary.passed}/${summary.total} tests réussis, ${summary.failed} échec(s).`)
console.log(`Résultats détaillés : ${join(HERE, 'last-run.json')}`)

if (process.env.AUDIT_STRICT === '1' && summary.failed > 0) process.exitCode = 1
