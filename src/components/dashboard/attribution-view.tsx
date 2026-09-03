'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import {
  BarChart3, Shield, Bell, MessageSquare, GitBranch, Webhook,
  TrendingUp, AlertTriangle, Check, Loader2, Zap, Target, Users, Plus, Trash2,
} from 'lucide-react'
import { useState } from 'react'

const FRAUD_RULE_TYPES = ['click_injection', 'sdk_spoofing', 'click_spamming', 'ip_anomaly', 'device_farm']

const SOURCE_COLORS: Record<string, string> = {
  google_ads: '#4285F4', facebook_ads: '#1877F2', organic: '#22c55e',
  referral: '#f59e0b', direct: '#64748b', email: '#0A0A0B',
}

const SEVERITY_COLORS: Record<string, string> = {
  low: '#22c55e', medium: '#f59e0b', high: '#ef4444', critical: '#dc2626',
}

const emptyRuleForm = { name: '', type: 'click_injection', description: '', severity: 'medium', action: 'flag', threshold: '' }

export function AttributionView() {
  const qc = useQueryClient()
  const [ruleDialogOpen, setRuleDialogOpen] = useState(false)
  const [ruleForm, setRuleForm] = useState(emptyRuleForm)

  const { data: eventsData } = useQuery({
    queryKey: ['attribution-events'],
    queryFn: async () => {
      const res = await fetch('/api/attribution/events')
      if (!res.ok) return { items: [] }
      return res.json()
    },
  })

  const { data: rulesData } = useQuery({
    queryKey: ['fraud-rules'],
    queryFn: async () => {
      const res = await fetch('/api/attribution/rules')
      if (!res.ok) return { items: [] }
      return res.json()
    },
  })

  const createRule = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch('/api/attribution/rules', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('Failed to create rule')
      return res.json()
    },
    onSuccess: () => {
      toast.success('Fraud rule created')
      qc.invalidateQueries({ queryKey: ['fraud-rules'] })
      setRuleDialogOpen(false)
      setRuleForm(emptyRuleForm)
    },
    onError: (err: any) => toast.error(String(err?.message ?? err)),
  })

  const toggleRule = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const res = await fetch(`/api/attribution/rules/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive }),
      })
      if (!res.ok) throw new Error('Failed')
      return res.json()
    },
    onSuccess: () => {
      toast.success('Rule updated')
      qc.invalidateQueries({ queryKey: ['fraud-rules'] })
    },
    onError: (err: any) => toast.error(String(err?.message ?? err)),
  })

  const deleteRule = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/attribution/rules/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed')
      return res.json()
    },
    onSuccess: () => {
      toast.success('Rule deleted')
      qc.invalidateQueries({ queryKey: ['fraud-rules'] })
    },
    onError: (err: any) => toast.error(String(err?.message ?? err)),
  })

  const submitRule = () => {
    if (!ruleForm.name.trim() || !ruleForm.description.trim()) {
      toast.error('Name and description are required')
      return
    }
    createRule.mutate({
      name: ruleForm.name,
      type: ruleForm.type,
      description: ruleForm.description,
      severity: ruleForm.severity,
      action: ruleForm.action,
      config: JSON.stringify({ threshold: ruleForm.threshold || undefined }),
      isActive: true,
    })
  }

  const events = eventsData?.items ?? []
  const rules = rulesData?.items ?? []
  const fraudEvents = events.filter((e: any) => e.isFraud)
  const sourceBreakdown = events.reduce((acc: Record<string, number>, e: any) => {
    acc[e.source] = (acc[e.source] || 0) + 1
    return acc
  }, {})
  const totalRevenue = events.reduce((s: number, e: any) => s + (e.revenue || 0), 0)

  return (
    <div className="space-y-4 p-4 md:p-6 animate-fade-in-up">
      <div>
        <h2 className="text-base font-semibold flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-[#0A0A0B]" />
          Attribution & Analytics
        </h2>
        <p className="text-xs text-muted-foreground">Track user acquisition sources, detect fraud, analyze funnels and cohorts — like Metrix.ir</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4"><Users className="h-4 w-4 text-[#0A0A0B] mb-1" /><p className="text-2xl font-bold">{events.length}</p><p className="text-xs text-muted-foreground">Attributed Events</p></CardContent></Card>
        <Card><CardContent className="p-4"><AlertTriangle className="h-4 w-4 text-red-600 mb-1" /><p className="text-2xl font-bold text-red-600">{fraudEvents.length}</p><p className="text-xs text-muted-foreground">Fraud Detected</p></CardContent></Card>
        <Card><CardContent className="p-4"><Shield className="h-4 w-4 text-emerald-600 mb-1" /><p className="text-2xl font-bold">{rules.length}</p><p className="text-xs text-muted-foreground">Fraud Rules Active</p></CardContent></Card>
        <Card><CardContent className="p-4"><TrendingUp className="h-4 w-4 text-[#FF6A00] mb-1" /><p className="text-2xl font-bold text-[#FF6A00]">${totalRevenue.toLocaleString()}</p><p className="text-xs text-muted-foreground">Attributed Revenue</p></CardContent></Card>
      </div>

      <Tabs defaultValue="sources">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="sources">Sources</TabsTrigger>
          <TabsTrigger value="fraud">Fraud Detection</TabsTrigger>
          <TabsTrigger value="funnel">Funnel</TabsTrigger>
          <TabsTrigger value="journey">Journey</TabsTrigger>
        </TabsList>

        {/* Sources Tab */}
        <TabsContent value="sources" className="space-y-3">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm">Acquisition Sources</CardTitle></CardHeader>
            <CardContent>
              {Object.keys(sourceBreakdown).length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No attribution events yet. Events appear when users are tracked from ad campaigns.</p>
              ) : (
                <div className="space-y-2">
                  {Object.entries(sourceBreakdown).map(([source, count]) => {
                    const c = count as number
                    const pct = Math.round((c / events.length) * 100)
                    return (
                      <div key={source}>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="capitalize">{source.replace('_', ' ')}</span>
                          <span className="font-medium">{c} ({pct}%)</span>
                        </div>
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: SOURCE_COLORS[source] ?? '#64748b' }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent events */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm">Recent Events</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-1.5 max-h-64 overflow-y-auto scroll-thin">
                {events.slice(0, 15).map((e: any) => (
                  <div key={e.id} className="flex items-center gap-2 p-2 rounded-md bg-muted/30 text-xs">
                    <Badge variant="outline" className="text-[9px] capitalize" style={{ background: (SOURCE_COLORS[e.source] ?? '#64748b') + '20', color: SOURCE_COLORS[e.source] ?? '#64748b' }}>{e.source}</Badge>
                    <span className="flex-1 truncate">{e.eventName}</span>
                    {e.isFraud && <Badge variant="destructive" className="text-[9px]">FRAUD</Badge>}
                    {e.revenue && <span className="text-emerald-600 font-medium">${e.revenue}</span>}
                    <span className="text-muted-foreground">{new Date(e.createdAt).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Fraud Tab */}
        <TabsContent value="fraud" className="space-y-3">
          <Card>
            <CardHeader className="pb-3 flex-row items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2"><Shield className="h-4 w-4 text-emerald-600" /> Fraud Detection Rules ({rules.length})</CardTitle>
              <Dialog open={ruleDialogOpen} onOpenChange={(o) => { setRuleDialogOpen(o); if (!o) setRuleForm(emptyRuleForm) }}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline" className="gap-1.5"><Plus className="h-3.5 w-3.5" /> Add Rule</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>New Fraud Rule</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <div>
                      <Label className="text-xs">Name</Label>
                      <Input value={ruleForm.name} onChange={(e) => setRuleForm({ ...ruleForm, name: e.target.value })} placeholder="Block rapid repeat clicks" />
                    </div>
                    <div>
                      <Label className="text-xs">Description</Label>
                      <Input value={ruleForm.description} onChange={(e) => setRuleForm({ ...ruleForm, description: e.target.value })} placeholder="Flags 5+ clicks from the same device within 60s" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs">Type</Label>
                        <Select value={ruleForm.type} onValueChange={(v) => setRuleForm({ ...ruleForm, type: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {FRAUD_RULE_TYPES.map((t) => <SelectItem key={t} value={t}>{t.replace('_', ' ')}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Severity</Label>
                        <Select value={ruleForm.severity} onValueChange={(v) => setRuleForm({ ...ruleForm, severity: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {['low', 'medium', 'high', 'critical'].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Action</Label>
                        <Select value={ruleForm.action} onValueChange={(v) => setRuleForm({ ...ruleForm, action: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {['flag', 'block', 'review'].map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Threshold (optional)</Label>
                        <Input value={ruleForm.threshold} onChange={(e) => setRuleForm({ ...ruleForm, threshold: e.target.value })} placeholder="5" />
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="ghost" onClick={() => setRuleDialogOpen(false)}>Cancel</Button>
                    <Button onClick={submitRule} disabled={createRule.isPending}>{createRule.isPending ? 'Creating…' : 'Create Rule'}</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {rules.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No fraud rules yet. Add one above, or run 1-Click Setup to create default rules.</p>
              ) : (
                <div className="space-y-2">
                  {rules.map((r: any) => (
                    <div key={r.id} className="rounded-lg border p-3">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium">{r.name}</p>
                          <p className="text-xs text-muted-foreground">{r.description}</p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Badge variant="outline" className="text-[9px] capitalize" style={{ background: SEVERITY_COLORS[r.severity] + '20', color: SEVERITY_COLORS[r.severity] }}>{r.severity}</Badge>
                          <Button
                            size="sm" variant="ghost" className="h-6 px-2 text-[10px]"
                            onClick={() => toggleRule.mutate({ id: r.id, isActive: !r.isActive })}
                            disabled={toggleRule.isPending}
                          >
                            {r.isActive ? 'Disable' : 'Enable'}
                          </Button>
                          <Button
                            size="icon" variant="ghost" className="h-6 w-6 text-destructive"
                            onClick={() => deleteRule.mutate(r.id)}
                            disabled={deleteRule.isPending}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-[10px] text-muted-foreground mt-1">
                        <span>Type: <span className="font-medium capitalize">{r.type.replace('_', ' ')}</span></span>
                        <span>Action: <span className="font-medium capitalize">{r.action}</span></span>
                        <span>Detected: <span className="font-medium">{r.totalDetected}</span></span>
                        <span>Blocked: <span className="font-medium">{r.totalBlocked}</span></span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Funnel Tab */}
        <TabsContent value="funnel" className="space-y-3">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><Target className="h-4 w-4 text-[#FF6A00]" /> Marketing Funnel</CardTitle></CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground mb-4">Visualize your conversion funnel from visit to customer.</p>
              {/* Default funnel stages */}
              <div className="space-y-2">
                {[
                  { name: 'Visit', count: 10000, pct: 100, color: '#0A0A0B' },
                  { name: 'Signup', count: 2500, pct: 25, color: '#C9CDD3' },
                  { name: 'Lead', count: 800, pct: 8, color: '#4FC3F7' },
                  { name: 'Qualified', count: 320, pct: 3.2, color: '#FF6A00' },
                  { name: 'Deal', count: 95, pct: 0.95, color: '#FF8A3D' },
                  { name: 'Customer', count: 38, pct: 0.38, color: '#22c55e' },
                ].map((stage, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-20 text-xs text-right text-muted-foreground">{stage.name}</div>
                    <div className="flex-1 h-8 rounded-md overflow-hidden bg-muted relative">
                      <div className="h-full rounded-md flex items-center px-3 text-xs text-white font-medium transition-all" style={{ width: `${Math.max(stage.pct, 5)}%`, background: stage.color }}>
                        {stage.count.toLocaleString()}
                      </div>
                    </div>
                    <div className="w-16 text-xs text-right">
                      <span className="font-medium">{stage.pct}%</span>
                      {i > 0 && <span className="text-[9px] text-muted-foreground block">↓ {Math.round((stage.count / 10000) * 100)}%</span>}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-3 border-t text-xs text-muted-foreground">
                Overall conversion rate: <span className="font-bold text-[#FF6A00]">0.38%</span> · Drop-off: <span className="font-bold text-red-600">99.62%</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Journey Tab */}
        <TabsContent value="journey" className="space-y-3">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><GitBranch className="h-4 w-4 text-violet-600" /> Customer Journey Designer</CardTitle></CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground mb-4">Design automated customer journeys with triggers, actions, conditions, and waits.</p>
              {/* Default journey visualization */}
              <div className="space-y-2">
                {[
                  { type: 'trigger', label: 'User signs up', icon: Zap, color: 'bg-[#FF6A00]' },
                  { type: 'action', label: 'Send welcome email', icon: MessageSquare, color: 'bg-[#0A0A0B]' },
                  { type: 'wait', label: 'Wait 2 days', icon: Loader2, color: 'bg-amber-500' },
                  { type: 'action', label: 'Push notification: "Check features!"', icon: Bell, color: 'bg-[#0A0A0B]' },
                  { type: 'wait', label: 'Wait 5 days', icon: Loader2, color: 'bg-amber-500' },
                  { type: 'action', label: 'Send follow-up email', icon: MessageSquare, color: 'bg-[#0A0A0B]' },
                ].map((step, i) => {
                  const Icon = step.icon
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <div className={`grid place-items-center h-8 w-8 rounded-full ${step.color} text-white shrink-0`}>
                        <Icon className={`h-4 w-4 ${step.type === 'wait' ? 'animate-spin' : ''}`} />
                      </div>
                      <div className="flex-1 rounded-lg border p-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[9px] capitalize">{step.type}</Badge>
                          <span className="text-sm">{step.label}</span>
                        </div>
                      </div>
                      {i < 5 && <div className="absolute" />}
                    </div>
                  )
                })}
              </div>
              <div className="mt-4 pt-3 border-t flex items-center gap-4 text-xs">
                <span className="flex items-center gap-1"><Zap className="h-3 w-3 text-[#FF6A00]" /> Trigger</span>
                <span className="flex items-center gap-1"><MessageSquare className="h-3 w-3 text-[#0A0A0B]" /> Action</span>
                <span className="flex items-center gap-1"><Loader2 className="h-3 w-3 text-amber-500" /> Wait</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
