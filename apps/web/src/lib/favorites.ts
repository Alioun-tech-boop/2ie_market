import { api } from './auth'
import type { Listing } from './market'

/** Favori persisté en base, avec la date d'enregistrement. */
export interface FavoriteDto {
  listing: Listing
  savedAt: string
}

export const favoritesApi = {
  list: () => api<{ favorites: FavoriteDto[] }>('/favorites'),
  save: (listingId: string) =>
    api<{ ok: true; listingId: string }>(`/favorites/${encodeURIComponent(listingId)}`, {
      method: 'POST',
    }),
  remove: (listingId: string) =>
    api<{ ok: true; listingId: string }>(`/favorites/${encodeURIComponent(listingId)}`, {
      method: 'DELETE',
    }),
}
