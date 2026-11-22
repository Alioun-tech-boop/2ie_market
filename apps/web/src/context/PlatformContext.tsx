import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { marketApi, type PlatformInfo } from '../lib/market'

const DEFAULT_PLATFORM: PlatformInfo = {
  name: '2ie Market',
  logoUrl: null,
  supportEmail: null,
  maintenanceMessage: null,
  reviewsEnabled: true,
  updatedAt: new Date(0).toISOString(),
}

const PlatformContext = createContext<{
  platform: PlatformInfo
  refresh: () => Promise<void>
}>({
  platform: DEFAULT_PLATFORM,
  refresh: async () => undefined,
})

export function PlatformProvider({ children }: { children: ReactNode }) {
  const [platform, setPlatform] = useState<PlatformInfo>(DEFAULT_PLATFORM)

  const refresh = useCallback(async () => {
    try {
      const result = await marketApi.platform()
      setPlatform(result.platform)
    } catch {
      // Le site reste utilisable avec l'identité par défaut si l'API est momentanément indisponible.
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return <PlatformContext.Provider value={{ platform, refresh }}>{children}</PlatformContext.Provider>
}

export function usePlatform() {
  return useContext(PlatformContext)
}
