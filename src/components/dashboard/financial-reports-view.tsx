'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { GuideTooltip } from '@/components/guides/guided-tour'
import { toast } from 'sonner'
import { BarChart3, TrendingUp, TrendingDown, DollarSign, Activity, FileText, Sparkles, RefreshCw, Archive, Plus } from 'lucide-react'

const ARCHIVE_TYPES = ['revenue_summary', 'commission_summary', 'payout_summary', 'license_usage']

function periodToRange(period: Period): { start: Date; end: Date } {
  const end = new Date()
  const start = new Date()
  if (period === 'daily') start.setDate(start.getDate() - 1)
  else if (period === 'weekly') start.setDate(start.getDate() - 7)
  else if (period === 'monthly') start.setMonth(start.getMonth() - 1)
  else if (period === 'quarterly') start.setMonth(start.getMonth() - 3)
  else start.setFullYear(start.getFullYear() - 1)
  return { start, end }
}

type Period = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual'
type Audience = 'admin' | 'distributor' | 'affiliate' | 'platform'

export function FinancialReportsView() {
  const qc = useQueryClient()
  const [period, setPeriod] = useState<Period>('monthly')
  const [audience, setAudience] = useState<Audience>('admin')
  const [archiveType, setArchiveType] = useState('revenue_summary')

  const { data: reportData, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['financial-report', period, audience],
    queryFn: async () => {
      const res = await fetch(`/api/reports?period=${period}&audience=${audience}&aiInsights=true`)
      if (!res.ok) return null
      return res.json()
    },
  })

  const { data: archiveData } = useQuery({
    queryKey: ['financial-report-archive'],
    queryFn: async () => {
      const res = await fetch('/api/finance/reports')
      if (!res.ok) return { reports: [] }
      return res.json()
    },
  })

  const generateArchive = useMutation({
    mutationFn: async () => {
      const { start, end } = periodToRange(period)
      const res = await fetch('/api/finance/reports', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: archiveType, periodType: period,
          periodStart: start.toISOString(), periodEnd: end.toISOString(),
          scope: 'platform',
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error === 'forbidden' ? 'Only a super admin can archive reports' : (data.error || 'Failed'))
      }
      return res.json()
    },
    onSuccess: () => {
      toast.success('Report archived')
      qc.invalidateQueries({ queryKey: ['financial-report-archive'] })
    },
    onError: (err: any) => toast.error(String(err?.message ?? err)),
  })

  const report = reportData?.report
  const revenue = report?.revenue
  const audienceMetrics = report?.audienceMetrics
  const aiInsights = report?.aiInsights
  const archivedReports = archiveData?.reports ?? []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <BarChart3 className="h-8 w-8 animate-float-3d" style={{ color: '#FF6A00' }} />
            Financial Reports
            <GuideTooltip sectionId="payroll" />
          </h1>
          <p className="text-muted-foreground mt-1">
            Daily, weekly, monthly reports with AI-generated insights for admins, distributors, and affiliates
          </p>
        </div>
        <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`h-4 w-4 mr-1 ${isFetching ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Period & Audience selector */}
      <Card className="card-3d-flat">
        <CardContent className="p-4 flex items-center gap-3 flex-wrap">
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Period</label>
            <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="quarterly">Quarterly</SelectItem>
                <SelectItem value="annual">Annual</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Audience</label>
            <Select value={audience} onValueChange={(v) => setAudience(v as Audience)}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Platform Admin</SelectItem>
                <SelectItem value="distributor">Distributor</SelectItem>
                <SelectItem value="affiliate">Affiliate / Reseller</SelectItem>
                <SelectItem value="platform">Platform-wide</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {report && (
            <div className="text-xs text-muted-foreground">
              Period: {new Date(report.startDate).toLocaleDateString()} → {new Date(report.endDate).toLocaleDateString()}
            </div>
          )}
        </CardContent>
      </Card>

      {isLoading ? (
        <Skeleton className="h-96" />
      ) : !revenue ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">No data for this period.</CardContent></Card>
      ) : (
        <>
          {/* KPI cards */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card className="card-3d">
              <CardContent className="p-4">
                <DollarSign className="h-5 w-5 text-brand-accent mb-1" />
                <div className="text-xs text-muted-foreground">Gross Revenue</div>
                <div className="text-2xl font-bold text-brand-primary">${revenue.totalGross.toLocaleString()}</div>
                <div className={`text-xs flex items-center gap-1 ${revenue.growthPercent >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                  {revenue.growthPercent >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {revenue.growthPercent >= 0 ? '+' : ''}{revenue.growthPercent.toFixed(1)}% vs prev
                </div>
              </CardContent>
            </Card>
            <Card className="card-3d">
              <CardContent className="p-4">
                <Activity className="h-5 w-5 text-brand-light mb-1" />
                <div className="text-xs text-muted-foreground">Transactions</div>
                <div className="text-2xl font-bold text-brand-primary">{revenue.transactionCount}</div>
                <div className="text-xs text-muted-foreground">across all gateways</div>
              </CardContent>
            </Card>
            <Card className="card-3d">
              <CardContent className="p-4">
                <DollarSign className="h-5 w-5 text-emerald-500 mb-1" />
                <div className="text-xs text-muted-foreground">Net Revenue</div>
                <div className="text-2xl font-bold text-brand-primary">${revenue.totalNet.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">after fees</div>
              </CardContent>
            </Card>
            <Card className="card-3d">
              <CardContent className="p-4">
                <DollarSign className="h-5 w-5 text-yellow-500 mb-1" />
                <div className="text-xs text-muted-foreground">Commissions Paid</div>
                <div className="text-2xl font-bold text-brand-primary">${revenue.totalCommission.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">to affiliates</div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="overview">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="breakdown">Breakdown</TabsTrigger>
              <TabsTrigger value="audience">Audience Metrics</TabsTrigger>
              <TabsTrigger value="ai">AI Insights</TabsTrigger>
              <TabsTrigger value="archive">Archive</TabsTrigger>
            </TabsList>

            {/* Overview tab */}
            <TabsContent value="overview" className="space-y-3">
              <Card>
                <CardHeader><CardTitle className="text-sm">Revenue Trend (Daily)</CardTitle></CardHeader>
                <CardContent>
                  {Object.keys(revenue.byDay).length === 0 ? (
                    <p className="text-sm text-muted-foreground">No daily data for this period.</p>
                  ) : (
                    <div className="space-y-1">
                      {Object.entries(revenue.byDay).sort().map(([day, amount]) => {
                        const max = Math.max(...Object.values(revenue.byDay) as number[])
                        const pct = max > 0 ? (amount as number / max) * 100 : 0
                        return (
                          <div key={day} className="flex items-center gap-3 text-xs">
                            <div className="w-24 text-muted-foreground">{day}</div>
                            <div className="flex-1 bg-muted rounded h-6 overflow-hidden">
                              <div
                                className="h-full bg-brand-accent-gradient transition-all"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <div className="w-20 text-right font-medium">${(amount as number).toLocaleString()}</div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Breakdown tab */}
            <TabsContent value="breakdown" className="space-y-3">
              <Card>
                <CardHeader><CardTitle className="text-sm">Revenue by Payment Method</CardTitle></CardHeader>
                <CardContent>
                  {Object.keys(revenue.byMethod).length === 0 ? (
                    <p className="text-sm text-muted-foreground">No data.</p>
                  ) : (
                    <div className="space-y-2">
                      {Object.entries(revenue.byMethod).sort((a, b) => (b[1] as any).gross - (a[1] as any).gross).map(([method, stats]: any) => (
                        <div key={method} className="flex items-center justify-between p-2 border rounded">
                          <div>
                            <div className="font-medium text-sm capitalize">{method.replace(/_/g, ' ')}</div>
                            <div className="text-xs text-muted-foreground">{stats.count} transactions</div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold">${stats.gross.toLocaleString()}</div>
                            <div className="text-xs text-muted-foreground">fees: ${stats.fees.toFixed(2)}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-sm">Revenue by Currency</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                    {Object.entries(revenue.byCurrency).map(([curr, amt]) => (
                      <div key={curr} className="border rounded p-2 text-center">
                        <div className="text-xs text-muted-foreground">{curr}</div>
                        <div className="font-bold">${(amt as number).toLocaleString()}</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Audience metrics */}
            <TabsContent value="audience" className="space-y-3">
              <Card>
                <CardHeader><CardTitle className="text-sm">{audience.charAt(0).toUpperCase() + audience.slice(1)} Metrics</CardTitle></CardHeader>
                <CardContent>
                  <pre className="text-xs bg-muted/30 p-3 rounded overflow-auto max-h-96">
                    {JSON.stringify(audienceMetrics, null, 2)}
                  </pre>
                </CardContent>
              </Card>
            </TabsContent>

            {/* AI Insights */}
            <TabsContent value="ai" className="space-y-3">
              {aiInsights && !aiInsights.error ? (
                <>
                  <Card className="card-3d border-2" style={{ borderColor: '#FF6A00' }}>
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-brand-accent" />
                        Executive Summary
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm">{aiInsights.summary}</p>
                    </CardContent>
                  </Card>

                  {aiInsights.key_findings && (
                    <Card>
                      <CardHeader><CardTitle className="text-sm">Key Findings</CardTitle></CardHeader>
                      <CardContent>
                        <ul className="space-y-2 text-sm">
                          {aiInsights.key_findings.map((f: string, i: number) => (
                            <li key={i} className="flex items-start gap-2">
                              <Badge variant="outline" className="text-xs">{i + 1}</Badge>
                              <span>{f}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}

                  {aiInsights.anomalies && aiInsights.anomalies.length > 0 && (
                    <Card>
                      <CardHeader><CardTitle className="text-sm">Anomalies Detected</CardTitle></CardHeader>
                      <CardContent>
                        <ul className="space-y-1 text-sm">
                          {aiInsights.anomalies.map((a: string, i: number) => (
                            <li key={i} className="text-amber-600">⚠ {a}</li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}

                  {aiInsights.recommendations && (
                    <Card>
                      <CardHeader><CardTitle className="text-sm">Recommendations</CardTitle></CardHeader>
                      <CardContent>
                        <ul className="space-y-2 text-sm">
                          {aiInsights.recommendations.map((r: any, i: number) => (
                            <li key={i} className="flex items-start gap-2">
                              <Badge variant={r.priority === 'high' ? 'destructive' : 'outline'} className="text-xs">{r.priority ?? 'medium'}</Badge>
                              <span>{typeof r === 'string' ? r : r.action ?? r.recommendation ?? JSON.stringify(r)}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}

                  {aiInsights.risk_assessment != null && (
                    <Card>
                      <CardHeader><CardTitle className="text-sm">Risk Assessment</CardTitle></CardHeader>
                      <CardContent>
                        <div className="flex items-center gap-3">
                          <div className="text-3xl font-bold" style={{
                            color: (aiInsights.risk_assessment as number) > 70 ? '#ef4444' : (aiInsights.risk_assessment as number) > 40 ? '#f59e0b' : '#10b981'
                          }}>
                            {aiInsights.risk_assessment}
                          </div>
                          <div className="text-sm text-muted-foreground">/ 100</div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </>
              ) : (
                <Card><CardContent className="p-8 text-center text-muted-foreground">
                  <FileText className="h-10 w-10 mx-auto mb-2 opacity-40" />
                  AI insights unavailable for this period. Configure an LLM API key (e.g. Groq) in Settings → Multi-LLM Aggregator.
                </CardContent></Card>
              )}
            </TabsContent>

            {/* Archive tab */}
            <TabsContent value="archive" className="space-y-3">
              <Card>
                <CardHeader className="pb-3 flex-row items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2"><Archive className="h-4 w-4 text-[#0A0A0B]" /> Archived Reports ({archivedReports.length})</CardTitle>
                  <div className="flex items-center gap-2">
                    <Select value={archiveType} onValueChange={setArchiveType}>
                      <SelectTrigger className="w-44 h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ARCHIVE_TYPES.map((t) => <SelectItem key={t} value={t}>{t.replace(/_/g, ' ')}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Button size="sm" className="gap-1.5" onClick={() => generateArchive.mutate()} disabled={generateArchive.isPending}>
                      <Plus className="h-3.5 w-3.5" /> {generateArchive.isPending ? 'Generating…' : 'Generate & Save'}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground mb-3">
                    Permanent, point-in-time snapshots for compliance/audit — separate from the live report above.
                    Generating requires super admin access.
                  </p>
                  {archivedReports.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-8 text-center">No archived reports yet.</p>
                  ) : (
                    <div className="space-y-2 max-h-96 overflow-y-auto scroll-thin">
                      {archivedReports.map((r: any) => {
                        const metrics = (() => { try { return JSON.parse(r.metrics) } catch { return {} } })()
                        return (
                          <div key={r.id} className="rounded-lg border p-3">
                            <div className="flex items-center justify-between gap-2">
                              <div>
                                <p className="text-sm font-medium capitalize">{r.type.replace(/_/g, ' ')}</p>
                                <p className="text-xs text-muted-foreground">
                                  {r.scope} · {new Date(r.periodStart).toLocaleDateString()} → {new Date(r.periodEnd).toLocaleDateString()}
                                </p>
                              </div>
                              <Badge variant="outline" className="text-[10px] capitalize">{r.status}</Badge>
                            </div>
                            <div className="flex flex-wrap gap-2 mt-2">
                              {Object.entries(metrics).slice(0, 4).map(([k, v]: any) => (
                                typeof v === 'object' ? null : (
                                  <Badge key={k} variant="secondary" className="text-[10px]">
                                    {k}: {typeof v === 'number' ? v.toLocaleString() : String(v)}
                                  </Badge>
                                )
                              ))}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  )
}
