import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { favoritesApi, type FavoriteDto } from '../lib/favorites'
import type { Listing } from '../lib/market'
import { useAuth } from './AuthContext'

interface FavoritesContextValue {
  favorites: FavoriteDto[]
  favoriteIds: Set<string>
  count: number
  loading: boolean
  isFavorite: (listingId: string) => boolean
  toggle: (listing: Listing) => Promise<boolean>
  refresh: () => Promise<void>
}

const FavoritesContext = createContext<FavoritesContextValue | null>(null)

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const { status } = useAuth()
  const [favorites, setFavorites] = useState<FavoriteDto[]>([])
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(async () => {
    try {
      const data = await favoritesApi.list()
      setFavorites(data.favorites)
    } catch {
      // L'absence de favoris ne doit jamais bloquer la navigation.
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (status !== 'authenticated') {
      setFavorites([])
      return
    }
    setLoading(true)
    void refresh()
  }, [status, refresh])

  const favoriteIds = useMemo(
    () => new Set(favorites.map((favorite) => favorite.listing.id)),
    [favorites],
  )

  const isFavorite = useCallback(
    (listingId: string) => favoriteIds.has(listingId),
    [favoriteIds],
  )

  const toggle = useCallback(
    async (listing: Listing) => {
      const wasSaved = favoriteIds.has(listing.id)
      setFavorites((current) =>
        wasSaved
          ? current.filter((favorite) => favorite.listing.id !== listing.id)
          : [{ listing, savedAt: new Date().toISOString() }, ...current],
      )
      try {
        if (wasSaved) await favoritesApi.remove(listing.id)
        else await favoritesApi.save(listing.id)
        return !wasSaved
      } catch {
        await refresh()
        return wasSaved
      }
    },
    [favoriteIds, refresh],
  )

  const value = useMemo(
    () => ({
      favorites,
      favoriteIds,
      count: favorites.length,
      loading,
      isFavorite,
      toggle,
      refresh,
    }),
    [favorites, favoriteIds, loading, isFavorite, toggle, refresh],
  )

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>
}

export function useFavorites() {
  const value = useContext(FavoritesContext)
  if (!value) throw new Error('useFavorites doit être utilisé dans FavoritesProvider')
  return value
}
