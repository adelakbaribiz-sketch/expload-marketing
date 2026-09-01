'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import {
  DollarSign, TrendingUp, AlertTriangle, CreditCard, Bell,
  Check, X, Receipt, Zap, Target,
} from 'lucide-react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

const SEVERITY_COLORS: Record<string, string> = { info: '#0A2A3A', warning: '#f59e0b', critical: '#ef4444' }
const TYPE_ICONS: Record<string, any> = {
  low_balance: AlertTriangle, failed_payment: X, churn_risk: AlertTriangle,
  revenue_milestone: Target, payment_overdue: Bell, subscription_expiring: Clock,
  high_usage: Zap, commission_due: DollarSign,
}

import { Clock } from 'lucide-react'

export function FinanceView() {
  const qc = useQueryClient()

  const { data: reportsData, isLoading } = useQuery({
    queryKey: ['payment-reports'],
    queryFn: async () => {
      const res = await fetch('/api/payments/reports')
      if (!res.ok) return null
      return res.json()
    },
  })

  const { data: paymentsData } = useQuery({
    queryKey: ['payments-list'],
    queryFn: async () => {
      const res = await fetch('/api/payments/list?limit=20')
      if (!res.ok) return { payments: [], stats: {} }
      return res.json()
    },
  })

  const { data: alertsData } = useQuery({
    queryKey: ['financial-alerts'],
    queryFn: async () => {
      const res = await fetch('/api/payments/alerts')
      if (!res.ok) return { alerts: [] }
      return res.json()
    },
  })

  const { data: methodsData } = useQuery({
    queryKey: ['payment-methods'],
    queryFn: async () => {
      const res = await fetch('/api/payments/methods')
      if (!res.ok) return { methods: [] }
      return res.json()
    },
  })

  const resolveAlertMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/payments/alerts/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isResolved: true }),
      })
      if (!res.ok) throw new Error('failed')
      return res.json()
    },
    onSuccess: () => {
      toast.success('Alert resolved')
      qc.invalidateQueries({ queryKey: ['financial-alerts'] })
    },
  })

  const reports = reportsData
  const payments = paymentsData?.payments ?? []
  const paymentStats = paymentsData?.stats ?? {}
  const alerts = alertsData?.alerts ?? []
  const methods = methodsData?.methods ?? []

  if (isLoading) {
    return <div className="p-6"><Skeleton className="h-40 w-full" /></div>
  }

  return (
    <div className="space-y-4 p-4 md:p-6 animate-fade-in-up">
      <div>
        <h2 className="text-base font-semibold flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-emerald-600" />
          Finance & Payments
        </h2>
        <p className="text-xs text-muted-foreground">Revenue tracking, payments, invoices, financial alerts</p>
      </div>

      {/* Revenue Stats */}
      {reports && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card><CardContent className="p-4"><DollarSign className="h-4 w-4 text-emerald-600 mb-1" /><p className="text-2xl font-bold text-emerald-600">${reports.mrr?.toLocaleString()}</p><p className="text-xs text-muted-foreground">MRR</p></CardContent></Card>
          <Card><CardContent className="p-4"><TrendingUp className="h-4 w-4 text-[#FF5722] mb-1" /><p className="text-2xl font-bold text-[#FF5722]">${reports.arr?.toLocaleString()}</p><p className="text-xs text-muted-foreground">ARR</p></CardContent></Card>
          <Card><CardContent className="p-4"><TrendingUp className="h-4 w-4 text-violet-600 mb-1" /><p className="text-2xl font-bold">{reports.growth > 0 ? '+' : ''}{reports.growth}%</p><p className="text-xs text-muted-foreground">MoM Growth</p></CardContent></Card>
          <Card><CardContent className="p-4"><Receipt className="h-4 w-4 text-[#0A2A3A] mb-1" /><p className="text-2xl font-bold">${reports.totalRevenue?.toLocaleString()}</p><p className="text-xs text-muted-foreground">Total Revenue</p></CardContent></Card>
        </div>
      )}

      <Tabs defaultValue="overview">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="alerts">Alerts ({alerts.filter(a => !a.isResolved).length})</TabsTrigger>
          <TabsTrigger value="methods">Methods</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-3">
          {reports && (
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm">Revenue Trend (6 months)</CardTitle></CardHeader>
              <CardContent>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={reports.monthlyTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                      <YAxis tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                      <Tooltip contentStyle={{ background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                      <Bar dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}
          <div className="grid grid-cols-3 gap-3">
            <Card><CardContent className="p-3 text-center"><p className="text-lg font-bold text-emerald-600">${paymentStats.totalPaid?.toLocaleString()}</p><p className="text-xs text-muted-foreground">Total Paid</p></CardContent></Card>
            <Card><CardContent className="p-3 text-center"><p className="text-lg font-bold text-amber-600">${paymentStats.totalPending?.toLocaleString()}</p><p className="text-xs text-muted-foreground">Pending</p></CardContent></Card>
            <Card><CardContent className="p-3 text-center"><p className="text-lg font-bold text-red-600">${paymentStats.totalFailed?.toLocaleString()}</p><p className="text-xs text-muted-foreground">Failed</p></CardContent></Card>
          </div>
        </TabsContent>

        {/* Payments Tab */}
        <TabsContent value="payments" className="space-y-3">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm">Recent Payments ({payments.length})</CardTitle></CardHeader>
            <CardContent>
              {payments.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No payments yet.</p>
              ) : (
                <div className="space-y-1.5 max-h-96 overflow-y-auto scroll-thin">
                  {payments.map((p: any) => (
                    <div key={p.id} className="flex items-center gap-3 p-2 rounded-md bg-muted/30 text-xs">
                      <Badge variant="outline" className="text-[9px] capitalize">{p.type}</Badge>
                      <span className="font-medium">${p.amount}</span>
                      <span className="flex-1 truncate text-muted-foreground">{p.description || p.invoiceNumber || '—'}</span>
                      <Badge variant={p.status === 'completed' ? 'default' : p.status === 'failed' ? 'destructive' : 'secondary'} className="text-[9px]">{p.status}</Badge>
                      <span className="text-muted-foreground">{new Date(p.createdAt).toLocaleDateString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Alerts Tab */}
        <TabsContent value="alerts" className="space-y-3">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><Bell className="h-4 w-4 text-[#FF5722]" /> Financial Alerts</CardTitle></CardHeader>
            <CardContent>
              {alerts.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No financial alerts. All good! ✅</p>
              ) : (
                <div className="space-y-2">
                  {alerts.map((alert: any) => {
                    const Icon = TYPE_ICONS[alert.type] ?? Bell
                    return (
                      <div key={alert.id} className={`flex items-start gap-3 p-3 rounded-lg border ${alert.isResolved ? 'opacity-50' : ''}`} style={{ borderColor: (SEVERITY_COLORS[alert.severity] ?? '#0A2A3A') + '30' }}>
                        <div className="grid place-items-center h-8 w-8 rounded-md shrink-0" style={{ background: (SEVERITY_COLORS[alert.severity] ?? '#0A2A3A') + '20' }}>
                          <Icon className="h-4 w-4" style={{ color: SEVERITY_COLORS[alert.severity] ?? '#0A2A3A' }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-sm font-medium">{alert.title}</p>
                            <Badge variant="outline" className="text-[9px] capitalize" style={{ background: (SEVERITY_COLORS[alert.severity] ?? '#0A2A3A') + '20', color: SEVERITY_COLORS[alert.severity] ?? '#0A2A3A' }}>{alert.severity}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">{alert.message}</p>
                        </div>
                        {!alert.isResolved && (
                          <Button size="sm" variant="ghost" className="h-7 text-xs shrink-0" onClick={() => resolveAlertMutation.mutate(alert.id)}>
                            <Check className="h-3.5 w-3.5" /> Resolve
                          </Button>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Methods Tab */}
        <TabsContent value="methods" className="space-y-3">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><CreditCard className="h-4 w-4 text-[#0A2A3A]" /> Payment Methods</CardTitle></CardHeader>
            <CardContent>
              {methods.length === 0 ? (
                <div className="text-center py-8">
                  <CreditCard className="h-10 w-10 mx-auto text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mt-2">No payment methods added yet.</p>
                  <p className="text-xs text-muted-foreground">Add a card to enable automatic billing.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {methods.map((m: any) => (
                    <div key={m.id} className="flex items-center gap-3 p-3 rounded-lg border">
                      <div className="grid place-items-center h-8 w-12 rounded-md bg-[#0A2A3A] text-white text-xs font-bold shrink-0">
                        {m.brand?.toUpperCase() || 'CARD'}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">•••• {m.last4}</p>
                        <p className="text-xs text-muted-foreground">{m.holderName} · {m.expiryMonth}/{m.expiryYear}</p>
                      </div>
                      {m.isDefault && <Badge variant="default" className="text-[10px]">Default</Badge>}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
