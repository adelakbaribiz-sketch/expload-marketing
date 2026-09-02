'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { BrainCircuit, ChevronDown, CheckCircle2, XCircle, Lightbulb, ShieldAlert, TrendingUp } from 'lucide-react'

interface AiDecision {
  id: string
  domain: string
  goal: string
  recommendation: string
  reasoning: string
  confidence: number
  evidence: string | null
  alternatives: string | null
  expectedOutcome: string | null
  risks: string | null
  llmProvider: string | null
  outcomeRecorded: boolean
  actualOutcome: string | null
  wasAccurate: boolean | null
  createdAt: string
}

const DOMAIN_LABELS: Record<string, string> = {
  negotiation: 'Negotiation',
  campaign_scheduling: 'Campaign Timing',
  graph_planning: 'Graph Agent Plan',
}
const DOMAIN_COLORS: Record<string, string> = {
  negotiation: '#8b5cf6',
  campaign_scheduling: '#f59e0b',
  graph_planning: '#3b82f6',
}

function safeParseArray(json: string | null): any[] {
  if (!json) return []
  try {
    const v = JSON.parse(json)
    return Array.isArray(v) ? v : []
  } catch {
    return []
  }
}

function confidenceColor(c: number): string {
  if (c >= 70) return '#10b981'
  if (c >= 40) return '#f59e0b'
  return '#ef4444'
}

function DecisionCard({ decision }: { decision: AiDecision }) {
  const [open, setOpen] = useState(false)
  const evidence = safeParseArray(decision.evidence)
  const alternatives = safeParseArray(decision.alternatives)
  const risks = safeParseArray(decision.risks)
  const domainColor = DOMAIN_COLORS[decision.domain] ?? '#6b7280'

  return (
    <Card style={{ borderLeft: `4px solid ${domainColor}` }}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" style={{ color: domainColor, borderColor: domainColor }}>
              {DOMAIN_LABELS[decision.domain] ?? decision.domain}
            </Badge>
            {decision.outcomeRecorded && (
              decision.wasAccurate ? (
                <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                  <CheckCircle2 className="h-3 w-3 mr-1" /> {decision.actualOutcome} · confidence was right
                </Badge>
              ) : (
                <Badge className="bg-red-100 text-red-700 hover:bg-red-100">
                  <XCircle className="h-3 w-3 mr-1" /> {decision.actualOutcome} · confidence was off
                </Badge>
              )
            )}
            <span className="text-[10px] text-muted-foreground">{new Date(decision.createdAt).toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-2 min-w-[140px]">
            <span className="text-xs text-muted-foreground whitespace-nowrap">Confidence</span>
            <Progress value={decision.confidence} className="w-20 h-1.5" />
            <span className="text-xs font-semibold" style={{ color: confidenceColor(decision.confidence) }}>
              {Math.round(decision.confidence)}%
            </span>
          </div>
        </div>

        <div>
          <div className="text-xs text-muted-foreground">{decision.goal}</div>
          <div className="font-semibold text-sm mt-0.5">{decision.recommendation}</div>
        </div>

        <p className="text-sm text-muted-foreground">{decision.reasoning}</p>

        {evidence.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {evidence.map((e, i) => (
              <span key={i} className="text-[11px] bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
                {String(e)}
              </span>
            ))}
          </div>
        )}

        {(alternatives.length > 0 || risks.length > 0 || decision.expectedOutcome) && (
          <Collapsible open={open} onOpenChange={setOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-muted-foreground">
                <ChevronDown className={`h-3 w-3 mr-1 transition-transform ${open ? 'rotate-180' : ''}`} />
                {open ? 'Hide' : 'Show'} alternatives considered & risks
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2 space-y-2">
              {decision.expectedOutcome && (
                <div className="flex items-start gap-2 text-xs">
                  <TrendingUp className="h-3.5 w-3.5 mt-0.5 shrink-0 text-emerald-600" />
                  <span><span className="font-medium">Expected outcome:</span> {decision.expectedOutcome}</span>
                </div>
              )}
              {alternatives.map((a, i) => (
                <div key={i} className="flex items-start gap-2 text-xs">
                  <Lightbulb className="h-3.5 w-3.5 mt-0.5 shrink-0 text-amber-500" />
                  <span><span className="font-medium">{a.option}:</span> {a.whyNotChosen}</span>
                </div>
              ))}
              {risks.map((r, i) => (
                <div key={i} className="flex items-start gap-2 text-xs">
                  <ShieldAlert className="h-3.5 w-3.5 mt-0.5 shrink-0 text-red-500" />
                  <span>{String(r)}</span>
                </div>
              ))}
            </CollapsibleContent>
          </Collapsible>
        )}
      </CardContent>
    </Card>
  )
}

export function AiDecisionsView() {
  const [domainFilter, setDomainFilter] = useState<string>('all')

  const { data, isLoading } = useQuery({
    queryKey: ['ai-decisions', domainFilter],
    queryFn: async () => {
      const url = domainFilter === 'all' ? '/api/ai-decisions' : `/api/ai-decisions?domain=${domainFilter}`
      const res = await fetch(url)
      if (!res.ok) return { decisions: [] }
      return res.json()
    },
    refetchInterval: 8000,
  })

  const decisions: AiDecision[] = data?.decisions ?? []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <BrainCircuit className="h-8 w-8" style={{ color: '#0A0A0B' }} />
          AI Decisions
        </h1>
        <p className="text-muted-foreground mt-1">
          Every recommendation the platform's AI has made — its reasoning, confidence, evidence, the alternatives it
          weighed, and (once known) whether it was right.
        </p>
      </div>

      <div className="flex gap-1.5 flex-wrap">
        {['all', 'negotiation', 'campaign_scheduling', 'graph_planning'].map((d) => (
          <Button
            key={d}
            size="sm"
            variant={domainFilter === d ? 'default' : 'outline'}
            onClick={() => setDomainFilter(d)}
          >
            {d === 'all' ? 'All' : DOMAIN_LABELS[d]}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      ) : decisions.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            <BrainCircuit className="h-10 w-10 mx-auto mb-2 opacity-40" />
            <div>No AI decisions recorded yet.</div>
            <div className="text-xs mt-1">
              Generate a negotiation proposal, a campaign schedule suggestion, or a Graph Agent plan — each one
              explains itself here.
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {decisions.map((d) => (
            <DecisionCard key={d.id} decision={d} />
          ))}
        </div>
      )}
    </div>
  )
}
