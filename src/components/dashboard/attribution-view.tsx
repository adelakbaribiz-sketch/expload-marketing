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
  BarChart3, Shield, MessageSquare, GitBranch,
  TrendingUp, AlertTriangle, Loader2, Zap, Target, Users, Plus, Trash2, X, Power,
} from 'lucide-react'
import { useState } from 'react'

const FRAUD_RULE_TYPES = ['click_injection', 'sdk_spoofing', 'click_spamming', 'ip_anomaly', 'device_farm']
const STAGE_COLORS = ['#0A0A0B', '#C9CDD3', '#4FC3F7', '#FF6A00', '#FF8A3D', '#22c55e', '#7C4DFF', '#f59e0b']
const JOURNEY_TRIGGERS = ['signup', 'purchase', 'abandonment', 'custom_event', 'scheduled']
const STEP_TYPE_META: Record<string, { icon: any; color: string }> = {
  trigger: { icon: Zap, color: 'bg-[#FF6A00]' },
  action: { icon: MessageSquare, color: 'bg-[#0A0A0B]' },
  wait: { icon: Loader2, color: 'bg-amber-500' },
}

/** Stage JSON can come from this UI ({name, count}) or the signup auto-setup ({name, event}). */
function normalizeStage(raw: any): { name: string; count: number; event?: string } {
  return { name: String(raw?.name ?? ''), count: Number(raw?.count) || 0, event: raw?.event }
}

/** Step JSON can come from this UI ({type, label}) or the signup auto-setup ({type, config}). */
function normalizeStep(raw: any): { type: string; label: string } {
  if (typeof raw?.label === 'string' && raw.label) return { type: raw.type ?? 'action', label: raw.label }
  const cfg = raw?.config ?? {}
  const type = raw?.type ?? 'action'
  let label = ''
  if (type === 'trigger') label = `Trigger: ${cfg.event ?? 'event'}`
  else if (type === 'wait') label = `Wait ${cfg.duration ?? ''}`.trim()
  else label = [cfg.channel ? `Send ${cfg.channel}` : 'Action', cfg.template ? `(${cfg.template})` : '', cfg.message ? `: ${cfg.message}` : ''].filter(Boolean).join(' ')
  return { type, label: label || 'Step' }
}

const SOURCE_COLORS: Record<string, string> = {
  google_ads: '#4285F4', facebook_ads: '#1877F2', organic: '#22c55e',
  referral: '#f59e0b', direct: '#64748b', email: '#0A0A0B',
}

const SEVERITY_COLORS: Record<string, string> = {
  low: '#22c55e', medium: '#f59e0b', high: '#ef4444', critical: '#dc2626',
}

const emptyRuleForm = { name: '', type: 'click_injection', description: '', severity: 'medium', action: 'flag', threshold: '' }

const emptyFunnelForm = {
  name: '', description: '', segment: '',
  startDate: new Date().toISOString().slice(0, 10),
  endDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
  stages: [{ name: 'Visit', count: '' }, { name: 'Signup', count: '' }, { name: 'Customer', count: '' }],
}
const emptyJourneyForm = {
  name: '', description: '', trigger: 'signup',
  steps: [{ type: 'trigger', label: 'User signs up' }, { type: 'action', label: 'Send welcome email' }],
}

export function AttributionView() {
  const qc = useQueryClient()
  const [ruleDialogOpen, setRuleDialogOpen] = useState(false)
  const [ruleForm, setRuleForm] = useState(emptyRuleForm)
  const [funnelDialogOpen, setFunnelDialogOpen] = useState(false)
  const [funnelForm, setFunnelForm] = useState(emptyFunnelForm)
  const [selectedFunnelId, setSelectedFunnelId] = useState<string | null>(null)
  const [journeyDialogOpen, setJourneyDialogOpen] = useState(false)
  const [journeyForm, setJourneyForm] = useState(emptyJourneyForm)
  const [selectedJourneyId, setSelectedJourneyId] = useState<string | null>(null)

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

  const { data: funnelsData } = useQuery({
    queryKey: ['marketing-funnels'],
    queryFn: async () => {
      const res = await fetch('/api/funnel')
      if (!res.ok) return { items: [] }
      return res.json()
    },
  })

  const { data: journeysData } = useQuery({
    queryKey: ['customer-journeys'],
    queryFn: async () => {
      const res = await fetch('/api/journey')
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

  const createFunnel = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch('/api/funnel', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('Failed to create funnel')
      return res.json()
    },
    onSuccess: (data: any) => {
      toast.success('Funnel created')
      qc.invalidateQueries({ queryKey: ['marketing-funnels'] })
      setFunnelDialogOpen(false)
      setFunnelForm(emptyFunnelForm)
      if (data?.item?.id) setSelectedFunnelId(data.item.id)
    },
    onError: (err: any) => toast.error(String(err?.message ?? err)),
  })

  const deleteFunnel = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/funnel/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed')
      return res.json()
    },
    onSuccess: () => {
      toast.success('Funnel deleted')
      qc.invalidateQueries({ queryKey: ['marketing-funnels'] })
      setSelectedFunnelId(null)
    },
    onError: (err: any) => toast.error(String(err?.message ?? err)),
  })

  const submitFunnel = () => {
    if (!funnelForm.name.trim()) {
      toast.error('Name is required')
      return
    }
    const stages = funnelForm.stages
      .filter((s) => s.name.trim())
      .map((s) => ({ name: s.name.trim(), count: Number(s.count) || 0 }))
    if (stages.length < 2) {
      toast.error('Add at least 2 stages')
      return
    }
    createFunnel.mutate({
      name: funnelForm.name,
      description: funnelForm.description || undefined,
      segment: funnelForm.segment || undefined,
      startDate: new Date(funnelForm.startDate).toISOString(),
      endDate: new Date(funnelForm.endDate).toISOString(),
      stages,
    })
  }

  const createJourney = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch('/api/journey', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('Failed to create journey')
      return res.json()
    },
    onSuccess: (data: any) => {
      toast.success('Journey created')
      qc.invalidateQueries({ queryKey: ['customer-journeys'] })
      setJourneyDialogOpen(false)
      setJourneyForm(emptyJourneyForm)
      if (data?.item?.id) setSelectedJourneyId(data.item.id)
    },
    onError: (err: any) => toast.error(String(err?.message ?? err)),
  })

  const toggleJourney = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const res = await fetch(`/api/journey/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive }),
      })
      if (!res.ok) throw new Error('Failed')
      return res.json()
    },
    onSuccess: () => {
      toast.success('Journey updated')
      qc.invalidateQueries({ queryKey: ['customer-journeys'] })
    },
    onError: (err: any) => toast.error(String(err?.message ?? err)),
  })

  const deleteJourney = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/journey/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed')
      return res.json()
    },
    onSuccess: () => {
      toast.success('Journey deleted')
      qc.invalidateQueries({ queryKey: ['customer-journeys'] })
      setSelectedJourneyId(null)
    },
    onError: (err: any) => toast.error(String(err?.message ?? err)),
  })

  const submitJourney = () => {
    if (!journeyForm.name.trim()) {
      toast.error('Name is required')
      return
    }
    const steps = journeyForm.steps.filter((s) => s.label.trim())
    if (steps.length === 0) {
      toast.error('Add at least 1 step')
      return
    }
    createJourney.mutate({
      name: journeyForm.name,
      description: journeyForm.description || undefined,
      trigger: journeyForm.trigger,
      steps,
      isActive: true,
    })
  }

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
  const funnels = funnelsData?.items ?? []
  const journeys = journeysData?.items ?? []
  const selectedFunnel = funnels.find((f: any) => f.id === selectedFunnelId) ?? funnels[0]
  const funnelStages: { name: string; count: number; event?: string }[] = selectedFunnel
    ? (() => { try { return (JSON.parse(selectedFunnel.stages) as any[]).map(normalizeStage) } catch { return [] } })()
    : []
  const funnelHasVolume = funnelStages.some((s) => s.count > 0)
  const funnelMax = funnelStages[0]?.count || 1
  const selectedJourney = journeys.find((j: any) => j.id === selectedJourneyId) ?? journeys[0]
  const journeySteps: { type: string; label: string }[] = selectedJourney
    ? (() => { try { return (JSON.parse(selectedJourney.steps) as any[]).map(normalizeStep) } catch { return [] } })()
    : []
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
                            onClick={() => { if (confirm(`Delete fraud rule "${r.name}"?`)) deleteRule.mutate(r.id) }}
                            disabled={deleteRule.isPending}
                            aria-label="Delete fraud rule"
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
            <CardHeader className="pb-3 flex-row items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2"><Target className="h-4 w-4 text-[#FF6A00]" /> Marketing Funnel</CardTitle>
              <div className="flex items-center gap-2">
                {funnels.length > 1 && (
                  <Select value={selectedFunnel?.id} onValueChange={setSelectedFunnelId}>
                    <SelectTrigger className="w-[160px] h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {funnels.map((f: any) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
                <Dialog open={funnelDialogOpen} onOpenChange={(o) => { setFunnelDialogOpen(o); if (!o) setFunnelForm(emptyFunnelForm) }}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline" className="gap-1.5"><Plus className="h-3.5 w-3.5" /> Create Funnel</Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-lg">
                    <DialogHeader><DialogTitle>New Marketing Funnel</DialogTitle></DialogHeader>
                    <div className="space-y-3 max-h-[60vh] overflow-y-auto scroll-thin pr-1">
                      <div>
                        <Label className="text-xs">Name</Label>
                        <Input value={funnelForm.name} onChange={(e) => setFunnelForm({ ...funnelForm, name: e.target.value })} placeholder="Q1 Signup Funnel" />
                      </div>
                      <div>
                        <Label className="text-xs">Description</Label>
                        <Input value={funnelForm.description} onChange={(e) => setFunnelForm({ ...funnelForm, description: e.target.value })} placeholder="Visit to paying customer" />
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <Label className="text-xs">Segment</Label>
                          <Input value={funnelForm.segment} onChange={(e) => setFunnelForm({ ...funnelForm, segment: e.target.value })} placeholder="all" />
                        </div>
                        <div>
                          <Label className="text-xs">Start</Label>
                          <Input type="date" value={funnelForm.startDate} onChange={(e) => setFunnelForm({ ...funnelForm, startDate: e.target.value })} />
                        </div>
                        <div>
                          <Label className="text-xs">End</Label>
                          <Input type="date" value={funnelForm.endDate} onChange={(e) => setFunnelForm({ ...funnelForm, endDate: e.target.value })} />
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs">Stages (in order, e.g. Visit → Signup → Customer)</Label>
                        <div className="space-y-1.5 mt-1.5">
                          {funnelForm.stages.map((stage, i) => (
                            <div key={i} className="flex items-center gap-1.5">
                              <Input
                                className="flex-1" placeholder="Stage name"
                                value={stage.name}
                                onChange={(e) => {
                                  const stages = [...funnelForm.stages]
                                  stages[i] = { ...stages[i], name: e.target.value }
                                  setFunnelForm({ ...funnelForm, stages })
                                }}
                              />
                              <Input
                                className="w-24" type="number" placeholder="Count"
                                value={stage.count}
                                onChange={(e) => {
                                  const stages = [...funnelForm.stages]
                                  stages[i] = { ...stages[i], count: e.target.value }
                                  setFunnelForm({ ...funnelForm, stages })
                                }}
                              />
                              <Button
                                size="icon" variant="ghost" className="h-8 w-8 shrink-0"
                                onClick={() => setFunnelForm({ ...funnelForm, stages: funnelForm.stages.filter((_, si) => si !== i) })}
                                disabled={funnelForm.stages.length <= 2}
                                aria-label="Remove stage"
                              >
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          ))}
                        </div>
                        <Button
                          size="sm" variant="ghost" className="mt-1.5 gap-1.5 text-xs"
                          onClick={() => setFunnelForm({ ...funnelForm, stages: [...funnelForm.stages, { name: '', count: '' }] })}
                        >
                          <Plus className="h-3 w-3" /> Add Stage
                        </Button>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="ghost" onClick={() => setFunnelDialogOpen(false)}>Cancel</Button>
                      <Button onClick={submitFunnel} disabled={createFunnel.isPending}>{createFunnel.isPending ? 'Creating…' : 'Create Funnel'}</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {!selectedFunnel ? (
                <p className="text-sm text-muted-foreground py-8 text-center">No funnels yet. Create one to visualize conversion from visit to customer.</p>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-sm font-medium">{selectedFunnel.name}</p>
                      {selectedFunnel.description && <p className="text-xs text-muted-foreground">{selectedFunnel.description}</p>}
                    </div>
                    <Button
                      size="icon" variant="ghost" className="h-7 w-7 text-destructive"
                      onClick={() => { if (confirm(`Delete funnel "${selectedFunnel.name}"?`)) deleteFunnel.mutate(selectedFunnel.id) }}
                      disabled={deleteFunnel.isPending}
                      aria-label="Delete funnel"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  {!funnelHasVolume && (
                    <p className="text-xs text-muted-foreground mb-2">
                      No visitor counts recorded yet for these stages — showing stage order only.
                    </p>
                  )}
                  <div className="space-y-2">
                    {funnelStages.map((stage, i) => {
                      const pct = funnelHasVolume && funnelMax > 0 ? (stage.count / funnelMax) * 100 : 0
                      return (
                        <div key={i} className="flex items-center gap-3">
                          <div className="w-20 text-xs text-right text-muted-foreground truncate" title={stage.name}>{stage.name}</div>
                          <div className="flex-1 h-8 rounded-md overflow-hidden bg-muted relative">
                            <div
                              className="h-full rounded-md flex items-center px-3 text-xs text-white font-medium transition-all"
                              style={{ width: `${funnelHasVolume ? Math.max(pct, 5) : 100 / funnelStages.length}%`, background: STAGE_COLORS[i % STAGE_COLORS.length] }}
                            >
                              {funnelHasVolume ? stage.count.toLocaleString() : (stage.event ?? stage.name)}
                            </div>
                          </div>
                          <div className="w-16 text-xs text-right">
                            {funnelHasVolume && <span className="font-medium">{pct.toFixed(1)}%</span>}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  {funnelHasVolume && funnelStages.length > 1 && (
                    <div className="mt-4 pt-3 border-t text-xs text-muted-foreground">
                      Overall conversion rate:{' '}
                      <span className="font-bold text-[#FF6A00]">
                        {((funnelStages[funnelStages.length - 1].count / funnelMax) * 100).toFixed(2)}%
                      </span>
                      {' '}· Drop-off:{' '}
                      <span className="font-bold text-red-600">
                        {(100 - (funnelStages[funnelStages.length - 1].count / funnelMax) * 100).toFixed(2)}%
                      </span>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Journey Tab */}
        <TabsContent value="journey" className="space-y-3">
          <Card>
            <CardHeader className="pb-3 flex-row items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2"><GitBranch className="h-4 w-4 text-violet-600" /> Customer Journey Designer</CardTitle>
              <div className="flex items-center gap-2">
                {journeys.length > 1 && (
                  <Select value={selectedJourney?.id} onValueChange={setSelectedJourneyId}>
                    <SelectTrigger className="w-[160px] h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {journeys.map((j: any) => <SelectItem key={j.id} value={j.id}>{j.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
                <Dialog open={journeyDialogOpen} onOpenChange={(o) => { setJourneyDialogOpen(o); if (!o) setJourneyForm(emptyJourneyForm) }}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline" className="gap-1.5"><Plus className="h-3.5 w-3.5" /> Create Journey</Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-lg">
                    <DialogHeader><DialogTitle>New Customer Journey</DialogTitle></DialogHeader>
                    <div className="space-y-3 max-h-[60vh] overflow-y-auto scroll-thin pr-1">
                      <div>
                        <Label className="text-xs">Name</Label>
                        <Input value={journeyForm.name} onChange={(e) => setJourneyForm({ ...journeyForm, name: e.target.value })} placeholder="Welcome Series" />
                      </div>
                      <div>
                        <Label className="text-xs">Description</Label>
                        <Input value={journeyForm.description} onChange={(e) => setJourneyForm({ ...journeyForm, description: e.target.value })} placeholder="Onboard new signups over 2 weeks" />
                      </div>
                      <div>
                        <Label className="text-xs">Trigger</Label>
                        <Select value={journeyForm.trigger} onValueChange={(v) => setJourneyForm({ ...journeyForm, trigger: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {JOURNEY_TRIGGERS.map((t) => <SelectItem key={t} value={t}>{t.replace('_', ' ')}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Steps (in order)</Label>
                        <div className="space-y-1.5 mt-1.5">
                          {journeyForm.steps.map((step, i) => (
                            <div key={i} className="flex items-center gap-1.5">
                              <Select
                                value={step.type}
                                onValueChange={(v) => {
                                  const steps = [...journeyForm.steps]
                                  steps[i] = { ...steps[i], type: v }
                                  setJourneyForm({ ...journeyForm, steps })
                                }}
                              >
                                <SelectTrigger className="w-28 shrink-0"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="trigger">trigger</SelectItem>
                                  <SelectItem value="action">action</SelectItem>
                                  <SelectItem value="wait">wait</SelectItem>
                                </SelectContent>
                              </Select>
                              <Input
                                className="flex-1" placeholder="e.g. Send welcome email"
                                value={step.label}
                                onChange={(e) => {
                                  const steps = [...journeyForm.steps]
                                  steps[i] = { ...steps[i], label: e.target.value }
                                  setJourneyForm({ ...journeyForm, steps })
                                }}
                              />
                              <Button
                                size="icon" variant="ghost" className="h-8 w-8 shrink-0"
                                onClick={() => setJourneyForm({ ...journeyForm, steps: journeyForm.steps.filter((_, si) => si !== i) })}
                                disabled={journeyForm.steps.length <= 1}
                                aria-label="Remove step"
                              >
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          ))}
                        </div>
                        <Button
                          size="sm" variant="ghost" className="mt-1.5 gap-1.5 text-xs"
                          onClick={() => setJourneyForm({ ...journeyForm, steps: [...journeyForm.steps, { type: 'action', label: '' }] })}
                        >
                          <Plus className="h-3 w-3" /> Add Step
                        </Button>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="ghost" onClick={() => setJourneyDialogOpen(false)}>Cancel</Button>
                      <Button onClick={submitJourney} disabled={createJourney.isPending}>{createJourney.isPending ? 'Creating…' : 'Create Journey'}</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {!selectedJourney ? (
                <p className="text-sm text-muted-foreground py-8 text-center">No journeys yet. Create one to automate triggers, actions, and waits.</p>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-sm font-medium flex items-center gap-2">
                        {selectedJourney.name}
                        <Badge variant={selectedJourney.isActive ? 'default' : 'secondary'} className="text-[9px]">
                          {selectedJourney.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                        <Badge variant="outline" className="text-[9px] capitalize">{selectedJourney.trigger?.replace('_', ' ')}</Badge>
                      </p>
                      {selectedJourney.description && <p className="text-xs text-muted-foreground">{selectedJourney.description}</p>}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        size="icon" variant="ghost" className="h-7 w-7"
                        onClick={() => toggleJourney.mutate({ id: selectedJourney.id, isActive: !selectedJourney.isActive })}
                        disabled={toggleJourney.isPending}
                        title={selectedJourney.isActive ? 'Deactivate' : 'Activate'}
                      >
                        <Power className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon" variant="ghost" className="h-7 w-7 text-destructive"
                        onClick={() => { if (confirm(`Delete journey "${selectedJourney.name}"?`)) deleteJourney.mutate(selectedJourney.id) }}
                        disabled={deleteJourney.isPending}
                        aria-label="Delete journey"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {journeySteps.map((step, i) => {
                      const meta = STEP_TYPE_META[step.type] ?? STEP_TYPE_META.action
                      const Icon = meta.icon
                      return (
                        <div key={i} className="flex items-center gap-3">
                          <div className={`grid place-items-center h-8 w-8 rounded-full ${meta.color} text-white shrink-0`}>
                            <Icon className={`h-4 w-4 ${step.type === 'wait' ? 'animate-spin' : ''}`} />
                          </div>
                          <div className="flex-1 rounded-lg border p-2">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-[9px] capitalize">{step.type}</Badge>
                              <span className="text-sm">{step.label}</span>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  <div className="mt-4 pt-3 border-t flex items-center gap-4 text-xs text-muted-foreground">
                    <span>Enrolled: <span className="font-medium text-foreground">{selectedJourney.totalEnrolled ?? 0}</span></span>
                    <span>Completed: <span className="font-medium text-foreground">{selectedJourney.totalCompleted ?? 0}</span></span>
                    <span>Converted: <span className="font-medium text-foreground">{selectedJourney.totalConverted ?? 0}</span></span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
