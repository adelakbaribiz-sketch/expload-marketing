'use client'

import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { BarChart3, TrendingUp, Users, Target, Mail, FileText, Megaphone } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

export function AnalyticsView() {
  const { data, isLoading } = useQuery({
    queryKey: ['analytics-summary'],
    queryFn: async () => {
      const res = await fetch('/api/analytics/events')
      if (!res.ok) throw new Error('failed')
      return res.json()
    },
  })

  if (isLoading) {
    return (
      <div className="space-y-4 p-4 md:p-6">
        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}
      </div>
    )
  }

  const cards = [
    { label: 'Total Leads', value: data?.leads ?? 0, icon: Users, color: 'text-emerald-600' },
    { label: 'Pipeline Deals', value: data?.deals ?? 0, icon: Target, color: 'text-violet-600' },
    { label: 'Won Revenue', value: `$${(data?.pipelineValue ?? 0).toLocaleString()}`, icon: TrendingUp, color: 'text-emerald-600' },
    { label: 'Email Campaigns', value: data?.campaigns ?? 0, icon: Mail, color: 'text-blue-600' },
    { label: 'Emails Sent', value: data?.emailsSent ?? 0, icon: Mail, color: 'text-blue-600' },
    { label: 'SEO Projects', value: data?.seoProjects ?? 0, icon: BarChart3, color: 'text-amber-600' },
    { label: 'Content Pieces', value: data?.contentPieces ?? 0, icon: FileText, color: 'text-blue-600' },
    { label: 'Social Posts', value: data?.socialPosts ?? 0, icon: FileText, color: 'text-pink-600' },
    { label: 'Ad Campaigns', value: data?.adCampaigns ?? 0, icon: Megaphone, color: 'text-rose-600' },
  ]

  const chartData = [
    { name: 'Leads', value: data?.leads ?? 0 },
    { name: 'Deals', value: data?.deals ?? 0 },
    { name: 'Campaigns', value: data?.campaigns ?? 0 },
    { name: 'Content', value: data?.contentPieces ?? 0 },
    { name: 'Social', value: data?.socialPosts ?? 0 },
    { name: 'Ads', value: data?.adCampaigns ?? 0 },
  ]

  return (
    <div className="space-y-4 p-4 md:p-6 animate-fade-in-up">
      <div>
        <h2 className="text-base font-semibold flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-violet-600" />
          Analytics Dashboard
        </h2>
        <p className="text-xs text-muted-foreground">Cross-platform marketing intelligence</p>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {cards.map((c) => {
          const Icon = c.icon
          return (
            <Card key={c.label}>
              <CardContent className="p-3">
                <Icon className={`h-4 w-4 ${c.color} mb-1`} />
                <p className="text-xl font-bold">{c.value}</p>
                <p className="text-[11px] text-muted-foreground">{c.label}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Chart */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Marketing Activity Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                <YAxis tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" allowDecimals={false} />
                <Tooltip contentStyle={{ background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="value" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Recent Events */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Recent Activity Feed</CardTitle>
        </CardHeader>
        <CardContent>
          {(data?.recentEvents ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No recent events.</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto scroll-thin">
              {(data?.recentEvents ?? []).map((e: any) => (
                <div key={e.id} className="flex items-center gap-3 text-sm p-2 rounded-md bg-muted/30">
                  <Badge variant="secondary" className="text-[10px]">{e.eventType}</Badge>
                  <span className="flex-1 truncate">{e.eventName}</span>
                  <span className="text-[11px] text-muted-foreground">{new Date(e.createdAt).toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
