import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from '@tanstack/react-router'
import { ToastProvider } from './components/ui/Toast'
import { AuthProvider } from './context/AuthContext'
import { PlatformProvider } from './context/PlatformContext'
import { FavoritesProvider } from './context/FavoritesContext'
import { CartProvider } from './context/CartContext'
import { NotificationsProvider } from './context/NotificationsContext'
import { router } from './router'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ToastProvider>
      <AuthProvider>
        <PlatformProvider>
          <FavoritesProvider>
          <NotificationsProvider>
            <CartProvider>
              <RouterProvider router={router} />
            </CartProvider>
          </NotificationsProvider>
          </FavoritesProvider>
        </PlatformProvider>
      </AuthProvider>
    </ToastProvider>
  </StrictMode>,
)
