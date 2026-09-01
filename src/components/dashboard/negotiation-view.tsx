'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Handshake, Check, X, RefreshCw, Trophy, AlertCircle, Loader2, History } from 'lucide-react'

const STATE_LABELS: Record<string, { label: string; color: string }> = {
  initial: { label: 'Initial Proposal', color: '#3b82f6' },
  mvp: { label: 'MVP Fast-Track', color: '#f59e0b' },
  economic: { label: 'Economic', color: '#8b5cf6' },
  phased: { label: 'Phased Delivery', color: '#10b981' },
  revenue_share: { label: 'Revenue-Share', color: '#06b6d4' },
  equity: { label: 'Equity / Partnership', color: '#ec4899' },
  accepted: { label: 'Accepted!', color: '#10b981' },
  rejected_all: { label: 'All Rejected', color: '#ef4444' },
  closed: { label: 'Closed', color: '#6b7280' },
}

const ROUND_FORMULAS = [
  { round: 0, type: 'initial', title: 'Initial Proposal', formula: 'Full scope · Full price · Standard timeline' },
  { round: 1, type: 'mvp', title: 'MVP Fast-Track', formula: '−20% scope · −30% timeline · −15% price' },
  { round: 2, type: 'economic', title: 'Economic', formula: 'Cheaper LLM models · +50% timeline · −30% price' },
  { round: 3, type: 'phased', title: 'Phased Delivery', formula: '3 phases · pay-per-phase · −60% start cost' },
  { round: 4, type: 'revenue_share', title: 'Revenue-Share', formula: '40% upfront + 20% monthly revenue · 18 months' },
  { round: 5, type: 'equity', title: 'Equity / Partnership', formula: '15% cash + 3% equity · 24-month partner · FINAL' },
]

export function NegotiationView() {
  const qc = useQueryClient()
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null)
  const [feedback, setFeedback] = useState('')

  const { data: sessionsData, isLoading } = useQuery({
    queryKey: ['negotiation-sessions'],
    queryFn: async () => {
      const res = await fetch('/api/negotiation/sessions')
      if (!res.ok) return { sessions: [] }
      return res.json()
    },
  })

  const { data: sessionDetail } = useQuery({
    queryKey: ['negotiation-session', selectedSessionId],
    queryFn: async () => {
      if (!selectedSessionId) return null
      const res = await fetch(`/api/negotiation/sessions/${selectedSessionId}`)
      if (!res.ok) return null
      return res.json()
    },
    enabled: !!selectedSessionId,
    refetchInterval: 5000,
  })

  const respond = useMutation({
    mutationFn: async ({ proposalId, response, feedback }: { proposalId: string; response: 'accepted' | 'rejected'; feedback?: string }) => {
      const res = await fetch('/api/negotiation/respond', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proposalId, response, feedback }),
      })
      if (!res.ok) throw new Error('Failed')
      return res.json()
    },
    onSuccess: (data) => {
      toast.success(data.result.newState === 'accepted' ? 'Proposal accepted!' : data.result.allRejected ? 'All proposals rejected' : 'Moving to next round...')
      setFeedback('')
      qc.invalidateQueries({ queryKey: ['negotiation-session', selectedSessionId] })
      qc.invalidateQueries({ queryKey: ['negotiation-sessions'] })
    },
    onError: () => toast.error('Response failed'),
  })

  const regenerate = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/negotiation/sessions/${selectedSessionId}/regenerate`, { method: 'POST' })
      if (!res.ok) throw new Error('Failed')
      return res.json()
    },
    onSuccess: () => {
      toast.success('Proposal regenerated')
      qc.invalidateQueries({ queryKey: ['negotiation-session', selectedSessionId] })
    },
  })

  const sessions = sessionsData?.sessions ?? []
  const session = sessionDetail?.session
  const proposals = session?.proposals ?? []
  const currentProposal = proposals.find((p: any) => p.customerResponse === 'pending')
  const auditEvents = session?.auditEvents ?? []

  if (isLoading) return <Skeleton className="h-96" />

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Handshake className="h-8 w-8" style={{ color: '#0A2A3A' }} />
          Negotiation Engine
        </h1>
        <p className="text-muted-foreground mt-1">
          State-machine-driven 3-step fallback: Initial → MVP → Economic → Phased
        </p>
      </div>

      {/* Round formulas reference */}
      <Card>
        <CardContent className="p-4">
          <div className="text-sm font-semibold mb-2">Fallback Strategy (5-Step + Final):</div>
          <div className="grid gap-2 md:grid-cols-3 lg:grid-cols-6">
            {ROUND_FORMULAS.map(r => (
              <div key={r.round} className="border rounded p-2 text-xs">
                <div className="font-medium">{r.round + 1}. {r.title}</div>
                <div className="text-muted-foreground">{r.formula}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        {/* Sessions list */}
        <Card className="md:col-span-1">
          <CardHeader><CardTitle className="text-sm">Sessions ({sessions.length})</CardTitle></CardHeader>
          <CardContent className="space-y-1 max-h-96 overflow-auto">
            {sessions.map((s: any) => {
              const meta = STATE_LABELS[s.currentState] ?? { label: s.currentState, color: '#6b7280' }
              return (
                <button
                  key={s.id}
                  onClick={() => setSelectedSessionId(s.id)}
                  className={`w-full text-left p-2 rounded border transition-colors ${selectedSessionId === s.id ? 'bg-[#0A2A3A] text-white' : 'hover:bg-muted'}`}
                >
                  <div className="font-medium text-sm truncate">{s.projectName}</div>
                  <div className="text-xs opacity-75">{s.customerName}</div>
                  <div className="flex items-center gap-1 mt-1">
                    <Badge variant="outline" style={{ color: meta.color, borderColor: meta.color }}>{meta.label}</Badge>
                    <span className="text-[10px] opacity-60">{s._count?.proposals ?? 0} proposals</span>
                  </div>
                </button>
              )
            })}
            {sessions.length === 0 && (
              <p className="text-sm text-muted-foreground p-4 text-center">
                No sessions yet. Create one from the Onboarding Wizard.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Selected session detail */}
        <div className="md:col-span-2 space-y-4">
          {!session ? (
            <Card><CardContent className="p-8 text-center text-muted-foreground">Select a session to view proposals</CardContent></Card>
          ) : session.currentState === 'accepted' ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Trophy className="h-12 w-12 mx-auto text-emerald-500 mb-2" />
                <h2 className="text-xl font-semibold">Deal Closed!</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Accepted proposal: {proposals.find(p => p.id === session.acceptedProposalId)?.title ?? '—'}
                </p>
              </CardContent>
            </Card>
          ) : session.currentState === 'rejected_all' ? (
            <Card>
              <CardContent className="p-8 text-center">
                <AlertCircle className="h-12 w-12 mx-auto text-red-500 mb-2" />
                <h2 className="text-xl font-semibold">All Proposals Rejected</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Customer declined all 4 rounds. Session saved for manual follow-up.
                </p>
                {session.rejectionReasons && (
                  <div className="mt-3 text-left max-w-md mx-auto text-xs">
                    {JSON.parse(session.rejectionReasons).map((r: any, i: number) => (
                      <div key={i} className="border-l-2 pl-2 my-1" style={{ borderColor: '#ef4444' }}>
                        <strong>Round {r.round} ({r.type}):</strong> {r.reason}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Current proposal */}
              {currentProposal && (
                <Card>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-lg">{currentProposal.title}</div>
                        <Badge variant="outline" style={{ color: STATE_LABELS[session.currentState].color, borderColor: STATE_LABELS[session.currentState].color }}>
                          Round {currentProposal.round + 1} of 6 · {STATE_LABELS[session.currentState].label}
                        </Badge>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold">${currentProposal.price.toLocaleString()}</div>
                        <div className="text-xs text-muted-foreground">{currentProposal.deliveryWeeks} weeks · {currentProposal.currency}</div>
                        {currentProposal.savingsPercent > 0 && (
                          <Badge variant="secondary" className="mt-1">−{currentProposal.savingsPercent}% vs initial</Badge>
                        )}
                      </div>
                    </div>

                    <p className="text-sm whitespace-pre-wrap">{currentProposal.description}</p>

                    <div className="grid gap-2 md:grid-cols-2">
                      <div>
                        <div className="text-xs font-semibold mb-1">Included Features:</div>
                        <ul className="text-xs space-y-0.5">
                          {(JSON.parse(currentProposal.features ?? '[]')).map((f: string, i: number) => (
                            <li key={i} className="flex items-start gap-1">
                              <Check className="h-3 w-3 mt-0.5 text-emerald-600 shrink-0" /> {f}
                            </li>
                          ))}
                        </ul>
                      </div>
                      {currentProposal.excludedFeatures && (
                        <div>
                          <div className="text-xs font-semibold mb-1">Excluded (vs initial):</div>
                          <ul className="text-xs space-y-0.5">
                            {(JSON.parse(currentProposal.excludedFeatures)).map((f: string, i: number) => (
                              <li key={i} className="flex items-start gap-1">
                                <X className="h-3 w-3 mt-0.5 text-red-500 shrink-0" /> {f}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    <div className="text-xs text-muted-foreground">
                      <strong>Payment:</strong> {currentProposal.paymentSchedule ?? '50% upfront, 50% on delivery'}
                    </div>

                    <div>
                      <Label className="text-xs">Customer Feedback (optional, for rejection)</Label>
                      <Textarea
                        rows={2}
                        placeholder="e.g. too expensive, missing X feature, timeline too long..."
                        value={feedback}
                        onChange={e => setFeedback(e.target.value)}
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="default"
                        className="bg-emerald-600 hover:bg-emerald-700"
                        disabled={respond.isPending}
                        onClick={() => respond.mutate({ proposalId: currentProposal.id, response: 'accepted' })}
                      >
                        <Check className="h-4 w-4 mr-1" /> Accept
                      </Button>
                      <Button
                        variant="outline"
                        disabled={respond.isPending || currentProposal.round >= 5}
                        onClick={() => respond.mutate({ proposalId: currentProposal.id, response: 'rejected', feedback })}
                      >
                        <X className="h-4 w-4 mr-1" /> Reject {currentProposal.round >= 5 ? '(final)' : '→ Next Round'}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={regenerate.isPending}
                        onClick={() => regenerate.mutate()}
                      >
                        {regenerate.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-1" />}
                        Regenerate
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Previous proposals */}
              {proposals.length > 1 && (
                <Card>
                  <CardHeader><CardTitle className="text-sm flex items-center gap-2"><History className="h-4 w-4" /> Previous Rounds</CardTitle></CardHeader>
                  <CardContent className="space-y-1">
                    {proposals.filter((p: any) => p.customerResponse !== 'pending').map((p: any) => (
                      <div key={p.id} className="text-xs border-l-2 pl-2 py-1" style={{ borderColor: p.customerResponse === 'accepted' ? '#10b981' : '#ef4444' }}>
                        <div className="flex justify-between">
                          <span><strong>Round {p.round + 1}:</strong> {p.title}</span>
                          <span>${p.price.toLocaleString()}</span>
                        </div>
                        {p.customerFeedback && <div className="text-muted-foreground italic">"{p.customerFeedback}"</div>}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Audit log */}
              {auditEvents.length > 0 && (
                <Card>
                  <CardHeader><CardTitle className="text-sm">Audit Trail</CardTitle></CardHeader>
                  <CardContent className="space-y-0.5 text-xs">
                    {auditEvents.slice(0, 10).map((e: any) => (
                      <div key={e.id} className="flex justify-between">
                        <span>{e.message}</span>
                        <span className="text-muted-foreground">{new Date(e.createdAt).toLocaleTimeString()}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
