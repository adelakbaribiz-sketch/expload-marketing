'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { Plus, Target, TrendingUp, Calendar, DollarSign, Users, Trophy, Clock } from 'lucide-react'
import { useState } from 'react'

const GOAL_TYPE_ICONS: Record<string, any> = {
  revenue: DollarSign,
  leads: Users,
  deals: Target,
  traffic: TrendingUp,
  engagement: Users,
  conversions: Trophy,
  custom: Target,
}

const PRIORITY_COLORS: Record<string, string> = {
  low: '#64748b',
  medium: '#3b82f6',
  high: '#f59e0b',
  critical: '#ef4444',
}

export function GoalsView() {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({
    title: '',
    type: 'revenue',
    targetValue: '',
    unit: 'usd',
    endDate: '',
    priority: 'medium',
    linkedPhases: 'P1,P2',
  })

  const { data, isLoading } = useQuery({
    queryKey: ['goals'],
    queryFn: async () => {
      const res = await fetch('/api/goals')
      if (!res.ok) return { items: [] }
      return res.json()
    },
  })

  const { data: onboardingData } = useQuery({
    queryKey: ['onboarding'],
    queryFn: async () => {
      const res = await fetch('/api/onboarding')
      if (!res.ok) return { steps: [] }
      return res.json()
    },
  })

  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payload,
          targetValue: Number(payload.targetValue),
          endDate: new Date(payload.endDate),
        }),
      })
      if (!res.ok) throw new Error('create failed')
      return res.json()
    },
    onSuccess: () => {
      toast.success('Goal created')
      qc.invalidateQueries({ queryKey: ['goals'] })
      setOpen(false)
      setForm({ title: '', type: 'revenue', targetValue: '', unit: 'usd', endDate: '', priority: 'medium', linkedPhases: 'P1,P2' })
    },
  })

  const goals = data?.items ?? []
  const onboardingSteps = onboardingData?.steps ?? []
  const completedSteps = onboardingSteps.filter((s: any) => s.status === 'completed').length
  const onboardingProgress = onboardingSteps.length > 0 ? (completedSteps / onboardingSteps.length) * 100 : 0

  return (
    <div className="space-y-4 p-4 md:p-6 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold flex items-center gap-2">
            <Target className="h-5 w-5 text-violet-600" />
            Goals & Onboarding
          </h2>
          <p className="text-xs text-muted-foreground">Set marketing goals, track progress, and complete your onboarding</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              New Goal
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Goal</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Goal Title</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Reach $10K monthly revenue" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Type</Label>
                  <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="revenue">Revenue</SelectItem>
                      <SelectItem value="leads">Leads</SelectItem>
                      <SelectItem value="deals">Deals</SelectItem>
                      <SelectItem value="traffic">Traffic</SelectItem>
                      <SelectItem value="engagement">Engagement</SelectItem>
                      <SelectItem value="conversions">Conversions</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Unit</Label>
                  <Select value={form.unit} onValueChange={(v) => setForm({ ...form, unit: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="usd">USD ($)</SelectItem>
                      <SelectItem value="count">Count</SelectItem>
                      <SelectItem value="percent">Percent (%)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Target Value</Label>
                  <Input type="number" value={form.targetValue} onChange={(e) => setForm({ ...form, targetValue: e.target.value })} placeholder="10000" dir="ltr" />
                </div>
                <div>
                  <Label>End Date</Label>
                  <Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Priority</Label>
                  <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Linked Phases</Label>
                  <Input value={form.linkedPhases} onChange={(e) => setForm({ ...form, linkedPhases: e.target.value })} placeholder="P1,P2,P3" dir="ltr" />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={() => createMutation.mutate(form)} disabled={!form.title || !form.targetValue || !form.endDate || createMutation.isPending}>
                {createMutation.isPending ? 'Creating…' : 'Create Goal'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Onboarding Progress */}
      {onboardingSteps.length > 0 && onboardingProgress < 100 && (
        <Card className="border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-teal-500/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-sm font-medium">Onboarding Progress</p>
                <p className="text-xs text-muted-foreground">{completedSteps} of {onboardingSteps.length} steps completed</p>
              </div>
              <span className="text-2xl font-bold text-emerald-600">{Math.round(onboardingProgress)}%</span>
            </div>
            <Progress value={onboardingProgress} className="h-2" />
            <div className="flex flex-wrap gap-2 mt-3">
              {onboardingSteps.map((s: any) => (
                <Badge key={s.id} variant={s.status === 'completed' ? 'default' : 'outline'} className="text-[10px] capitalize">
                  {s.status === 'completed' && <Trophy className="h-2.5 w-2.5 ml-1" />}
                  {s.step.replace('_', ' ')}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Goals Grid */}
      {isLoading ? (
        <Card><CardContent className="p-4"><div className="h-32 bg-muted animate-pulse rounded" /></CardContent></Card>
      ) : goals.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Target className="h-10 w-10 mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground mt-2">No goals set yet.</p>
            <p className="text-xs text-muted-foreground">Create your first goal to start tracking your marketing objectives.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {goals.map((g: any) => {
            const Icon = GOAL_TYPE_ICONS[g.type] ?? Target
            const progress = g.targetValue > 0 ? Math.min((g.currentValue / g.targetValue) * 100, 100) : 0
            const isAchieved = g.status === 'achieved' || progress >= 100
            const daysLeft = Math.ceil((new Date(g.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
            return (
              <Card key={g.id} className={`hover:shadow-md transition-shadow ${isAchieved ? 'border-emerald-500' : ''}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="grid place-items-center h-8 w-8 rounded-lg bg-violet-500/15 text-violet-600 shrink-0">
                        <Icon className="h-4 w-4" />
                      </div>
                      <p className="font-medium text-sm truncate">{g.title}</p>
                    </div>
                    <Badge variant="outline" className="text-[10px] capitalize shrink-0" style={{ background: (PRIORITY_COLORS[g.priority] ?? '#64748b') + '20', color: PRIORITY_COLORS[g.priority] ?? '#64748b' }}>
                      {g.priority}
                    </Badge>
                  </div>

                  {/* Progress */}
                  <div className="mb-2">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-muted-foreground">
                        {g.unit === 'usd' ? `$${g.currentValue.toLocaleString()}` : g.currentValue} / {g.unit === 'usd' ? `$${g.targetValue.toLocaleString()}` : g.targetValue}
                      </span>
                      <span className="font-medium">{Math.round(progress)}%</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>

                  {/* Status + Deadline */}
                  <div className="flex items-center justify-between text-xs">
                    <Badge variant={isAchieved ? 'default' : 'secondary'} className="text-[10px] capitalize">
                      {isAchieved ? <><Trophy className="h-2.5 w-2.5 ml-1" /> Achieved</> : g.status}
                    </Badge>
                    {daysLeft > 0 && !isAchieved && (
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {daysLeft} days left
                      </span>
                    )}
                  </div>

                  {g.linkedPhases && (
                    <div className="mt-2 pt-2 border-t flex flex-wrap gap-1">
                      {g.linkedPhases.split(',').map((phase: string) => (
                        <Badge key={phase} variant="outline" className="text-[9px]">{phase.trim()}</Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
