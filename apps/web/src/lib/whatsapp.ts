import { formatPrice, siteLabel } from './format'
import type { Listing, MerchantOrder, PublicStore } from './market'
import type { OrderDto, OrderGroupDto } from './orders'

/** Messages préremplis uniquement : aucun envoi automatique sans API officielle. */
export function listingWhatsappMessage(
  listing: Pick<Listing, 'title' | 'priceCents' | 'reference'>,
  storeName?: string,
): string {
  return [
    `Bonjour${storeName ? ` ${storeName}` : ''}, je souhaite me renseigner sur « ${listing.title} » (${listing.reference}) affiché à ${formatPrice(listing.priceCents)}.`,
    'Est-il toujours disponible ? Pouvez-vous me préciser les modalités de remise ?',
  ].join('\n')
}

export function storeWhatsappMessage(store: Pick<PublicStore, 'name'>): string {
  return `Bonjour ${store.name}, je découvre votre boutique sur 2ie Market. Quels articles et services sont actuellement disponibles ?`
}

export function merchantOrderWhatsappMessage(order: MerchantOrder): string {
  const lines = [
    `Bonjour ${order.client.name}, concernant la commande ${order.orderNumber}${order.groupReference ? ` (réf. ${order.groupReference})` : ''} :`,
    ...order.items.map(
      (item) => `- ${item.quantity} × ${item.title} — ${formatPrice(item.lineTotalCents)}`,
    ),
    `Total : ${formatPrice(order.totalCents)}`,
    `Localisation : ${order.client.locationRef || `${siteLabel(order.client.site)}, bât. ${order.client.buildingNumber ?? '—'}, chambre ${order.client.roomNumber ?? '—'}, étage ${order.client.floor ?? '—'}`}.`,
  ]
  if (order.clientNote) lines.push(`Vos instructions : ${order.clientNote}`)
  lines.push('Pouvez-vous me confirmer la prise en charge et le point de remise ?')
  return lines.join('\n')
}

export function orderWhatsappMessage(order: OrderDto): string {
  const lines = [
    `Bonjour ${order.merchant.name}, je vous contacte au sujet de ma commande ${order.orderNumber} (référence globale : ${order.groupReference}).`,
    'Récapitulatif :',
    ...order.items.map(
      (item) =>
        `- ${item.quantity} × ${item.title} — ${formatPrice(item.unitPriceCents)} l’unité, soit ${formatPrice(item.lineTotalCents)}`,
    ),
    `Total : ${formatPrice(order.totalCents)}`,
    `Ma localisation : ${order.client.locationRef}, ${siteLabel(order.client.site)}.`,
  ]
  if (order.clientNote) lines.push(`Instructions : ${order.clientNote}`)
  lines.push('Pouvez-vous me confirmer la disponibilité et le point de remise ?')
  return lines.join('\n')
}

export function orderGroupWhatsappMessage(group: OrderGroupDto): string {
  const lines = [
    `Bonjour, voici le récapitulatif de ma commande ${group.reference}.`,
    ...group.orders.flatMap((order) => [
      `${order.merchant.name} — ${order.orderNumber} (${order.status}) :`,
      ...order.items.map((item) => `  - ${item.quantity} × ${item.title} — ${formatPrice(item.lineTotalCents)}`),
      `  Sous-total : ${formatPrice(order.totalCents)}`,
    ]),
    `Total général : ${formatPrice(group.totalCents)}`,
    `Ma localisation : ${group.client.locationRef}, ${siteLabel(group.client.site)}.`,
  ]
  return lines.join('\n')
}
