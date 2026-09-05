'use client'

import { useEffect, useState, useRef } from 'react'
import dynamic from 'next/dynamic'
import { Sidebar, type View } from '@/components/dashboard/sidebar'
import { Header } from '@/components/dashboard/header'
import { CommandPalette } from '@/components/i18n/command-palette'
import { AuthModal } from '@/components/auth/auth-modal'
import { useAuth } from '@/components/auth/session-provider'
import { useAppStore } from '@/store/app-store'
import { useAuthStore } from '@/store/auth-store'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Rocket, LogIn, Loader2 } from 'lucide-react'
import { useI18n } from '@/i18n/provider'
import { LanguageSwitcher } from '@/components/i18n/language-switcher'

// All 63 dashboard views (+ the marketing landing page) are code-split via
// next/dynamic instead of statically imported: previously every one of
// them — and everything they import, e.g. recharts — shipped in the initial
// bundle for every user regardless of which single view they actually
// opened. Each now loads only when its `case` in RenderView is first
// reached. See FRONTEND-ARCHITECTURE.md "Performance".
function ViewLoading() {
  return (
    <div className="p-6 space-y-3">
      <div className="h-6 w-48 rounded bg-muted animate-pulse" />
      <div className="h-32 w-full rounded bg-muted animate-pulse" />
      <div className="h-32 w-full rounded bg-muted animate-pulse" />
    </div>
  )
}

const DashboardView = dynamic(() => import('@/components/dashboard/dashboard-view').then(m => m.DashboardView), { loading: () => <ViewLoading /> })
const LeadsView = dynamic(() => import('@/components/dashboard/leads-view').then(m => m.LeadsView), { loading: () => <ViewLoading /> })
const GeneratorView = dynamic(() => import('@/components/dashboard/generator-view').then(m => m.GeneratorView), { loading: () => <ViewLoading /> })
const CampaignsView = dynamic(() => import('@/components/dashboard/campaigns-view').then(m => m.CampaignsView), { loading: () => <ViewLoading /> })
const CrmView = dynamic(() => import('@/components/dashboard/crm-view').then(m => m.CrmView), { loading: () => <ViewLoading /> })
const SeoView = dynamic(() => import('@/components/dashboard/seo-view').then(m => m.SeoView), { loading: () => <ViewLoading /> })
const ContentView = dynamic(() => import('@/components/dashboard/content-view').then(m => m.ContentView), { loading: () => <ViewLoading /> })
const SocialView = dynamic(() => import('@/components/dashboard/social-view').then(m => m.SocialView), { loading: () => <ViewLoading /> })
const AdsView = dynamic(() => import('@/components/dashboard/ads-view').then(m => m.AdsView), { loading: () => <ViewLoading /> })
const AnalyticsView = dynamic(() => import('@/components/dashboard/analytics-view').then(m => m.AnalyticsView), { loading: () => <ViewLoading /> })
const AiAgentsView = dynamic(() => import('@/components/dashboard/ai-agents-view').then(m => m.AiAgentsView), { loading: () => <ViewLoading /> })
const WorkflowView = dynamic(() => import('@/components/dashboard/workflow-view').then(m => m.WorkflowView), { loading: () => <ViewLoading /> })
const BacklinksView = dynamic(() => import('@/components/dashboard/backlinks-view').then(m => m.BacklinksView), { loading: () => <ViewLoading /> })
const SocialAnalyzerView = dynamic(() => import('@/components/dashboard/social-analyzer-view').then(m => m.SocialAnalyzerView), { loading: () => <ViewLoading /> })
const ExportAnalyzerView = dynamic(() => import('@/components/dashboard/export-analyzer-view').then(m => m.ExportAnalyzerView), { loading: () => <ViewLoading /> })
const UnifiedDashboardView = dynamic(() => import('@/components/dashboard/unified-dashboard-view').then(m => m.UnifiedDashboardView), { loading: () => <ViewLoading /> })
const EngagementHubView = dynamic(() => import('@/components/dashboard/engagement-hub-view').then(m => m.EngagementHubView), { loading: () => <ViewLoading /> })
const GrowthView = dynamic(() => import('@/components/dashboard/growth-view').then(m => m.GrowthView), { loading: () => <ViewLoading /> })
const AiAdvisorHubView = dynamic(() => import('@/components/dashboard/ai-advisor-hub-view').then(m => m.AiAdvisorHubView), { loading: () => <ViewLoading /> })
const AutonomousAgentView = dynamic(() => import('@/components/dashboard/autonomous-agent-view').then(m => m.AutonomousAgentView), { loading: () => <ViewLoading /> })
const PricingView = dynamic(() => import('@/components/dashboard/pricing-view').then(m => m.PricingView), { loading: () => <ViewLoading /> })
const GoalsView = dynamic(() => import('@/components/dashboard/goals-view').then(m => m.GoalsView), { loading: () => <ViewLoading /> })
const CalendarView = dynamic(() => import('@/components/dashboard/calendar-view').then(m => m.CalendarView), { loading: () => <ViewLoading /> })
const SocialListeningView = dynamic(() => import('@/components/dashboard/social-listening-view').then(m => m.SocialListeningView), { loading: () => <ViewLoading /> })
const LandingPage = dynamic(() => import('@/components/dashboard/landing-page').then(m => m.LandingPage), { loading: () => <ViewLoading /> })
const ProgressiveRoadmapView = dynamic(() => import('@/components/dashboard/progressive-roadmap-view').then(m => m.ProgressiveRoadmapView), { loading: () => <ViewLoading /> })
const MarketplaceView = dynamic(() => import('@/components/dashboard/marketplace-view').then(m => m.MarketplaceView), { loading: () => <ViewLoading /> })
const ClubView = dynamic(() => import('@/components/dashboard/club-view').then(m => m.ClubView), { loading: () => <ViewLoading /> })
const EcommerceView = dynamic(() => import('@/components/dashboard/ecommerce-view').then(m => m.EcommerceView), { loading: () => <ViewLoading /> })
const ResellerView = dynamic(() => import('@/components/dashboard/reseller-view').then(m => m.ResellerView), { loading: () => <ViewLoading /> })
const AttributionView = dynamic(() => import('@/components/dashboard/attribution-view').then(m => m.AttributionView), { loading: () => <ViewLoading /> })
const QuickSetupView = dynamic(() => import('@/components/dashboard/quick-setup-view').then(m => m.QuickSetupView), { loading: () => <ViewLoading /> })
const TeamView = dynamic(() => import('@/components/dashboard/team-view').then(m => m.TeamView), { loading: () => <ViewLoading /> })
const SuperAdminView = dynamic(() => import('@/components/dashboard/super-admin-view').then(m => m.SuperAdminView), { loading: () => <ViewLoading /> })
const WhiteLabelView = dynamic(() => import('@/components/dashboard/white-label-view').then(m => m.WhiteLabelView), { loading: () => <ViewLoading /> })
const FinanceView = dynamic(() => import('@/components/dashboard/finance-view').then(m => m.FinanceView), { loading: () => <ViewLoading /> })
const PlatformPromotionView = dynamic(() => import('@/components/dashboard/platform-promotion-view').then(m => m.PlatformPromotionView), { loading: () => <ViewLoading /> })
const PromoLinkView = dynamic(() => import('@/components/dashboard/promo-link-view').then(m => m.PromoLinkView), { loading: () => <ViewLoading /> })
const CompetitorAnalysisView = dynamic(() => import('@/components/dashboard/competitor-analysis-view').then(m => m.CompetitorAnalysisView), { loading: () => <ViewLoading /> })
const InvestorHubView = dynamic(() => import('@/components/dashboard/investor-hub-view').then(m => m.InvestorHubView), { loading: () => <ViewLoading /> })
const TenantsView = dynamic(() => import('@/components/dashboard/tenants-view').then(m => m.TenantsView), { loading: () => <ViewLoading /> })
const ProjectsView = dynamic(() => import('@/components/dashboard/projects-view').then(m => m.ProjectsView), { loading: () => <ViewLoading /> })
const ActivityView = dynamic(() => import('@/components/dashboard/activity-view').then(m => m.ActivityView), { loading: () => <ViewLoading /> })
const SettingsView = dynamic(() => import('@/components/dashboard/settings-view').then(m => m.SettingsView), { loading: () => <ViewLoading /> })
const DistributorView = dynamic(() => import('@/components/dashboard/distributor-view').then(m => m.DistributorView), { loading: () => <ViewLoading /> })
const InternalPortalView = dynamic(() => import('@/components/dashboard/internal-portal-view').then(m => m.InternalPortalView), { loading: () => <ViewLoading /> })
const PaymentGatewaysView = dynamic(() => import('@/components/dashboard/payment-gateways-view').then(m => m.PaymentGatewaysView), { loading: () => <ViewLoading /> })
const LlmSettingsView = dynamic(() => import('@/components/dashboard/llm-settings-view').then(m => m.LlmSettingsView), { loading: () => <ViewLoading /> })
const OnboardingWizardView = dynamic(() => import('@/components/dashboard/onboarding-wizard-view').then(m => m.OnboardingWizardView), { loading: () => <ViewLoading /> })
const NegotiationView = dynamic(() => import('@/components/dashboard/negotiation-view').then(m => m.NegotiationView), { loading: () => <ViewLoading /> })
const NotificationCenterView = dynamic(() => import('@/components/dashboard/notification-center-view').then(m => m.NotificationCenterView), { loading: () => <ViewLoading /> })
const AiDecisionsView = dynamic(() => import('@/components/dashboard/ai-decisions-view').then(m => m.AiDecisionsView), { loading: () => <ViewLoading /> })
const AgentHubView = dynamic(() => import('@/components/dashboard/agent-hub-view').then(m => m.AgentHubView), { loading: () => <ViewLoading /> })
const VirtualAssistantView = dynamic(() => import('@/components/dashboard/virtual-assistant-view').then(m => m.VirtualAssistantView), { loading: () => <ViewLoading /> })
const PayrollView = dynamic(() => import('@/components/dashboard/payroll-view').then(m => m.PayrollView), { loading: () => <ViewLoading /> })
const SupportPlansView = dynamic(() => import('@/components/dashboard/support-plans-view').then(m => m.SupportPlansView), { loading: () => <ViewLoading /> })
const GraphAgentView = dynamic(() => import('@/components/dashboard/graph-agent-view').then(m => m.GraphAgentView), { loading: () => <ViewLoading /> })
const FinancialReportsView = dynamic(() => import('@/components/dashboard/financial-reports-view').then(m => m.FinancialReportsView), { loading: () => <ViewLoading /> })
const ProjectIntakeView = dynamic(() => import('@/components/dashboard/project-intake-view').then(m => m.ProjectIntakeView), { loading: () => <ViewLoading /> })
const EventsCalendarView = dynamic(() => import('@/components/dashboard/events-calendar-view').then(m => m.EventsCalendarView), { loading: () => <ViewLoading /> })
const SandboxDemoView = dynamic(() => import('@/components/dashboard/sandbox-demo-view').then(m => m.SandboxDemoView), { loading: () => <ViewLoading /> })
const WebhooksView = dynamic(() => import('@/components/dashboard/webhooks-view').then(m => m.WebhooksView), { loading: () => <ViewLoading /> })
const ApprovalsView = dynamic(() => import('@/components/dashboard/approvals-view').then(m => m.ApprovalsView), { loading: () => <ViewLoading /> })

export default function Home() {
  const { t } = useI18n()
  const { user, loading: authLoading } = useAuth()
  const [view, setView] = useState<View>('dashboard')
  const [commandOpen, setCommandOpen] = useState(false)
  const [langOpen, setLangOpen] = useState(false)
  const { activeTenantId, setActiveTenant, setSidebarOpen } = useAppStore()
  const { openAuthModal } = useAuthStore()
  const bootstrappedRef = useRef(false)
  const [bootstrapped, setBootstrapped] = useState(false)
  const qc = useQueryClient()

  const { data: tenantsData } = useQuery({
    queryKey: ['tenants'],
    queryFn: async () => {
      const res = await fetch('/api/tenants')
      if (!res.ok) return { tenants: [] }
      return res.json()
    },
    enabled: !!user,
  })

  // Auto-bootstrap demo data on first run (only if authenticated but no tenants)
  useEffect(() => {
    if (bootstrappedRef.current || tenantsData === undefined) return
    if (!user) return

    if ((tenantsData?.tenants ?? []).length === 0) {
      bootstrappedRef.current = true
      fetch('/api/seed', { method: 'POST' })
        .then((r) => r.json())
        .then((data) => {
          if (data.tenantId) setActiveTenant(data.tenantId)
          setBootstrapped(true)
          qc.invalidateQueries({ queryKey: ['tenants'] })
        })
        .catch(() => setBootstrapped(true))
      return
    }
    bootstrappedRef.current = true
    if (!activeTenantId && tenantsData.tenants[0]) {
      setActiveTenant(tenantsData.tenants[0].id)
    }
    Promise.resolve().then(() => setBootstrapped(true))
  }, [tenantsData, activeTenantId, setActiveTenant, user, qc])

  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth >= 768) {
      setSidebarOpen(true)
    }
  }, [setSidebarOpen])

  // Loading state while checking session
  if (authLoading) {
    return (
      <div className="min-h-screen grid place-items-center bg-muted/30">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
          <p className="text-sm text-muted-foreground">Loading…</p>
        </div>
      </div>
    )
  }

  // Not authenticated — show full marketing landing page
  if (!user) {
    return (
      <>
        <LandingPage />
        <AuthModal />
      </>
    )
  }

  const VIEW_META: Record<View, { title: string; subtitle: string }> = {
    dashboard: { title: t('dashboard.title'), subtitle: t('dashboard.subtitle') },
    unified: { title: 'Unified Dashboard', subtitle: 'Cross-phase KPIs, radar, funnel, and all phases at a glance' },
    roadmap: { title: 'Marketing Roadmap', subtitle: 'Progressive phase unlocking based on your plan, budget, and activity' },
    'quick-setup': { title: '1-Click Setup', subtitle: 'Auto-configure your entire marketing platform in one click' },
    leads: { title: t('leads.title'), subtitle: t('leads.subtitle') },
    generator: { title: t('generator.title'), subtitle: t('generator.subtitle') },
    campaigns: { title: 'Email Campaigns', subtitle: 'Create, send, and track email marketing campaigns' },
    crm: { title: 'CRM Pipeline', subtitle: 'Manage deals, tasks, and sales pipeline' },
    engagement: { title: 'Engagement Hub', subtitle: 'WhatsApp, Conversational AI, and Review Monitoring' },
    seo: { title: 'SEO Platform', subtitle: 'Crawl websites, track keywords, monitor backlinks' },
    content: { title: 'Content Strategy', subtitle: 'Generate ideas, create content, plan your calendar' },
    growth: { title: 'Growth & Optimization', subtitle: 'A/B testing experiments and landing page builder' },
    ads: { title: 'Advertising', subtitle: 'Manage ad campaigns, track ROI, optimize budgets' },
    social: { title: 'Social Media', subtitle: 'Manage accounts, schedule posts, track engagement' },
    listening: { title: 'Social Listening', subtitle: 'Monitor brand mentions across the web and social media' },
    analytics: { title: 'Analytics', subtitle: 'Cross-platform marketing intelligence' },
    ai: { title: 'AI Agents', subtitle: 'Strategy, Advisor, and Autonomous marketing agents' },
    advisor: { title: 'AI Advisor Hub', subtitle: 'Monthly reports, business diagnostics, and growth recommendations' },
    workflow: { title: 'Workflow Engine', subtitle: 'Automate marketing workflows with scheduled triggers' },
    autonomous: { title: 'Autonomous Marketing Agent', subtitle: 'Executes all 10 phases automatically on a weekly cycle' },
    backlinks: { title: 'Backlink Platform', subtitle: 'Discover opportunities, manage outreach, track authority' },
    'social-analyzer': { title: 'Social Media Analyzer', subtitle: 'Deep analysis of YouTube, Instagram, TikTok, X, Facebook, LinkedIn' },
    'export-analyzer': { title: 'Export Market Analyzer', subtitle: 'International trade intelligence, market research, competitor analysis' },
    calendar: { title: 'Marketing Calendar', subtitle: 'Unified view of all marketing activities across channels' },
    goals: { title: 'Goals & Onboarding', subtitle: 'Set marketing goals, track progress, and complete your onboarding' },
    pricing: { title: 'Pricing & Billing', subtitle: 'Smart pricing calculator and subscription management' },
    marketplace: { title: 'API Marketplace', subtitle: 'Sell API access to your platform capabilities and earn revenue' },
    club: { title: 'Customer Club', subtitle: 'Earn points, unlock rewards, and advertise your business for free' },
    ecommerce: { title: 'Ecommerce Analyzer', subtitle: 'Research products on Amazon, AliExpress, Alibaba, eBay — analyze profit and competition' },
    reseller: { title: 'Reseller Hub', subtitle: 'Become a reseller — see costs, risks, profit estimates, and apply directly' },
    attribution: { title: 'Attribution & Analytics', subtitle: 'Track acquisition sources, detect fraud, analyze funnels and customer journeys' },
    team: { title: 'Team & Access Control', subtitle: 'Manage team members, roles, permissions, and project-level access' },
    approvals: { title: 'Approval Queue', subtitle: 'Review and approve campaigns, content, ads, and budget requests before they go live' },
    webhooks: { title: 'Webhooks', subtitle: 'Register endpoints to receive real-time event notifications from your account' },
    'super-admin': { title: 'Super Admin Panel', subtitle: 'Platform-wide management of all tenants, users, and revenue' },
    'white-label': { title: 'White Label & Reseller', subtitle: 'Custom branding, reseller customers, commissions, and pricing' },
    finance: { title: 'Finance & Payments', subtitle: 'Revenue tracking, payments, invoices, financial alerts' },
    platform: { title: 'Platform Self-Promotion', subtitle: 'The marketing platform that markets itself — campaigns, referrals, financial dashboard' },
    'promo-links': { title: 'Marketing Link Generator', subtitle: 'Create trackable short links with UTM, QR codes, and social share' },
    'competitor-analysis': { title: 'Competitor Deep Analysis', subtitle: '10-factor comprehensive analysis of competitors across all platforms' },
    'investor-hub': { title: 'Investor & Partnership Hub', subtitle: 'Find investors, co-founders, and strategic partnerships' },
    'distributors': { title: 'Wholesale Distributors', subtitle: 'Master distributor contracts, license pools, territories, payouts & support' },
    'internal-portal': { title: 'Internal Portal', subtitle: 'Platform employees, departments, partner management & internal activity' },
    'payment-gateways': { title: 'Payment Gateways & Crypto', subtitle: 'International gateways (Stripe, PayPal, Moyasar, Razorpay, etc.) + crypto (BTC/ETH/USDT)' },
    'llm-settings': { title: 'Multi-LLM Aggregator', subtitle: 'Free-tier LLM providers (OpenRouter, Groq, Cerebras, Mistral, HuggingFace) with auto-fallback & token tracking' },
    'onboarding-wizard': { title: 'Onboarding Wizard', subtitle: 'Collect customer info, crawl website, upload documents, generate AI negotiation proposals' },
    'negotiation': { title: 'Negotiation Engine', subtitle: '3-step fallback: Initial → MVP (−20% scope/−30% time/−15% price) → Economic → Phased delivery' },
    'ai-decisions': { title: 'AI Decisions', subtitle: 'Every AI recommendation across the platform — reasoning, confidence, alternatives weighed, and outcomes' },
    'notification-center': { title: 'Notification Center', subtitle: 'Real-time events: LLM provider switches, quota warnings, onboarding completion, negotiation updates' },
    'agent-hub': { title: 'Agent Hub', subtitle: 'One-click command center — find leads, launch campaigns, generate content, start negotiations, and more' },
    'virtual-assistants': { title: 'Virtual Assistant Service', subtitle: 'Hire trained assistants for customer projects — in-office or remote. Includes work-tracking & automatic salary.' },
    'payroll': { title: 'Payroll & Salary', subtitle: 'Automatic salary distribution: 50% revenue to owner, 50% to staff pool based on contribution & performance.' },
    'support-plans': { title: 'Support Plans', subtitle: 'Customer-purchased support packages: Basic ($99/mo), Premium ($499/mo), Enterprise ($1999/mo) with SLA backing.' },
    'graph-agent': { title: 'Graph Agent Orchestrator', subtitle: 'Node-based autonomous execution — state a goal, AI generates a DAG plan, engine executes it across all modules.' },
    'financial-reports': { title: 'Financial Reports', subtitle: 'Daily, weekly, monthly reports with AI-generated insights for admins, distributors, and affiliates.' },
    'project-intake': { title: 'Project Brief & Pricing', subtitle: 'Describe your business → AI generates roadmap + 3-tier pricing → Pay in full or phased.' },
    'events-calendar': { title: 'Events & Smart Scheduler', subtitle: 'World holidays, trending events, and AI-powered campaign date suggestions based on your deposit.' },
    'sandbox-demo': { title: 'Demo Sandbox', subtitle: 'Try the platform without signing up — 20 actions, 24-hour access, no credit card required.' },
    projects: { title: t('projects.title'), subtitle: t('projects.subtitle') },
    tenants: { title: t('tenants.title'), subtitle: t('tenants.subtitle') },
    activity: { title: t('activity.title'), subtitle: t('activity.subtitle') },
    settings: { title: t('settings.title'), subtitle: t('settings.subtitle') },
  }
  const meta = VIEW_META[view]

  return (
    <div className="flex min-h-screen bg-muted/30">
      <Sidebar view={view} onViewChange={setView} />

      <div className="flex-1 flex flex-col min-w-0">
        <Header
          title={meta.title}
          subtitle={meta.subtitle}
          onPrimary={view === 'leads' ? () => setView('generator') : undefined}
          primaryLabel={view === 'leads' ? t('leads.generateLead') : undefined}
          onOpenCommand={() => setCommandOpen(true)}
        />

        <main className="flex-1">
          {!activeTenantId && bootstrapped ? (
            <EmptyState onPickTenants={() => setView('tenants')} />
          ) : (
            <RenderView view={view} onNavigate={(v) => setView(v as View)} />
          )}
        </main>

        <footer className="mt-auto border-t bg-background/60 backdrop-blur px-4 py-3 text-center text-xs text-muted-foreground">
          {t('app.footer')} — Expload Marketing SaaS · Signed in as {user.email}
        </footer>
      </div>

      <LanguageSwitcherController openSignal={langOpen} onDone={() => setLangOpen(false)} />

      <CommandPalette
        onNavigate={(v) => setView(v as View)}
        onOpenLanguages={() => setLangOpen(true)}
      />

      <AuthModal />
    </div>
  )
}

function RenderView({ view, onNavigate }: { view: View; onNavigate?: (v: string) => void }) {
  switch (view) {
    case 'dashboard':
      return <DashboardView onNavigate={onNavigate} />
    case 'agent-hub':
      return <AgentHubView onNavigate={onNavigate ? (v) => onNavigate(v) : undefined} />
    case 'unified':
      return <UnifiedDashboardView />
    case 'roadmap':
      return <ProgressiveRoadmapView />
    case 'leads':
      return <LeadsView />
    case 'generator':
      return <GeneratorView />
    case 'campaigns':
      return <CampaignsView />
    case 'crm':
      return <CrmView />
    case 'engagement':
      return <EngagementHubView />
    case 'seo':
      return <SeoView />
    case 'content':
      return <ContentView />
    case 'growth':
      return <GrowthView />
    case 'ads':
      return <AdsView />
    case 'social':
      return <SocialView />
    case 'analytics':
      return <AnalyticsView />
    case 'ai':
      return <AiAgentsView />
    case 'advisor':
      return <AiAdvisorHubView />
    case 'workflow':
      return <WorkflowView />
    case 'autonomous':
      return <AutonomousAgentView />
    case 'backlinks':
      return <BacklinksView />
    case 'social-analyzer':
      return <SocialAnalyzerView />
    case 'export-analyzer':
      return <ExportAnalyzerView />
    case 'calendar':
      return <CalendarView />
    case 'goals':
      return <GoalsView />
    case 'pricing':
      return <PricingView />
    case 'marketplace':
      return <MarketplaceView />
    case 'club':
      return <ClubView />
    case 'ecommerce':
      return <EcommerceView />
    case 'reseller':
      return <ResellerView />
    case 'attribution':
      return <AttributionView />
    case 'team':
      return <TeamView />
    case 'super-admin':
      return <SuperAdminView />
    case 'white-label':
      return <WhiteLabelView />
    case 'finance':
      return <FinanceView />
    case 'platform':
      return <PlatformPromotionView />
    case 'promo-links':
      return <PromoLinkView />
    case 'competitor-analysis':
      return <CompetitorAnalysisView />
    case 'investor-hub':
      return <InvestorHubView />
    case 'distributors':
      return <DistributorView />
    case 'internal-portal':
      return <InternalPortalView />
    case 'approvals':
      return <ApprovalsView />
    case 'webhooks':
      return <WebhooksView />
    case 'payment-gateways':
      return <PaymentGatewaysView />
    case 'llm-settings':
      return <LlmSettingsView />
    case 'onboarding-wizard':
      return <OnboardingWizardView />
    case 'negotiation':
      return <NegotiationView />
    case 'ai-decisions':
      return <AiDecisionsView />
    case 'notification-center':
      return <NotificationCenterView />
    case 'virtual-assistants':
      return <VirtualAssistantView />
    case 'payroll':
      return <PayrollView />
    case 'support-plans':
      return <SupportPlansView />
    case 'graph-agent':
      return <GraphAgentView />
    case 'financial-reports':
      return <FinancialReportsView />
    case 'project-intake':
      return <ProjectIntakeView />
    case 'events-calendar':
      return <EventsCalendarView />
    case 'sandbox-demo':
      return <SandboxDemoView />
    case 'quick-setup':
      return <QuickSetupView />
    case 'listening':
      return <SocialListeningView />
    case 'projects':
      return <ProjectsView />
    case 'tenants':
      return <TenantsView />
    case 'activity':
      return <ActivityView />
    case 'settings':
      return <SettingsView />
    default:
      return <DashboardView />
  }
}

function EmptyState({ onPickTenants }: { onPickTenants: () => void }) {
  const { t } = useI18n()
  return (
    <div className="p-6 grid place-items-center min-h-[60vh]">
      <Card className="max-w-md w-full">
        <CardContent className="p-8 text-center space-y-3">
          <div className="grid place-items-center h-14 w-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white mx-auto shadow-lg shadow-emerald-500/20">
            <Rocket className="h-7 w-7" />
          </div>
          <h3 className="text-lg font-semibold">{t('common.welcome')}</h3>
          <p className="text-sm text-muted-foreground">{t('common.welcomeMessage')}</p>
          <Button onClick={onPickTenants} className="gap-2">
            <Rocket className="h-4 w-4" />
            {t('common.getStarted')}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

function LanguageSwitcherController({
  openSignal,
  onDone,
}: {
  openSignal: boolean
  onDone: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (openSignal && ref.current) {
      const btn = ref.current.querySelector('button')
      btn?.click()
      onDone()
    }
  }, [openSignal, onDone])

  return (
    <div ref={ref} className="sr-only">
      <LanguageSwitcher />
    </div>
  )
}
