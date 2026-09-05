import type { KeyboardEvent } from 'react'

/**
 * Keyboard-activation handler for a non-native clickable element (a `Card`
 * or table row used as a button via `onClick`, which — unlike a real
 * `<button>` — gets no Enter/Space activation or focus ring for free). Pair
 * with `role="button" tabIndex={0}` on the element. See
 * FRONTEND-ARCHITECTURE.md "Accessibility" (Phase 09).
 */
export function onActivateKey(handler: () => void) {
  return (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handler()
    }
  }
}
