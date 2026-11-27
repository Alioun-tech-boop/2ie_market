const numberFormatter = new Intl.NumberFormat('fr-FR')

/** Les prix sont stockés en centimes (RG-05). 0 s'affiche « Gratuit ». */
export function formatPrice(priceCents: number): string {
  if (priceCents === 0) return 'Gratuit'
  return `${numberFormatter.format(priceCents / 100)} F`
}


export function siteLabel(site: 'KAMBOINSIN' | 'OUAGA'): string {
  return site === 'KAMBOINSIN' ? 'Kamboinsin' : 'Ouaga'
}
