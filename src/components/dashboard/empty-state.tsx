'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

/**
 * Shared empty-state block — the design-system audit found 4+ hand-written
 * variants of this same idea scattered across dashboard views (bare text,
 * Card+icon+p-12, Card-no-icon+p-8, unstyled raw text), each with slightly
 * different padding/centering/copy tone. See DESIGN-SYSTEM.md §7.
 *
 * Most real call sites live INSIDE an already-existing Card/CardContent
 * (a section like "Recent Payments" that's empty) — wrapping those in a
 * second nested Card would look wrong, so this renders bare content by
 * default (`p-8`, matching the audit's most common padding). Pass
 * `card` for the top-level "this whole view/tab has zero data" case,
 * which wraps in its own Card at `p-12` (the audit's other majority
 * variant) so it reads as a standalone panel rather than a stray block.
 */
export function EmptyState({
  icon: Icon,
  title,
  message,
  action,
  card = false,
  className,
}: {
  icon?: LucideIcon
  title?: string
  message: string
  action?: { label: string; onClick: () => void; icon?: LucideIcon }
  /** Wrap in its own Card (for a top-level, no-parent-Card empty view). */
  card?: boolean
  className?: string
}) {
  const ActionIcon = action?.icon
  const body = (
    <div className={cn('text-center space-y-2', card ? 'p-12' : 'p-8', className)}>
      {Icon && <Icon className="h-10 w-10 mx-auto text-muted-foreground" />}
      {title && <p className="text-sm font-medium">{title}</p>}
      <p className="text-sm text-muted-foreground">{message}</p>
      {action && (
        <Button size="sm" className="gap-1.5 mt-2" onClick={action.onClick}>
          {ActionIcon && <ActionIcon className="h-3.5 w-3.5" />}
          {action.label}
        </Button>
      )}
    </div>
  )
  if (!card) return body
  return (
    <Card>
      <CardContent className="p-0">{body}</CardContent>
    </Card>
  )
}
