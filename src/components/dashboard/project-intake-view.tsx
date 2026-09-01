'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { GuideTooltip } from '@/components/guides/guided-tour'
import {
  Rocket, Sparkles, Loader2, Check, X, DollarSign, Calendar,
  TrendingUp, ArrowRight, CreditCard, Zap,
} from 'lucide-react'

const TIER_COLORS: Record<string, string> = {
  essential: '#8CD4D8', growth: '#F26522', premium: '#1B3A4B',
}

export function ProjectIntakeView() {
  const qc = useQueryClient()
  const [form, setForm] = useState({
    businessName: '', industry: '', website: '', description: '',
    targetMarket: '', budget: '', timeline: 'flexible', goals: '',
  })
  const [analyzingBriefId, setAnalyzingBriefId] = useState<string | null>(null)
  const [paymentFlow, setPaymentFlow] = useState<{ tier: any; option: 'full' | 'phased' } | null>(null)

  const { data: briefsData } = useQuery({
    queryKey: ['project-briefs'],
    queryFn: async () => {
      const res = await fetch('/api/project-intake')
      if (!res.ok) return { briefs: [] }
      return res.json()
    },
  })

  const { data: briefDetail, refetch: refetchBrief } = useQuery({
    queryKey: ['project-brief', analyzingBriefId],
    queryFn: async () => {
      if (!analyzingBriefId) return null
      const res = await fetch(`/api/project-intake/${analyzingBriefId}`)
      if (!res.ok) return null
      return res.json()
    },
    enabled: !!analyzingBriefId,
    refetchInterval: (data: any) => data?.brief?.status === 'analyzed' || data?.brief?.status === 'priced' ? false : 3000,
  })

  const createBrief = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/project-intake', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Failed')
      return res.json()
    },
    onSuccess: (data) => {
      toast.success('Brief submitted — AI is analyzing your business...')
      setAnalyzingBriefId(data.brief.id)
      refetchBrief()
      qc.invalidateQueries({ queryKey: ['project-briefs'] })
    },
    onError: () => toast.error('Failed to submit brief'),
  })

  const pay = useMutation({
    mutationFn: async (params: { amount: number; tier: string; paymentOption: 'full' | 'phased' }) => {
      const res = await fetch(`/api/project-intake/${analyzingBriefId}/pay`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      })
      if (!res.ok) throw new Error('Payment failed')
      return res.json()
    },
    onSuccess: () => {
      toast.success('Payment processed!')
      setPaymentFlow(null)
      refetchBrief()
    },
    onError: () => toast.error('Payment failed'),
  })

  const brief = briefDetail?.brief
  const roadmap = briefDetail?.roadmap
  const pricing = briefDetail?.pricingTiers
  const isAnalyzing = brief && (brief.status === 'draft' || brief.status === 'analyzed')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Rocket className="h-8 w-8 animate-float-3d" style={{ color: '#F26522' }} />
          Project Brief & Pricing
          <GuideTooltip sectionId="onboarding-wizard" />
        </h1>
        <p className="text-muted-foreground mt-1">
          Describe your business → AI generates roadmap + 3-tier pricing → Pay in full or phased
        </p>
      </div>

      {/* Brief form */}
      <Card className="card-3d">
        <CardContent className="p-6 space-y-4">
          <h2 className="text-lg font-semibold">Tell us about your business</h2>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <Label>Business Name *</Label>
              <Input value={form.businessName} onChange={e => setForm({ ...form, businessName: e.target.value })} placeholder="Acme Corp" />
            </div>
            <div>
              <Label>Industry</Label>
              <Input value={form.industry} onChange={e => setForm({ ...form, industry: e.target.value })} placeholder="SaaS, Retail, Healthcare..." />
            </div>
            <div>
              <Label>Website</Label>
              <Input value={form.website} onChange={e => setForm({ ...form, website: e.target.value })} placeholder="https://..." />
            </div>
            <div>
              <Label>Target Market</Label>
              <Input value={form.targetMarket} onChange={e => setForm({ ...form, targetMarket: e.target.value })} placeholder="Global, MENA, US..." />
            </div>
            <div>
              <Label>Budget (USD)</Label>
              <Input type="number" value={form.budget} onChange={e => setForm({ ...form, budget: e.target.value })} placeholder="5000" />
            </div>
            <div>
              <Label>Timeline</Label>
              <Select value={form.timeline} onValueChange={(v) => setForm({ ...form, timeline: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ASAP">ASAP</SelectItem>
                  <SelectItem value="1-3 months">1-3 months</SelectItem>
                  <SelectItem value="3-6 months">3-6 months</SelectItem>
                  <SelectItem value="6+ months">6+ months</SelectItem>
                  <SelectItem value="flexible">Flexible</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Business Description *</Label>
            <Textarea rows={4} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="What does your business do? What problems do you solve? Who are your customers?" />
          </div>
          <div>
            <Label>Goals (comma-separated)</Label>
            <Input value={form.goals} onChange={e => setForm({ ...form, goals: e.target.value })} placeholder="increase sales, brand awareness, lead generation..." />
          </div>
          <Button
            className="bg-brand-accent-gradient text-white btn-3d"
            disabled={!form.businessName || !form.description || createBrief.isPending}
            onClick={() => createBrief.mutate({
              businessName: form.businessName,
              industry: form.industry,
              website: form.website,
              description: form.description,
              targetMarket: form.targetMarket,
              budget: form.budget ? parseFloat(form.budget) : undefined,
              timeline: form.timeline,
              goals: form.goals.split(',').map(s => s.trim()).filter(Boolean),
            })}
          >
            {createBrief.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1" />}
            Submit & Generate Roadmap
          </Button>
        </CardContent>
      </Card>

      {/* Analysis loading */}
      {isAnalyzing && (
        <Card className="card-3d border-2" style={{ borderColor: '#F26522' }}>
          <CardContent className="p-8 text-center">
            <Loader2 className="h-12 w-12 mx-auto animate-spin text-brand-accent mb-3" />
            <h3 className="font-semibold text-lg">AI is analyzing your business...</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Generating roadmap, milestones, and 3-tier pricing. This takes ~30 seconds.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Roadmap + Pricing result */}
      {brief?.status === 'priced' && roadmap && pricing && (
        <>
          {/* Roadmap */}
          <Card className="card-3d">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-brand-accent" />
                Marketing Roadmap
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm">{roadmap.executive_summary}</p>

              {/* SWOT */}
              {roadmap.swot && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {['strengths', 'weaknesses', 'opportunities', 'threats'].map(key => (
                    <div key={key} className="border rounded p-2">
                      <div className="text-xs font-semibold capitalize text-muted-foreground">{key}</div>
                      <ul className="text-xs mt-1 space-y-0.5">
                        {(roadmap.swot[key] ?? []).slice(0, 3).map((item: string, i: number) => (
                          <li key={i}>• {item}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}

              {/* Phases */}
              <div>
                <div className="text-sm font-semibold mb-2">Project Phases</div>
                <div className="space-y-2">
                  {(roadmap.roadmap ?? []).map((phase: any, i: number) => (
                    <div key={i} className="border-l-2 pl-3 py-1" style={{ borderColor: '#F26522' }}>
                      <div className="font-medium text-sm">Phase {phase.phase}: {phase.name} ({phase.duration_weeks}w)</div>
                      <div className="text-xs text-muted-foreground">
                        Milestones: {(phase.milestones ?? []).join(', ')}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Deliverables: {(phase.deliverables ?? []).join(', ')}
                      </div>
                      <div className="text-xs">~{phase.estimated_hours}h estimated</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-4 text-sm pt-2 border-t">
                <span><strong>Total:</strong> {roadmap.total_estimated_weeks} weeks · {roadmap.total_estimated_hours}h</span>
                <span><strong>Channels:</strong> {(roadmap.recommended_channels ?? []).join(', ')}</span>
              </div>
            </CardContent>
          </Card>

          {/* 3-Tier Pricing */}
          <Card className="card-3d">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-brand-accent" />
                Choose Your Plan
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                {(pricing.tiers ?? []).map((tier: any, i: number) => {
                  const isRecommended = tier.is_recommended || pricing.recommended_tier?.toLowerCase() === tier.name.toLowerCase()
                  const tierColor = TIER_COLORS[tier.name.toLowerCase()] ?? '#999'
                  return (
                    <Card
                      key={i}
                      className={`card-3d relative ${isRecommended ? 'border-2 scale-105' : ''}`}
                      style={isRecommended ? { borderColor: '#F26522' } : undefined}
                    >
                      {isRecommended && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-semibold text-white" style={{ background: '#F26522' }}>
                          RECOMMENDED
                        </div>
                      )}
                      <CardContent className="p-4 space-y-3">
                        <div>
                          <div className="font-bold text-lg" style={{ color: tierColor }}>{tier.name}</div>
                          <div className="text-xs text-muted-foreground">{tier.tagline}</div>
                        </div>
                        <div>
                          <span className="text-3xl font-bold">${tier.price?.toLocaleString()}</span>
                          <span className="text-sm text-muted-foreground"> · {tier.delivery_weeks}w</span>
                        </div>
                        <ul className="space-y-1 text-xs">
                          {(tier.features ?? []).map((f: string, j: number) => (
                            <li key={j} className="flex items-start gap-1">
                              <Check className="h-3 w-3 text-emerald-500 shrink-0 mt-0.5" /> {f}
                            </li>
                          ))}
                        </ul>
                        {tier.excluded?.length > 0 && (
                          <ul className="space-y-1 text-xs text-muted-foreground">
                            {tier.excluded.map((f: string, j: number) => (
                              <li key={j} className="flex items-start gap-1">
                                <X className="h-3 w-3 text-red-400 shrink-0 mt-0.5" /> {f}
                              </li>
                            ))}
                          </ul>
                        )}

                        {/* Payment options */}
                        <div className="space-y-2 pt-2 border-t">
                          <Button
                            className="w-full bg-brand-accent-gradient text-white btn-3d"
                            onClick={() => setPaymentFlow({ tier, option: 'full' })}
                          >
                            <CreditCard className="h-4 w-4 mr-1" />
                            Pay Full: ${tier.payment_options?.full_payment?.price?.toLocaleString()}
                            <Badge variant="secondary" className="ml-1 text-[10px]">-{tier.payment_options?.full_payment?.discount_percent}%</Badge>
                          </Button>
                          <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => setPaymentFlow({ tier, option: 'phased' })}
                          >
                            <Calendar className="h-4 w-4 mr-1" />
                            Pay Phased: {tier.payment_options?.phased?.length} installments
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>

              {pricing.recommendation_reason && (
                <div className="mt-4 p-3 rounded-lg bg-brand-primary/5 border border-brand-primary/20 text-sm">
                  <strong>Why {pricing.recommended_tier}?</strong> {pricing.recommendation_reason}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Payment modal */}
      {paymentFlow && (
        <Card className="fixed inset-0 z-50 grid place-items-center bg-black/40 backdrop-blur-sm p-4">
          <Card className="w-full max-w-md card-3d animate-scale-in">
            <CardContent className="p-6 space-y-3">
              <h3 className="font-bold text-lg">
                {paymentFlow.option === 'full' ? 'Pay in Full' : 'Phased Payment'} — {paymentFlow.tier.name}
              </h3>
              {paymentFlow.option === 'full' ? (
                <div className="space-y-2">
                  <div className="text-3xl font-bold">${paymentFlow.tier.payment_options.full_payment.price.toLocaleString()}</div>
                  <div className="text-xs text-emerald-600">You save ${(paymentFlow.tier.price - paymentFlow.tier.payment_options.full_payment.price).toLocaleString()} (10% off)</div>
                  <Button
                    className="w-full bg-brand-accent-gradient text-white btn-3d mt-3"
                    disabled={pay.isPending}
                    onClick={() => pay.mutate({
                      amount: paymentFlow.tier.payment_options.full_payment.price,
                      tier: paymentFlow.tier.name,
                      paymentOption: 'full',
                    })}
                  >
                    {pay.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Zap className="h-4 w-4 mr-1" />}
                    Pay ${paymentFlow.tier.payment_options.full_payment.price.toLocaleString()} Now
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">{paymentFlow.tier.payment_options.phased.length} installments:</div>
                  {paymentFlow.tier.payment_options.phased.map((p: any, i: number) => (
                    <div key={i} className="flex justify-between p-2 border rounded text-sm">
                      <div>
                        <div className="font-medium">{p.milestone}</div>
                        <div className="text-xs text-muted-foreground">{p.due}</div>
                      </div>
                      <div className="font-semibold">${p.amount.toLocaleString()}</div>
                    </div>
                  ))}
                  <Button
                    className="w-full bg-brand-accent-gradient text-white btn-3d mt-3"
                    disabled={pay.isPending}
                    onClick={() => pay.mutate({
                      amount: paymentFlow.tier.payment_options.phased[0].amount,
                      tier: paymentFlow.tier.name,
                      paymentOption: 'phased',
                    })}
                  >
                    {pay.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <CreditCard className="h-4 w-4 mr-1" />}
                    Pay Deposit: ${paymentFlow.tier.payment_options.phased[0].amount.toLocaleString()}
                  </Button>
                </div>
              )}
              <Button variant="ghost" className="w-full" onClick={() => setPaymentFlow(null)}>Cancel</Button>
            </CardContent>
          </Card>
        </Card>
      )}

      {/* Recent briefs */}
      {(briefsData?.briefs ?? []).length > 0 && !analyzingBriefId && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Your Recent Briefs</CardTitle></CardHeader>
          <CardContent className="space-y-1">
            {(briefsData?.briefs ?? []).slice(0, 5).map((b: any) => (
              <button
                key={b.id}
                onClick={() => setAnalyzingBriefId(b.id)}
                className="w-full text-left p-2 border rounded hover:bg-muted transition-colors flex items-center justify-between"
              >
                <div>
                  <div className="font-medium text-sm">{b.businessName}</div>
                  <div className="text-xs text-muted-foreground">{new Date(b.createdAt).toLocaleString()}</div>
                </div>
                <Badge variant="outline">{b.status}</Badge>
              </button>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
