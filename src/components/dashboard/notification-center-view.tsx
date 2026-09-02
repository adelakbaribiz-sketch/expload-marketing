'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Bell, BellOff, CheckCheck, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

const CATEGORY_COLORS: Record<string, string> = {
  llm: '#3b82f6', onboarding: '#10b981', negotiation: '#f59e0b',
  system: '#6b7280', billing: '#ef4444', distributor: '#8b5cf6',
}
const SEVERITY_COLORS: Record<string, string> = {
  info: '#3b82f6', warning: '#f59e0b', critical: '#ef4444', success: '#10b981',
}

export function NotificationCenterView() {
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['notification-center'],
    queryFn: async () => {
      const res = await fetch('/api/notifications/center?limit=100')
      if (!res.ok) return { notifications: [] }
      return res.json()
    },
    refetchInterval: 5000,
  })

  const { data: unreadData } = useQuery({
    queryKey: ['unread-count'],
    queryFn: async () => {
      const res = await fetch('/api/notifications/unread-count')
      if (!res.ok) return { count: 0 }
      return res.json()
    },
    refetchInterval: 3000,
  })

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch('/api/notifications/center', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      if (!res.ok) throw new Error('Failed')
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notification-center'] })
      qc.invalidateQueries({ queryKey: ['unread-count'] })
    },
  })

  const markAllRead = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/notifications/center', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAllRead: true }),
      })
      if (!res.ok) throw new Error('Failed')
      return res.json()
    },
    onSuccess: () => {
      toast.success('All marked as read')
      qc.invalidateQueries({ queryKey: ['notification-center'] })
      qc.invalidateQueries({ queryKey: ['unread-count'] })
    },
  })

  const notifications = data?.notifications ?? []
  const unreadCount = unreadData?.count ?? 0

  if (isLoading) return <Skeleton className="h-96" />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Bell className="h-8 w-8" style={{ color: '#0A0A0B' }} />
            Notification Center
          </h1>
          <p className="text-muted-foreground mt-1">
            Real-time event feed: LLM switches, quota warnings, onboarding completion, negotiation updates
          </p>
        </div>
        <Button variant="outline" disabled={unreadCount === 0} onClick={() => markAllRead.mutate()}>
          <CheckCheck className="h-4 w-4 mr-1" /> Mark all read ({unreadCount})
        </Button>
      </div>

      <div className="space-y-2">
        {notifications.map(n => {
          const catColor = CATEGORY_COLORS[n.category] ?? '#6b7280'
          const sevColor = SEVERITY_COLORS[n.type] ?? '#3b82f6'
          return (
            <Card
              key={n.id}
              className={n.isRead ? 'opacity-60' : ''}
              style={{ borderLeft: `4px solid ${sevColor}` }}
            >
              <CardContent className="p-3 flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" style={{ color: catColor, borderColor: catColor }}>{n.category}</Badge>
                    {!n.isRead && <Badge variant="secondary">NEW</Badge>}
                    <span className="font-semibold text-sm">{n.title}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{n.message}</p>
                  <div className="text-[10px] text-muted-foreground mt-1">{new Date(n.createdAt).toLocaleString()}</div>
                </div>
                <div className="flex flex-col gap-1">
                  {!n.isRead && (
                    <Button size="sm" variant="ghost" onClick={() => markRead.mutate(n.id)}>
                      <CheckCheck className="h-3 w-3" />
                    </Button>
                  )}
                  {n.actionUrl && (
                    <a href={n.actionUrl} className="text-xs text-blue-600 underline">View →</a>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
        {notifications.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center text-muted-foreground">
              <BellOff className="h-10 w-10 mx-auto mb-2 opacity-40" />
              <div>No notifications yet.</div>
              <div className="text-xs mt-1">LLM provider switches, quota warnings, and negotiation events will appear here.</div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
