'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import {
  Users, DollarSign, Handshake, Sparkles, Loader2, Mail,
  ExternalLink, Target, TrendingUp, Star,
} from 'lucide-react'
import { useState } from 'react'

const INVESTOR_TYPES: Record<string, { label: string; color: string }> = {
  angel: { label: 'Angel Investor', color: '#FF5722' },
  seed: { label: 'Seed Fund', color: '#0A2A3A' },
  vc: { label: 'Venture Capital', color: '#7C4DFF' },
  pe: { label: 'Private Equity', color: '#22c55e' },
  corporate: { label: 'Corporate VC', color: '#f59e0b' },
  accelerator: { label: 'Accelerator', color: '#80DEEA' },
}

const PARTNERSHIP_TYPES: Record<string, string> = {
  strategic: '#0A2A3A', technical: '#7C4DFF', marketing: '#FF5722',
  distribution: '#22c55e', co_development: '#f59e0b', joint_venture: '#EC4899',
  reseller: '#80DEEA', affiliate: '#6366f1',
}

export function InvestorHubView() {
  const qc = useQueryClient()

  const { data: investorsData } = useQuery({
    queryKey: ['investors'],
    queryFn: async () => {
      const res = await fetch('/api/investors')
      if (!res.ok) return { items: [] }
      return res.json()
    },
  })

  const { data: cofoundersData } = useQuery({
    queryKey: ['cofounders'],
    queryFn: async () => {
      const res = await fetch('/api/cofounders')
      if (!res.ok) return { items: [] }
      return res.json()
    },
  })

  const { data: partnershipsData } = useQuery({
    queryKey: ['partnerships'],
    queryFn: async () => {
      const res = await fetch('/api/partnerships')
      if (!res.ok) return { items: [] }
      return res.json()
    },
  })

  const matchMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/investors/match', { method: 'POST' })
      if (!res.ok) throw new Error('match failed')
      return res.json()
    },
    onSuccess: (data) => {
      toast.success(`Found ${data.matches.length} investor matches!`)
      qc.invalidateQueries({ queryKey: ['investors'] })
    },
  })

  const [matches, setMatches] = useState<any[] | null>(null)

  const investors = investorsData?.items ?? []
  const cofounders = cofoundersData?.items ?? []
  const partnerships = partnershipsData?.items ?? []

  return (
    <div className="space-y-4 p-4 md:p-6 animate-fade-in-up">
      <div>
        <h2 className="text-base font-semibold flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-[#FF5722]" />
          Investor & Partnership Hub
        </h2>
        <p className="text-xs text-muted-foreground">Find investors, co-founders, and strategic partnerships for your business</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="p-4"><DollarSign className="h-4 w-4 text-[#FF5722] mb-1" /><p className="text-2xl font-bold">{investors.length}</p><p className="text-xs text-muted-foreground">Investors</p></CardContent></Card>
        <Card><CardContent className="p-4"><Users className="h-4 w-4 text-[#0A2A3A] mb-1" /><p className="text-2xl font-bold">{cofounders.length}</p><p className="text-xs text-muted-foreground">Co-founders</p></CardContent></Card>
        <Card><CardContent className="p-4"><Handshake className="h-4 w-4 text-violet-600 mb-1" /><p className="text-2xl font-bold">{partnerships.length}</p><p className="text-xs text-muted-foreground">Partnerships</p></CardContent></Card>
      </div>

      <Tabs defaultValue="investors">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="investors">Investors</TabsTrigger>
          <TabsTrigger value="cofounders">Co-founders</TabsTrigger>
          <TabsTrigger value="partnerships">Partnerships</TabsTrigger>
        </TabsList>

        {/* Investors Tab */}
        <TabsContent value="investors" className="space-y-3">
          <div className="flex justify-end">
            <Button className="gap-2 bg-[#FF5722] hover:bg-[#FF7043]" onClick={() => { matchMutation.mutate(); }} disabled={matchMutation.isPending}>
              {matchMutation.isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Matching...</> : <><Sparkles className="h-4 w-4" /> Find Best Matches</>}
            </Button>
          </div>

          {investors.length === 0 ? (
            <Card><CardContent className="p-12 text-center"><DollarSign className="h-10 w-10 mx-auto text-muted-foreground" /><p className="text-sm text-muted-foreground mt-2">No investors yet. Click "Find Best Matches" to discover investors.</p></CardContent></Card>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {investors.map((inv: any) => {
                const typeInfo = INVESTOR_TYPES[inv.investorType] ?? { label: inv.investorType, color: '#64748b' }
                const matchScore = inv.matchScore ?? 0
                return (
                  <Card key={inv.id} className={`hover:shadow-md transition-shadow ${matchScore >= 70 ? 'border-emerald-500/30' : ''}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="grid place-items-center h-10 w-10 rounded-full text-white shrink-0" style={{ background: typeInfo.color }}>
                            <DollarSign className="h-5 w-5" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{inv.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{inv.firmName || typeInfo.label}</p>
                          </div>
                        </div>
                        {matchScore > 0 && (
                          <Badge variant="outline" className="shrink-0" style={{ background: matchScore >= 70 ? '#22c55e20' : '#f59e0b20', color: matchScore >= 70 ? '#22c55e' : '#f59e0b' }}>
                            <Star className="h-2.5 w-2.5 mr-0.5" /> {matchScore}% match
                          </Badge>
                        )}
                      </div>
                      {inv.bio && <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{inv.bio}</p>}
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        <Badge variant="outline" className="text-[10px]" style={{ borderColor: typeInfo.color, color: typeInfo.color }}>{typeInfo.label}</Badge>
                        {inv.checkSize && <Badge variant="secondary" className="text-[10px]">{inv.checkSize}</Badge>}
                        {inv.geography && <Badge variant="secondary" className="text-[10px]">{inv.geography}</Badge>}
                      </div>
                      {inv.matchReasons && (
                        <div className="mb-2">
                          {JSON.parse(inv.matchReasons).map((r: string, i: number) => (
                            <div key={i} className="text-[10px] text-emerald-600 flex items-center gap-1"><Sparkles className="h-2.5 w-2.5" /> {r}</div>
                          ))}
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        {inv.linkedin && <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => window.open(inv.linkedin, '_blank')}><ExternalLink className="h-3 w-3" /> LinkedIn</Button>}
                        <Badge variant={inv.contactStatus === 'not_contacted' ? 'secondary' : 'default'} className="text-[10px] capitalize ml-auto">{inv.contactStatus.replace(/_/g, ' ')}</Badge>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>

        {/* Co-founders Tab */}
        <TabsContent value="cofounders" className="space-y-3">
          {cofounders.length === 0 ? (
            <Card><CardContent className="p-12 text-center"><Users className="h-10 w-10 mx-auto text-muted-foreground" /><p className="text-sm text-muted-foreground mt-2">No co-founder profiles yet.</p></CardContent></Card>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {cofounders.map((co: any) => {
                const skills = co.skills ? JSON.parse(co.skills) : []
                return (
                  <Card key={co.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="grid place-items-center h-10 w-10 rounded-full bg-[#0A2A3A] text-white shrink-0">
                            <Users className="h-5 w-5" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{co.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{co.currentRole || 'Professional'}{co.experience ? ` · ${co.experience}y exp` : ''}</p>
                          </div>
                        </div>
                        {co.matchScore && <Badge variant="outline" className="shrink-0">{co.matchScore}% match</Badge>}
                      </div>
                      {co.bio && <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{co.bio}</p>}
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {skills.map((s: string, i: number) => <Badge key={i} variant="secondary" className="text-[10px]">{s}</Badge>)}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                        <span>Commitment: <span className="font-medium capitalize">{co.commitment}</span></span>
                        {co.equityExpected && <span>Equity: <span className="font-medium">{co.equityExpected}%</span></span>}
                        {co.remoteOk && <Badge variant="outline" className="text-[9px]">Remote OK</Badge>}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>

        {/* Partnerships Tab */}
        <TabsContent value="partnerships" className="space-y-3">
          {partnerships.length === 0 ? (
            <Card><CardContent className="p-12 text-center"><Handshake className="h-10 w-10 mx-auto text-muted-foreground" /><p className="text-sm text-muted-foreground mt-2">No partnership opportunities yet.</p></CardContent></Card>
          ) : (
            <div className="space-y-2">
              {partnerships.map((p: any) => (
                <Card key={p.id}>
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-medium truncate">{p.title}</p>
                          <Badge variant="outline" className="text-[9px] capitalize" style={{ background: (PARTNERSHIP_TYPES[p.type] ?? '#64748b') + '20', color: PARTNERSHIP_TYPES[p.type] ?? '#64748b' }}>{p.type.replace(/_/g, ' ')}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">{p.description}</p>
                        <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                          <span>{p.partnerName}</span>
                          <span className="capitalize">{p.partnerType}</span>
                          {p.estimatedValue && <span>💰 ${p.estimatedValue.toLocaleString()}</span>}
                          {p.timeline && <span>⏱ {p.timeline}</span>}
                        </div>
                      </div>
                      <Badge variant="outline" className="capitalize shrink-0" style={{ background: p.priority === 'critical' ? '#ef444420' : p.priority === 'high' ? '#f59e0b20' : '#0A2A3A20', color: p.priority === 'critical' ? '#ef4444' : p.priority === 'high' ? '#f59e0b' : '#0A2A3A' }}>{p.priority}</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
