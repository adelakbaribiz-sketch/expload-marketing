'use client'

import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Activity, Clock } from 'lucide-react'
import { useI18n } from '@/i18n/provider'

const TYPE_COLORS: Record<string, string> = {
  created: '#10b981',
  updated: '#3b82f6',
  enriched: '#a855f7',
  contacted: '#f59e0b',
  scored: '#22c55e',
}

export function ActivityView() {
  const { t } = useI18n()

  const TYPE_LABELS: Record<string, string> = {
    created: t('activityTypes.created'),
    updated: t('activityTypes.updated'),
    enriched: t('activityTypes.enriched'),
    contacted: t('activityTypes.contacted'),
    scored: t('activityTypes.scored'),
  }

  const { data, isLoading } = useQuery({
    queryKey: ['activity'],
    queryFn: async () => {
      const res = await fetch('/api/stats')
      if (!res.ok) throw new Error('failed')
      return res.json()
    },
  })

  const activities = data?.recentActivities ?? []

  return (
    <div className="space-y-4 p-4 md:p-6 animate-fade-in-up">
      <div>
        <h2 className="text-base font-semibold">{t('activity.title')}</h2>
        <p className="text-xs text-muted-foreground">{t('activity.subtitle')}</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Activity className="h-4 w-4 text-muted-foreground" />
            {t('activity.timeline')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : activities.length === 0 ? (
            <div className="py-12 text-center">
              <Clock className="h-8 w-8 mx-auto text-muted-foreground" />
              <p className="text-sm text-muted-foreground mt-2">{t('activity.noActivity')}</p>
            </div>
          ) : (
            <div className="relative pr-4">
              <div className="absolute right-2 top-2 bottom-2 w-px bg-border" />
              <div className="space-y-4">
                {activities.map((a: any) => {
                  const color = TYPE_COLORS[a.type] ?? '#94a3b8'
                  return (
                    <div key={a.id} className="relative flex items-start gap-3">
                      <span
                        className="absolute right-[-7px] top-1.5 h-3 w-3 rounded-full ring-2 ring-background"
                        style={{ background: color }}
                      />
                      <div className="flex-1 min-w-0 mr-4">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                            style={{ background: color + '20', color }}
                          >
                            {TYPE_LABELS[a.type] ?? a.type}
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            {new Date(a.createdAt).toLocaleString(undefined, {
                              dateStyle: 'medium',
                              timeStyle: 'short',
                            })}
                          </span>
                        </div>
                        <p className="text-sm mt-0.5">{a.message}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
