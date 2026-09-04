'use client'

import { useEffect, useState } from 'react'
import { useAppStore } from '@/store/app-store'
import { useQuery } from '@tanstack/react-query'
import {
  LayoutDashboard,
  Users2,
  FolderKanban,
  UserSearch,
  Sparkles,
  Settings,
  Building2,
  ChevronLeft,
  Activity,
  Rocket,
  Mail,
  Target,
  Search,
  Lightbulb,
  Share2,
  Megaphone,
  BarChart3,
  Bot,
  Workflow,
  Link2,
  Globe2,
  Gauge,
  MessageCircle,
  FlaskConical,
  FileText,
  Play,
  Calendar,
  Calculator,
  Ear,
  Bell,
  CreditCard,
  Map,
  Code,
  Crown,
  ShoppingBag,
  Package,
  BarChart3 as BarChart3Icon,
  Zap,
  Users as UsersIcon,
  ShieldCheck,
  Palette,
  DollarSign as DollarSignIcon,
  Megaphone as MegaphoneIcon,
  Link2 as Link2Icon,
  Microscope as MicroscopeIcon,
  DollarSign as InvestorIcon,
  Handshake as HandshakeIcon,
  Shield as ShieldIcon,
  Bitcoin as BitcoinIcon,
  Brain as BrainIcon,
  Wand2 as Wand2Icon,
  Bell as BellIcon,
  Headset as HeadsetIcon,
  Wallet as WalletIcon,
  LifeBuoy as LifeBuoyIcon,
  Network as NetworkIcon,
  Rocket as RocketIcon,
  Calendar as CalendarIcon2,
  PlayCircle as PlayCircleIcon,
  BrainCircuit as BrainCircuitIcon,
  Webhook as WebhookIcon,
  ClipboardCheck as ClipboardCheckIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { LogOut } from 'lucide-react'
import { useI18n } from '@/i18n/provider'
import { useAuth } from '@/components/auth/session-provider'

type View = 'dashboard' | 'unified' | 'roadmap' | 'quick-setup' | 'marketplace' | 'club' | 'ecommerce' | 'reseller' | 'attribution' | 'team' | 'super-admin' | 'white-label' | 'finance' | 'platform' | 'promo-links' | 'competitor-analysis' | 'investor-hub' | 'tenants' | 'projects' | 'leads' | 'generator' | 'campaigns' | 'crm' | 'engagement' | 'seo' | 'content' | 'growth' | 'ads' | 'social' | 'listening' | 'analytics' | 'ai' | 'advisor' | 'workflow' | 'autonomous' | 'backlinks' | 'social-analyzer' | 'export-analyzer' | 'calendar' | 'goals' | 'pricing' | 'activity' | 'settings' | 'distributors' | 'internal-portal' | 'payment-gateways' | 'llm-settings' | 'onboarding-wizard' | 'negotiation' | 'notification-center' | 'agent-hub' | 'virtual-assistants' | 'payroll' | 'support-plans' | 'graph-agent' | 'financial-reports' | 'project-intake' | 'events-calendar' | 'sandbox-demo' | 'ai-decisions' | 'webhooks' | 'approvals'

interface SidebarProps {
  view: View
  onViewChange: (v: View) => void
}

export function Sidebar({ view, onViewChange }: SidebarProps) {
  const { sidebarOpen, setSidebarOpen, activeTenantId, setActiveTenant } = useAppStore()
  const { t } = useI18n()
  const { user, logout } = useAuth()
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    'overview': true,
    'acquire': true,
    'engage': false,
    'grow': false,
    'monetize': false,
    'system': false,
  })

  const toggleSection = (section: string) => setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }))

  type NavItem = { id: View; label: string; icon: React.ElementType; hint?: string }
  type NavSection = { key: string; title: string; items: NavItem[] }

  const SECTIONS: NavSection[] = [
    {
      key: 'overview', title: t('nav.sectionOverview') || 'Overview',
      items: [
        { id: 'dashboard', label: t('nav.dashboard'), icon: LayoutDashboard },
        { id: 'agent-hub', label: t('nav.agentHub'), icon: Zap, hint: '⚡' },
        { id: 'graph-agent', label: 'Graph Agent', icon: NetworkIcon, hint: 'DAG' },
        { id: 'project-intake', label: 'Project Brief & Pricing', icon: RocketIcon, hint: 'NEW' },
        { id: 'events-calendar', label: 'Events & Scheduler', icon: CalendarIcon2, hint: '📅' },
        { id: 'unified', label: t('nav.unified'), icon: Gauge, hint: 'ALL' },
        { id: 'roadmap', label: t('nav.roadmap'), icon: Map, hint: 'STEP' },
        { id: 'quick-setup', label: t('nav.quickSetup'), icon: Zap, hint: '⚡' },
        { id: 'goals', label: t('nav.goals'), icon: Target, hint: 'PLAN' },
        { id: 'calendar', label: t('nav.calendar'), icon: Calendar, hint: 'ALL' },
      ],
    },
    {
      key: 'acquire', title: t('nav.sectionAcquire') || 'Acquire (P1-P2)',
      items: [
        { id: 'leads', label: t('nav.leads'), icon: UserSearch, hint: 'P1' },
        { id: 'generator', label: t('nav.generator'), icon: Sparkles, hint: 'AI' },
        { id: 'crm', label: t('nav.crm'), icon: Target, hint: 'P2' },
        { id: 'campaigns', label: t('nav.campaigns'), icon: Mail, hint: 'P2' },
        { id: 'engagement', label: t('nav.engagement'), icon: MessageCircle, hint: 'P2' },
        { id: 'attribution', label: t('nav.attribution'), icon: BarChart3Icon, hint: '📊' },
        { id: 'competitor-analysis', label: t('nav.competitorAnalysis'), icon: MicroscopeIcon, hint: '🔬' },
        { id: 'investor-hub', label: t('nav.investorHub'), icon: InvestorIcon, hint: '💰' },
      ],
    },
    {
      key: 'grow', title: t('nav.sectionGrow') || 'Grow (P3-P8)',
      items: [
        { id: 'content', label: t('nav.content'), icon: Lightbulb, hint: 'P3' },
        { id: 'seo', label: t('nav.seo'), icon: Search, hint: 'P4' },
        { id: 'growth', label: t('nav.growth'), icon: FlaskConical, hint: 'P4' },
        { id: 'ads', label: t('nav.ads'), icon: Megaphone, hint: 'P5' },
        { id: 'social', label: t('nav.social'), icon: Share2, hint: 'P6' },
        { id: 'listening', label: t('nav.listening'), icon: Ear, hint: 'P6' },
        { id: 'backlinks', label: t('nav.backlinks'), icon: Link2, hint: 'P7' },
        { id: 'social-analyzer', label: t('nav.socialAnalyzer'), icon: BarChart3, hint: 'P8' },
        { id: 'export-analyzer', label: t('nav.exportAnalyzer'), icon: Globe2, hint: 'P8' },
        { id: 'analytics', label: t('nav.analytics'), icon: BarChart3, hint: 'P8' },
      ],
    },
    {
      key: 'monetize', title: t('nav.sectionMonetize') || 'Monetize & AI',
      items: [
        { id: 'ai', label: t('nav.ai'), icon: Bot, hint: 'P9' },
        { id: 'advisor', label: t('nav.advisor'), icon: FileText, hint: 'P9' },
        { id: 'workflow', label: t('nav.workflow'), icon: Workflow, hint: 'P10' },
        { id: 'autonomous', label: t('nav.autonomous'), icon: Play, hint: 'P10' },
        { id: 'pricing', label: 'Pricing & Billing', icon: CreditCard, hint: '$' },
        { id: 'marketplace', label: t('nav.marketplace'), icon: Code, hint: 'API' },
        { id: 'club', label: t('nav.club'), icon: Crown, hint: '⭐' },
        { id: 'ecommerce', label: t('nav.ecommerce'), icon: ShoppingBag, hint: '🛒' },
        { id: 'reseller', label: t('nav.reseller'), icon: Package, hint: '💰' },
        { id: 'distributors', label: t('nav.distributors'), icon: HandshakeIcon, hint: 'B2B' },
        { id: 'payment-gateways', label: t('nav.paymentGateways'), icon: BitcoinIcon, hint: 'GW' },
        { id: 'llm-settings', label: t('nav.llmSettings'), icon: BrainIcon, hint: 'AI' },
        { id: 'ai-decisions', label: 'AI Decisions', icon: BrainCircuitIcon, hint: 'WHY' },
        { id: 'onboarding-wizard', label: t('nav.onboardingWizard'), icon: Wand2Icon, hint: 'WISE' },
        { id: 'negotiation', label: t('nav.negotiation'), icon: HandshakeIcon, hint: 'NEG' },
        { id: 'virtual-assistants', label: 'Virtual Assistants', icon: HeadsetIcon, hint: 'VA' },
        { id: 'support-plans', label: 'Support Plans', icon: LifeBuoyIcon, hint: 'SLA' },
        // Platform-operator-only: pays the SaaS's own staff out of platform
        // revenue, not a tenant's own business feature — and already
        // server-side gated to platform staff, so every other tenant role
        // clicking it was a guaranteed dead-end 403.
        ...((user?.internalPlatformRole || user?.isSuperAdmin)
          ? [{ id: 'payroll' as const, label: 'Payroll & Salary', icon: WalletIcon, hint: '$$' }]
          : []),
      ],
    },
    {
      key: 'system', title: t('nav.sectionSystem') || 'System',
      items: [
        { id: 'notification-center', label: t('nav.notificationCenter'), icon: BellIcon, hint: '🔔' },
        ...(user?.internalPlatformRole
          ? [{ id: 'internal-portal' as const, label: t('nav.internalPortal'), icon: ShieldIcon, hint: 'STAFF' }]
          : []),
        ...(user?.isSuperAdmin
          ? [{ id: 'super-admin' as const, label: t('nav.superAdmin'), icon: Crown, hint: 'ADMIN' }]
          : []),
        { id: 'white-label', label: t('nav.whiteLabel'), icon: Palette, hint: 'WL' },
        { id: 'finance', label: t('nav.finance'), icon: DollarSignIcon, hint: '$' },
        { id: 'financial-reports', label: 'Financial Reports', icon: BarChart3, hint: '📊' },
        // Platform-operator-only: markets THIS SaaS product itself (its own
        // referral program, its own financial dashboard), not the tenant's
        // business — see SITEMAP.md §4.1.
        ...((user?.internalPlatformRole || user?.isSuperAdmin)
          ? [{ id: 'platform' as const, label: t('nav.platform'), icon: MegaphoneIcon, hint: '📣' }]
          : []),
        { id: 'promo-links', label: t('nav.promoLinks'), icon: Link2Icon, hint: '🔗' },
        { id: 'team', label: t('nav.team'), icon: UsersIcon, hint: '👥' },
        { id: 'approvals', label: 'Approval Queue', icon: ClipboardCheckIcon, hint: 'OK' },
        { id: 'webhooks', label: 'Webhooks', icon: WebhookIcon, hint: 'DEV' },
        { id: 'projects', label: t('nav.projects'), icon: FolderKanban },
        { id: 'tenants', label: t('nav.tenants'), icon: Building2, hint: 'Multi' },
        { id: 'activity', label: t('nav.activity'), icon: Activity },
        { id: 'settings', label: t('nav.settings'), icon: Settings },
        { id: 'sandbox-demo', label: 'Demo Sandbox', icon: PlayCircleIcon, hint: '▶' },
      ],
    },
  ]

  const { data: tenantsData } = useQuery({
    queryKey: ['tenants'],
    queryFn: async () => {
      const res = await fetch('/api/tenants')
      if (!res.ok) return { tenants: [] }
      return res.json()
    },
  })

  useEffect(() => {
    if (!activeTenantId && tenantsData?.tenants?.length) {
      setActiveTenant(tenantsData.tenants[0].id)
    }
  }, [activeTenantId, tenantsData, setActiveTenant])

  return (
    <>
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm md:hidden animate-fade-in"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <aside
        className={cn(
          'fixed md:sticky top-0 z-40 h-screen w-72 shrink-0 border-l border-sidebar-border bg-sidebar text-sidebar-foreground transition-transform duration-200',
          sidebarOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-full md:hidden',
        )}
      >
        <div className="flex h-full flex-col">
          {/* Brand */}
          <div className="flex items-center justify-between gap-2 p-4 border-b border-sidebar-border">
            <div className="flex items-center gap-2 min-w-0">
              <div className="grid place-items-center h-9 w-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-sm shrink-0">
                <Rocket className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">{t('app.name')}</p>
                <p className="text-xs text-muted-foreground truncate">{t('app.tagline')}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 md:hidden"
              onClick={() => setSidebarOpen(false)}
              aria-label="Close menu"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>

          {/* Tenant switcher */}
          <div className="p-3 border-b border-sidebar-border">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">
              {t('header.activeTenant')}
            </p>
            <Select
              value={activeTenantId ?? undefined}
              onValueChange={(v) => setActiveTenant(v)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="—" />
              </SelectTrigger>
              <SelectContent>
                {(tenantsData?.tenants ?? []).map((t: any) => (
                  <SelectItem key={t.id} value={t.id}>
                    <div className="flex items-center gap-2 w-full">
                      <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="truncate">{t.name}</span>
                      <Badge variant="outline" className="ml-auto text-[10px] px-1 py-0">
                        {t.plan}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Nav — Collapsible Sections */}
          <ScrollArea className="flex-1 px-2 py-3 scroll-thin">
            <nav className="space-y-1">
              {SECTIONS.map((section) => {
                const isExpanded = expandedSections[section.key]
                const hasActive = section.items.some(item => item.id === view)
                return (
                  <div key={section.key} className="mb-1">
                    {/* Section header */}
                    <button
                      onClick={() => toggleSection(section.key)}
                      className={cn(
                        'flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider transition-colors',
                        hasActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
                      )}
                    >
                      <ChevronLeft className={cn('h-3 w-3 transition-transform', isExpanded ? '-rotate-90' : 'rotate-0')} />
                      {section.title}
                    </button>
                    {/* Section items */}
                    {isExpanded && (
                      <div className="space-y-0.5 mt-0.5">
                        {section.items.map((item) => {
                          const Icon = item.icon
                          const active = view === item.id
                          return (
                            <button
                              key={item.id}
                              onClick={() => {
                                onViewChange(item.id)
                                setSidebarOpen(false)
                              }}
                              className={cn(
                                'group flex w-full items-center gap-3 rounded-lg px-3 py-1.5 text-sm transition-all',
                                active
                                  ? 'bg-sidebar-primary text-sidebar-primary-foreground font-medium shadow-sm'
                                  : 'text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground',
                              )}
                            >
                              <Icon
                                className={cn(
                                  'h-4 w-4 shrink-0 transition-colors',
                                  active ? 'text-primary' : 'text-muted-foreground',
                                )}
                              />
                              <span className="flex-1 text-start truncate">{item.label}</span>
                              {item.hint && (
                                <Badge
                                  variant="secondary"
                                  className="text-[10px] px-1.5 py-0 h-4 font-mono"
                                >
                                  {item.hint}
                                </Badge>
                              )}
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </nav>
          </ScrollArea>

          {/* Footer */}
          <div className="border-t border-sidebar-border p-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded-lg bg-sidebar-accent/40 p-2.5 text-xs text-left hover:bg-sidebar-accent/70 transition-colors"
                >
                  <div className="grid place-items-center h-7 w-7 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 shrink-0">
                    <Users2 className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{user?.name || user?.email || '—'}</p>
                    <p className="text-muted-foreground truncate text-[11px]">{user?.role ?? ''}</p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" side="top" className="w-56">
                <DropdownMenuLabel className="truncate">{user?.email ?? ''}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onViewChange('settings')}>
                  <Settings className="h-4 w-4" />
                  {t('nav.settings') || 'Settings'}
                </DropdownMenuItem>
                <DropdownMenuItem variant="destructive" onClick={() => logout()}>
                  <LogOut className="h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </aside>
    </>
  )
}

export type { View }
