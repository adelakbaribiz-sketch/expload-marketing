'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { GuideTooltip } from '@/components/guides/guided-tour'
import { useQuery } from '@tanstack/react-query'
import {
  Network, Sparkles, Play, CheckCircle, XCircle, Clock,
  Zap, Target, ArrowRight, Loader2,
} from 'lucide-react'

const NODE_COLORS: Record<string, string> = {
  find_leads: '#3b82f6', enrich_leads: '#10b981', qualify_leads: '#f59e0b',
  create_campaign: '#8b5cf6', send_campaign: '#ec4899',
  analyze_competitor: '#06b6d4', generate_content: '#f97316',
  schedule_social: '#ec4899', run_seo_audit: '#10b981',
  launch_ads: '#ef4444', start_negotiation: '#1B3A4B',
  onboard_customer: '#7c3aed', run_diagnostics: '#f97316',
  generate_report: '#F26522', assign_assistant: '#8CD4D8',
  process_payment: '#10b981', notify_user: '#999999',
}

export function GraphAgentView() {
  const qc = useQueryClient()
  const [goal, setGoal] = useState('')
  const [plan, setPlan] = useState<any>(null)
  const [execution, setExecution] = useState<any>(null)

  const { data: templatesData } = useQuery({
    queryKey: ['graph-templates'],
    queryFn: async () => {
      const res = await fetch('/api/graph/plan')
      if (!res.ok) return { templates: [] }
      return res.json()
    },
  })

  const generatePlanMutation = useMutation({
    mutationFn: async (goalText: string) => {
      const res = await fetch('/api/graph/plan', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal: goalText }),
      })
      if (!res.ok) throw new Error('Plan generation failed')
      return res.json()
    },
    onSuccess: (data) => {
      setPlan(data.plan)
      toast.success(`Plan generated: ${data.plan.nodes.length} nodes`)
    },
    onError: () => toast.error('Plan generation failed — check LLM API keys'),
  })

  const useTemplate = useMutation({
    mutationFn: async (templateId: string) => {
      const res = await fetch('/api/graph/plan', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template_id: templateId }),
      })
      if (!res.ok) throw new Error('Failed')
      return res.json()
    },
    onSuccess: (data) => {
      setPlan(data.plan)
      toast.success(`Template loaded: ${data.plan.plan_name}`)
    },
  })

  const executePlan = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/graph/execute', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      })
      if (!res.ok) throw new Error('Execution failed')
      return res.json()
    },
    onSuccess: (data) => {
      setExecution(data)
      toast.success(`Execution ${data.status}: ${Object.keys(data.results).filter(k => data.results[k].status === 'completed').length} nodes completed`)
    },
    onError: () => toast.error('Execution failed'),
  })

  const templates = templatesData?.templates ?? []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Network className="h-8 w-8 animate-float-3d" style={{ color: '#F26522' }} />
          Graph Agent Orchestrator
          <GuideTooltip sectionId="agent-hub" />
        </h1>
        <p className="text-muted-foreground mt-1">
          Node-based autonomous execution — state a goal, AI generates a graph plan, engine executes it
        </p>
      </div>

      {/* Goal input */}
      <Card className="card-3d">
        <CardContent className="p-6 space-y-3">
          <Label className="text-base font-semibold">State your goal in natural language</Label>
          <Textarea
            rows={3}
            placeholder="e.g. Find 50 dentist leads in Dubai, enrich them, qualify by score >60, and launch an email campaign"
            value={goal}
            onChange={e => setGoal(e.target.value)}
          />
          <div className="flex items-center gap-3">
            <Button
              className="bg-brand-accent-gradient text-white btn-3d"
              disabled={!goal || generatePlanMutation.isPending}
              onClick={() => generatePlanMutation.mutate(goal)}
            >
              {generatePlanMutation.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1" />}
              Generate Plan
            </Button>
            <span className="text-xs text-muted-foreground">
              Or use a template below
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Templates */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Quick Templates</h2>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          {templates.map(t => (
            <Card
              key={t.id}
              className="card-3d-flat cursor-pointer hover:border-brand-accent transition-all"
              onClick={() => useTemplate.mutate(t.id)}
            >
              <CardContent className="p-4">
                <div className="font-semibold text-sm">{t.name}</div>
                <p className="text-xs text-muted-foreground mt-1">{t.goal}</p>
                <div className="flex items-center gap-2 mt-2 text-xs">
                  <Badge variant="outline">{t.node_count} nodes</Badge>
                  <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />{t.estimated_minutes}m</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Plan visualization */}
      {plan && (
        <Card className="card-3d">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Target className="h-5 w-5" style={{ color: '#F26522' }} />
                {plan.plan_name}
              </span>
              <Button
                className="bg-emerald-600 text-white btn-3d"
                disabled={executePlan.isPending}
                onClick={() => executePlan.mutate()}
              >
                {executePlan.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Play className="h-4 w-4 mr-1" />}
                Execute Plan
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">{plan.goal}</p>
            <div className="text-xs">
              <strong>Success criteria:</strong> {plan.success_criteria}
            </div>

            {/* Node graph */}
            <div className="space-y-2">
              {plan.nodes.map((node: any, i: number) => {
                const result = execution?.results?.[node.id]
                const status = result?.status ?? 'pending'
                const color = NODE_COLORS[node.type] ?? '#999'
                return (
                  <div key={node.id} className="flex items-center gap-3">
                    {/* Connector */}
                    {i > 0 && <div className="w-6 h-px bg-border" />}
                    {/* Node */}
                    <div
                      className="flex-1 border-2 rounded-lg p-3 transition-all"
                      style={{
                        borderColor: status === 'completed' ? '#10b981' : status === 'failed' ? '#ef4444' : status === 'running' ? '#F26522' : color,
                        background: status === 'completed' ? 'rgba(16,185,129,0.05)' : status === 'failed' ? 'rgba(239,68,68,0.05)' : 'transparent',
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div
                            className="grid place-items-center h-8 w-8 rounded-lg text-white text-xs font-bold"
                            style={{ background: color }}
                          >
                            {i + 1}
                          </div>
                          <div>
                            <div className="font-medium text-sm">{node.type.replace(/_/g, ' ')}</div>
                            <div className="text-xs text-muted-foreground font-mono">{node.id}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {node.parallelizable && <Badge variant="outline" className="text-xs"><Zap className="h-3 w-3 mr-1" />parallel</Badge>}
                          {node.depends_on.length > 0 && (
                            <Badge variant="outline" className="text-xs">depends: {node.depends_on.join(',')}</Badge>
                          )}
                          {status === 'completed' && <CheckCircle className="h-5 w-5 text-emerald-500" />}
                          {status === 'failed' && <XCircle className="h-5 w-5 text-red-500" />}
                          {status === 'running' && <Loader2 className="h-5 w-5 animate-spin text-brand-accent" />}
                          {status === 'pending' && <Clock className="h-5 w-5 text-muted-foreground" />}
                        </div>
                      </div>
                      {Object.keys(node.inputs).length > 0 && (
                        <div className="mt-2 text-xs text-muted-foreground font-mono">
                          {JSON.stringify(node.inputs).slice(0, 120)}
                        </div>
                      )}
                      {result?.error && (
                        <div className="mt-2 text-xs text-red-500">Error: {result.error}</div>
                      )}
                      {result?.duration_ms && (
                        <div className="mt-1 text-xs text-muted-foreground">
                          Completed in {(result.duration_ms / 1000).toFixed(2)}s
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Execution summary */}
            {execution && (
              <div className="mt-4 p-3 rounded-lg bg-brand-primary/5 border border-brand-primary/20">
                <div className="text-sm font-semibold flex items-center gap-2">
                  {execution.status === 'completed' && <CheckCircle className="h-4 w-4 text-emerald-500" />}
                  {execution.status === 'failed' && <XCircle className="h-4 w-4 text-red-500" />}
                  Execution {execution.status}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {Object.keys(execution.results).filter(k => execution.results[k].status === 'completed').length} completed ·
                  {' '}{Object.keys(execution.results).filter(k => execution.results[k].status === 'failed').length} failed ·
                  {' '}Total time: {((new Date(execution.completed_at).getTime() - new Date(execution.started_at).getTime()) / 1000).toFixed(1)}s
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
