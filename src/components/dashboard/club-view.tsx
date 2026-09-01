'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { Crown, Star, Gift, Megaphone, TrendingUp, Award, Sparkles, Check, Eye, MousePointerClick, Key } from 'lucide-react'
import { useState } from 'react'

const TIER_ICONS: Record<string, string> = { Bronze: '🥉', Silver: '🥈', Gold: '🥇', Platinum: '💎' }

export function ClubView() {
  const qc = useQueryClient()
  const [tab, setTab] = useState('overview')
  const [adOpen, setAdOpen] = useState(false)
  const [adForm, setAdForm] = useState({ title: '', description: '', targetUrl: '', placement: 'dashboard_sidebar' })

  const { data, isLoading } = useQuery({
    queryKey: ['club-membership'],
    queryFn: async () => {
      const res = await fetch('/api/club/membership')
      if (!res.ok) return null
      return res.json()
    },
  })

  const { data: tiersData } = useQuery({
    queryKey: ['club-tiers'],
    queryFn: async () => {
      const res = await fetch('/api/club/tiers')
      if (!res.ok) return { tiers: [] }
      return res.json()
    },
  })

  const createAdMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/club/membership', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create_ad', ...adForm }),
      })
      if (!res.ok) {
        const e = await res.json().catch(() => ({}))
        throw new Error(e.error || 'failed')
      }
      return res.json()
    },
    onSuccess: () => {
      toast.success('Ad submitted for approval! It will appear once approved.')
      qc.invalidateQueries({ queryKey: ['club-membership'] })
      setAdOpen(false)
      setAdForm({ title: '', description: '', targetUrl: '', placement: 'dashboard_sidebar' })
    },
    onError: (e: any) => toast.error(String(e?.message ?? e)),
  })

  const redeemMutation = useMutation({
    mutationFn: async (rewardId: string) => {
      const res = await fetch(`/api/club/rewards/${rewardId}/redeem`, { method: 'POST' })
      if (!res.ok) {
        const e = await res.json().catch(() => ({}))
        throw new Error(e.error || 'failed')
      }
      return res.json()
    },
    onSuccess: (data) => {
      toast.success(`Redeemed! ${data.effect}`)
      qc.invalidateQueries({ queryKey: ['club-membership'] })
    },
    onError: (e: any) => toast.error(String(e?.message ?? e)),
  })

  if (isLoading) {
    return <div className="p-6"><div className="h-40 bg-muted animate-pulse rounded-xl" /></div>
  }

  const membership = data?.membership
  const rewards = data?.rewards ?? []
  const tiers = tiersData?.tiers ?? []

  if (!membership) return null

  const tier = membership.tier
  const pointsHistory = membership.pointsHistory ?? []
  const advertisements = membership.advertisements ?? []

  // Find next tier
  const nextTier = tiers.find((t: any) => t.level === tier.level + 1)
  const spendProgress = nextTier ? Math.min((membership.totalSpend / nextTier.minSpend) * 100, 100) : 100
  const monthsProgress = nextTier ? Math.min((membership.monthsActive / nextTier.minMonths) * 100, 100) : 100

  return (
    <div className="space-y-4 p-4 md:p-6 animate-fade-in-up">
      <div>
        <h2 className="text-base font-semibold flex items-center gap-2">
          <Crown className="h-5 w-5" style={{ color: tier.color }} />
          Customer Club
        </h2>
        <p className="text-xs text-muted-foreground">Earn points, unlock rewards, and advertise your business for free</p>
      </div>

      {/* Membership Card */}
      <Card className="overflow-hidden relative" style={{ background: `linear-gradient(135deg, ${tier.color}22, ${tier.color}05)` }}>
        <CardContent className="p-6">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="grid place-items-center h-16 w-16 rounded-2xl text-4xl shadow-md" style={{ background: tier.color }}>
                {TIER_ICONS[tier.name] ?? '🏆'}
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-2xl font-bold" style={{ color: tier.color }}>{tier.name}</h3>
                  <Badge variant="outline" className="text-[10px]">Level {tier.level}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{tier.description}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold" style={{ color: tier.color }}>{membership.availablePoints.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Available Points</p>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-4 gap-3 mt-4">
            <div className="rounded-lg bg-white/50 dark:bg-white/5 p-2 text-center">
              <Star className="h-4 w-4 mx-auto text-amber-500 mb-1" />
              <p className="text-lg font-bold">{membership.lifetimePoints.toLocaleString()}</p>
              <p className="text-[10px] text-muted-foreground">Lifetime Points</p>
            </div>
            <div className="rounded-lg bg-white/50 dark:bg-white/5 p-2 text-center">
              <TrendingUp className="h-4 w-4 mx-auto text-emerald-600 mb-1" />
              <p className="text-lg font-bold">${membership.totalSpend.toLocaleString()}</p>
              <p className="text-[10px] text-muted-foreground">Total Spend</p>
            </div>
            <div className="rounded-lg bg-white/50 dark:bg-white/5 p-2 text-center">
              <Megaphone className="h-4 w-4 mx-auto text-[#FF5722] mb-1" />
              <p className="text-lg font-bold">{membership.adCreditsBalance}</p>
              <p className="text-[10px] text-muted-foreground">Ad Credits</p>
            </div>
            <div className="rounded-lg bg-white/50 dark:bg-white/5 p-2 text-center">
              <Award className="h-4 w-4 mx-auto text-violet-600 mb-1" />
              <p className="text-lg font-bold">{membership.monthsActive}</p>
              <p className="text-[10px] text-muted-foreground">Months Active</p>
            </div>
          </div>

          {/* Next tier progress */}
          {nextTier && (
            <div className="mt-4 pt-4 border-t">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium">Progress to {nextTier.name} {TIER_ICONS[nextTier.name]}</span>
                <span className="text-xs text-muted-foreground">Spend ${membership.totalSpend}/${nextTier.minSpend} · {membership.monthsActive}/{nextTier.minMonths} months</span>
              </div>
              <div className="space-y-2">
                <div>
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-0.5"><span>Spend</span><span>{Math.round(spendProgress)}%</span></div>
                  <Progress value={spendProgress} className="h-1.5" />
                </div>
                <div>
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-0.5"><span>Tenure</span><span>{Math.round(monthsProgress)}%</span></div>
                  <Progress value={monthsProgress} className="h-1.5" />
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Benefits & Rewards</TabsTrigger>
          <TabsTrigger value="ads">My Ads</TabsTrigger>
          <TabsTrigger value="history">Points History</TabsTrigger>
        </TabsList>

        {/* Overview Tab — Benefits + Rewards */}
        <TabsContent value="overview" className="space-y-4">
          {/* Benefits */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><Award className="h-4 w-4" style={{ color: tier.color }} /> Your {tier.name} Benefits</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <BenefitItem icon="percentage" label="Discount" value={`${tier.discountPct}%`} active={tier.discountPct > 0} />
                <BenefitItem icon="megaphone" label="Free Ad Credits/mo" value={tier.freeAdCredits.toString()} active={tier.freeAdCredits > 0} />
                <BenefitItem icon="api" label="API Call Bonus" value={tier.apiCallBonus.toLocaleString()} active={tier.apiCallBonus > 0} />
                <BenefitItem icon="support" label="Priority Support" value={tier.prioritySupport ? 'Yes' : 'No'} active={tier.prioritySupport} />
                <BenefitItem icon="early" label="Early Access" value={tier.earlyAccess ? 'Yes' : 'No'} active={tier.earlyAccess} />
                <BenefitItem icon="ads" label="Ads Used" value={membership.adCreditsUsed.toString()} active={membership.adCreditsUsed > 0} />
              </div>
            </CardContent>
          </Card>

          {/* Rewards */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><Gift className="h-4 w-4 text-[#FF5722]" /> Redeem Points</CardTitle></CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {rewards.map((reward: any) => (
                  <div key={reward.id} className="rounded-lg border p-3 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="text-3xl">{reward.icon}</div>
                      <Badge variant="outline" className="text-[10px] gap-1"><Star className="h-2.5 w-2.5" /> {reward.pointsCost}</Badge>
                    </div>
                    <p className="font-medium text-sm">{reward.name}</p>
                    <p className="text-xs text-muted-foreground mt-1 mb-3">{reward.description}</p>
                    <Button
                      size="sm"
                      className="w-full gap-1.5"
                      variant={membership.availablePoints >= reward.pointsCost ? 'default' : 'outline'}
                      disabled={membership.availablePoints < reward.pointsCost}
                      onClick={() => redeemMutation.mutate(reward.id)}
                    >
                      {membership.availablePoints >= reward.pointsCost ? <><Sparkles className="h-3.5 w-3.5" /> Redeem</> : <><Star className="h-3.5 w-3.5" /> Need {reward.pointsCost - membership.availablePoints} more</>}
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* All tiers comparison */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm">All Tiers</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {tiers.map((t: any) => (
                  <div key={t.id} className={`rounded-lg border p-3 text-center ${t.id === tier.id ? 'ring-2' : ''}`} style={t.id === tier.id ? { borderColor: t.color, boxShadow: `0 0 0 2px ${t.color}` } : {}}>
                    <div className="text-3xl mb-1">{TIER_ICONS[t.name] ?? '🏆'}</div>
                    <p className="font-medium text-sm" style={{ color: t.color }}>{t.name}</p>
                    <div className="mt-2 space-y-1 text-[10px] text-muted-foreground">
                      <p>{t.discountPct}% discount</p>
                      <p>{t.freeAdCredits} ad credits/mo</p>
                      {t.prioritySupport && <p>Priority support</p>}
                    </div>
                    {t.id !== tier.id && <p className="text-[9px] text-muted-foreground mt-2">Spend ${t.minSpend}+ · {t.minMonths}mo+</p>}
                    {t.id === tier.id && <Badge className="mt-2 text-[9px]" style={{ background: t.color }}>Current</Badge>}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Ads Tab */}
        <TabsContent value="ads" className="space-y-3">
          <div className="flex justify-end">
            <Dialog open={adOpen} onOpenChange={setAdOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2" disabled={membership.adCreditsBalance < 1}>
                  <Megaphone className="h-4 w-4" /> Create Ad {membership.adCreditsBalance < 1 && '(No credits)'}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Advertise Your Business — Free!</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground">Your ad will appear on the platform (dashboard sidebar, landing page, etc.) for all users to see. Costs 1 ad credit.</p>
                  <div>
                    <Label>Ad Title</Label>
                    <Input value={adForm.title} onChange={(e) => setAdForm({ ...adForm, title: e.target.value })} placeholder="Special Offer: 20% Off Web Design" />
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Textarea rows={3} value={adForm.description} onChange={(e) => setAdForm({ ...adForm, description: e.target.value })} placeholder="Professional web design services for small businesses..." />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label>Target URL</Label>
                      <Input value={adForm.targetUrl} onChange={(e) => setAdForm({ ...adForm, targetUrl: e.target.value })} placeholder="https://yoursite.com" dir="ltr" />
                    </div>
                    <div>
                      <Label>Placement</Label>
                      <Select value={adForm.placement} onValueChange={(v) => setAdForm({ ...adForm, placement: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="dashboard_sidebar">Dashboard Sidebar</SelectItem>
                          <SelectItem value="landing_page">Landing Page</SelectItem>
                          <SelectItem value="blog_sidebar">Blog Sidebar</SelectItem>
                          <SelectItem value="email_footer">Email Footer</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="ghost" onClick={() => setAdOpen(false)}>Cancel</Button>
                  <Button onClick={() => createAdMutation.mutate()} disabled={!adForm.title || !adForm.description || createAdMutation.isPending}>
                    {createAdMutation.isPending ? 'Submitting…' : 'Submit Ad (1 credit)'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {advertisements.length === 0 ? (
            <Card><CardContent className="p-12 text-center"><Megaphone className="h-10 w-10 mx-auto text-muted-foreground" /><p className="text-sm text-muted-foreground mt-2">No ads created yet.</p><p className="text-xs text-muted-foreground">Create an ad to promote your business for free on the platform!</p></CardContent></Card>
          ) : (
            <div className="space-y-3">
              {advertisements.map((ad: any) => (
                <Card key={ad.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm">{ad.title}</p>
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{ad.description}</p>
                      </div>
                      <Badge variant="outline" className="capitalize text-[10px] shrink-0">{ad.status}</Badge>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2 pt-2 border-t">
                      <span className="capitalize">{ad.placement.replace('_', ' ')}</span>
                      <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> {ad.impressions}</span>
                      <span className="flex items-center gap-1"><MousePointerClick className="h-3 w-3" /> {ad.clicks}</span>
                      <span>{new Date(ad.createdAt).toLocaleDateString()}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-3">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm">Points History ({pointsHistory.length})</CardTitle></CardHeader>
            <CardContent>
              {pointsHistory.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No points history yet.</p>
              ) : (
                <div className="space-y-1.5 max-h-96 overflow-y-auto scroll-thin">
                  {pointsHistory.map((p: any) => (
                    <div key={p.id} className="flex items-center gap-3 p-2 rounded-md bg-muted/30 text-sm">
                      <div className={`grid place-items-center h-7 w-7 rounded-full shrink-0 ${p.points > 0 ? 'bg-emerald-500/15 text-emerald-600' : 'bg-red-500/15 text-red-600'}`}>
                        {p.points > 0 ? '+' : '−'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="truncate">{p.description}</p>
                        <p className="text-[10px] text-muted-foreground capitalize">{p.reason.replace('_', ' ')} · {new Date(p.createdAt).toLocaleString()}</p>
                      </div>
                      <span className={`font-medium ${p.points > 0 ? 'text-emerald-600' : 'text-red-600'}`}>{p.points > 0 ? '+' : ''}{p.points}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function BenefitItem({ icon, label, value, active }: { icon: string; label: string; value: string; active: boolean }) {
  const icons: Record<string, any> = {
    percentage: '%', megaphone: Megaphone, api: Key, support: Award, early: Sparkles, ads: Megaphone,
  }
  const Icon = icons[icon]
  return (
    <div className={`rounded-lg border p-3 ${active ? '' : 'opacity-50'}`}>
      <div className="flex items-center gap-2 mb-1">
        {typeof Icon === 'string' ? <span className="text-lg font-bold">{Icon}</span> : <Icon className="h-4 w-4 text-muted-foreground" />}
        {active && <Check className="h-3 w-3 text-emerald-600 ml-auto" />}
      </div>
      <p className="text-sm font-medium">{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  )
}

