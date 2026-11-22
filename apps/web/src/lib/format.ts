const numberFormatter = new Intl.NumberFormat('fr-FR')

/** Les prix sont stockés en centimes (RG-05). 0 s'affiche « Gratuit ». */
export function formatPrice(priceCents: number): string {
  if (priceCents === 0) return 'Gratuit'
  return `${numberFormatter.format(priceCents / 100)} F`
}

/** Lien profond WhatsApp : E.164 sans « + » (RG-04). */
export function whatsappLink(phoneE164: string, message?: string): string {
  const digits = phoneE164.replace(/^\+/, '').replace(/[^0-9]/g, '')
  const base = `https://wa.me/${digits}`
  return message ? `${base}?text=${encodeURIComponent(message)}` : base
}

export function siteLabel(site: 'KAMBOINSIN' | 'OUAGA'): string {
  return site === 'KAMBOINSIN' ? 'Kamboinsin' : 'Ouaga'
}
