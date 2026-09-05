'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AuthState {
  /** Controls the login/signup modal visibility */
  authModalOpen: boolean
  authModalMode: 'login' | 'signup'
  openAuthModal: (mode?: 'login' | 'signup') => void
  closeAuthModal: () => void
  setAuthModalMode: (mode: 'login' | 'signup') => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      authModalOpen: false,
      authModalMode: 'login',
      openAuthModal: (mode = 'login') => set({ authModalOpen: true, authModalMode: mode }),
      closeAuthModal: () => set({ authModalOpen: false }),
      setAuthModalMode: (mode) => set({ authModalMode: mode }),
    }),
    {
      name: 'marketing-saas-auth',
      // Modal open/mode is transient UI state, not something that should
      // survive a reload — without this, closing the tab mid-login left
      // `authModalOpen: true` in localStorage and the modal reopened
      // unprompted on the next visit (Phase 09 frontend audit).
      partialize: () => ({}),
    },
  ),
)
