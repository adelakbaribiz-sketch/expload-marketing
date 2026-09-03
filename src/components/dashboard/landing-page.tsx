'use client'

import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { LiveDemoSection } from '@/components/landing/live-demo-section'
import { BlogSection } from '@/components/landing/blog-section'
import { Separator } from '@/components/ui/separator'
import { useAuthStore } from '@/store/auth-store'
import { useI18n } from '@/i18n/provider'
import { LanguageSwitcher } from '@/components/i18n/language-switcher'
import { toast } from 'sonner'
import {
  Rocket, Sparkles, Bot, Search, Mail, Target, Share2, Megaphone,
  Link2, BarChart3, Workflow, Globe2, Calculator, TrendingUp,
  DollarSign, Users, Star, Filter, Check, ArrowRight, Loader2,
  Zap, Shield, Globe, Brain, Calendar, MessageCircle, ChevronDown,
} from 'lucide-react'

const PLAN_COLORS: Record<string, string> = {
  starter: '#3b82f6',
  growth: '#8b5cf6',
  enterprise: '#10b981',
}

const PHASES = [
  { icon: Users, key: 'leadGeneration', color: 'from-emerald-500 to-teal-600' },
  { icon: Target, key: 'crmEngagement', color: 'from-violet-500 to-purple-600' },
  { icon: Sparkles, key: 'contentStrategy', color: 'from-blue-500 to-indigo-600' },
  { icon: Search, key: 'seoPlatform', color: 'from-amber-500 to-orange-600' },
  { icon: Megaphone, key: 'adAutomation', color: 'from-rose-500 to-red-600' },
  { icon: Share2, key: 'socialMedia', color: 'from-pink-500 to-rose-600' },
  { icon: Link2, key: 'backlinkPlatform', color: 'from-cyan-500 to-blue-600' },
  { icon: BarChart3, key: 'specializedAnalyzers', color: 'from-teal-500 to-cyan-600' },
  { icon: Brain, key: 'aiAdvisor', color: 'from-violet-500 to-fuchsia-600' },
  { icon: Bot, key: 'autonomousAgent', color: 'from-indigo-500 to-blue-600' },
]

const STATS = [
  { value: '10', labelKey: 'phases', icon: Workflow },
  { value: '20', labelKey: 'languages', icon: Globe },
  { value: '64', labelKey: 'dataModels', icon: BarChart3 },
  { value: '105+', labelKey: 'apiEndpoints', icon: Zap },
]

export function LandingPage() {
  const { openAuthModal } = useAuthStore()
  const { t } = useI18n()
  const [calcResult, setCalcResult] = useState<any>(null)
  const [calcForm, setCalcForm] = useState({
    monthlyBudget: '',
    productPrice: '',
    reviewCount: '',
    reviewPlatforms: '1',
    funnelLeads: '',
    funnelQualified: '30',
    funnelDeals: '10',
  })

  const calcMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch('/api/public/pricing-calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('calc failed')
      return res.json()
    },
    onSuccess: (data) => {
      setCalcResult(data)
    },
    onError: (e: any) => toast.error(String(e?.message ?? e)),
  })

  const handleCalculate = () => {
    calcMutation.mutate({
      monthlyBudget: Number(calcForm.monthlyBudget || 0),
      productPrice: Number(calcForm.productPrice || 0),
      reviewCount: Number(calcForm.reviewCount || 0),
      reviewPlatforms: Number(calcForm.reviewPlatforms || 0),
      funnelLeads: Number(calcForm.funnelLeads || 0),
      funnelQualified: Number(calcForm.funnelQualified || 0),
      funnelDeals: Number(calcForm.funnelDeals || 0),
    })
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="grid place-items-center h-9 w-9 rounded-xl bg-brand-accent-gradient text-primary-foreground shadow-md">
                <Rocket className="h-5 w-5" />
              </div>
              <span className="font-bold text-lg">Expload Marketing</span>
            </div>
            <div className="flex items-center gap-2">
              <LanguageSwitcher />
              <Button variant="ghost" size="sm" onClick={() => openAuthModal('login')}>
                {t('landing.nav.signIn')}
              </Button>
              <Button size="sm" className="gap-2" onClick={() => openAuthModal('signup')}>
                <Sparkles className="h-4 w-4" />
                {t('landing.nav.getStarted')}
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Animated gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-neutral-50 via-orange-50/40 to-neutral-100 dark:from-black dark:via-neutral-950 dark:to-black" />
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-0 left-1/4 h-72 w-72 rounded-full bg-primary/20 blur-3xl animate-pulse" />
          <div className="absolute top-20 right-1/4 h-96 w-96 rounded-full bg-neutral-400/20 dark:bg-neutral-500/10 blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-primary/10 blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 md:py-32">
          <div className="text-center max-w-4xl mx-auto">
            <Badge variant="secondary" className="mb-6 gap-1.5 py-1.5 px-4 text-sm">
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              {t('landing.hero.badge')}
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
              {t('landing.hero.titleLine1')}
              <span className="block bg-gradient-to-r from-[#FF6A00] via-[#FF8A3D] to-[#FFAD66] bg-clip-text text-transparent">
                {t('landing.hero.titleLine2')}
              </span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              {t('landing.hero.subtitle')}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button size="lg" className="gap-2 text-base h-12 px-8" onClick={() => openAuthModal('signup')}>
                <Zap className="h-5 w-5" />
                {t('landing.hero.ctaPrimary')}
              </Button>
              <Button size="lg" variant="outline" className="gap-2 text-base h-12 px-8" onClick={() => {
                document.getElementById('pricing-calculator')?.scrollIntoView({ behavior: 'smooth' })
              }}>
                <Calculator className="h-5 w-5" />
                {t('landing.hero.ctaSecondary')}
              </Button>
            </div>

            {/* 1-click badge */}
            <div className="flex items-center justify-center gap-2 mt-4">
              <Badge variant="secondary" className="gap-1.5 py-1 px-3">
                <Zap className="h-3 w-3 text-primary" />
                {t('landing.hero.autoSetupBadge')}
              </Badge>
            </div>

            {/* Trust indicators */}
            <div className="flex flex-wrap items-center justify-center gap-6 mt-10 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5"><Check className="h-4 w-4 text-emerald-600" /> {t('landing.hero.trustNoCard')}</span>
              <span className="flex items-center gap-1.5"><Check className="h-4 w-4 text-emerald-600" /> {t('landing.hero.trustFreeTrial')}</span>
              <span className="flex items-center gap-1.5"><Check className="h-4 w-4 text-emerald-600" /> {t('landing.hero.trustCancel')}</span>
            </div>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="relative border-t bg-background/50 backdrop-blur-sm">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {STATS.map((stat) => {
                const Icon = stat.icon
                return (
                  <div key={stat.labelKey} className="text-center">
                    <Icon className="h-6 w-6 mx-auto text-emerald-600 mb-1" />
                    <p className="text-2xl md:text-3xl font-bold">{stat.value}</p>
                    <p className="text-xs md:text-sm text-muted-foreground">{t(`landing.stats.${stat.labelKey}`)}</p>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 md:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-4">{t('landing.features.badge')}</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              {t('landing.features.title')}
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              {t('landing.features.subtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {PHASES.map((phase, i) => {
              const Icon = phase.icon
              return (
                <Card
                  key={phase.key}
                  className="relative overflow-hidden hover:shadow-xl transition-all duration-300 group cursor-default"
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  <CardContent className="p-6">
                    <div className={`grid place-items-center h-12 w-12 rounded-xl bg-gradient-to-br ${phase.color} text-white shadow-md mb-4 group-hover:scale-110 transition-transform`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <h3 className="font-semibold text-lg mb-2">{t(`landing.features.items.${phase.key}.title`)}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{t(`landing.features.items.${phase.key}.desc`)}</p>
                  </CardContent>
                  <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${phase.color} opacity-0 group-hover:opacity-100 transition-opacity`} />
                </Card>
              )
            })}
          </div>
        </div>
      </section>

      {/* Pricing Calculator Section */}
      <section id="pricing-calculator" className="py-20 md:py-28 bg-gradient-to-br from-violet-50 via-purple-50 to-fuchsia-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <Badge variant="secondary" className="mb-4 gap-1.5">
              <Calculator className="h-3.5 w-3.5" />
              {t('landing.pricing.badge')}
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              {t('landing.pricing.title')}
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              {t('landing.pricing.subtitle')}
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-2 max-w-5xl mx-auto">
            {/* Calculator Form */}
            <Card className="border-violet-500/20">
              <CardContent className="p-6 space-y-5">
                <div>
                  <Label className="flex items-center gap-1.5 mb-1.5"><DollarSign className="h-4 w-4" /> {t('landing.pricing.form.budget')}</Label>
                  <Input type="number" placeholder="500" value={calcForm.monthlyBudget} onChange={(e) => setCalcForm({ ...calcForm, monthlyBudget: e.target.value })} dir="ltr" />
                </div>
                <div>
                  <Label className="flex items-center gap-1.5 mb-1.5"><DollarSign className="h-4 w-4" /> {t('landing.pricing.form.productPrice')}</Label>
                  <Input type="number" placeholder="99" value={calcForm.productPrice} onChange={(e) => setCalcForm({ ...calcForm, productPrice: e.target.value })} dir="ltr" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="flex items-center gap-1.5 mb-1.5"><Star className="h-4 w-4" /> {t('landing.pricing.form.reviews')}</Label>
                    <Input type="number" placeholder="25" value={calcForm.reviewCount} onChange={(e) => setCalcForm({ ...calcForm, reviewCount: e.target.value })} dir="ltr" />
                  </div>
                  <div>
                    <Label className="flex items-center gap-1.5 mb-1.5"><Globe className="h-4 w-4" /> {t('landing.pricing.form.platforms')}</Label>
                    <Input type="number" min={0} max={10} placeholder="2" value={calcForm.reviewPlatforms} onChange={(e) => setCalcForm({ ...calcForm, reviewPlatforms: e.target.value })} dir="ltr" />
                  </div>
                </div>
                <Separator />
                <div>
                  <Label className="flex items-center gap-1.5 mb-2"><Filter className="h-4 w-4" /> {t('landing.pricing.form.funnelTitle')}</Label>
                  <div className="space-y-3">
                    <div>
                      <Label className="text-xs mb-1.5 block">{t('landing.pricing.form.monthlyLeads')}</Label>
                      <Input type="number" placeholder="100" value={calcForm.funnelLeads} onChange={(e) => setCalcForm({ ...calcForm, funnelLeads: e.target.value })} dir="ltr" />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <Label className="text-xs">{t('landing.pricing.form.qualifiedRate')}</Label>
                        <span className="text-xs font-medium">{calcForm.funnelQualified}%</span>
                      </div>
                      <Input type="range" min={0} max={100} value={calcForm.funnelQualified} onChange={(e) => setCalcForm({ ...calcForm, funnelQualified: e.target.value })} className="w-full" />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <Label className="text-xs">{t('landing.pricing.form.dealRate')}</Label>
                        <span className="text-xs font-medium">{calcForm.funnelDeals}%</span>
                      </div>
                      <Input type="range" min={0} max={100} value={calcForm.funnelDeals} onChange={(e) => setCalcForm({ ...calcForm, funnelDeals: e.target.value })} className="w-full" />
                    </div>
                  </div>
                </div>
                <Button className="w-full gap-2" size="lg" onClick={handleCalculate} disabled={calcMutation.isPending}>
                  {calcMutation.isPending ? <><Loader2 className="h-5 w-5 animate-spin" /> {t('landing.pricing.form.calculating')}</> : <><Calculator className="h-5 w-5" /> {t('landing.pricing.form.submit')}</>}
                </Button>
              </CardContent>
            </Card>

            {/* Results */}
            <div className="space-y-4">
              {calcResult ? (
                <>
                  {/* Recommended Plan */}
                  <Card className="border-violet-500/30 bg-gradient-to-br from-violet-500/5 to-purple-500/5">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="text-xs text-muted-foreground">{t('landing.pricing.results.recommendedPlan')}</p>
                          <h3 className="text-2xl font-bold capitalize" style={{ color: PLAN_COLORS[calcResult.recommendation.plan] }}>
                            {t(`landing.pricing.comparison.plans.${calcResult.recommendation.plan}.label`)}
                          </h3>
                          <p className="text-xs text-muted-foreground mt-0.5">{calcResult.recommendation.features.tagline}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-3xl font-bold">${calcResult.recommendation.monthlyCost}</p>
                          <p className="text-xs text-muted-foreground">{t('landing.pricing.results.perMonth')}</p>
                          <p className="text-[10px] text-muted-foreground">{t('landing.pricing.results.orPerYear', { amount: `$${calcResult.recommendation.yearlyCost}` })}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* ROI Estimates */}
                  <Card>
                    <CardContent className="p-6">
                      <h4 className="text-sm font-medium flex items-center gap-2 mb-3">
                        <TrendingUp className="h-4 w-4 text-emerald-600" /> {t('landing.pricing.results.estimatedResults')}
                      </h4>
                      <div className="grid grid-cols-2 gap-3 mb-4">
                        <div className="rounded-lg bg-muted/50 p-3 text-center">
                          <p className="text-xl font-bold text-blue-600">{calcResult.estimates.leadsPerMonth}</p>
                          <p className="text-[10px] text-muted-foreground">{t('landing.pricing.results.estLeads')}</p>
                        </div>
                        <div className="rounded-lg bg-muted/50 p-3 text-center">
                          <p className="text-xl font-bold text-violet-600">{calcResult.estimates.qualifiedLeads}</p>
                          <p className="text-[10px] text-muted-foreground">{t('landing.pricing.results.qualified')}</p>
                        </div>
                        <div className="rounded-lg bg-muted/50 p-3 text-center">
                          <p className="text-xl font-bold text-amber-600">{calcResult.estimates.deals}</p>
                          <p className="text-[10px] text-muted-foreground">{t('landing.pricing.results.deals')}</p>
                        </div>
                        <div className="rounded-lg bg-muted/50 p-3 text-center">
                          <p className="text-xl font-bold text-emerald-600">${calcResult.estimates.revenue.toLocaleString()}</p>
                          <p className="text-[10px] text-muted-foreground">{t('landing.pricing.results.revenue')}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between pt-3 border-t">
                        <span className="text-sm font-medium">{t('landing.pricing.results.estimatedRoi')}</span>
                        <span className={`text-2xl font-bold ${calcResult.estimates.roi >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          {calcResult.estimates.roi >= 0 ? '+' : ''}{calcResult.estimates.roi}%
                        </span>
                      </div>
                    </CardContent>
                  </Card>

                  {/* CTA */}
                  <Button className="w-full gap-2" size="lg" onClick={() => openAuthModal('signup')}>
                    <Rocket className="h-5 w-5" />
                    {t('landing.pricing.results.startWithPlan', { plan: t(`landing.pricing.comparison.plans.${calcResult.recommendation.plan}.label`) })}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <Card>
                  <CardContent className="p-12 text-center">
                    <Calculator className="h-16 w-16 mx-auto text-muted-foreground/50" />
                    <p className="text-sm text-muted-foreground mt-4">
                      {t('landing.pricing.results.empty')}
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* Plan Comparison Table */}
          <div className="mt-12 max-w-5xl mx-auto">
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-center mb-6">{t('landing.pricing.comparison.title')}</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {(calcResult?.planComparison ?? [
                    { plan: 'starter', price: 49, yearlyPrice: 490, maxLeads: 100, maxCampaigns: 5, maxUsers: 3, maxSeoProjects: 1, maxSocialAccounts: 3, maxWorkflows: 2, aiCredits: 100 },
                    { plan: 'growth', price: 199, yearlyPrice: 1990, maxLeads: 1000, maxCampaigns: 50, maxUsers: 10, maxSeoProjects: 5, maxSocialAccounts: 15, maxWorkflows: 20, aiCredits: 1000 },
                    { plan: 'enterprise', price: 499, yearlyPrice: 4990, maxLeads: 10000, maxCampaigns: 999, maxUsers: 999, maxSeoProjects: 50, maxSocialAccounts: 999, maxWorkflows: 999, aiCredits: 10000 },
                  ]).map((p: any) => (
                    <div
                      key={p.plan}
                      className={`rounded-xl border-2 p-5 transition-all ${calcResult?.recommendation.plan === p.plan ? 'border-violet-500 bg-violet-500/5 shadow-md' : 'border-border'}`}
                      style={{ borderColor: calcResult?.recommendation.plan === p.plan ? PLAN_COLORS[p.plan] : undefined }}
                    >
                      <div className="text-center mb-4">
                        <h4 className="font-bold text-lg" style={{ color: PLAN_COLORS[p.plan] }}>{p.label ?? t(`landing.pricing.comparison.plans.${p.plan}.label`)}</h4>
                        <p className="text-xs text-muted-foreground mb-2">{p.tagline ?? t(`landing.pricing.comparison.plans.${p.plan}.tagline`)}</p>
                        <p className="text-3xl font-bold">${p.price}<span className="text-sm font-normal text-muted-foreground">{t('landing.pricing.comparison.perMoShort')}</span></p>
                        <p className="text-[10px] text-muted-foreground">{t('landing.pricing.comparison.yearlyNote', { amount: `$${p.yearlyPrice}` })}</p>
                      </div>
                      <div className="space-y-1.5">
                        <FeatureRow value={p.maxLeads >= 999 ? t('landing.pricing.comparison.unlimited') : p.maxLeads} label={t('landing.pricing.comparison.leadsPerMonth')} />
                        <FeatureRow value={p.maxCampaigns >= 999 ? t('landing.pricing.comparison.unlimited') : p.maxCampaigns} label={t('landing.pricing.comparison.campaigns')} />
                        <FeatureRow value={p.maxUsers >= 999 ? t('landing.pricing.comparison.unlimited') : p.maxUsers} label={t('landing.pricing.comparison.teamMembers')} />
                        <FeatureRow value={p.maxSeoProjects >= 999 ? t('landing.pricing.comparison.unlimited') : p.maxSeoProjects} label={t('landing.pricing.comparison.seoProjects')} />
                        <FeatureRow value={p.maxSocialAccounts >= 999 ? t('landing.pricing.comparison.unlimited') : p.maxSocialAccounts} label={t('landing.pricing.comparison.socialAccounts')} />
                        <FeatureRow value={p.maxWorkflows >= 999 ? t('landing.pricing.comparison.unlimited') : p.maxWorkflows} label={t('landing.pricing.comparison.workflows')} />
                        <FeatureRow value={p.aiCredits >= 9999 ? t('landing.pricing.comparison.unlimited') : p.aiCredits} label={t('landing.pricing.comparison.aiCredits')} />
                      </div>
                      <Button
                        className="w-full mt-4"
                        variant={calcResult?.recommendation.plan === p.plan ? 'default' : 'outline'}
                        onClick={() => openAuthModal('signup')}
                      >
                        {calcResult?.recommendation.plan === p.plan ? t('landing.pricing.comparison.choosePlan') : t('landing.pricing.comparison.getStarted')}
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Live Demo Section */}
      <LiveDemoSection />

      {/* Blog Section */}
      <BlogSection />

      {/* Why Choose Us Section */}
      <section className="py-20 md:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <Badge variant="secondary" className="mb-4 gap-1.5">
                <Shield className="h-3.5 w-3.5" />
                {t('landing.whyUs.badge')}
              </Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                {t('landing.whyUs.title')}
              </h2>
              <div className="space-y-4">
                {[
                  { icon: Bot, key: 'autonomousAgent' },
                  { icon: Brain, key: 'aiPowered' },
                  { icon: Globe, key: 'languages' },
                  { icon: Calculator, key: 'smartPricing' },
                ].map((item) => {
                  const Icon = item.icon
                  return (
                    <div key={item.key} className="flex gap-4">
                      <div className="grid place-items-center h-10 w-10 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white shrink-0">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold mb-1">{t(`landing.whyUs.items.${item.key}.title`)}</h3>
                        <p className="text-sm text-muted-foreground">{t(`landing.whyUs.items.${item.key}.desc`)}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-violet-500/10 rounded-3xl blur-2xl" />
              <Card className="relative overflow-hidden">
                <CardContent className="p-8">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="grid place-items-center h-12 w-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 text-white">
                      <Bot className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="font-semibold">{t('landing.whyUs.agentCard.title')}</p>
                      <p className="text-xs text-muted-foreground">{t('landing.whyUs.agentCard.subtitle')}</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {[
                      { key: 'leadGen', color: 'bg-emerald-500' },
                      { key: 'emailCampaigns', color: 'bg-blue-500' },
                      { key: 'seoAudit', color: 'bg-amber-500' },
                      { key: 'socialMedia', color: 'bg-pink-500' },
                      { key: 'aiRecommendations', color: 'bg-violet-500' },
                    ].map((item) => (
                      <div key={item.key} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-2">
                          <span className={`h-2 w-2 rounded-full ${item.color}`} />
                          <span className="text-sm font-medium">{t(`landing.whyUs.agentCard.${item.key}`)}</span>
                        </div>
                        <span className="text-sm text-muted-foreground">{t(`landing.whyUs.agentCard.${item.key}Value`)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 pt-4 border-t flex items-center justify-between">
                    <span className="text-sm font-medium">{t('landing.whyUs.agentCard.tasksCreated')}</span>
                    <Badge variant="default" className="gap-1">
                      <Check className="h-3 w-3" />
                      {t('landing.whyUs.agentCard.newTasks')}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 md:py-28 bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-600 text-white">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
          <Rocket className="h-16 w-16 mx-auto mb-6 opacity-90" />
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            {t('landing.finalCta.title')}
          </h2>
          <p className="text-lg md:text-xl text-white/90 mb-8 max-w-2xl mx-auto">
            {t('landing.finalCta.subtitle')}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button size="lg" variant="secondary" className="gap-2 text-base h-12 px-8" onClick={() => openAuthModal('signup')}>
              <Sparkles className="h-5 w-5" />
              {t('landing.finalCta.ctaPrimary')}
            </Button>
            <Button size="lg" variant="ghost" className="gap-2 text-base h-12 px-8 text-white border border-white/30 hover:bg-white/10" onClick={() => openAuthModal('login')}>
              {t('landing.finalCta.ctaSecondary')}
            </Button>
          </div>
          <p className="text-sm text-white/70 mt-6">{t('landing.finalCta.footer')}</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-3">
                <div className="grid place-items-center h-8 w-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
                  <Rocket className="h-4 w-4" />
                </div>
                <span className="font-bold">Expload Marketing</span>
              </div>
              <p className="text-xs text-muted-foreground">{t('landing.footer.tagline')}</p>
            </div>
            <div>
              <h4 className="text-sm font-semibold mb-3">{t('landing.footer.platform.title')}</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>{t('landing.footer.platform.leadGeneration')}</li>
                <li>{t('landing.footer.platform.crmEngagement')}</li>
                <li>{t('landing.footer.platform.seoPlatform')}</li>
                <li>{t('landing.footer.platform.socialMedia')}</li>
                <li>{t('landing.footer.platform.aiAgents')}</li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold mb-3">{t('landing.footer.resources.title')}</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>{t('landing.footer.resources.pricingCalculator')}</li>
                <li>{t('landing.footer.resources.documentation')}</li>
                <li>{t('landing.footer.resources.apiReference')}</li>
                <li>{t('landing.footer.resources.deploymentGuide')}</li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold mb-3">{t('landing.footer.company.title')}</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>{t('landing.footer.company.about')}</li>
                <li>{t('landing.footer.company.privacyPolicy')}</li>
                <li>{t('landing.footer.company.termsOfService')}</li>
                <li>{t('landing.footer.company.contact')}</li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-muted-foreground">{t('landing.footer.copyright', { year: new Date().getFullYear() })}</p>
            <div className="flex items-center gap-2">
              <LanguageSwitcher />
            </div>
          </div>
        </div>
      </footer>

      {/* Auth Modal (shared) */}
      {/* Note: AuthModal is rendered by the parent page.tsx */}
    </div>
  )
}

function FeatureRow({ value, label }: { value: any; label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
      <span className="font-medium">{value}</span>
      <span className="text-muted-foreground text-xs">{label}</span>
    </div>
  )
}
