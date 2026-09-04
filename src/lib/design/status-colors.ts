/**
 * Canonical status/severity/risk color maps — the single source of truth
 * this project's design-system audit found missing (DESIGN-SYSTEM.md §1).
 * 45 dashboard views each defined their own hardcoded color-map constant
 * for the same handful of semantic concepts, with real drift between them
 * (e.g. "info" meant #0A0A0B in some files and #3b82f6 in others). New
 * code — and any file being touched for other reasons — should import
 * from here instead of adding another one-off map.
 *
 * Values are plain hex (not CSS var() references) because these maps feed
 * inline `style={{ background: X + '20', color: X }}` opacity-suffix
 * patterns used throughout the dashboard, which need a literal hex string
 * to concatenate — they intentionally mirror the actual `--chart-*`/
 * `--destructive` token values from globals.css rather than inventing new
 * colors, so they stay visually consistent with the token system even
 * though they can't reference it directly through a CSS variable.
 */

/** Generic lifecycle status — pending/active/success/failure family. */
export const STATUS_COLORS: Record<string, string> = {
  pending: '#64748b',
  draft: '#64748b',
  new: '#3b82f6',
  active: '#3b82f6',
  in_progress: '#3b82f6',
  qualified: '#a855f7',
  won: '#22c55e',
  completed: '#22c55e',
  success: '#22c55e',
  approved: '#22c55e',
  lost: '#ef4444',
  failed: '#ef4444',
  rejected: '#ef4444',
  cancelled: '#ef4444',
}

/** Severity/priority — used for alerts, notifications, audit events. */
export const SEVERITY_COLORS: Record<string, string> = {
  info: '#3b82f6',
  low: '#3b82f6',
  warning: '#f59e0b',
  medium: '#f59e0b',
  high: '#ef4444',
  critical: '#DC2626', // matches --destructive exactly, not a near-miss shade
}

/**
 * Risk level — preserved exactly as already used identically in
 * ecommerce-view.tsx and reseller-view.tsx (confirmed byte-for-byte
 * duplicate constants before this consolidation) so migrating those two
 * files to import from here is a zero-visual-change refactor.
 */
export const RISK_COLORS: Record<string, string> = {
  low: '#22c55e',
  medium: '#f59e0b',
  high: '#ef4444',
  very_high: '#dc2626',
}

/**
 * Shared helper for the "badge with a tinted background" pattern repeated
 * throughout the dashboard: `style={{ background: COLOR + '20', color: COLOR }}`.
 * Falls back to a neutral gray for an unrecognized key instead of each
 * call site inventing its own fallback shade.
 */
export function statusBadgeStyle(colorMap: Record<string, string>, key: string | undefined | null, fallback = '#64748b') {
  const color = (key && colorMap[key]) || fallback
  return { background: `${color}20`, color }
}
