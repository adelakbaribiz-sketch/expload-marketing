'use client'

import { useState, useEffect } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import { useAuthStore } from '@/store/auth-store'
import { toast } from 'sonner'
import {
  Users, Target, DollarSign, Mail, TrendingUp, Search, Megaphone,
  Share2, Bot, Lock, ArrowRight, Sparkles, Eye, Clock, Star,
  BarChart3, Play, Zap,
} from 'lucide-react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell, Pie, PieChart } from 'recharts'

type DemoView = 'dashboard' | 'leads' | 'generator' | 'seo' | 'analytics'

const DEMO_NAV: { id: DemoView; label: string; icon: any }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
  { id: 'leads', label: 'Leads', icon: Users },
  { id: 'generator', label: 'AI Generator', icon: Sparkles },
  { id: 'seo', label: 'SEO', icon: Search },
  { id: 'analytics', label: 'Analytics', icon: TrendingUp },
]

const STATUS_COLORS: Record<string, string> = {
  new: '#0A2A3A', contacted: '#FF5722', qualified: '#80DEEA', won: '#22c55e', lost: '#ef4444',
}

export function LiveDemoSection() {
  const { openAuthModal } = useAuthStore()
  const [demoView, setDemoView] = useState<DemoView>('dashboard')
  const [sessionToken, setSessionToken] = useState<string | null>(null)
  const [demoOpen, setDemoOpen] = useState(false)

  const demoMutation = useMutation({
    mutationFn: async ({ view, action }: { view: DemoView; action: string }) => {
      const res = await fetch('/api/public/demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, view, sessionToken }),
      })
      if (!res.ok) throw new Error('demo failed')
      return res.json()
    },
    onSuccess: (data) => {
      setSessionToken(data.sessionToken)
    },
  })

  // Initialize demo when opened
  useEffect(() => {
    if (demoOpen && !sessionToken) {
      demoMutation.mutate({ view: 'dashboard', action: 'init' })
    }
  }, [demoOpen])

  // Navigate demo view
  const handleNavigate = (view: DemoView) => {
    setDemoView(view)
    demoMutation.mutate({ view, action: 'navigate' })
  }

  const demoData = demoMutation.data?.data

  return (
    <section className="py-20 md:py-28 bg-gradient-to-br from-[#0A2A3A] to-[#0D47A1] text-white relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-0 right-0 h-64 w-64 rounded-full bg-[#FF5722]/10 blur-3xl" />
      <div className="absolute bottom-0 left-0 h-64 w-64 rounded-full bg-[#80DEEA]/10 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <Badge variant="secondary" className="mb-4 gap-1.5 bg-white/10 text-white border-white/20">
            <Play className="h-3.5 w-3.5 text-[#FF5722]" />
            Live Interactive Demo
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Try It Before You Sign Up
          </h2>
          <p className="text-lg text-white/70 max-w-2xl mx-auto">
            Explore a fully populated dashboard with sample data — no registration required.
            Click through different modules and see what Expload Marketing can do.
          </p>
        </div>

        {/* Demo Preview Card */}
        {!demoOpen ? (
          <Card className="max-w-4xl mx-auto bg-white/5 border-white/10 backdrop-blur-md">
            <CardContent className="p-8 text-center">
              {/* Mock dashboard preview */}
              <div className="grid grid-cols-4 gap-3 mb-6">
                {[
                  { icon: Users, label: 'Leads', value: '247', color: 'text-[#80DEEA]' },
                  { icon: DollarSign, label: 'Revenue', value: '$67K', color: 'text-[#FF5722]' },
                  { icon: Mail, label: 'Emails', value: '1.2K', color: 'text-[#80DEEA]' },
                  { icon: TrendingUp, label: 'ROI', value: '+340%', color: 'text-[#FF5722]' },
                ].map((stat) => {
                  const Icon = stat.icon
                  return (
                    <div key={stat.label} className="rounded-lg bg-white/5 p-3">
                      <Icon className={`h-5 w-5 mx-auto mb-1 ${stat.color}`} />
                      <p className="text-xl font-bold">{stat.value}</p>
                      <p className="text-[10px] text-white/60">{stat.label}</p>
                    </div>
                  )
                })}
              </div>

              {/* Mock chart preview */}
              <div className="h-32 rounded-lg bg-white/5 p-4 mb-6">
                <div className="flex items-end justify-between h-full gap-2">
                  {[40, 65, 50, 80, 60, 90, 75, 95].map((h, i) => (
                    <div
                      key={i}
                      className="flex-1 rounded-t"
                      style={{
                        height: `${h}%`,
                        background: i % 2 === 0 ? '#FF5722' : '#80DEEA',
                        opacity: 0.7,
                      }}
                    />
                  ))}
                </div>
              </div>

              <Button
                size="lg"
                variant="secondary"
                className="gap-2"
                onClick={() => setDemoOpen(true)}
              >
                <Play className="h-5 w-5" />
                Launch Live Demo
              </Button>
              <p className="text-xs text-white/50 mt-3">No signup required · Explore 5 dashboard views</p>
            </CardContent>
          </Card>
        ) : (
          /* Interactive Demo */
          <Card className="max-w-6xl mx-auto bg-white text-[#0A2A3A] shadow-2xl">
            {/* Demo Header */}
            <div className="flex items-center justify-between p-4 border-b bg-[#0A2A3A] text-white rounded-t-xl">
              <div className="flex items-center gap-2">
                <div className="grid place-items-center h-8 w-8 rounded-lg bg-[#FF5722]">
                  <Bot className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-medium">Expload Marketing — Live Demo</p>
                  <p className="text-[10px] text-white/60">Sample data · Read-only</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px] text-white border-white/30">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#FF5722] mr-1.5 animate-pulse" />
                  DEMO MODE
                </Badge>
                <Button size="sm" variant="secondary" className="gap-1.5" onClick={() => { setDemoOpen(false); openAuthModal('signup') }}>
                  <Sparkles className="h-3.5 w-3.5" />
                  Sign Up
                </Button>
              </div>
            </div>

            {/* Demo Body */}
            <div className="flex flex-col md:flex-row min-h-[500px]">
              {/* Sidebar */}
              <div className="md:w-48 border-r p-3 space-y-1 bg-[#F5F5F5]">
                {DEMO_NAV.map((item) => {
                  const Icon = item.icon
                  const active = demoView === item.id
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNavigate(item.id)}
                      className={`flex items-center gap-2 w-full rounded-lg px-3 py-2 text-sm transition-colors ${
                        active ? 'bg-[#0A2A3A] text-white' : 'text-[#0A2A3A] hover:bg-[#E0E0E0]'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </button>
                  )
                })}

                {/* Locked items */}
                {['CRM', 'Content', 'Ads', 'Social', 'AI Agent'].map((label) => (
                  <div key={label} className="flex items-center gap-2 w-full rounded-lg px-3 py-2 text-sm text-[#B0BEC5] cursor-not-allowed">
                    <Lock className="h-3.5 w-3.5" />
                    {label}
                  </div>
                ))}
              </div>

              {/* Demo Content */}
              <div className="flex-1 p-4 overflow-y-auto max-h-[500px] scroll-thin">
                {demoMutation.isPending && !demoData ? (
                  <div className="space-y-3">
                    {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
                  </div>
                ) : demoData ? (
                  <DemoContent view={demoView} data={demoData} />
                ) : (
                  <p className="text-center text-muted-foreground py-8">Loading demo data…</p>
                )}
              </div>
            </div>

            {/* Demo Footer */}
            <div className="p-4 border-t bg-[#F5F5F5] rounded-b-xl flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                This is sample data. Your real dashboard will have your own marketing data.
              </p>
              <Button size="sm" className="gap-1.5 bg-[#FF5722] hover:bg-[#FF7043]" onClick={() => { setDemoOpen(false); openAuthModal('signup') }}>
                Get Full Access <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </Card>
        )}
      </div>
    </section>
  )
}

function DemoContent({ view, data }: { view: DemoView; data: any }) {
  switch (view) {
    case 'dashboard':
      return <DemoDashboard data={data} />
    case 'leads':
      return <DemoLeads data={data} />
    case 'generator':
      return <DemoGenerator data={data} />
    case 'seo':
      return <DemoSeo data={data} />
    case 'analytics':
      return <DemoAnalytics data={data} />
    default:
      return <DemoDashboard data={data} />
  }
}

function DemoDashboard({ data }: { data: any }) {
  const { stats, recentLeads, recentActivity, statuses, scoreBuckets } = data
  const cards = [
    { label: 'Total Leads', value: stats.totalLeads, icon: Users, color: 'text-[#0A2A3A]' },
    { label: 'Pipeline', value: `$${(stats.pipelineValue / 1000).toFixed(0)}K`, icon: DollarSign, color: 'text-[#FF5722]' },
    { label: 'Won Revenue', value: `$${(stats.wonRevenue / 1000).toFixed(0)}K`, icon: TrendingUp, color: 'text-emerald-600' },
    { label: 'Emails Sent', value: stats.emailsSent, icon: Mail, color: 'text-[#80DEEA]' },
  ]

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {cards.map((c) => {
          const Icon = c.icon
          return (
            <Card key={c.label}>
              <CardContent className="p-3">
                <Icon className={`h-4 w-4 ${c.color} mb-1`} />
                <p className="text-xl font-bold">{c.value}</p>
                <p className="text-[10px] text-muted-foreground">{c.label}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Chart + Activity */}
      <div className="grid md:grid-cols-2 gap-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs">Lead Score Distribution</CardTitle></CardHeader>
          <CardContent>
            <div className="h-32">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={scoreBuckets}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 9 }} />
                  <YAxis tick={{ fontSize: 9 }} />
                  <Tooltip contentStyle={{ fontSize: 11 }} />
                  <Bar dataKey="count" fill="#0A2A3A" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs">Recent Activity</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-1.5 max-h-32 overflow-y-auto scroll-thin">
              {recentActivity.slice(0, 5).map((a: any) => (
                <div key={a.id} className="flex items-center gap-2 text-xs">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#FF5722]" />
                  <span className="truncate">{a.message}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Leads */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-xs">Recent Leads</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-1">
            {recentLeads.slice(0, 4).map((lead: any) => (
              <div key={lead.id} className="flex items-center justify-between text-xs p-1.5 rounded bg-muted/30">
                <span className="truncate flex-1">{lead.name}</span>
                <Badge variant="outline" className="text-[9px] ml-2">{lead.score}</Badge>
                <Badge variant="outline" className="text-[9px] ml-1 capitalize" style={{ background: STATUS_COLORS[lead.status] + '20', color: STATUS_COLORS[lead.status] }}>{lead.status}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function DemoLeads({ data }: { data: any }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Leads ({data.total})</h3>
        <Badge variant="secondary" className="text-[10px]">Sample Data</Badge>
      </div>
      <div className="overflow-x-auto scroll-thin">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-right text-muted-foreground border-b">
              <th className="pb-1.5 font-medium">Name</th>
              <th className="pb-1.5 font-medium">Industry</th>
              <th className="pb-1.5 font-medium">Score</th>
              <th className="pb-1.5 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {data.leads.map((lead: any) => (
              <tr key={lead.id} className="border-b last:border-0">
                <td className="py-1.5 font-medium truncate max-w-[150px]">{lead.name}</td>
                <td className="py-1.5 text-muted-foreground">{lead.industry}</td>
                <td className="py-1.5"><Badge variant="outline" className="text-[9px]">{lead.score}</Badge></td>
                <td className="py-1.5"><Badge variant="outline" className="text-[9px] capitalize" style={{ background: STATUS_COLORS[lead.status] + '20', color: STATUS_COLORS[lead.status] }}>{lead.status}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function DemoGenerator({ data }: { data: any }) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold">AI Lead Generator — Sample Results</h3>
      <div className="rounded-lg bg-[#0A2A3A]/5 p-3 text-xs">
        <p className="text-muted-foreground mb-1">Query: <span className="font-mono">{data.sampleQuery}</span></p>
        <p className="text-muted-foreground">Results: {data.sampleResults.length} leads found</p>
      </div>
      <div className="space-y-2">
        {data.sampleResults.map((lead: any) => (
          <div key={lead.id} className="rounded-lg border p-2.5">
            <div className="flex items-start justify-between gap-2 mb-1">
              <p className="text-xs font-medium truncate">{lead.name}</p>
              <Badge variant="outline" className="text-[9px] shrink-0" style={{ background: lead.score >= 75 ? '#22c55e20' : '#f59e0b20', color: lead.score >= 75 ? '#22c55e' : '#f59e0b' }}>{lead.score}</Badge>
            </div>
            <p className="text-[10px] text-muted-foreground line-clamp-2">{lead.industry}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function DemoSeo({ data }: { data: any }) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold">SEO Projects — Sample</h3>
      <div className="grid gap-2">
        {data.projects.map((p: any) => (
          <Card key={p.id}>
            <CardContent className="p-3">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <p className="text-sm font-medium">{p.name}</p>
                  <p className="text-[10px] text-muted-foreground" dir="ltr">{p.domain}</p>
                </div>
                <Badge variant="outline" className="text-[9px]">{p.avgScore}/100</Badge>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
                <div><p className="font-semibold">{p.pages}</p><p className="text-muted-foreground">Pages</p></div>
                <div><p className="font-semibold text-amber-600">{p.issues}</p><p className="text-muted-foreground">Issues</p></div>
                <div><p className="font-semibold text-blue-600">{p.backlinks}</p><p className="text-muted-foreground">Backlinks</p></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

function DemoAnalytics({ data }: { data: any }) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold">Analytics Overview — Sample</h3>
      <div className="grid grid-cols-3 gap-2">
        {Object.entries(data.metrics).slice(0, 6).map(([key, value]: any) => (
          <div key={key} className="rounded-lg bg-muted/50 p-2 text-center">
            <p className="text-sm font-bold">{typeof value === 'number' ? value.toLocaleString() : value}</p>
            <p className="text-[9px] text-muted-foreground">{key}</p>
          </div>
        ))}
      </div>
      <Card>
        <CardContent className="p-3">
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                <YAxis tick={{ fontSize: 9 }} />
                <Tooltip contentStyle={{ fontSize: 11 }} />
                <Bar dataKey="value" fill="#0A2A3A" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
