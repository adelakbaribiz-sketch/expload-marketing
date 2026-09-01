'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { Bot, Sparkles, Loader2, CheckCircle2, XCircle, Brain, TrendingUp, Lightbulb } from 'lucide-react'

const PRIORITY_COLORS: Record<string, string> = {
  low: '#64748b',
  medium: '#3b82f6',
  high: '#f59e0b',
  critical: '#ef4444',
}

const CATEGORY_ICONS: Record<string, any> = {
  seo: TrendingUp,
  content: Lightbulb,
  ads: TrendingUp,
  social: Sparkles,
  email: Bot,
  strategy: Brain,
}

export function AiAgentsView() {
  const qc = useQueryClient()

  const { data: agentsData, isLoading } = useQuery({
    queryKey: ['ai-agents'],
    queryFn: async () => {
      const res = await fetch('/api/ai/agents')
      if (!res.ok) return { items: [] }
      return res.json()
    },
  })

  const { data: recsData } = useQuery({
    queryKey: ['ai-recommendations'],
    queryFn: async () => {
      const res = await fetch('/api/ai/recommendations')
      if (!res.ok) return { items: [] }
      return res.json()
    },
  })

  const generateMutation = useMutation({
    mutationFn: async (type: string) => {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      })
      if (!res.ok) throw new Error('generate failed')
      return res.json()
    },
    onSuccess: (data) => {
      toast.success(`AI analysis complete: ${data.recommendations.length} recommendations generated`)
      qc.invalidateQueries({ queryKey: ['ai-agents'] })
      qc.invalidateQueries({ queryKey: ['ai-recommendations'] })
    },
    onError: (e: any) => toast.error(String(e?.message ?? e)),
  })

  const updateRecMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await fetch(`/api/ai/recommendations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) throw new Error('update failed')
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ai-recommendations'] })
    },
  })

  const agents = agentsData?.items ?? []
  const recommendations = recsData?.items ?? []

  const AGENT_TYPES = [
    { type: 'strategy', name: 'Strategy Agent', desc: 'Market analysis, content strategy, channel planning', icon: Brain, color: 'from-violet-500 to-purple-600' },
    { type: 'advisor', name: 'Advisor Agent', desc: 'Monthly SEO, ads, content performance review', icon: TrendingUp, color: 'from-blue-500 to-cyan-600' },
    { type: 'content', name: 'Content Agent', desc: 'Generate content ideas and draft content', icon: Lightbulb, color: 'from-amber-500 to-orange-600' },
  ]

  return (
    <div className="space-y-4 p-4 md:p-6 animate-fade-in-up">
      <div>
        <h2 className="text-base font-semibold flex items-center gap-2">
          <Bot className="h-5 w-5 text-violet-600" />
          AI Agents
        </h2>
        <p className="text-xs text-muted-foreground">Strategy, Advisor, and Autonomous marketing agents powered by AI</p>
      </div>

      {/* AI Agent Types */}
      <div className="grid gap-3 md:grid-cols-3">
        {AGENT_TYPES.map((agent) => {
          const Icon = agent.icon
          const existingAgent = agents.find((a: any) => a.type === agent.type)
          return (
            <Card key={agent.type} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className={`grid place-items-center h-10 w-10 rounded-lg bg-gradient-to-br ${agent.color} text-white mb-3`}>
                  <Icon className="h-5 w-5" />
                </div>
                <p className="font-medium text-sm">{agent.name}</p>
                <p className="text-xs text-muted-foreground mt-1">{agent.desc}</p>
                <Button
                  size="sm"
                  variant="default"
                  className="w-full mt-3 gap-2"
                  onClick={() => generateMutation.mutate(agent.type)}
                  disabled={generateMutation.isPending}
                >
                  {generateMutation.isPending && generateMutation.variables === agent.type ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5" />
                  )}
                  Generate Analysis
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Recommendations */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-600" />
            AI Recommendations ({recommendations.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : recommendations.length === 0 ? (
            <div className="py-8 text-center">
              <Bot className="h-10 w-10 mx-auto text-muted-foreground" />
              <p className="text-sm text-muted-foreground mt-2">No AI recommendations yet.</p>
              <p className="text-xs text-muted-foreground">Run an agent above to generate personalized recommendations.</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[600px] overflow-y-auto scroll-thin">
              {recommendations.map((rec: any) => {
                const Icon = CATEGORY_ICONS[rec.category] ?? Sparkles
                return (
                  <div key={rec.id} className="rounded-lg border p-3">
                    <div className="flex items-start gap-3">
                      <div className="grid place-items-center h-8 w-8 rounded-md bg-violet-500/15 text-violet-600 shrink-0">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <Badge variant="outline" className="text-[10px] capitalize" style={{ background: (PRIORITY_COLORS[rec.priority] ?? '#64748b') + '20', color: PRIORITY_COLORS[rec.priority] ?? '#64748b' }}>
                            {rec.priority}
                          </Badge>
                          <Badge variant="secondary" className="text-[10px] capitalize">{rec.category}</Badge>
                          {rec.status !== 'pending' && (
                            <Badge variant="outline" className="text-[10px] capitalize">{rec.status}</Badge>
                          )}
                        </div>
                        <p className="font-medium text-sm">{rec.title}</p>
                        <p className="text-xs text-muted-foreground mt-1">{rec.description}</p>
                        {rec.impact && (
                          <p className="text-xs mt-2"><span className="font-medium">Impact:</span> {rec.impact}</p>
                        )}
                        {rec.status === 'pending' && (
                          <div className="flex items-center gap-2 mt-3">
                            <Button size="sm" variant="default" className="h-7 gap-1 text-xs" onClick={() => updateRecMutation.mutate({ id: rec.id, status: 'approved' })}>
                              <CheckCircle2 className="h-3 w-3" /> Approve
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs text-destructive" onClick={() => updateRecMutation.mutate({ id: rec.id, status: 'rejected' })}>
                              <XCircle className="h-3 w-3" /> Reject
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
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
