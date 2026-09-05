'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
import { Plus, Trash2, TrendingUp, DollarSign, Target, Calendar } from 'lucide-react'
import { useState } from 'react'
import { apiGet, apiPost, apiDelete } from '@/lib/api-client'

const STAGE_COLORS: Record<string, string> = {
  lead: '#64748b',
  qualified: '#3b82f6',
  proposal: '#a855f7',
  negotiation: '#f59e0b',
  won: '#22c55e',
  lost: '#ef4444',
}

export function CrmView() {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ title: '', value: '', stage: 'lead', probability: '0' })

  const { data, isLoading } = useQuery({
    queryKey: ['deals'],
    queryFn: () => apiGet('/api/crm/deals'),
  })

  const { data: tasksData } = useQuery({
    queryKey: ['tasks'],
    queryFn: async () => {
      try {
        return await apiGet('/api/crm/tasks')
      } catch {
        return { items: [] }
      }
    },
  })

  const createMutation = useMutation({
    mutationFn: (payload: any) =>
      apiPost('/api/crm/deals', { ...payload, value: Number(payload.value), probability: Number(payload.probability) }),
    onSuccess: () => {
      toast.success('Deal created')
      qc.invalidateQueries({ queryKey: ['deals'] })
      setOpen(false)
      setForm({ title: '', value: '', stage: 'lead', probability: '0' })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiDelete(`/api/crm/deals/${id}`),
    onSuccess: () => {
      toast.success('Deal deleted')
      qc.invalidateQueries({ queryKey: ['deals'] })
    },
  })

  const deals = data?.items ?? []
  const tasks = tasksData?.items ?? []

  // Pipeline stages summary
  const stageSummary = deals.reduce((acc: Record<string, number>, d: any) => {
    acc[d.stage] = (acc[d.stage] || 0) + 1
    return acc
  }, {})
  const totalValue = deals.reduce((sum: number, d: any) => sum + (d.value || 0), 0)
  const wonValue = deals.filter((d: any) => d.stage === 'won').reduce((sum: number, d: any) => sum + (d.value || 0), 0)

  return (
    <div className="space-y-4 p-4 md:p-6 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold flex items-center gap-2">
            <Target className="h-5 w-5 text-violet-600" />
            CRM Pipeline
          </h2>
          <p className="text-xs text-muted-foreground">Manage deals, tasks, and sales pipeline</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              New Deal
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Deal</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Deal Title</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Enterprise subscription" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Value (USD)</Label>
                  <Input type="number" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} placeholder="5000" />
                </div>
                <div>
                  <Label>Stage</Label>
                  <Select value={form.stage} onValueChange={(v) => setForm({ ...form, stage: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lead">Lead</SelectItem>
                      <SelectItem value="qualified">Qualified</SelectItem>
                      <SelectItem value="proposal">Proposal</SelectItem>
                      <SelectItem value="negotiation">Negotiation</SelectItem>
                      <SelectItem value="won">Won</SelectItem>
                      <SelectItem value="lost">Lost</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Probability (0-100)</Label>
                <Input type="number" min={0} max={100} value={form.probability} onChange={(e) => setForm({ ...form, probability: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={() => createMutation.mutate(form)} disabled={!form.title || createMutation.isPending}>
                {createMutation.isPending ? 'Creating…' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Pipeline Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Target className="h-4 w-4 text-violet-600" />
              <span className="text-xs text-muted-foreground">Total Deals</span>
            </div>
            <p className="text-2xl font-bold">{deals.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="h-4 w-4 text-blue-600" />
              <span className="text-xs text-muted-foreground">Pipeline Value</span>
            </div>
            <p className="text-2xl font-bold">${totalValue.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-emerald-600" />
              <span className="text-xs text-muted-foreground">Won Revenue</span>
            </div>
            <p className="text-2xl font-bold text-emerald-600">${wonValue.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="h-4 w-4 text-amber-600" />
              <span className="text-xs text-muted-foreground">Open Tasks</span>
            </div>
            <p className="text-2xl font-bold">{tasks.filter((t: any) => t.status !== 'done').length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Pipeline Stages Bar */}
      {deals.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Pipeline by Stage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 flex-wrap">
              {Object.entries(stageSummary).map(([stage, count]) => (
                <div key={stage} className="flex-1 min-w-[100px]">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs capitalize">{stage}</span>
                    <Badge variant="outline" className="text-[10px]" style={{ background: (STAGE_COLORS[stage] ?? '#94a3b8') + '20', color: STAGE_COLORS[stage] ?? '#94a3b8' }}>
                      {count as number}
                    </Badge>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${((count as number) / deals.length) * 100}%`, background: STAGE_COLORS[stage] ?? '#94a3b8' }} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Deals Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Deals ({deals.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : deals.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No deals yet. Create your first deal to start tracking your sales pipeline.
            </div>
          ) : (
            <div className="overflow-x-auto scroll-thin">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-right text-xs text-muted-foreground border-b">
                    <th className="pb-2 font-medium">Title</th>
                    <th className="pb-2 font-medium">Value</th>
                    <th className="pb-2 font-medium">Stage</th>
                    <th className="pb-2 font-medium">Probability</th>
                    <th className="pb-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {deals.map((d: any) => (
                    <tr key={d.id} className="border-b last:border-0 hover:bg-muted/40">
                      <td className="py-2.5 font-medium truncate max-w-[200px]">{d.title}</td>
                      <td className="py-2.5">${(d.value || 0).toLocaleString()}</td>
                      <td className="py-2.5">
                        <Badge variant="outline" className="capitalize" style={{ background: (STAGE_COLORS[d.stage] ?? '#94a3b8') + '20', color: STAGE_COLORS[d.stage] ?? '#94a3b8' }}>
                          {d.stage}
                        </Badge>
                      </td>
                      <td className="py-2.5">
                        <div className="flex items-center gap-2">
                          <Progress value={d.probability || 0} className="h-1.5 w-16" />
                          <span className="text-xs text-muted-foreground">{d.probability || 0}%</span>
                        </div>
                      </td>
                      <td className="py-2.5">
                        <Button size="sm" variant="ghost" className="text-destructive hover:bg-destructive/10 h-7 w-7 p-0" onClick={() => { if (confirm(`Delete deal "${d.title}"?`)) deleteMutation.mutate(d.id) }} aria-label="Delete deal">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tasks */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Tasks ({tasks.filter((t: any) => t.status !== 'done').length} open)</CardTitle>
        </CardHeader>
        <CardContent>
          {tasks.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No tasks yet.</p>
          ) : (
            <div className="space-y-2">
              {tasks.slice(0, 10).map((t: any) => (
                <div key={t.id} className="flex items-center gap-3 p-2 rounded-md bg-muted/30">
                  <Badge variant={t.priority === 'urgent' ? 'destructive' : t.priority === 'high' ? 'default' : 'secondary'} className="text-[10px] capitalize">
                    {t.priority}
                  </Badge>
                  <span className={`flex-1 text-sm ${t.status === 'done' ? 'line-through text-muted-foreground' : ''}`}>{t.title}</span>
                  <Badge variant="outline" className="text-[10px] capitalize">{t.status.replace('_', ' ')}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
