'use client'

import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import {
  Users,
  Target,
  Trophy,
  Star,
  TrendingUp,
  Activity as ActivityIcon,
  Clock,
  Sparkles,
} from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useI18n } from '@/i18n/provider'

const STATUS_COLORS: Record<string, string> = {
  new: '#10b981',
  contacted: '#3b82f6',
  qualified: '#a855f7',
  won: '#22c55e',
  lost: '#ef4444',
}

export function DashboardView({ onNavigate }: { onNavigate?: (view: string) => void } = {}) {
  const { t } = useI18n()

  const STATUS_LABELS: Record<string, string> = {
    new: t('statuses.new'),
    contacted: t('statuses.contacted'),
    qualified: t('statuses.qualified'),
    won: t('statuses.won'),
    lost: t('statuses.lost'),
  }

  const { data, isLoading } = useQuery({
    queryKey: ['stats'],
    queryFn: async () => {
      const res = await fetch('/api/stats')
      if (!res.ok) throw new Error('failed')
      return res.json()
    },
  })

  if (isLoading) {
    return (
      <div className="grid gap-4 p-4 md:p-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />
        ))}
      </div>
    )
  }

  if (!data) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        {t('common.loading')}
      </div>
    )
  }

  const cards = [
    { label: t('dashboard.totalLeads'), value: data.totalLeads, icon: Users, color: 'from-emerald-500 to-teal-600' },
    { label: t('dashboard.newLeads'), value: data.newLeads, icon: Target, color: 'from-sky-500 to-blue-600' },
    { label: t('dashboard.qualified'), value: data.qualifiedLeads, icon: Star, color: 'from-violet-500 to-purple-600' },
    { label: t('dashboard.won'), value: data.wonLeads, icon: Trophy, color: 'from-amber-500 to-orange-600' },
  ]

  const pieData = data.statuses.map((s: any) => ({
    name: STATUS_LABELS[s.name] ?? s.name,
    value: s.count,
    color: STATUS_COLORS[s.name] ?? '#94a3b8',
  }))

  const barData = data.scoreBuckets.map((b: any) => ({ name: b.label, count: b.count }))

  return (
    <div className="space-y-6 p-4 md:p-6 animate-fade-in-up">
      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {cards.map((c, idx) => {
          const Icon = c.icon
          return (
            <Card key={c.label} className="relative overflow-hidden group hover:shadow-md transition-shadow" style={{ animationDelay: `${idx * 50}ms` }}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">
                  {c.label}
                </CardTitle>
                <div className={`grid place-items-center h-8 w-8 rounded-lg bg-gradient-to-br ${c.color} text-white shadow-sm`}>
                  <Icon className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl md:text-3xl font-bold">{c.value}</div>
                <p className="text-[11px] text-muted-foreground mt-1">{t('dashboard.vsLastMonth')}</p>
              </CardContent>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent" />
            </Card>
          )
        })}
      </div>

      {/* Avg score + projects */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-600" />
              {t('dashboard.avgScore')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold">{data.avgScore}</span>
              <span className="text-sm text-muted-foreground">{t('dashboard.outOf100')}</span>
            </div>
            <Progress value={data.avgScore} className="h-2" />
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-md bg-muted/50 p-2">
                <p className="text-muted-foreground">{t('dashboard.activeProjects')}</p>
                <p className="font-semibold text-base">{data.totalProjects}</p>
              </div>
              <div className="rounded-md bg-muted/50 p-2">
                <p className="text-muted-foreground">{t('dashboard.conversionRate')}</p>
                <p className="font-semibold text-base">
                  {data.totalLeads > 0 ? Math.round((data.wonLeads / data.totalLeads) * 100) : 0}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">{t('dashboard.statusDistribution')}</CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length === 0 ? (
              <div className="h-48 grid place-items-center gap-3 text-sm text-muted-foreground">
                <p>{t('dashboard.noLeadsYet')}</p>
                {onNavigate && (
                  <Button size="sm" className="gap-1.5" onClick={() => onNavigate('generator')}>
                    <Sparkles className="h-3.5 w-3.5" />
                    Generate your first leads
                  </Button>
                )}
              </div>
            ) : (
              <div className="flex flex-col md:flex-row items-center gap-4">
                <div className="h-48 w-full md:w-1/2">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={40} outerRadius={70} paddingAngle={2}>
                        {pieData.map((entry: any, i: number) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          background: 'var(--background)',
                          border: '1px solid var(--border)',
                          borderRadius: 8,
                          fontSize: 12,
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 space-y-2 w-full">
                  {pieData.map((s: any) => (
                    <div key={s.name} className="flex items-center justify-between gap-2 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
                        <span className="text-muted-foreground">{s.name}</span>
                      </div>
                      <Badge variant="outline">{s.value}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Score distribution + recent activity */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">{t('dashboard.scoreDistribution')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                  <YAxis tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      background: 'var(--background)',
                      border: '1px solid var(--border)',
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <ActivityIcon className="h-4 w-4 text-muted-foreground" />
              {t('dashboard.recentActivity')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-56 overflow-y-auto scroll-thin">
              {(data.recentActivities ?? []).length === 0 && (
                <p className="text-sm text-muted-foreground">{t('dashboard.noActivityYet')}</p>
              )}
              {(data.recentActivities ?? []).map((a: any) => (
                <div key={a.id} className="flex items-start gap-3 text-sm">
                  <div className="grid place-items-center h-7 w-7 rounded-full bg-muted shrink-0">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate">{a.message}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {new Date(a.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent leads */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">{t('dashboard.recentLeads')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto scroll-thin">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-right text-xs text-muted-foreground border-b">
                  <th className="pb-2 font-medium">{t('leads.name')}</th>
                  <th className="pb-2 font-medium">{t('leads.industry')}</th>
                  <th className="pb-2 font-medium">{t('leads.score')}</th>
                  <th className="pb-2 font-medium">{t('leads.status')}</th>
                  <th className="pb-2 font-medium">{t('nav.projects')}</th>
                </tr>
              </thead>
              <tbody>
                {(data.recentLeads ?? []).map((l: any) => (
                  <tr key={l.id} className="border-b last:border-0">
                    <td className="py-2 font-medium truncate max-w-[200px]">{l.name}</td>
                    <td className="py-2 text-muted-foreground">{l.industry ?? '—'}</td>
                    <td className="py-2"><Badge variant="outline">{l.score}</Badge></td>
                    <td className="py-2">
                      <Badge
                        style={{
                          background: (STATUS_COLORS[l.status] ?? '#94a3b8') + '20',
                          color: STATUS_COLORS[l.status] ?? '#94a3b8',
                        }}
                      >
                        {STATUS_LABELS[l.status] ?? l.status}
                      </Badge>
                    </td>
                    <td className="py-2 text-muted-foreground text-xs">{l.project?.name ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
