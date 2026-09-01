'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { FileText, Stethoscope, Bot, Loader2, Download, Play, Calendar, AlertTriangle, TrendingUp } from 'lucide-react'

const SCORE_COLORS: Record<string, string> = {
  critical: '#ef4444',
  high: '#f59e0b',
  medium: '#3b82f6',
  low: '#22c55e',
}

export function AiAdvisorHubView() {
  const qc = useQueryClient()
  const [tab, setTab] = useState('reports')
  const [reportOpen, setReportOpen] = useState(false)
  const [diagOpen, setDiagOpen] = useState(false)
  const [reportForm, setReportForm] = useState({ month: new Date().toISOString().slice(0, 7), language: 'en' })
  const [diagForm, setDiagForm] = useState({ businessName: '', website: '', industry: '' })

  const { data: reports } = useQuery({
    queryKey: ['monthly-reports'],
    queryFn: async () => {
      const res = await fetch('/api/reports/monthly')
      if (!res.ok) return { items: [] }
      return res.json()
    },
  })

  const { data: diagnostics } = useQuery({
    queryKey: ['diagnostics'],
    queryFn: async () => {
      const res = await fetch('/api/diagnostics')
      if (!res.ok) return { items: [] }
      return res.json()
    },
  })

  const generateReportMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch('/api/reports/monthly/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('generation failed')
      return res.json()
    },
    onSuccess: (data) => {
      toast.success(`Monthly report generated for ${data.report.month}`)
      qc.invalidateQueries({ queryKey: ['monthly-reports'] })
      setReportOpen(false)
    },
    onError: (e: any) => toast.error(String(e?.message ?? e)),
  })

  const runDiagnosticMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch('/api/diagnostics/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('diagnostic failed')
      return res.json()
    },
    onSuccess: (data) => {
      toast.success(`Diagnostic complete — Score: ${data.scores.overallScore}/100`)
      qc.invalidateQueries({ queryKey: ['diagnostics'] })
      setDiagOpen(false)
    },
    onError: (e: any) => toast.error(String(e?.message ?? e)),
  })

  const monthlyReports = reports?.items ?? []
  const diags = diagnostics?.items ?? []

  return (
    <div className="space-y-4 p-4 md:p-6 animate-fade-in-up">
      <div>
        <h2 className="text-base font-semibold flex items-center gap-2">
          <Bot className="h-5 w-5 text-violet-600" />
          AI Advisor Hub
        </h2>
        <p className="text-xs text-muted-foreground">Monthly reports, business diagnostics, and growth recommendations</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4">
            <FileText className="h-4 w-4 text-blue-600 mb-1" />
            <p className="text-2xl font-bold">{monthlyReports.length}</p>
            <p className="text-xs text-muted-foreground">Monthly Reports</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <Stethoscope className="h-4 w-4 text-violet-600 mb-1" />
            <p className="text-2xl font-bold">{diags.length}</p>
            <p className="text-xs text-muted-foreground">Diagnostics Run</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <TrendingUp className="h-4 w-4 text-emerald-600 mb-1" />
            <p className="text-2xl font-bold">{diags.length > 0 ? Math.round(diags.reduce((s: number, d: any) => s + (d.overallScore || 0), 0) / diags.length) : '—'}</p>
            <p className="text-xs text-muted-foreground">Avg Health Score</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="reports">Monthly Reports</TabsTrigger>
          <TabsTrigger value="diagnostics">Business Diagnostics</TabsTrigger>
        </TabsList>

        {/* Monthly Reports Tab */}
        <TabsContent value="reports" className="space-y-3">
          <div className="flex justify-end">
            <Dialog open={reportOpen} onOpenChange={setReportOpen}>
              <Button className="gap-2" onClick={() => setReportOpen(true)}>
                <FileText className="h-4 w-4" />
                Generate Report
              </Button>
              <DialogContent>
                <DialogHeader><DialogTitle>Generate Monthly Report</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div>
                    <Label>Month</Label>
                    <Input type="month" value={reportForm.month} onChange={(e) => setReportForm({ ...reportForm, month: e.target.value })} />
                  </div>
                  <div>
                    <Label>Language</Label>
                    <Select value={reportForm.language} onValueChange={(v) => setReportForm({ ...reportForm, language: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="fa">Persian (فارسی)</SelectItem>
                        <SelectItem value="ar">Arabic (العربية)</SelectItem>
                        <SelectItem value="de">German</SelectItem>
                        <SelectItem value="fr">French</SelectItem>
                        <SelectItem value="es">Spanish</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="ghost" onClick={() => setReportOpen(false)}>Cancel</Button>
                  <Button onClick={() => generateReportMutation.mutate(reportForm)} disabled={generateReportMutation.isPending}>
                    {generateReportMutation.isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Generating…</> : 'Generate'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {monthlyReports.length === 0 ? (
            <Card><CardContent className="p-12 text-center"><FileText className="h-10 w-10 mx-auto text-muted-foreground" /><p className="text-sm text-muted-foreground mt-2">No reports generated yet.</p></CardContent></Card>
          ) : (
            <div className="space-y-3">
              {monthlyReports.map((r: any) => (
                <Card key={r.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm">{r.title}</p>
                        <p className="text-xs text-muted-foreground">{r.month} · {r.language.toUpperCase()}</p>
                      </div>
                      <Badge variant="outline" className="capitalize shrink-0">{r.status}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-3">{r.executiveSummary}</p>
                    {r.metrics && (
                      <div className="mt-2 text-xs text-muted-foreground">
                        <span className="font-medium">Metrics:</span> {(() => { try { const m = JSON.parse(r.metrics); return `${m.leads} leads, ${m.deals} deals, $${m.revenue?.toLocaleString?.() ?? 0} revenue`; } catch { return '—'; } })()}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Diagnostics Tab */}
        <TabsContent value="diagnostics" className="space-y-3">
          <div className="flex justify-end">
            <Dialog open={diagOpen} onOpenChange={setDiagOpen}>
              <Button className="gap-2" onClick={() => setDiagOpen(true)}>
                <Stethoscope className="h-4 w-4" />
                Run Diagnostic
              </Button>
              <DialogContent>
                <DialogHeader><DialogTitle>Business Diagnostic</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div>
                    <Label>Business Name</Label>
                    <Input value={diagForm.businessName} onChange={(e) => setDiagForm({ ...diagForm, businessName: e.target.value })} />
                  </div>
                  <div>
                    <Label>Website (optional)</Label>
                    <Input value={diagForm.website} onChange={(e) => setDiagForm({ ...diagForm, website: e.target.value })} dir="ltr" />
                  </div>
                  <div>
                    <Label>Industry (optional)</Label>
                    <Input value={diagForm.industry} onChange={(e) => setDiagForm({ ...diagForm, industry: e.target.value })} />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="ghost" onClick={() => setDiagOpen(false)}>Cancel</Button>
                  <Button onClick={() => runDiagnosticMutation.mutate(diagForm)} disabled={!diagForm.businessName || runDiagnosticMutation.isPending}>
                    {runDiagnosticMutation.isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Analyzing…</> : 'Run Diagnostic'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {diags.length === 0 ? (
            <Card><CardContent className="p-12 text-center"><Stethoscope className="h-10 w-10 mx-auto text-muted-foreground" /><p className="text-sm text-muted-foreground mt-2">No diagnostics run yet.</p></CardContent></Card>
          ) : (
            <div className="space-y-3">
              {diags.map((d: any) => (
                <Card key={d.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm">{d.businessName}</p>
                        <p className="text-xs text-muted-foreground">{d.industry || 'Unknown industry'}</p>
                      </div>
                      <div className="text-center shrink-0">
                        <p className="text-3xl font-bold" style={{ color: (d.overallScore || 0) >= 75 ? '#22c55e' : (d.overallScore || 0) >= 50 ? '#f59e0b' : '#ef4444' }}>{d.overallScore}</p>
                        <p className="text-[10px] text-muted-foreground">/ 100</p>
                      </div>
                    </div>
                    {/* Score bars */}
                    <div className="grid grid-cols-5 gap-2 text-center text-[10px] mb-3">
                      <ScoreCell label="Mkt" value={d.marketingScore} />
                      <ScoreCell label="Sales" value={d.salesScore} />
                      <ScoreCell label="Digital" value={d.digitalPresenceScore} />
                      <ScoreCell label="CSAT" value={d.customerSatisfactionScore} />
                      <ScoreCell label="Ops" value={d.operationalScore} />
                    </div>
                    {d.summary && <p className="text-sm text-muted-foreground">{d.summary}</p>}
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

function ScoreCell({ label, value }: { label: string; value: number | null }) {
  const v = value || 0
  const color = v >= 75 ? '#22c55e' : v >= 50 ? '#f59e0b' : '#ef4444'
  return (
    <div>
      <p className="text-muted-foreground">{label}</p>
      <p className="font-bold" style={{ color }}>{v}</p>
    </div>
  )
}
