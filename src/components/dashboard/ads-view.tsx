'use client'

import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
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
import { Plus, Megaphone, DollarSign, MousePointerClick, TrendingUp, Target } from 'lucide-react'
import { useState } from 'react'

const STATUS_COLORS: Record<string, string> = {
  draft: '#64748b',
  active: '#22c55e',
  paused: '#f59e0b',
  completed: '#3b82f6',
}

export function AdsView() {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ name: '', budget: '', budgetType: 'daily', platform: 'google_ads' })

  const { data, isLoading } = useQuery({
    queryKey: ['ad-campaigns'],
    queryFn: async () => {
      const res = await fetch('/api/ads/campaigns')
      if (!res.ok) return { items: [] }
      return res.json()
    },
  })

  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      // First ensure an ad account exists (create if needed)
      const acctRes = await fetch('/api/ads/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, budget: Number(payload.budget) }),
      })
      if (!acctRes.ok) throw new Error('create failed')
      return acctRes.json()
    },
    onSuccess: () => {
      toast.success('Ad campaign created')
      qc.invalidateQueries({ queryKey: ['ad-campaigns'] })
      setOpen(false)
      setForm({ name: '', budget: '', budgetType: 'daily', platform: 'google_ads' })
    },
  })

  const campaigns = data?.items ?? []
  const totalSpend = campaigns.reduce((s: number, c: any) => s + (c.spend || 0), 0)
  const totalConversions = campaigns.reduce((s: number, c: any) => s + (c.conversions || 0), 0)
  const avgRoas = campaigns.length > 0 ? campaigns.reduce((s: number, c: any) => s + (c.roas || 0), 0) / campaigns.length : 0

  return (
    <div className="space-y-4 p-4 md:p-6 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-rose-600" />
            Advertising
          </h2>
          <p className="text-xs text-muted-foreground">Manage ad campaigns, track ROI, optimize budgets</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              New Campaign
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Ad Campaign</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Campaign Name</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Q4 Lead Gen" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Budget</Label>
                  <Input type="number" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} placeholder="50" />
                </div>
                <div>
                  <Label>Budget Type</Label>
                  <Select value={form.budgetType} onValueChange={(v) => setForm({ ...form, budgetType: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="lifetime">Lifetime</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={() => createMutation.mutate(form)} disabled={!form.name || !form.budget || createMutation.isPending}>
                {createMutation.isPending ? 'Creating…' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <Megaphone className="h-4 w-4 text-rose-600 mb-1" />
            <p className="text-2xl font-bold">{campaigns.length}</p>
            <p className="text-xs text-muted-foreground">Campaigns</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <DollarSign className="h-4 w-4 text-amber-600 mb-1" />
            <p className="text-2xl font-bold">${totalSpend.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Total Spend</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <Target className="h-4 w-4 text-violet-600 mb-1" />
            <p className="text-2xl font-bold">{totalConversions}</p>
            <p className="text-xs text-muted-foreground">Conversions</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <TrendingUp className="h-4 w-4 text-emerald-600 mb-1" />
            <p className="text-2xl font-bold">{avgRoas.toFixed(1)}x</p>
            <p className="text-xs text-muted-foreground">Avg ROAS</p>
          </CardContent>
        </Card>
      </div>

      {/* Campaigns List */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Campaigns ({campaigns.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : campaigns.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No ad campaigns yet. Create your first campaign to start advertising.</p>
          ) : (
            <div className="space-y-3">
              {campaigns.map((c: any) => (
                <div key={c.id} className="rounded-lg border p-3">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">{c.name}</p>
                      <p className="text-xs text-muted-foreground">${c.budget} {c.budgetType} budget</p>
                    </div>
                    <Badge variant="outline" className="capitalize shrink-0" style={{ background: (STATUS_COLORS[c.status] ?? '#64748b') + '20', color: STATUS_COLORS[c.status] ?? '#64748b' }}>
                      {c.status}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-center text-xs">
                    <div>
                      <p className="text-muted-foreground">Spend</p>
                      <p className="font-semibold">${(c.spend || 0).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Clicks</p>
                      <p className="font-semibold">{(c.clicks || 0).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">CTR</p>
                      <p className="font-semibold">{c.ctr ? c.ctr.toFixed(1) + '%' : '—'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">ROAS</p>
                      <p className="font-semibold">{c.roas ? c.roas.toFixed(1) + 'x' : '—'}</p>
                    </div>
                  </div>
                  {(c.budget || 0) > 0 && (
                    <div className="mt-2">
                      <Progress value={Math.min(((c.spend || 0) / c.budget) * 100, 100)} className="h-1" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
