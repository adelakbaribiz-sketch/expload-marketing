'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { useAuth } from '@/components/auth/session-provider'
import {
  Building2, Package, MapPin, Wallet, LifeBuoy, FileText, TrendingUp, BadgeCheck,
} from 'lucide-react'

const TIER_COLORS: Record<string, string> = {
  standard: '#6b7280', silver: '#9ca3af', gold: '#f59e0b',
  platinum: '#a78bfa', master: '#0A0A0B',
}
const STATUS_COLORS: Record<string, string> = {
  pending: '#6b7280', active: '#10b981', suspended: '#f59e0b', terminated: '#ef4444',
}

export function DistributorView() {
  const qc = useQueryClient()
  const { user } = useAuth()

  const { data: distData, isLoading } = useQuery({
    queryKey: ['distributors'],
    queryFn: async () => {
      const res = await fetch('/api/distributors')
      if (!res.ok) return { distributors: [] }
      return res.json()
    },
  })

  const { data: contractsData } = useQuery({
    queryKey: ['distributor-contracts'],
    queryFn: async () => {
      const res = await fetch('/api/distributors/contracts')
      if (!res.ok) return { contracts: [] }
      return res.json()
    },
  })

  const { data: territoriesData } = useQuery({
    queryKey: ['distributor-territories'],
    queryFn: async () => {
      const res = await fetch('/api/distributors/territories')
      if (!res.ok) return { territories: [] }
      return res.json()
    },
  })

  const { data: licensesData } = useQuery({
    queryKey: ['distributor-licenses'],
    queryFn: async () => {
      const res = await fetch('/api/distributors/licenses')
      if (!res.ok) return { allocations: [] }
      return res.json()
    },
  })

  const { data: payoutsData } = useQuery({
    queryKey: ['distributor-payouts'],
    queryFn: async () => {
      const res = await fetch('/api/distributors/payouts')
      if (!res.ok) return { payouts: [] }
      return res.json()
    },
  })

  const { data: ticketsData } = useQuery({
    queryKey: ['distributor-tickets'],
    queryFn: async () => {
      const res = await fetch('/api/distributors/tickets')
      if (!res.ok) return { tickets: [] }
      return res.json()
    },
  })

  const { data: financeData } = useQuery({
    queryKey: ['distributor-finance'],
    queryFn: async () => {
      const res = await fetch('/api/distributors/finance')
      if (!res.ok) return null
      return res.json()
    },
  })

  const issueLicense = useMutation({
    mutationFn: async (params: { distributorId: string; packageId: string; count: number }) => {
      const res = await fetch('/api/distributors/licenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      })
      if (!res.ok) throw new Error('Failed to issue licenses')
      return res.json()
    },
    onSuccess: () => {
      toast.success('Licenses issued')
      qc.invalidateQueries({ queryKey: ['distributor-licenses'] })
    },
    onError: () => toast.error('Failed to issue licenses'),
  })

  const distributors = distData?.distributors ?? []
  const contracts = contractsData?.contracts ?? []
  const territories = territoriesData?.territories ?? []
  const allocations = licensesData?.allocations ?? []
  const payouts = payoutsData?.payouts ?? []
  const tickets = ticketsData?.tickets ?? []

  if (isLoading) return <Skeleton className="h-96" />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Building2 className="h-8 w-8" style={{ color: '#0A0A0B' }} />
            Wholesale Distributors
          </h1>
          <p className="text-muted-foreground mt-1">
            Master distributor management, license pools, contracts & territories
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Active Distributors</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{distributors.filter(d => d.status === 'active').length}</div>
            <p className="text-xs text-muted-foreground">of {distributors.length} total</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Licenses in Pool</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{allocations.length}</div>
            <p className="text-xs text-muted-foreground">
              {allocations.filter(a => a.status === 'in_pool').length} available
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Pending Payouts</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${payouts.filter(p => p.status === 'pending').reduce((s, p) => s + p.distributorShare, 0).toFixed(0)}
            </div>
            <p className="text-xs text-muted-foreground">{payouts.filter(p => p.status === 'pending').length} requests</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Exclusive Territories</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{territories.filter(t => t.isExclusive).length}</div>
            <p className="text-xs text-muted-foreground">{territories.length} total territories</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="distributors">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="distributors">Distributors</TabsTrigger>
          <TabsTrigger value="contracts">Contracts</TabsTrigger>
          <TabsTrigger value="licenses">Licenses</TabsTrigger>
          <TabsTrigger value="payouts">Payouts</TabsTrigger>
          <TabsTrigger value="tickets">Support</TabsTrigger>
        </TabsList>

        <TabsContent value="distributors" className="space-y-3">
          {distributors.map(d => (
            <Card key={d.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold flex items-center gap-2">
                      {d.companyName}
                      <Badge style={{ background: TIER_COLORS[d.tier] ?? '#6b7280', color: '#fff' }}>
                        {d.tier}
                      </Badge>
                      <Badge variant="outline" style={{ color: STATUS_COLORS[d.status] }}>
                        {d.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {d.country}{d.city ? ` · ${d.city}` : ''} · {d.contactName} · {d.contactEmail}
                    </p>
                  </div>
                  <div className="text-right text-sm">
                    <div>{d._count?.allocations ?? 0} licenses</div>
                    <div className="text-muted-foreground">{d._count?.contracts ?? 0} contracts</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {distributors.length === 0 && (
            <Card><CardContent className="p-8 text-center text-muted-foreground">No distributors yet.</CardContent></Card>
          )}
        </TabsContent>

        <TabsContent value="contracts" className="space-y-3">
          {contracts.map(c => (
            <Card key={c.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      {c.contractNumber}
                      {c.isExclusive && <BadgeCheck className="h-4 w-4 text-green-600" />}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {c.type} · {c.paymentTerms} · {c.wholesaleDiscountPercent}% discount
                      {c.minimumGuarantee ? ` · ${c.currency} ${c.minimumGuarantee}/yr min` : ''}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(c.startDate).toLocaleDateString()} → {c.endDate ? new Date(c.endDate).toLocaleDateString() : 'open'}
                    </p>
                  </div>
                  <Badge variant="outline">{c.status}</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
          {contracts.length === 0 && (
            <Card><CardContent className="p-8 text-center text-muted-foreground">No contracts yet.</CardContent></Card>
          )}
        </TabsContent>

        <TabsContent value="licenses" className="space-y-3">
          {user?.isSuperAdmin ? (
            <Card>
              <CardContent className="p-4 space-y-3">
                <div className="font-semibold">Issue new licenses</div>
                <LicenseIssueForm
                  distributors={distributors}
                  onSubmit={(v) => issueLicense.mutate(v)}
                  loading={issueLicense.isPending}
                />
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-4 text-sm text-muted-foreground">
                License issuance requires platform approval — contact your account manager to request additional licenses.
              </CardContent>
            </Card>
          )}
          {allocations.slice(0, 20).map(a => (
            <Card key={a.id}>
              <CardContent className="p-3 flex items-center justify-between text-sm">
                <div>
                  <code className="font-mono">{a.licenseKey}</code>
                  <span className="ml-2 text-muted-foreground">{a.package?.sku ?? '—'}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-muted-foreground">{a.customerEmail ?? 'unallocated'}</span>
                  <Badge variant="outline">{a.status}</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
          {allocations.length === 0 && (
            <Card><CardContent className="p-8 text-center text-muted-foreground">No licenses in pool yet.</CardContent></Card>
          )}
        </TabsContent>

        <TabsContent value="payouts" className="space-y-3">
          {payouts.map(p => (
            <Card key={p.id}>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <div className="font-semibold">
                    ${p.distributorShare.toFixed(2)} {p.currency}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {new Date(p.periodStart).toLocaleDateString()} → {new Date(p.periodEnd).toLocaleDateString()}
                    {' · '}via {p.method}
                  </p>
                </div>
                <Badge variant="outline">{p.status}</Badge>
              </CardContent>
            </Card>
          ))}
          {payouts.length === 0 && (
            <Card><CardContent className="p-8 text-center text-muted-foreground">No payouts yet.</CardContent></Card>
          )}
        </TabsContent>

        <TabsContent value="tickets" className="space-y-3">
          {tickets.map(t => (
            <Card key={t.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold">{t.subject}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {t.ticketNumber} · {t.category} · {t.tier} · {t.priority}
                    </p>
                  </div>
                  <Badge variant="outline">{t.status}</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
          {tickets.length === 0 && (
            <Card><CardContent className="p-8 text-center text-muted-foreground">No support tickets.</CardContent></Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

function LicenseIssueForm({ distributors, onSubmit, loading }: {
  distributors: any[]
  onSubmit: (v: { distributorId: string; packageId: string; count: number }) => void
  loading: boolean
}) {
  return (
    <form
      className="flex items-end gap-2"
      onSubmit={(e) => {
        e.preventDefault()
        const fd = new FormData(e.currentTarget)
        onSubmit({
          distributorId: fd.get('distributorId') as string,
          packageId: fd.get('packageId') as string,
          count: parseInt(fd.get('count') as string) || 1,
        })
      }}
    >
      <div>
        <Label className="text-xs">Distributor</Label>
        <Select name="distributorId">
          <SelectTrigger className="w-48"><SelectValue placeholder="Select..." /></SelectTrigger>
          <SelectContent>
            {distributors.map(d => <SelectItem key={d.id} value={d.id}>{d.companyName}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="text-xs">Package ID</Label>
        <Input name="packageId" placeholder="pkg-xxx" className="w-40" />
      </div>
      <div>
        <Label className="text-xs">Count</Label>
        <Input name="count" type="number" defaultValue={1} min={1} max={1000} className="w-24" />
      </div>
      <Button type="submit" disabled={loading}>
        <Package className="h-4 w-4 mr-1" /> Issue
      </Button>
    </form>
  )
}
