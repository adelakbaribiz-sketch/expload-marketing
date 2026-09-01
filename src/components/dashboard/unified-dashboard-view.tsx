'use client'

import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  PieChart,
  Pie,
  LineChart,
  Line,
} from 'recharts'
import {
  Users, DollarSign, Mail, FileText, Search, Megaphone, Share2, Link2,
  Globe2, Bot, Workflow, TrendingUp, Target, Award, Activity,
} from 'lucide-react'

const PHASE_ICONS: Record<string, any> = {
  'P1 Leads': Users,
  'P2 CRM': Target,
  'P3 Content': FileText,
  'P4 SEO': Search,
  'P5 Ads': Megaphone,
  'P6 Social': Share2,
  'P7 Backlinks': Link2,
  'P8 Analyzers': Globe2,
  'P9 AI': Bot,
  'P10 Workflow': Workflow,
}

const PHASE_COLORS: Record<string, string> = {
  'P1 Leads': '#10b981',
  'P2 CRM': '#8b5cf6',
  'P3 Content': '#3b82f6',
  'P4 SEO': '#f59e0b',
  'P5 Ads': '#ef4444',
  'P6 Social': '#ec4899',
  'P7 Backlinks': '#06b6d4',
  'P8 Analyzers': '#14b8a6',
  'P9 AI': '#a855f7',
  'P10 Workflow': '#6366f1',
}

export function UnifiedDashboardView() {
  const { data, isLoading } = useQuery({
    queryKey: ['unified-dashboard'],
    queryFn: async () => {
      const res = await fetch('/api/dashboard/unified')
      if (!res.ok) throw new Error('failed')
      return res.json()
    },
  })

  if (isLoading) {
    return (
      <div className="space-y-4 p-4 md:p-6">
        <Skeleton className="h-32 w-full" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-80 w-full" />
          <Skeleton className="h-80 w-full" />
        </div>
      </div>
    )
  }

  if (!data) return null

  const kpiCards = [
    { label: 'Total Leads', value: data.leads.total, icon: Users, color: 'text-emerald-600', bg: 'from-emerald-500 to-teal-600' },
    { label: 'Pipeline Value', value: `$${data.crm.pipelineValue.toLocaleString()}`, icon: DollarSign, color: 'text-violet-600', bg: 'from-violet-500 to-purple-600' },
    { label: 'Won Revenue', value: `$${data.crm.wonRevenue.toLocaleString()}`, icon: TrendingUp, color: 'text-emerald-600', bg: 'from-emerald-500 to-green-600' },
    { label: 'Emails Sent', value: data.email.sent, icon: Mail, color: 'text-blue-600', bg: 'from-blue-500 to-cyan-600' },
    { label: 'Content Pieces', value: data.content.pieces, icon: FileText, color: 'text-blue-600', bg: 'from-blue-500 to-indigo-600' },
    { label: 'SEO Avg Score', value: data.seo.avgScore, icon: Search, color: 'text-amber-600', bg: 'from-amber-500 to-orange-600' },
    { label: 'Ad Spend', value: `$${data.ads.spend.toLocaleString()}`, icon: Megaphone, color: 'text-rose-600', bg: 'from-rose-500 to-red-600' },
    { label: 'Social Followers', value: formatNumber(data.social.followers), icon: Share2, color: 'text-pink-600', bg: 'from-pink-500 to-rose-600' },
    { label: 'Backlinks Acquired', value: data.backlinks.acquired, icon: Link2, color: 'text-cyan-600', bg: 'from-cyan-500 to-blue-600' },
    { label: 'AI Recommendations', value: data.ai.recommendations, icon: Bot, color: 'text-violet-600', bg: 'from-violet-500 to-fuchsia-600' },
    { label: 'Export Markets', value: data.analyzers.exportMarkets, icon: Globe2, color: 'text-teal-600', bg: 'from-teal-500 to-cyan-600' },
    { label: 'Active Workflows', value: data.workflow.active, icon: Workflow, color: 'text-indigo-600', bg: 'from-indigo-500 to-blue-600' },
  ]

  return (
    <div className="space-y-6 p-4 md:p-6 animate-fade-in-up">
      {/* Health Score Banner */}
      <Card className="border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-teal-500/5">
        <CardContent className="p-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Activity className="h-5 w-5 text-emerald-600" />
                <h2 className="text-lg font-semibold">Marketing Health Score</h2>
              </div>
              <p className="text-sm text-muted-foreground">Cross-phase performance overview across all 10 marketing domains</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-center">
                <p className="text-4xl font-bold text-emerald-600">{data.healthScore}</p>
                <p className="text-xs text-muted-foreground">out of 100</p>
              </div>
              <div className="w-32">
                <Progress value={data.healthScore} className="h-2" />
                <p className="text-[10px] text-muted-foreground mt-1 text-center">
                  {data.healthScore >= 75 ? 'Excellent' : data.healthScore >= 50 ? 'Good' : data.healthScore >= 25 ? 'Needs Work' : 'Getting Started'}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
        {kpiCards.map((card, idx) => {
          const Icon = card.icon
          return (
            <Card key={card.label} className="relative overflow-hidden hover:shadow-md transition-shadow" style={{ animationDelay: `${idx * 30}ms` }}>
              <CardContent className="p-3">
                <div className={`grid place-items-center h-8 w-8 rounded-lg bg-gradient-to-br ${card.bg} text-white mb-2`}>
                  <Icon className="h-4 w-4" />
                </div>
                <p className="text-xl font-bold">{card.value}</p>
                <p className="text-[11px] text-muted-foreground truncate">{card.label}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Radar Chart - Phase Performance */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Award className="h-4 w-4 text-violet-600" />
              Phase Performance Radar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={data.phases}>
                  <PolarGrid stroke="var(--border)" />
                  <PolarAngleAxis dataKey="phase" tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" />
                  <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 9 }} stroke="var(--muted-foreground)" />
                  <Radar name="Score" dataKey="score" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.3} strokeWidth={2} />
                  <Tooltip contentStyle={{ background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Funnel Chart */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-600" />
              Marketing Funnel
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.funnel} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                  <YAxis type="category" dataKey="stage" tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" width={70} />
                  <Tooltip contentStyle={{ background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {data.funnel.map((entry: any, i: number) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Phase Breakdown */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Target className="h-4 w-4 text-blue-600" />
            All Phases Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-5">
            {data.phases.map((phase: any) => {
              const Icon = PHASE_ICONS[phase.phase] ?? Activity
              const color = PHASE_COLORS[phase.phase] ?? '#64748b'
              return (
                <div key={phase.phase} className="rounded-lg border p-3 hover:bg-muted/40 transition-colors">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="grid place-items-center h-7 w-7 rounded-md text-white shrink-0" style={{ background: color }}>
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <span className="text-xs font-medium truncate">{phase.phase}</span>
                  </div>
                  <p className="text-2xl font-bold mb-1">{phase.value}</p>
                  <Progress value={phase.score} className="h-1.5 mb-1" />
                  <p className="text-[10px] text-muted-foreground">{phase.score}/100 score</p>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Detailed Phase Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Leads Detail */}
        <PhaseCard title="Lead Generation" icon={Users} color="text-emerald-600">
          <StatRow label="Total" value={data.leads.total} />
          <StatRow label="New" value={data.leads.new} />
          <StatRow label="Qualified" value={data.leads.qualified} />
          <StatRow label="Won" value={data.leads.won} />
          <StatRow label="Avg Score" value={data.leads.avgScore} />
        </PhaseCard>

        {/* Email Detail */}
        <PhaseCard title="Email Marketing" icon={Mail} color="text-blue-600">
          <StatRow label="Campaigns" value={data.email.campaigns} />
          <StatRow label="Emails Sent" value={data.email.sent} />
          <StatRow label="Open Rate" value={`${data.email.openRate}%`} />
        </PhaseCard>

        {/* Content Detail */}
        <PhaseCard title="Content" icon={FileText} color="text-indigo-600">
          <StatRow label="Ideas" value={data.content.ideas} />
          <StatRow label="Pieces" value={data.content.pieces} />
          <StatRow label="Published" value={data.content.published} />
        </PhaseCard>

        {/* SEO Detail */}
        <PhaseCard title="SEO" icon={Search} color="text-amber-600">
          <StatRow label="Projects" value={data.seo.projects} />
          <StatRow label="Open Issues" value={data.seo.issues} />
          <StatRow label="Avg Score" value={data.seo.avgScore} />
          <StatRow label="Keywords" value={data.seo.keywords} />
          <StatRow label="Backlinks" value={data.seo.backlinks} />
        </PhaseCard>

        {/* Ads Detail */}
        <PhaseCard title="Advertising" icon={Megaphone} color="text-rose-600">
          <StatRow label="Campaigns" value={data.ads.campaigns} />
          <StatRow label="Spend" value={`$${data.ads.spend.toLocaleString()}`} />
          <StatRow label="Conversions" value={data.ads.conversions} />
          <StatRow label="ROAS" value={`${data.ads.roas}x`} />
        </PhaseCard>

        {/* Social Detail */}
        <PhaseCard title="Social Media" icon={Share2} color="text-pink-600">
          <StatRow label="Accounts" value={data.social.accounts} />
          <StatRow label="Posts" value={data.social.posts} />
          <StatRow label="Followers" value={formatNumber(data.social.followers)} />
          <StatRow label="Engagement" value={formatNumber(data.social.engagement)} />
        </PhaseCard>

        {/* Backlinks Detail */}
        <PhaseCard title="Backlinks" icon={Link2} color="text-cyan-600">
          <StatRow label="Opportunities" value={data.backlinks.opportunities} />
          <StatRow label="Acquired" value={data.backlinks.acquired} />
          <StatRow label="Avg DA" value={data.backlinks.avgDA} />
        </PhaseCard>

        {/* Analyzers Detail */}
        <PhaseCard title="Analyzers" icon={Globe2} color="text-teal-600">
          <StatRow label="Social Analyses" value={data.analyzers.socialAnalyses} />
          <StatRow label="Competitors" value={data.analyzers.competitors} />
          <StatRow label="Export Markets" value={data.analyzers.exportMarkets} />
          <StatRow label="Products" value={data.analyzers.exportProducts} />
        </PhaseCard>

        {/* AI + Workflow Detail */}
        <PhaseCard title="AI & Workflows" icon={Bot} color="text-violet-600">
          <StatRow label="AI Recommendations" value={data.ai.recommendations} />
          <StatRow label="Pending Recs" value={data.ai.pending} />
          <StatRow label="Workflows" value={data.workflow.total} />
          <StatRow label="Active" value={data.workflow.active} />
        </PhaseCard>
      </div>
    </div>
  )
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

function PhaseCard({ title, icon: Icon, color, children }: { title: string; icon: any; color: string; children: React.ReactNode }) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Icon className={`h-4 w-4 ${color}`} />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1.5">
        {children}
      </CardContent>
    </Card>
  )
}

function StatRow({ label, value }: { label: string; value: any }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  )
}
