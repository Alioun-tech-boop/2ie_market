import { randomBytes } from 'node:crypto'

export function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 100)
}

export function uniqueSlug(value: string): string {
  return `${slugify(value) || 'boutique'}-${randomBytes(3).toString('hex')}`
}
