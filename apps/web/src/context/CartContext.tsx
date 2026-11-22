import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useToast } from '../components/ui/Toast'
import { useAuth } from './AuthContext'
import { ApiError } from '../lib/auth'
import type { CartDto } from '../lib/orders'
import { ordersApi } from '../lib/orders'

interface CartContextValue {
  cart: CartDto
  loading: boolean
  refresh: () => Promise<void>
  addItem: (listingId: string, quantity: number) => Promise<void>
  updateQuantity: (listingId: string, quantity: number) => Promise<void>
  removeItem: (listingId: string) => Promise<void>
  setNote: (storeId: string, note: string) => Promise<void>
  clear: () => Promise<void>
  itemCount: number
}

const emptyCart: CartDto = { currency: 'XOF', itemCount: 0, totalCents: 0, groups: [] }

const CartContext = createContext<CartContextValue | null>(null)

function errorMessage(cause: unknown): string {
  return cause instanceof ApiError ? cause.message : 'Le service est momentanément indisponible.'
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { status } = useAuth()
  const { showToast } = useToast()
  const [cart, setCart] = useState<CartDto>(emptyCart)
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(async () => {
    if (status !== 'authenticated') {
      setCart(emptyCart)
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const result = await ordersApi.get()
      setCart(result.cart)
    } catch (cause) {
      setCart(emptyCart)
      showToast({
        tone: 'info',
        title: 'Panier indisponible',
        description: errorMessage(cause),
      })
    } finally {
      setLoading(false)
    }
  }, [status, showToast])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const applyMutation = useCallback(
    async (run: () => Promise<{ cart: CartDto }>, title: string) => {
      if (status !== 'authenticated') {
        showToast({ tone: 'info', title: 'Connexion requise', description: 'Connectez-vous pour continuer.' })
        return
      }
      try {
        const result = await run()
        setCart(result.cart)
      } catch (cause) {
        showToast({ tone: 'info', title, description: errorMessage(cause) })
        throw cause
      }
    },
    [status, showToast],
  )

  const addItem = useCallback(
    (listingId: string, quantity: number) =>
      applyMutation(() => ordersApi.add(listingId, quantity), 'Ajout impossible'),
    [applyMutation],
  )

  const updateQuantity = useCallback(
    (listingId: string, quantity: number) =>
      applyMutation(() => ordersApi.updateQuantity(listingId, quantity), 'Quantité non mise à jour'),
    [applyMutation],
  )

  const removeItem = useCallback(
    (listingId: string) => applyMutation(() => ordersApi.remove(listingId), 'Suppression impossible'),
    [applyMutation],
  )

  const setNote = useCallback(
    (storeId: string, note: string) =>
      applyMutation(() => ordersApi.setNote(storeId, note), 'Note non enregistrée'),
    [applyMutation],
  )

  const clear = useCallback(() => applyMutation(() => ordersApi.clear(), 'Panier non vidé'), [applyMutation])

  const value = useMemo<CartContextValue>(
    () => ({
      cart,
      loading,
      refresh,
      addItem,
      updateQuantity,
      removeItem,
      setNote,
      clear,
      itemCount: cart.itemCount,
    }),
    [cart, loading, refresh, addItem, updateQuantity, removeItem, setNote, clear],
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const context = useContext(CartContext)
  if (!context) throw new Error('useCart doit être utilisé dans un CartProvider')
  return context
}
