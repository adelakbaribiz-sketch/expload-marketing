'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
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
import { Plus, Workflow, Play, Clock, CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { useState } from 'react'

const STATUS_ICONS: Record<string, any> = {
  pending: Clock,
  running: Loader2,
  completed: CheckCircle2,
  failed: XCircle,
  cancelled: XCircle,
}

const STATUS_COLORS: Record<string, string> = {
  pending: '#64748b',
  running: '#f59e0b',
  completed: '#22c55e',
  failed: '#ef4444',
  cancelled: '#94a3b8',
}

export function WorkflowView() {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', trigger: 'manual' })

  const { data, isLoading } = useQuery({
    queryKey: ['workflows'],
    queryFn: async () => {
      const res = await fetch('/api/workflows')
      if (!res.ok) return { items: [] }
      return res.json()
    },
  })

  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch('/api/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payload,
          steps: JSON.stringify([
            { id: 1, type: 'generate_leads', name: 'Generate Leads' },
            { id: 2, type: 'score_leads', name: 'Score & Qualify Leads' },
            { id: 3, type: 'send_email', name: 'Send Outreach Email' },
            { id: 4, type: 'create_content', name: 'Create Social Content' },
            { id: 5, type: 'run_seo_audit', name: 'Run SEO Audit' },
            { id: 6, type: 'generate_report', name: 'Generate Report' },
          ]),
        }),
      })
      if (!res.ok) throw new Error('create failed')
      return res.json()
    },
    onSuccess: () => {
      toast.success('Workflow created')
      qc.invalidateQueries({ queryKey: ['workflows'] })
      setOpen(false)
      setForm({ name: '', description: '', trigger: 'manual' })
    },
  })

  const workflows = data?.items ?? []

  const WORKFLOW_TEMPLATES = [
    {
      name: 'Weekly Marketing Cycle',
      description: 'Complete weekly marketing automation: discover leads, score, email, social, SEO, report',
      trigger: 'scheduled',
      triggerLabel: 'Weekly (Monday 9AM)',
    },
    {
      name: 'Lead Nurturing Flow',
      description: 'Automated lead nurturing: welcome email, follow-up, qualification, handoff to sales',
      trigger: 'event',
      triggerLabel: 'On new lead',
    },
    {
      name: 'Content Sprint',
      description: 'Generate content ideas, draft articles, schedule social posts, track performance',
      trigger: 'manual',
      triggerLabel: 'Manual trigger',
    },
  ]

  return (
    <div className="space-y-4 p-4 md:p-6 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold flex items-center gap-2">
            <Workflow className="h-5 w-5 text-blue-600" />
            Workflow Engine
          </h2>
          <p className="text-xs text-muted-foreground">Automate marketing workflows with scheduled triggers</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              New Workflow
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Workflow</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Name</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Weekly Marketing Cycle" />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div>
                <Label>Trigger</Label>
                <Select value={form.trigger} onValueChange={(v) => setForm({ ...form, trigger: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Manual</SelectItem>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="event">Event-based</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={() => createMutation.mutate(form)} disabled={!form.name || createMutation.isPending}>
                {createMutation.isPending ? 'Creating…' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Workflow Templates */}
      <div className="grid gap-3 md:grid-cols-3">
        {WORKFLOW_TEMPLATES.map((tpl) => (
          <Card key={tpl.name} className="hover:shadow-md transition-shadow cursor-pointer" >
            <CardContent className="p-4">
              <div className="grid place-items-center h-10 w-10 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600 text-white mb-3">
                <Workflow className="h-5 w-5" />
              </div>
              <p className="font-medium text-sm">{tpl.name}</p>
              <p className="text-xs text-muted-foreground mt-1">{tpl.description}</p>
              <Badge variant="outline" className="text-[10px] mt-2">{tpl.triggerLabel}</Badge>
              <Button
                size="sm"
                variant="outline"
                className="w-full mt-3 gap-1.5"
                onClick={() => createMutation.mutate({ name: tpl.name, description: tpl.description, trigger: tpl.trigger })}
                disabled={createMutation.isPending}
              >
                <Plus className="h-3.5 w-3.5" />
                Use Template
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Active Workflows */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Your Workflows ({workflows.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : workflows.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No workflows created yet. Use a template above to get started.</p>
          ) : (
            <div className="space-y-3">
              {workflows.map((w: any) => {
                const runs = w.runs ?? []
                const lastRun = runs[0]
                const steps = w.steps ? (typeof w.steps === 'string' ? JSON.parse(w.steps) : w.steps) : []
                return (
                  <div key={w.id} className="rounded-lg border p-3">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm truncate">{w.name}</p>
                        {w.description && <p className="text-xs text-muted-foreground mt-0.5">{w.description}</p>}
                      </div>
                      <Badge variant="outline" className="capitalize shrink-0">{w.trigger}</Badge>
                    </div>
                    {/* Steps */}
                    {steps.length > 0 && (
                      <div className="flex items-center gap-1 flex-wrap mt-2">
                        {steps.map((step: any, i: number) => (
                          <div key={step.id} className="flex items-center gap-1">
                            <Badge variant="secondary" className="text-[10px]">{step.name}</Badge>
                            {i < steps.length - 1 && <span className="text-muted-foreground text-xs">→</span>}
                          </div>
                        ))}
                      </div>
                    )}
                    {/* Last run */}
                    {lastRun && (
                      <div className="flex items-center gap-2 mt-2 pt-2 border-t text-xs">
                        {(() => {
                          const Icon = STATUS_ICONS[lastRun.status] ?? Clock
                          return <Icon className={`h-3 w-3 ${lastRun.status === 'running' ? 'animate-spin' : ''}`} style={{ color: STATUS_COLORS[lastRun.status] }} />
                        })()}
                        <span className="text-muted-foreground">Last run: {new Date(lastRun.createdAt).toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
