'use client'

import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { Calculator, Sparkles, TrendingUp, DollarSign, Users, Star, Filter, Loader2, Check } from 'lucide-react'

const PLAN_COLORS: Record<string, string> = {
  starter: '#3b82f6',
  growth: '#8b5cf6',
  enterprise: '#10b981',
}

const PLAN_FEATURES: Record<string, string[]> = {
  starter: ['100 leads/month', '5 email campaigns', '3 team members', '1 SEO project', '3 social accounts', '2 workflows', '100 AI credits'],
  growth: ['1,000 leads/month', '50 email campaigns', '10 team members', '5 SEO projects', '15 social accounts', '20 workflows', '1,000 AI credits'],
  enterprise: ['10,000 leads/month', 'Unlimited campaigns', 'Unlimited users', '50 SEO projects', 'Unlimited social accounts', 'Unlimited workflows', '10,000 AI credits'],
}

export function PricingView() {
  const [form, setForm] = useState({
    monthlyBudget: '',
    productPrice: '',
    reviewCount: '',
    reviewPlatforms: '1',
    funnelLeads: '',
    funnelQualified: '30',
    funnelDeals: '10',
  })
  const [result, setResult] = useState<any>(null)

  const calculateMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch('/api/billing/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('calc failed')
      return res.json()
    },
    onSuccess: (data) => {
      setResult(data)
      toast.success(`Recommended plan: ${data.recommendation.plan.toUpperCase()}`)
    },
    onError: (e: any) => toast.error(String(e?.message ?? e)),
  })

  const handleCalculate = () => {
    calculateMutation.mutate({
      monthlyBudget: Number(form.monthlyBudget || 0),
      productPrice: Number(form.productPrice || 0),
      reviewCount: Number(form.reviewCount || 0),
      reviewPlatforms: Number(form.reviewPlatforms || 0),
      funnelLeads: Number(form.funnelLeads || 0),
      funnelQualified: Number(form.funnelQualified || 0),
      funnelDeals: Number(form.funnelDeals || 0),
    })
  }

  return (
    <div className="space-y-6 p-4 md:p-6 animate-fade-in-up">
      <div>
        <h2 className="text-base font-semibold flex items-center gap-2">
          <Calculator className="h-5 w-5 text-violet-600" />
          Smart Pricing Calculator
        </h2>
        <p className="text-xs text-muted-foreground">
          Get a personalized plan recommendation based on your budget, product price, reviews, and funnel friction
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Input Form */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-600" />
              Tell Us About Your Business
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Budget */}
            <div>
              <Label className="flex items-center gap-1.5"><DollarSign className="h-3.5 w-3.5" /> Monthly Marketing Budget (USD)</Label>
              <Input type="number" placeholder="500" value={form.monthlyBudget} onChange={(e) => setForm({ ...form, monthlyBudget: e.target.value })} dir="ltr" />
              <p className="text-[11px] text-muted-foreground mt-1">How much can you spend on marketing per month?</p>
            </div>

            {/* Product Price */}
            <div>
              <Label className="flex items-center gap-1.5"><DollarSign className="h-3.5 w-3.5" /> Average Product/Service Price (USD)</Label>
              <Input type="number" placeholder="99" value={form.productPrice} onChange={(e) => setForm({ ...form, productPrice: e.target.value })} dir="ltr" />
              <p className="text-[11px] text-muted-foreground mt-1">What's your average order value?</p>
            </div>

            {/* Reviews */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="flex items-center gap-1.5"><Star className="h-3.5 w-3.5" /> Current Review Count</Label>
                <Input type="number" placeholder="25" value={form.reviewCount} onChange={(e) => setForm({ ...form, reviewCount: e.target.value })} dir="ltr" />
              </div>
              <div>
                <Label className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5" /> Review Platforms</Label>
                <Input type="number" min={0} max={10} placeholder="2" value={form.reviewPlatforms} onChange={(e) => setForm({ ...form, reviewPlatforms: e.target.value })} dir="ltr" />
              </div>
            </div>

            <Separator />

            {/* Funnel Friction */}
            <div>
              <Label className="flex items-center gap-1.5 mb-2"><Filter className="h-3.5 w-3.5" /> Sales Funnel Friction</Label>
              <div className="space-y-3">
                <div>
                  <Label className="text-xs">Monthly Leads Entering Funnel</Label>
                  <Input type="number" placeholder="100" value={form.funnelLeads} onChange={(e) => setForm({ ...form, funnelLeads: e.target.value })} dir="ltr" />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <Label className="text-xs">Lead → Qualified Rate</Label>
                    <span className="text-xs font-medium">{form.funnelQualified}%</span>
                  </div>
                  <Input type="range" min={0} max={100} value={form.funnelQualified} onChange={(e) => setForm({ ...form, funnelQualified: e.target.value })} className="w-full" />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <Label className="text-xs">Qualified → Deal Rate</Label>
                    <span className="text-xs font-medium">{form.funnelDeals}%</span>
                  </div>
                  <Input type="range" min={0} max={100} value={form.funnelDeals} onChange={(e) => setForm({ ...form, funnelDeals: e.target.value })} className="w-full" />
                </div>
              </div>
            </div>

            <Button className="w-full gap-2" onClick={handleCalculate} disabled={calculateMutation.isPending}>
              {calculateMutation.isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Calculating…</> : <><Calculator className="h-4 w-4" /> Get My Recommendation</>}
            </Button>
          </CardContent>
        </Card>

        {/* Results */}
        <div className="space-y-4">
          {result ? (
            <>
              {/* Recommended Plan */}
              <Card className="border-violet-500/30 bg-gradient-to-br from-violet-500/5 to-purple-500/5">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Recommended Plan</p>
                      <h3 className="text-2xl font-bold capitalize" style={{ color: PLAN_COLORS[result.recommendation.plan] }}>
                        {result.recommendation.plan}
                      </h3>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-bold">${result.recommendation.monthlyCost}</p>
                      <p className="text-xs text-muted-foreground">per month</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    {PLAN_FEATURES[result.recommendation.plan].map((f, i) => (
                      <div key={i} className="flex items-center gap-1.5 text-xs">
                        <Check className="h-3 w-3 text-emerald-600 shrink-0" />
                        <span>{f}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* ROI Estimates */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-emerald-600" />
                    Estimated Results
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3">
                    <MetricBox label="Est. Leads/Month" value={result.estimates.leadsPerMonth} color="text-blue-600" />
                    <MetricBox label="Est. Qualified" value={result.estimates.qualifiedLeads} color="text-violet-600" />
                    <MetricBox label="Est. Deals/Month" value={result.estimates.deals} color="text-amber-600" />
                    <MetricBox label="Est. Revenue" value={`$${result.estimates.revenue.toLocaleString()}`} color="text-emerald-600" />
                  </div>
                  <div className="mt-3 pt-3 border-t">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Estimated ROI</span>
                      <span className={`text-2xl font-bold ${result.estimates.roi >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {result.estimates.roi >= 0 ? '+' : ''}{result.estimates.roi}%
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Based on {result.estimates.leadsPerMonth} leads → {result.estimates.qualifiedLeads} qualified → {result.estimates.deals} deals × ${form.productPrice || 0}/sale
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Funnel Friction Analysis */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Filter className="h-4 w-4 text-amber-600" />
                    Funnel Friction Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span>Overall Conversion Rate</span>
                        <span className="font-medium">{result.funnelAnalysis.overallConversion}%</span>
                      </div>
                      <Progress value={result.funnelAnalysis.overallConversion} className="h-2" />
                    </div>
                    {result.funnelAnalysis.frictionPoints.length > 0 && (
                      <div className="space-y-2 pt-2">
                        <p className="text-xs font-medium text-muted-foreground">Friction Points Detected:</p>
                        {result.funnelAnalysis.frictionPoints.map((fp: any, i: number) => (
                          <div key={i} className="rounded-md bg-muted/50 p-2">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-medium">{fp.stage}</span>
                              <Badge variant="outline" className="text-[10px] capitalize" style={{ background: fp.severity === 'high' ? '#ef444420' : fp.severity === 'medium' ? '#f59e0b20' : '#3b82f620', color: fp.severity === 'high' ? '#ef4444' : fp.severity === 'medium' ? '#f59e0b' : '#3b82f6' }}>
                                {fp.severity}
                              </Badge>
                            </div>
                            <p className="text-[11px] text-muted-foreground">{fp.suggestion}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Plan Comparison */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Plan Comparison</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {result.planComparison.map((p: any) => (
                      <div key={p.plan} className={`rounded-lg border p-3 ${p.plan === result.recommendation.plan ? 'border-violet-500 bg-violet-500/5' : ''}`}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm capitalize">{p.label}</span>
                            {p.plan === result.recommendation.plan && <Badge variant="default" className="text-[10px]">Recommended</Badge>}
                          </div>
                          <span className="font-bold">${p.price}/mo</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Progress value={p.score} className="h-1.5 flex-1" />
                          <span className="text-[10px] text-muted-foreground">{p.score}% match</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <Calculator className="h-12 w-12 mx-auto text-muted-foreground" />
                <p className="text-sm text-muted-foreground mt-3">Fill in the form and click "Get My Recommendation" to see your personalized plan.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

function MetricBox({ label, value, color }: { label: string; value: any; color: string }) {
  return (
    <div className="rounded-lg bg-muted/50 p-3 text-center">
      <p className={`text-xl font-bold ${color}`}>{value}</p>
      <p className="text-[10px] text-muted-foreground mt-0.5">{label}</p>
    </div>
  )
}
