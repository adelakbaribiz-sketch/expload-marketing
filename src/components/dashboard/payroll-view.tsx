'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { GuideTooltip } from '@/components/guides/guided-tour'
import { DollarSign, Users, TrendingUp, Wallet, Play, CheckCircle } from 'lucide-react'

export function PayrollView() {
  const qc = useQueryClient()
  const [runForm, setRunForm] = useState({
    periodStart: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10),
    periodEnd: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().slice(0, 10),
    totalRevenue: '10000',
  })

  const { data: configData, isLoading } = useQuery({
    queryKey: ['payroll-config'],
    queryFn: async () => {
      const res = await fetch('/api/payroll/config')
      if (!res.ok) return { config: null }
      return res.json()
    },
  })

  const { data: periodsData } = useQuery({
    queryKey: ['payroll-periods'],
    queryFn: async () => {
      const res = await fetch('/api/payroll/periods')
      if (!res.ok) return { periods: [] }
      return res.json()
    },
  })

  const saveConfig = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/payroll/config', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Failed')
      return res.json()
    },
    onSuccess: () => {
      toast.success('Payroll config saved')
      qc.invalidateQueries({ queryKey: ['payroll-config'] })
    },
  })

  const runPayroll = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/payroll/run', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          periodStart: runForm.periodStart,
          periodEnd: runForm.periodEnd,
          totalRevenue: parseFloat(runForm.totalRevenue),
        }),
      })
      if (!res.ok) throw new Error('Failed')
      return res.json()
    },
    onSuccess: () => {
      toast.success('Payroll calculated')
      qc.invalidateQueries({ queryKey: ['payroll-periods'] })
    },
    onError: () => toast.error('Payroll run failed'),
  })

  const approve = useMutation({
    mutationFn: async (periodId: string) => {
      const res = await fetch('/api/payroll/periods', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve', periodId }),
      })
      if (!res.ok) throw new Error('Failed')
      return res.json()
    },
    onSuccess: () => {
      toast.success('Payroll approved & paid')
      qc.invalidateQueries({ queryKey: ['payroll-periods'] })
    },
  })

  const config = configData?.config
  const periods = periodsData?.periods ?? []

  if (isLoading) return <Skeleton className="h-96" />

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Wallet className="h-8 w-8 animate-float-3d" style={{ color: '#F26522' }} />
          Payroll & Salary System
          <GuideTooltip sectionId="payroll" />
        </h1>
        <p className="text-muted-foreground mt-1">
          Automatic salary distribution: 50% revenue to owner, 50% to staff pool based on contribution & performance
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="card-3d-flat"><CardContent className="p-4">
          <DollarSign className="h-5 w-5 text-brand-accent mb-1" />
          <div className="text-xs text-muted-foreground">Owner Share</div>
          <div className="text-2xl font-bold text-brand-primary">{config?.ownerSharePercent ?? 50}%</div>
        </CardContent></Card>
        <Card className="card-3d-flat"><CardContent className="p-4">
          <Users className="h-5 w-5 text-brand-light mb-1" />
          <div className="text-xs text-muted-foreground">Staff Pool</div>
          <div className="text-2xl font-bold text-brand-primary">{config?.staffPoolPercent ?? 40}%</div>
        </CardContent></Card>
        <Card className="card-3d-flat"><CardContent className="p-4">
          <TrendingUp className="h-5 w-5 text-emerald-500 mb-1" />
          <div className="text-xs text-muted-foreground">Reinvestment</div>
          <div className="text-2xl font-bold text-brand-primary">{config?.reinvestmentPercent ?? 10}%</div>
        </CardContent></Card>
        <Card className="card-3d-flat"><CardContent className="p-4">
          <Wallet className="h-5 w-5 text-yellow-500 mb-1" />
          <div className="text-xs text-muted-foreground">Bonus Pool</div>
          <div className="text-2xl font-bold text-brand-primary">{config?.bonusPoolPercent ?? 5}%</div>
        </CardContent></Card>
      </div>

      <Tabs defaultValue="run">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="run">Run Payroll</TabsTrigger>
          <TabsTrigger value="config">Configuration</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="run">
          <Card className="card-3d">
            <CardContent className="p-6 space-y-4">
              <h3 className="font-semibold text-lg">Run Payroll for Period</h3>
              <div className="grid gap-3 md:grid-cols-3">
                <div>
                  <Label>Period Start</Label>
                  <Input type="date" value={runForm.periodStart} onChange={e => setRunForm({ ...runForm, periodStart: e.target.value })} />
                </div>
                <div>
                  <Label>Period End</Label>
                  <Input type="date" value={runForm.periodEnd} onChange={e => setRunForm({ ...runForm, periodEnd: e.target.value })} />
                </div>
                <div>
                  <Label>Total Revenue (USD)</Label>
                  <Input type="number" value={runForm.totalRevenue} onChange={e => setRunForm({ ...runForm, totalRevenue: e.target.value })} />
                </div>
              </div>
              <Button
                className="bg-brand-accent-gradient text-white btn-3d"
                disabled={runPayroll.isPending}
                onClick={() => runPayroll.mutate()}
              >
                <Play className="h-4 w-4 mr-1" /> Calculate Payroll
              </Button>
              <p className="text-xs text-muted-foreground">
                System will distribute {config?.ownerSharePercent ?? 50}% to owner, {config?.staffPoolPercent ?? 40}% to staff pool (by role weight × hours × performance), {config?.reinvestmentPercent ?? 10}% to reinvestment.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="config">
          <Card className="card-3d-flat">
            <CardContent className="p-6 space-y-3">
              <h3 className="font-semibold text-lg">Revenue Distribution</h3>
              <div className="grid gap-3 md:grid-cols-4">
                <div><Label>Owner %</Label><Input type="number" defaultValue={config?.ownerSharePercent ?? 50} id="owner-pct" /></div>
                <div><Label>Staff Pool %</Label><Input type="number" defaultValue={config?.staffPoolPercent ?? 40} id="staff-pct" /></div>
                <div><Label>Reinvestment %</Label><Input type="number" defaultValue={config?.reinvestmentPercent ?? 10} id="reinv-pct" /></div>
                <div><Label>Bonus Pool %</Label><Input type="number" defaultValue={config?.bonusPoolPercent ?? 5} id="bonus-pct" /></div>
              </div>
              <div>
                <Label>Payout Frequency</Label>
                <select id="payout-freq" defaultValue={config?.payoutFrequency ?? 'monthly'} className="w-full border rounded p-2">
                  <option value="weekly">Weekly</option>
                  <option value="biweekly">Biweekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
              <Button onClick={() => saveConfig.mutate({
                ownerSharePercent: parseInt((document.getElementById('owner-pct') as HTMLInputElement).value),
                staffPoolPercent: parseInt((document.getElementById('staff-pct') as HTMLInputElement).value),
                reinvestmentPercent: parseInt((document.getElementById('reinv-pct') as HTMLInputElement).value),
                bonusPoolPercent: parseInt((document.getElementById('bonus-pct') as HTMLInputElement).value),
                payoutFrequency: (document.getElementById('payout-freq') as HTMLSelectElement).value,
              })}>Save Configuration</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-3">
          {periods.map(p => (
            <Card key={p.id} className="card-3d-flat">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold">{p.periodLabel}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Revenue: ${p.totalRevenue.toLocaleString()} · Owner: ${p.ownerShare.toLocaleString()} · Staff: ${p.staffPool.toLocaleString()} · {p._count?.payments ?? 0} payments
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{p.status}</Badge>
                    {p.status === 'calculated' && (
                      <Button size="sm" className="bg-emerald-600 text-white btn-3d" onClick={() => approve.mutate(p.id)}>
                        <CheckCircle className="h-3 w-3 mr-1" /> Approve & Pay
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {periods.length === 0 && (
            <Card><CardContent className="p-8 text-center text-muted-foreground">No payroll periods yet. Run your first payroll from the Run tab.</CardContent></Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
