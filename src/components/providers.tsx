'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
import { useAppStore } from '@/store/app-store'
import { useEffect } from 'react'
import { toast } from 'sonner'

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
          mutations: {
            // Design-system audit found 171 useMutation() call sites across
            // dashboard views but only 61 with their own onError — roughly
            // two-thirds of mutations failed completely silently (button
            // click does nothing visible) if the request threw. This
            // default only runs when a mutation doesn't define its own
            // onError (React Query overrides, not merges, per-mutation
            // callbacks), so the 61 already-specific error messages are
            // unaffected — see DESIGN-SYSTEM.md §14.
            onError: (error: unknown) => {
              const message = error instanceof Error ? error.message : 'Something went wrong. Please try again.'
              toast.error(message)
            },
          },
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
