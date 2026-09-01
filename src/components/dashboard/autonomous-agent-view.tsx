'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { Bot, Play, Loader2, CheckCircle2, XCircle, Clock, RefreshCw, Calendar, ListChecks } from 'lucide-react'
import { useState } from 'react'

const STATUS_ICONS: Record<string, any> = {
  pending: Clock,
  running: Loader2,
  completed: CheckCircle2,
  failed: XCircle,
}

const STATUS_COLORS: Record<string, string> = {
  pending: '#64748b',
  running: '#f59e0b',
  completed: '#22c55e',
  failed: '#ef4444',
}

export function AutonomousAgentView() {
  const qc = useQueryClient()
  const [running, setRunning] = useState(false)

  const { data: cyclesData, isLoading } = useQuery({
    queryKey: ['agent-cycles'],
    queryFn: async () => {
      const res = await fetch('/api/agent/cycles')
      if (!res.ok) return { items: [] }
      return res.json()
    },
  })

  const { data: tasksData } = useQuery({
    queryKey: ['crm-tasks'],
    queryFn: async () => {
      const res = await fetch('/api/crm/tasks')
      if (!res.ok) return { items: [] }
      return res.json()
    },
  })

  const runCycleMutation = useMutation({
    mutationFn: async (cycleType: string) => {
      const res = await fetch('/api/agent/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cycleType }),
      })
      if (!res.ok) throw new Error('cycle failed')
      return res.json()
    },
    onSuccess: (data) => {
      toast.success(`Cycle completed: ${data.tasksCreated} tasks created, ${data.recommendationsGenerated} recommendations`)
      qc.invalidateQueries({ queryKey: ['agent-cycles'] })
      qc.invalidateQueries({ queryKey: ['crm-tasks'] })
      setRunning(false)
    },
    onError: (e: any) => {
      toast.error(String(e?.message ?? e))
      setRunning(false)
    },
  })

  const cycles = cyclesData?.items ?? []
  const tasks = tasksData?.items ?? []
  const openTasks = tasks.filter((t: any) => t.status !== 'done')
  const lastCycle = cycles[0]

  return (
    <div className="space-y-4 p-4 md:p-6 animate-fade-in-up">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-base font-semibold flex items-center gap-2">
            <Bot className="h-5 w-5 text-violet-600" />
            Autonomous Marketing Agent
          </h2>
          <p className="text-xs text-muted-foreground">Executes all 10 phases automatically on a weekly cycle</p>
        </div>
        <Button
          className="gap-2"
          onClick={() => {
            setRunning(true)
            runCycleMutation.mutate('weekly')
          }}
          disabled={running}
        >
          {running ? <><Loader2 className="h-4 w-4 animate-spin" /> Running Cycle…</> : <><Play className="h-4 w-4" /> Run Weekly Cycle</>}
        </Button>
      </div>

      {/* Agent Architecture */}
      <Card className="border-violet-500/20 bg-gradient-to-br from-violet-500/5 to-purple-500/5">
        <CardContent className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="grid place-items-center h-10 w-10 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 text-white">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <p className="font-medium">Hierarchical Agent System</p>
              <p className="text-xs text-muted-foreground">Planner → Executor → Tool Agents</p>
            </div>
          </div>
          <div className="grid grid-cols-5 gap-2 text-center text-[10px]">
            {['P1 Leads', 'P2 CRM', 'P3 Content', 'P4 SEO', 'P5 Ads', 'P6 Social', 'P7 Backlinks', 'P8 Analyzers', 'P9 AI', 'P10 Workflow'].map((phase) => (
              <div key={phase} className="rounded-md bg-muted/50 p-1.5">
                <p className="font-medium">{phase}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <Calendar className="h-4 w-4 text-violet-600 mb-1" />
            <p className="text-2xl font-bold">{cycles.length}</p>
            <p className="text-xs text-muted-foreground">Cycles Run</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <ListChecks className="h-4 w-4 text-amber-600 mb-1" />
            <p className="text-2xl font-bold">{openTasks.length}</p>
            <p className="text-xs text-muted-foreground">Open Tasks</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 mb-1" />
            <p className="text-2xl font-bold">{lastCycle?.tasksCreated ?? 0}</p>
            <p className="text-xs text-muted-foreground">Tasks Last Cycle</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <Bot className="h-4 w-4 text-blue-600 mb-1" />
            <p className="text-2xl font-bold">{lastCycle?.recommendationsGenerated ?? 0}</p>
            <p className="text-xs text-muted-foreground">Recs Last Cycle</p>
          </CardContent>
        </Card>
      </div>

      {/* Last Cycle Details */}
      {lastCycle && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <RefreshCw className="h-4 w-4 text-violet-600" />
              Last Cycle Result
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3 mb-3">
              {(() => {
                const Icon = STATUS_ICONS[lastCycle.status] ?? Clock
                return <Icon className={`h-5 w-5 ${lastCycle.status === 'running' ? 'animate-spin' : ''}`} style={{ color: STATUS_COLORS[lastCycle.status] }} />
              })()}
              <div>
                <p className="text-sm font-medium capitalize">{lastCycle.status}</p>
                <p className="text-xs text-muted-foreground">{new Date(lastCycle.createdAt).toLocaleString()}</p>
              </div>
            </div>
            {lastCycle.summary && <p className="text-sm text-muted-foreground mb-3">{lastCycle.summary}</p>}
            {/* Phase Results */}
            <div className="grid grid-cols-3 md:grid-cols-9 gap-2">
              {['phase1', 'phase2', 'phase3', 'phase4', 'phase5', 'phase6', 'phase7', 'phase8', 'phase9'].map((phase, i) => {
                const result = lastCycle[`${phase}Result`]
                let parsed: any = null
                try { parsed = result ? JSON.parse(result) : null } catch { /* ignore */ }
                return (
                  <div key={phase} className="rounded-md bg-muted/50 p-2 text-center">
                    <p className="text-[9px] text-muted-foreground">P{i + 1}</p>
                    <p className="text-xs font-semibold">{parsed ? Object.values(parsed).reduce((a: number, b: any) => a + (typeof b === 'number' ? b : 0), 0) : '—'}</p>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cycle History */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Cycle History ({cycles.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : cycles.length === 0 ? (
            <div className="py-8 text-center">
              <Bot className="h-10 w-10 mx-auto text-muted-foreground" />
              <p className="text-sm text-muted-foreground mt-2">No cycles run yet.</p>
              <p className="text-xs text-muted-foreground">Click "Run Weekly Cycle" to execute all 10 phases automatically.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto scroll-thin">
              {cycles.map((c: any) => {
                const Icon = STATUS_ICONS[c.status] ?? Clock
                return (
                  <div key={c.id} className="flex items-center gap-3 p-2 rounded-md bg-muted/30">
                    <Icon className={`h-4 w-4 shrink-0 ${c.status === 'running' ? 'animate-spin' : ''}`} style={{ color: STATUS_COLORS[c.status] }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm capitalize">{c.cycleType} cycle</p>
                      <p className="text-[11px] text-muted-foreground">{new Date(c.createdAt).toLocaleString()}</p>
                    </div>
                    <Badge variant="outline" className="text-[10px]">{c.tasksCreated} tasks</Badge>
                    <Badge variant="outline" className="text-[10px]">{c.recommendationsGenerated} recs</Badge>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tasks Created by Agent */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Tasks Requiring Attention ({openTasks.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {openTasks.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No open tasks. Run a cycle to generate tasks.</p>
          ) : (
            <div className="space-y-2">
              {openTasks.slice(0, 10).map((t: any) => (
                <div key={t.id} className="flex items-start gap-3 p-3 rounded-lg border">
                  <Badge
                    variant="outline"
                    className="text-[10px] capitalize shrink-0"
                    style={{ background: (STATUS_COLORS[t.priority] ?? '#64748b') + '20', color: STATUS_COLORS[t.priority] ?? '#64748b' }}
                  >
                    {t.priority}
                  </Badge>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{t.title}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2">{t.description}</p>
                  </div>
                  <Badge variant="secondary" className="text-[10px] capitalize shrink-0">{t.status.replace('_', ' ')}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
