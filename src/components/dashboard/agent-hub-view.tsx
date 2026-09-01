'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import {
  Zap, Search, ArrowRight, Sparkles, TrendingUp, Send, BarChart3,
  Target, Mail, MessageCircle, Bot, Workflow, Calendar, Brain,
  Handshake, Bell, Brain as BrainIcon, Globe2, ShoppingBag,
  Megaphone, Link2, Microscope, DollarSign, Shield, Users,
  Crown, Package, Bitcoin, Wand2, FileText, Play,
} from 'lucide-react'

interface AgentHubProps {
  onNavigate?: (view: string) => void
}

interface AgentAction {
  id: string
  label: string
  description: string
  icon: any
  hint?: string
  color: string
  view?: string  // navigation target
  apiEndpoint?: string  // direct action endpoint
}

const QUICK_ACTIONS: AgentAction[] = [
  { id: 'find-leads', label: 'Find New Leads', description: 'AI-powered lead search via Google Maps + Serper', icon: Search, color: '#3b82f6', view: 'leads' },
  { id: 'enrich-lead', label: 'Enrich Lead', description: 'Extract contact info + scoring with LLM', icon: Sparkles, color: '#10b981', view: 'leads' },
  { id: 'run-campaign', label: 'Launch Email Campaign', description: 'Send bulk emails with templates', icon: Mail, color: '#f59e0b', view: 'campaigns' },
  { id: 'analyze-competitor', label: 'Analyze Competitor', description: '10-factor deep competitor analysis', icon: Microscope, color: '#8b5cf6', view: 'competitor-analysis' },
  { id: 'schedule-social', label: 'Schedule Social Posts', description: 'Multi-platform social media scheduling', icon: MessageCircle, color: '#ec4899', view: 'social' },
  { id: 'create-content', label: 'Generate Content', description: 'AI content ideas + draft generator', icon: FileText, color: '#06b6d4', view: 'content' },
  { id: 'run-seo-crawl', label: 'Run SEO Audit', description: 'Crawl site + 50+ on-page checks', icon: BarChart3, color: '#10b981', view: 'seo' },
  { id: 'launch-ad', label: 'Launch Ad Campaign', description: 'Google/Meta/TikTok ad management', icon: Megaphone, color: '#ef4444', view: 'ads' },
  { id: 'start-negotiation', label: 'Start Negotiation', description: 'Generate AI proposals with 6-round fallback', icon: Handshake, color: '#0A2A3A', view: 'negotiation' },
  { id: 'onboard-customer', label: 'Onboard New Customer', description: '6-step wizard: crawl site, ingest docs, generate proposal', icon: Wand2, color: '#7c3aed', view: 'onboarding-wizard' },
  { id: 'run-diagnostics', label: 'Run Diagnostics', description: 'AI business diagnostics + recommendations', icon: Play, color: '#f97316', view: 'diagnostics' },
  { id: 'autonomous-agent', label: 'Run Autonomous Agent', description: '24/7 marketing agent — fully autonomous', icon: Bot, color: '#FF5722', view: 'autonomous' },
]

const MODULE_SHORTCUTS = [
  { label: 'Multi-LLM', icon: Brain, view: 'llm-settings', color: '#3b82f6' },
  { label: 'Notifications', icon: Bell, view: 'notification-center', color: '#f59e0b' },
  { label: 'Distributors', icon: Handshake, view: 'distributors', color: '#10b981' },
  { label: 'Internal Portal', icon: Shield, view: 'internal-portal', color: '#8b5cf6' },
  { label: 'Payment Gateways', icon: Bitcoin, view: 'payment-gateways', color: '#f59e0b' },
  { label: 'Investors', icon: DollarSign, view: 'investor-hub', color: '#ec4899' },
  { label: 'CRM', icon: Target, view: 'crm', color: '#06b6d4' },
  { label: 'Reseller Hub', icon: Package, view: 'reseller', color: '#7c3aed' },
  { label: 'Calendar', icon: Calendar, view: 'calendar', color: '#3b82f6' },
  { label: 'Goals', icon: TrendingUp, view: 'goals', color: '#10b981' },
  { label: 'Workflow', icon: Workflow, view: 'workflow', color: '#f59e0b' },
  { label: 'Super Admin', icon: Crown, view: 'super-admin', color: '#0A2A3A' },
]

export function AgentHubView({ onNavigate }: AgentHubProps) {
  const [searchQuery, setSearchQuery] = useState('')

  const { data: statsData } = useQuery({
    queryKey: ['agent-hub-stats'],
    queryFn: async () => {
      const [statsRes, notifRes] = await Promise.all([
        fetch('/api/stats').catch(() => null),
        fetch('/api/notifications/unread-count').catch(() => null),
      ])
      const stats = statsRes?.ok ? await statsRes.json() : null
      const notif = notifRes?.ok ? await notifRes.json() : { count: 0 }
      return { stats, notif }
    },
    refetchInterval: 30000,
  })

  const stats = statsData?.stats
  const unreadCount = statsData?.notif?.count ?? 0

  const handleAction = (action: AgentAction) => {
    if (action.view && onNavigate) {
      onNavigate(action.view)
      toast.success(`Opening ${action.label}...`)
    } else if (action.apiEndpoint) {
      // Trigger the action directly via API
      toast.success(`Running ${action.label}...`)
      fetch(action.apiEndpoint, { method: 'POST' }).catch(() => {})
    }
  }

  const filteredActions = QUICK_ACTIONS.filter(a =>
    !searchQuery ||
    a.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.description.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  return (
    <div className="space-y-6">
      {/* Hero header */}
      <div className="bg-gradient-to-br from-[#0A2A3A] to-[#1e3a4a] text-white rounded-xl p-8 shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold flex items-center gap-3">
              <Zap className="h-10 w-10" style={{ color: '#FF5722' }} />
              Agent Hub
            </h1>
            <p className="text-lg opacity-90 mt-2">
              One-click command center — everything you need to run your marketing, sales, and partnerships in one place
            </p>
          </div>
          <div className="text-right text-sm">
            <div className="opacity-75">Unread notifications</div>
            <div className="text-3xl font-bold" style={{ color: '#FF5722' }}>{unreadCount}</div>
          </div>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-muted-foreground">Total Leads</div>
                <div className="text-2xl font-bold">{stats?.totalLeads ?? '—'}</div>
              </div>
              <Search className="h-6 w-6 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-muted-foreground">Active Campaigns</div>
                <div className="text-2xl font-bold">{stats?.activeCampaigns ?? '—'}</div>
              </div>
              <Mail className="h-6 w-6 text-amber-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-muted-foreground">AI Agents Running</div>
                <div className="text-2xl font-bold">{stats?.activeAgents ?? '—'}</div>
              </div>
              <Bot className="h-6 w-6 text-purple-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-muted-foreground">Revenue (MTD)</div>
                <div className="text-2xl font-bold">${(stats?.revenueMTD ?? 0).toLocaleString()}</div>
              </div>
              <DollarSign className="h-6 w-6 text-emerald-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Search className="h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Search actions, modules, or commands — e.g. 'find leads', 'send email', 'analyze competitor'..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="border-0 shadow-none focus-visible:ring-0 text-base"
            />
            <Badge variant="secondary">{filteredActions.length} actions</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions grid */}
      <div>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Sparkles className="h-5 w-5" style={{ color: '#FF5722' }} />
          One-Click Actions
        </h2>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {filteredActions.map(action => {
            const Icon = action.icon
            return (
              <Card
                key={action.id}
                className="cursor-pointer hover:shadow-lg hover:border-primary/40 transition-all group"
                onClick={() => handleAction(action)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div
                      className="grid place-items-center h-10 w-10 rounded-lg shrink-0 group-hover:scale-110 transition-transform"
                      style={{ background: `${action.color}15`, color: action.color }}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold flex items-center justify-between">
                        <span>{action.label}</span>
                        <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{action.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
          {filteredActions.length === 0 && (
            <Card className="md:col-span-3">
              <CardContent className="p-8 text-center text-muted-foreground">
                No actions match "{searchQuery}". Try a different search.
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Module shortcuts */}
      <div>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <BarChart3 className="h-5 w-5" style={{ color: '#0A2A3A' }} />
          Module Shortcuts
        </h2>
        <div className="grid grid-cols-3 md:grid-cols-6 lg:grid-cols-12 gap-2">
          {MODULE_SHORTCUTS.map(mod => {
            const Icon = mod.icon
            return (
              <button
                key={mod.view}
                onClick={() => onNavigate?.(mod.view)}
                className="flex flex-col items-center gap-1 p-3 rounded-lg border hover:shadow-md hover:border-primary/40 transition-all"
                style={{ background: `${mod.color}08` }}
                title={mod.label}
              >
                <Icon className="h-5 w-5" style={{ color: mod.color }} />
                <span className="text-[10px] font-medium text-center truncate w-full">{mod.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Autonomous agent CTA */}
      <Card className="border-2 border-dashed border-primary/30 bg-primary/5">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="grid place-items-center h-12 w-12 rounded-full bg-gradient-to-br from-[#FF5722] to-[#FF7043] text-white">
                <Bot className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-semibold">Autonomous Marketing Agent</h3>
                <p className="text-sm text-muted-foreground">
                  Let the AI agent run your entire marketing workflow 24/7 — leads, content, social, ads, reports. Hands-free.
                </p>
              </div>
            </div>
            <Button onClick={() => onNavigate?.('autonomous')} className="bg-[#FF5722] hover:bg-[#FF7043]">
              <Play className="h-4 w-4 mr-1" /> Launch Agent
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
