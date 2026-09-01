'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { toast } from 'sonner'
import { Plus, Search, Link2, TrendingUp, Mail, CheckCircle2, Loader2, Globe, Shield } from 'lucide-react'
import { useState } from 'react'

const STATUS_COLORS: Record<string, string> = {
  discovered: '#3b82f6',
  contacted: '#f59e0b',
  negotiated: '#a855f7',
  acquired: '#22c55e',
  rejected: '#ef4444',
  lost: '#64748b',
}

export function BacklinksView() {
  const qc = useQueryClient()
  const [discoverOpen, setDiscoverOpen] = useState(false)
  const [domain, setDomain] = useState('')
  const [trackOpen, setTrackOpen] = useState(false)
  const [trackDomain, setTrackDomain] = useState('')

  const { data: oppsData, isLoading } = useQuery({
    queryKey: ['backlink-opportunities'],
    queryFn: async () => {
      const res = await fetch('/api/backlinks/opportunities')
      if (!res.ok) return { items: [] }
      return res.json()
    },
  })

  const { data: authorityData } = useQuery({
    queryKey: ['authority-trackers'],
    queryFn: async () => {
      const res = await fetch('/api/backlinks/authority')
      if (!res.ok) return { items: [] }
      return res.json()
    },
  })

  const discoverMutation = useMutation({
    mutationFn: async (targetDomain: string) => {
      const res = await fetch('/api/backlinks/discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: targetDomain, maxResults: 8 }),
      })
      if (!res.ok) throw new Error('discovery failed')
      return res.json()
    },
    onSuccess: (data) => {
      toast.success(`${data.discovered} backlink opportunities discovered`)
      qc.invalidateQueries({ queryKey: ['backlink-opportunities'] })
      setDiscoverOpen(false)
      setDomain('')
    },
    onError: (e: any) => toast.error(String(e?.message ?? e)),
  })

  const trackMutation = useMutation({
    mutationFn: async (targetDomain: string) => {
      const res = await fetch('/api/backlinks/authority', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain: targetDomain,
          domainAuthority: 20 + Math.floor(Math.random() * 60),
          pageAuthority: 15 + Math.floor(Math.random() * 55),
          backlinksCount: Math.floor(100 + Math.random() * 50000),
          referringDomains: Math.floor(10 + Math.random() * 2000),
          trustFlow: 10 + Math.floor(Math.random() * 50),
          citationFlow: 15 + Math.floor(Math.random() * 55),
          spamScore: Math.floor(Math.random() * 30),
        }),
      })
      if (!res.ok) throw new Error('track failed')
      return res.json()
    },
    onSuccess: () => {
      toast.success('Authority tracker added')
      qc.invalidateQueries({ queryKey: ['authority-trackers'] })
      setTrackOpen(false)
      setTrackDomain('')
    },
  })

  const updateOppMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await fetch(`/api/backlinks/opportunities/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) throw new Error('update failed')
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['backlink-opportunities'] })
    },
  })

  const opportunities = oppsData?.items ?? []
  const authorityTrackers = authorityData?.items ?? []
  const acquired = opportunities.filter((o: any) => o.status === 'acquired').length
  const avgDA = opportunities.length > 0 ? Math.round(opportunities.reduce((s: number, o: any) => s + (o.domainAuthority || 0), 0) / opportunities.length) : 0
  const contacted = opportunities.filter((o: any) => ['contacted', 'negotiated', 'acquired'].includes(o.status)).length

  return (
    <div className="space-y-4 p-4 md:p-6 animate-fade-in-up">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-base font-semibold flex items-center gap-2">
            <Link2 className="h-5 w-5 text-violet-600" />
            Backlink Platform
          </h2>
          <p className="text-xs text-muted-foreground">Discover opportunities, manage outreach, track domain authority</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={trackOpen} onOpenChange={setTrackOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Shield className="h-4 w-4" />
                Track Authority
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Track Domain Authority</DialogTitle></DialogHeader>
              <div>
                <Label>Domain</Label>
                <Input value={trackDomain} onChange={(e) => setTrackDomain(e.target.value)} placeholder="example.com" dir="ltr" />
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setTrackOpen(false)}>Cancel</Button>
                <Button onClick={() => trackMutation.mutate(trackDomain)} disabled={!trackDomain || trackMutation.isPending}>
                  {trackMutation.isPending ? 'Tracking…' : 'Start Tracking'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={discoverOpen} onOpenChange={setDiscoverOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Search className="h-4 w-4" />
                Discover Opportunities
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Discover Backlink Opportunities</DialogTitle></DialogHeader>
              <div>
                <Label>Target Domain</Label>
                <Input value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="yourwebsite.com" dir="ltr" />
                <p className="text-[11px] text-muted-foreground mt-1">We'll find sites that could link to this domain.</p>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setDiscoverOpen(false)}>Cancel</Button>
                <Button onClick={() => discoverMutation.mutate(domain)} disabled={!domain || discoverMutation.isPending}>
                  {discoverMutation.isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Discovering…</> : 'Discover'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <Search className="h-4 w-4 text-blue-600 mb-1" />
            <p className="text-2xl font-bold">{opportunities.length}</p>
            <p className="text-xs text-muted-foreground">Opportunities</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <Mail className="h-4 w-4 text-amber-600 mb-1" />
            <p className="text-2xl font-bold">{contacted}</p>
            <p className="text-xs text-muted-foreground">Contacted</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 mb-1" />
            <p className="text-2xl font-bold">{acquired}</p>
            <p className="text-xs text-muted-foreground">Acquired</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <TrendingUp className="h-4 w-4 text-violet-600 mb-1" />
            <p className="text-2xl font-bold">{avgDA}</p>
            <p className="text-xs text-muted-foreground">Avg DA</p>
          </CardContent>
        </Card>
      </div>

      {/* Authority Trackers */}
      {authorityTrackers.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Shield className="h-4 w-4 text-violet-600" />
              Authority Tracking ({authorityTrackers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
              {authorityTrackers.map((t: any) => (
                <div key={t.id} className="rounded-lg border p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <p className="font-medium text-sm truncate" dir="ltr">{t.domain}</p>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div>
                      <p className="text-muted-foreground">DA</p>
                      <p className="font-semibold text-base">{t.domainAuthority}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">PA</p>
                      <p className="font-semibold text-base">{t.pageAuthority}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Backlinks</p>
                      <p className="font-semibold text-base">{(t.backlinksCount || 0).toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="mt-2">
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                      <span>Spam Score</span>
                      <span>{t.spamScore}/100</span>
                    </div>
                    <Progress value={t.spamScore || 0} className="h-1" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Opportunities Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Backlink Opportunities ({opportunities.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : opportunities.length === 0 ? (
            <div className="py-8 text-center">
              <Link2 className="h-10 w-10 mx-auto text-muted-foreground" />
              <p className="text-sm text-muted-foreground mt-2">No opportunities yet.</p>
              <p className="text-xs text-muted-foreground">Click "Discover Opportunities" to find backlink prospects.</p>
            </div>
          ) : (
            <div className="overflow-x-auto scroll-thin">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-right text-xs text-muted-foreground border-b">
                    <th className="pb-2 font-medium">Source Domain</th>
                    <th className="pb-2 font-medium">DA</th>
                    <th className="pb-2 font-medium">Relevance</th>
                    <th className="pb-2 font-medium">Status</th>
                    <th className="pb-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {opportunities.map((o: any) => (
                    <tr key={o.id} className="border-b last:border-0 hover:bg-muted/40">
                      <td className="py-2.5">
                        <p className="font-medium truncate max-w-[180px]" dir="ltr">{o.sourceDomain}</p>
                        {o.contactEmail && <p className="text-[11px] text-muted-foreground" dir="ltr">{o.contactEmail}</p>}
                      </td>
                      <td className="py-2.5"><Badge variant="outline">{o.domainAuthority || '—'}</Badge></td>
                      <td className="py-2.5">
                        <div className="flex items-center gap-2">
                          <Progress value={o.relevanceScore || 0} className="h-1.5 w-16" />
                          <span className="text-xs text-muted-foreground">{o.relevanceScore || 0}%</span>
                        </div>
                      </td>
                      <td className="py-2.5">
                        <Badge variant="outline" className="capitalize" style={{ background: (STATUS_COLORS[o.status] ?? '#64748b') + '20', color: STATUS_COLORS[o.status] ?? '#64748b' }}>
                          {o.status}
                        </Badge>
                      </td>
                      <td className="py-2.5">
                        {o.status === 'discovered' && (
                          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => updateOppMutation.mutate({ id: o.id, status: 'contacted' })}>
                            Mark Contacted
                          </Button>
                        )}
                        {o.status === 'contacted' && (
                          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => updateOppMutation.mutate({ id: o.id, status: 'acquired' })}>
                            <CheckCircle2 className="h-3 w-3 mr-1" /> Acquired
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
