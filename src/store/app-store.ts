'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AppState {
  activeTenantId: string | null
  setActiveTenant: (id: string | null) => void
  sidebarOpen: boolean
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      activeTenantId: null,
      setActiveTenant: (id) => set({ activeTenantId: id }),
      sidebarOpen: true,
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
    }),
    { name: 'marketing-saas-store' },
  ),
)
