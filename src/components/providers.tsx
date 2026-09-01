'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
import { useAppStore } from '@/store/app-store'
import { useEffect } from 'react'

/** Pushes the active tenant id from the store into the `tenant-id` cookie. */
function TenantSync() {
  const activeTenantId = useAppStore((s) => s.activeTenantId)
  useEffect(() => {
    if (activeTenantId) {
      document.cookie = `tenant-id=${activeTenantId}; path=/; max-age=${60 * 60 * 24 * 30}; samesite=lax`
    }
  }, [activeTenantId])
  return null
}

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 30_000, refetchOnWindowFocus: false, retry: 1 },
        },
      }),
  )
  return (
    <QueryClientProvider client={client}>
      <TenantSync />
      {children}
    </QueryClientProvider>
  )
}
