'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import {
  Megaphone, Gift, Users, DollarSign, TrendingUp, Sparkles,
  Plus, Copy, Share2, Mail, Globe, Zap, Target,
} from 'lucide-react'
import { useState } from 'react'
import { ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip } from 'recharts'

const PROMO_TYPES: Record<string, { label: string; icon: any; color: string }> = {
  email_campaign: { label: 'Email Campaign', icon: Mail, color: '#0A0A0B' },
  social_post: { label: 'Social Post', icon: Share2, color: '#FF6A00' },
  blog_post: { label: 'Blog Post', icon: Globe, color: '#C9CDD3' },
  ad_campaign: { label: 'Ad Campaign', icon: Target, color: '#7C4DFF' },
  referral_program: { label: 'Referral', icon: Gift, color: '#22c55e' },
  seo_content: { label: 'SEO Content', icon: TrendingUp, color: '#f59e0b' },
}

const STATUS_COLORS: Record<string, string> = {
  draft: '#64748b', scheduled: '#3b82f6', active: '#22c55e', completed: '#0A0A0B', paused: '#f59e0b',
}

export function PlatformPromotionView() {
  const qc = useQueryClient()
  const [promoOpen, setPromoOpen] = useState(false)
  const [promoForm, setPromoForm] = useState({ name: '', type: 'email_campaign', title: '', description: '', targetAudience: 'all', content: '' })

  const { data: promosData } = useQuery({
    queryKey: ['platform-promotions'],
    queryFn: async () => {
      const res = await fetch('/api/platform/promotions')
      if (!res.ok) return { promotions: [] }
      return res.json()
    },
  })

  const { data: referralData } = useQuery({
    queryKey: ['platform-referrals'],
    queryFn: async () => {
      const res = await fetch('/api/platform/referrals')
      if (!res.ok) return { programs: [], referrals: [], totalEarned: 0 }
      return res.json()
    },
  })

  const { data: financeData } = useQuery({
    queryKey: ['platform-finance'],
    queryFn: async () => {
      const res = await fetch('/api/platform/finance')
      if (!res.ok) return null
      return res.json()
    },
  })

  const createPromoMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch('/api/platform/promotions', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('create failed')
      return res.json()
    },
    onSuccess: () => {
      toast.success('Promotion created')
      qc.invalidateQueries({ queryKey: ['platform-promotions'] })
      setPromoOpen(false)
      setPromoForm({ name: '', type: 'email_campaign', title: '', description: '', targetAudience: 'all', content: '' })
    },
  })

  const launchPromoMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/platform/promotions/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'active' }),
      })
      if (!res.ok) throw new Error('launch failed')
      return res.json()
    },
    onSuccess: () => {
      toast.success('Promotion launched! 🚀')
      qc.invalidateQueries({ queryKey: ['platform-promotions'] })
    },
  })

  const createReferralMutation = useMutation({
    mutationFn: async (email: string) => {
      const programs = referralData?.programs ?? []
      const programId = programs[0]?.id
      if (!programId) throw new Error('No active referral program')
      const res = await fetch('/api/platform/referrals', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ programId, refereeEmail: email }),
      })
      if (!res.ok) throw new Error('referral failed')
      return res.json()
    },
    onSuccess: (data) => {
      toast.success(`Referral created! Share link: ${data.shareUrl}`)
      qc.invalidateQueries({ queryKey: ['platform-referrals'] })
    },
  })

  const [referralEmail, setReferralEmail] = useState('')

  const promotions = promosData?.promotions ?? []
  const referrals = referralData?.referrals ?? []
  const programs = referralData?.programs ?? []
  const finance = financeData

  return (
    <div className="space-y-4 p-4 md:p-6 animate-fade-in-up">
      <div>
        <h2 className="text-base font-semibold flex items-center gap-2">
          <Megaphone className="h-5 w-5 text-[#FF6A00]" />
          Platform Self-Promotion
        </h2>
        <p className="text-xs text-muted-foreground">The marketing platform that markets itself — campaigns, referrals, and financial dashboard</p>
      </div>

      {/* Platform Finance Stats */}
      {finance && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Card><CardContent className="p-3"><DollarSign className="h-4 w-4 text-emerald-600 mb-1" /><p className="text-xl font-bold text-emerald-600">${finance.mrr?.toLocaleString()}</p><p className="text-[10px] text-muted-foreground">MRR</p></CardContent></Card>
          <Card><CardContent className="p-3"><TrendingUp className="h-4 w-4 text-[#FF6A00] mb-1" /><p className="text-xl font-bold text-[#FF6A00]">${finance.arr?.toLocaleString()}</p><p className="text-[10px] text-muted-foreground">ARR</p></CardContent></Card>
          <Card><CardContent className="p-3"><Users className="h-4 w-4 text-[#0A0A0B] mb-1" /><p className="text-xl font-bold">{finance.activeTenants}</p><p className="text-[10px] text-muted-foreground">Active Tenants</p></CardContent></Card>
          <Card><CardContent className="p-3"><Target className="h-4 w-4 text-violet-600 mb-1" /><p className="text-xl font-bold">${finance.cacEstimate}</p><p className="text-[10px] text-muted-foreground">CAC Estimate</p></CardContent></Card>
          <Card><CardContent className="p-3"><DollarSign className="h-4 w-4 text-amber-600 mb-1" /><p className="text-xl font-bold text-amber-600">${finance.ltvEstimate?.toLocaleString()}</p><p className="text-[10px] text-muted-foreground">LTV Estimate</p></CardContent></Card>
        </div>
      )}

      <Tabs defaultValue="campaigns">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="campaigns">Promotion Campaigns</TabsTrigger>
          <TabsTrigger value="referrals">Referrals ({referrals.length})</TabsTrigger>
          <TabsTrigger value="finance">Financial Dashboard</TabsTrigger>
        </TabsList>

        {/* Campaigns Tab */}
        <TabsContent value="campaigns" className="space-y-3">
          <div className="flex justify-end">
            <Dialog open={promoOpen} onOpenChange={setPromoOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2"><Plus className="h-4 w-4" /> New Promotion</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Create Self-Promotion Campaign</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div><Label>Campaign Name</Label><Input value={promoForm.name} onChange={(e) => setPromoForm({ ...promoForm, name: e.target.value })} /></div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label>Type</Label>
                      <Select value={promoForm.type} onValueChange={(v) => setPromoForm({ ...promoForm, type: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{Object.entries(PROMO_TYPES).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Target Audience</Label>
                      <Select value={promoForm.targetAudience} onValueChange={(v) => setPromoForm({ ...promoForm, targetAudience: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Users</SelectItem>
                          <SelectItem value="trial_users">Trial Users</SelectItem>
                          <SelectItem value="churned">Churned Customers</SelectItem>
                          <SelectItem value="prospects">Prospects</SelectItem>
                          <SelectItem value="resellers">Resellers</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div><Label>Title</Label><Input value={promoForm.title} onChange={(e) => setPromoForm({ ...promoForm, title: e.target.value })} /></div>
                  <div><Label>Content</Label><Textarea rows={3} value={promoForm.content} onChange={(e) => setPromoForm({ ...promoForm, content: e.target.value })} /></div>
                </div>
                <DialogFooter>
                  <Button variant="ghost" onClick={() => setPromoOpen(false)}>Cancel</Button>
                  <Button onClick={() => createPromoMutation.mutate(promoForm)} disabled={!promoForm.name || createPromoMutation.isPending}>Create</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {promotions.length === 0 ? (
            <Card><CardContent className="p-12 text-center"><Megaphone className="h-10 w-10 mx-auto text-muted-foreground" /><p className="text-sm text-muted-foreground mt-2">No promotions yet. Create campaigns to promote your platform!</p></CardContent></Card>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {promotions.map((p: any) => {
                const typeInfo = PROMO_TYPES[p.type] ?? { label: p.type, icon: Megaphone, color: '#0A0A0B' }
                const Icon = typeInfo.icon
                return (
                  <Card key={p.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <div className="grid place-items-center h-8 w-8 rounded-lg text-white shrink-0" style={{ background: typeInfo.color }}><Icon className="h-4 w-4" /></div>
                          <div>
                            <p className="text-sm font-medium">{p.name}</p>
                            <p className="text-[10px] text-muted-foreground">{typeInfo.label} · {p.targetAudience}</p>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-[10px]" style={{ background: (STATUS_COLORS[p.status] ?? '#64748b') + '20', color: STATUS_COLORS[p.status] ?? '#64748b' }}>{p.status}</Badge>
                      </div>
                      {p.title && <p className="text-xs text-muted-foreground mb-2">{p.title}</p>}
                      <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                        <span>👁 {p.impressions}</span>
                        <span>👆 {p.clicks}</span>
                        <span>✅ {p.conversions}</span>
                        <span>💰 ${p.revenue}</span>
                      </div>
                      {p.status === 'draft' && (
                        <Button size="sm" className="w-full mt-2 gap-1.5 bg-[#FF6A00] hover:bg-[#FF8A3D]" onClick={() => launchPromoMutation.mutate(p.id)}>
                          <Zap className="h-3.5 w-3.5" /> Launch Campaign
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>

        {/* Referrals Tab */}
        <TabsContent value="referrals" className="space-y-3">
          {/* Referral Programs */}
          {programs.length > 0 && (
            <Card className="border-[#FF6A00]/20 bg-gradient-to-br from-[#FF6A00]/5 to-[#FF8A3D]/5">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <Gift className="h-8 w-8 text-[#FF6A00]" />
                  <div>
                    <p className="font-semibold">{programs[0].name}</p>
                    <p className="text-xs text-muted-foreground">Refer a friend: You get ${programs[0].referrerReward} credit, they get ${programs[0].refereeReward} credit</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Input placeholder="friend@email.com" value={referralEmail} onChange={(e) => setReferralEmail(e.target.value)} dir="ltr" />
                  <Button className="gap-2 bg-[#FF6A00] hover:bg-[#FF8A3D]" onClick={() => createReferralMutation.mutate(referralEmail)} disabled={!referralEmail}>
                    <Sparkles className="h-4 w-4" /> Invite
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* My Referrals */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><Users className="h-4 w-4 text-[#0A0A0B]" /> My Referrals ({referrals.length})</CardTitle></CardHeader>
            <CardContent>
              {referrals.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No referrals yet. Invite friends to earn ${programs[0]?.referrerReward || 50} credit each!</p>
              ) : (
                <div className="space-y-2">
                  {referrals.map((r: any) => (
                    <div key={r.id} className="flex items-center gap-3 p-2 rounded-md bg-muted/30 text-xs">
                      <Badge variant="outline" className="text-[9px] capitalize">{r.status}</Badge>
                      <span className="flex-1 truncate" dir="ltr">{r.refereeEmail}</span>
                      <code className="text-[10px] font-mono text-muted-foreground" dir="ltr">{r.referralCode}</code>
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/?ref=${r.referralCode}`); toast.success('Link copied!') }}>
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Finance Tab */}
        <TabsContent value="finance" className="space-y-3">
          {finance ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Card><CardContent className="p-3"><DollarSign className="h-4 w-4 text-emerald-600 mb-1" /><p className="text-lg font-bold text-emerald-600">${finance.totalRevenue?.toLocaleString()}</p><p className="text-[10px] text-muted-foreground">Total Revenue</p></CardContent></Card>
                <Card><CardContent className="p-3"><Users className="h-4 w-4 text-[#0A0A0B] mb-1" /><p className="text-lg font-bold">{finance.newThisMonth}</p><p className="text-[10px] text-muted-foreground">New This Month</p></CardContent></Card>
                <Card><CardContent className="p-3"><TrendingUp className="h-4 w-4 text-red-600 mb-1" /><p className="text-lg font-bold text-red-600">{finance.churnedThisMonth}</p><p className="text-[10px] text-muted-foreground">Churned</p></CardContent></Card>
                <Card><CardContent className="p-3"><Target className="h-4 w-4 text-amber-600 mb-1" /><p className="text-lg font-bold text-amber-600">{finance.churnRate}%</p><p className="text-[10px] text-muted-foreground">Churn Rate</p></CardContent></Card>
              </div>

              {/* Revenue Chart */}
              <Card>
                <CardHeader className="pb-3"><CardTitle className="text-sm">Platform Revenue (12 months)</CardTitle></CardHeader>
                <CardContent>
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={finance.monthlyTrend}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                        <XAxis dataKey="month" tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" />
                        <YAxis tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" />
                        <Tooltip contentStyle={{ background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                        <Bar dataKey="revenue" fill="#0A0A0B" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-3 gap-3">
                <Card><CardContent className="p-3 text-center"><p className="text-lg font-bold">{finance.activeSubs}</p><p className="text-[10px] text-muted-foreground">Active Subs</p></CardContent></Card>
                <Card><CardContent className="p-3 text-center"><p className="text-lg font-bold">{finance.trialUsers}</p><p className="text-[10px] text-muted-foreground">Trial Users</p></CardContent></Card>
                <Card><CardContent className="p-3 text-center"><p className="text-lg font-bold text-red-600">{finance.failedPayments}</p><p className="text-[10px] text-muted-foreground">Failed Payments</p></CardContent></Card>
              </div>
            </>
          ) : (
            <Skeleton className="h-40 w-full" />
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

