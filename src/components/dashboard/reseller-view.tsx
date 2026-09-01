'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import {
  Package, DollarSign, TrendingUp, Clock, AlertTriangle, Check,
  Star, Zap, Target, ChevronRight, Award, Megaphone,
} from 'lucide-react'
import { useState } from 'react'

const RISK_COLORS: Record<string, string> = { low: '#22c55e', medium: '#f59e0b', high: '#ef4444', very_high: '#dc2626' }

export function ResellerView() {
  const qc = useQueryClient()
  const [selectedOpp, setSelectedOpp] = useState<any>(null)
  const [applyForm, setApplyForm] = useState({ applicantName: '', applicantEmail: '', applicantPhone: '', businessName: '', plannedInvestment: '', plannedTimeline: '3 months', experience: 'beginner', agreedTerms: false })

  const { data, isLoading } = useQuery({
    queryKey: ['reseller-opportunities'],
    queryFn: async () => {
      const res = await fetch('/api/reseller/opportunities')
      if (!res.ok) return { opportunities: [], myApplications: [] }
      return res.json()
    },
  })

  const applyMutation = useMutation({
    mutationFn: async ({ id, form }: { id: string; form: any }) => {
      const res = await fetch(`/api/reseller/opportunities/${id}/apply`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, plannedInvestment: Number(form.plannedInvestment || 0) }),
      })
      if (!res.ok) {
        const e = await res.json().catch(() => ({}))
        throw new Error(e.error || 'apply failed')
      }
      return res.json()
    },
    onSuccess: () => {
      toast.success('Application submitted! We\'ll review and get back to you.')
      qc.invalidateQueries({ queryKey: ['reseller-opportunities'] })
      setSelectedOpp(null)
      setApplyForm({ applicantName: '', applicantEmail: '', applicantPhone: '', businessName: '', plannedInvestment: '', plannedTimeline: '3 months', experience: 'beginner', agreedTerms: false })
    },
    onError: (e: any) => toast.error(String(e?.message ?? e)),
  })

  const opportunities = data?.opportunities ?? []
  const myApplications = data?.myApplications ?? []

  return (
    <div className="space-y-4 p-4 md:p-6 animate-fade-in-up">
      <div>
        <h2 className="text-base font-semibold flex items-center gap-2">
          <Package className="h-5 w-5 text-[#FF5722]" />
          Reseller Opportunities
        </h2>
        <p className="text-xs text-muted-foreground">Become a reseller — see costs, risks, profit estimates, and apply directly</p>
      </div>

      {/* My Applications */}
      {myApplications.length > 0 && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><Award className="h-4 w-4 text-[#0A2A3A]" /> My Applications ({myApplications.length})</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {myApplications.map((app: any) => (
                <div key={app.id} className="flex items-center justify-between p-2 rounded-md bg-muted/30">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{app.opportunity?.icon}</span>
                    <div>
                      <p className="text-sm font-medium">{app.opportunity?.title}</p>
                      <p className="text-[10px] text-muted-foreground">Applied: {new Date(app.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="capitalize" style={{ background: app.status === 'approved' || app.status === 'active' ? '#22c55e20' : app.status === 'rejected' ? '#ef444420' : '#f59e0b20', color: app.status === 'approved' || app.status === 'active' ? '#22c55e' : app.status === 'rejected' ? '#ef4444' : '#f59e0b' }}>{app.status}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Opportunities Grid */}
      {isLoading ? (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-48 bg-muted animate-pulse rounded-xl" />)}</div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {opportunities.map((opp: any) => (
            <Card key={opp.id} className="hover:shadow-xl transition-all cursor-pointer group" onClick={() => setSelectedOpp(opp)}>
              <CardContent className="p-4">
                {/* Header */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="grid place-items-center h-12 w-12 rounded-xl text-2xl shadow-md" style={{ background: opp.color + '22' }}>{opp.icon}</div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm group-hover:text-[#FF5722] transition-colors">{opp.title}</p>
                      <Badge variant="outline" className="text-[9px] capitalize mt-0.5">{opp.type.replace('_', ' ')}</Badge>
                    </div>
                  </div>
                  {opp.isFeatured && <Badge className="text-[9px] bg-[#FF5722]">Featured</Badge>}
                </div>

                {/* Description */}
                <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{opp.description}</p>

                {/* Key metrics */}
                <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                  <div className="rounded-md bg-muted/50 p-2"><DollarSign className="h-3 w-3 text-[#0A2A3A] mb-0.5" /><p className="font-medium">${opp.initialInvestment}</p><p className="text-[9px] text-muted-foreground">Initial Investment</p></div>
                  <div className="rounded-md bg-muted/50 p-2"><TrendingUp className="h-3 w-3 text-emerald-600 mb-0.5" /><p className="font-medium text-emerald-600">${opp.monthlyProfitMin}-${opp.monthlyProfitMax}</p><p className="text-[9px] text-muted-foreground">Monthly Profit</p></div>
                  <div className="rounded-md bg-muted/50 p-2"><Clock className="h-3 w-3 text-amber-600 mb-0.5" /><p className="font-medium">{opp.breakEvenMonths} months</p><p className="text-[9px] text-muted-foreground">Break-even</p></div>
                  <div className="rounded-md bg-muted/50 p-2"><AlertTriangle className="h-3 w-3 mb-0.5" style={{ color: RISK_COLORS[opp.riskLevel] }} /><p className="font-medium capitalize" style={{ color: RISK_COLORS[opp.riskLevel] }}>{opp.riskLevel}</p><p className="text-[9px] text-muted-foreground">Risk Level</p></div>
                </div>

                {/* CTA */}
                <Button size="sm" variant="outline" className="w-full gap-1.5 group-hover:bg-[#0A2A3A] group-hover:text-white transition-colors">
                  View Details & Apply <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Detail + Apply Dialog */}
      {selectedOpp && (
        <Dialog open onOpenChange={(o) => !o && setSelectedOpp(null)}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto scroll-thin">
            <DialogHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="grid place-items-center h-12 w-12 rounded-xl text-2xl shadow-md" style={{ background: selectedOpp.color + '22' }}>{selectedOpp.icon}</div>
                <div>
                  <DialogTitle>{selectedOpp.title}</DialogTitle>
                  <Badge variant="outline" className="text-[10px] capitalize">{selectedOpp.type.replace('_', ' ')}</Badge>
                </div>
              </div>
            </DialogHeader>

            {/* Description */}
            <p className="text-sm text-muted-foreground">{selectedOpp.description}</p>

            {/* Investment & Profit */}
            <div className="grid grid-cols-4 gap-3">
              <div className="rounded-lg bg-muted/50 p-3 text-center"><DollarSign className="h-4 w-4 mx-auto text-[#0A2A3A] mb-1" /><p className="text-lg font-bold">${selectedOpp.initialInvestment}</p><p className="text-[10px] text-muted-foreground">Initial Cost</p></div>
              <div className="rounded-lg bg-muted/50 p-3 text-center"><DollarSign className="h-4 w-4 mx-auto text-amber-600 mb-1" /><p className="text-lg font-bold">${selectedOpp.monthlyCostMin}-${selectedOpp.monthlyCostMax}</p><p className="text-[10px] text-muted-foreground">Monthly Cost</p></div>
              <div className="rounded-lg bg-muted/50 p-3 text-center"><TrendingUp className="h-4 w-4 mx-auto text-emerald-600 mb-1" /><p className="text-lg font-bold text-emerald-600">${selectedOpp.monthlyProfitMin}-${selectedOpp.monthlyProfitMax}</p><p className="text-[10px] text-muted-foreground">Monthly Profit</p></div>
              <div className="rounded-lg bg-muted/50 p-3 text-center"><Clock className="h-4 w-4 mx-auto text-amber-600 mb-1" /><p className="text-lg font-bold">{selectedOpp.breakEvenMonths}mo</p><p className="text-[10px] text-muted-foreground">Break-even</p></div>
            </div>

            {/* Risk */}
            <div className="rounded-lg border p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium flex items-center gap-1.5"><AlertTriangle className="h-4 w-4" style={{ color: RISK_COLORS[selectedOpp.riskLevel] }} /> Risk Assessment</span>
                <Badge variant="outline" className="capitalize" style={{ background: RISK_COLORS[selectedOpp.riskLevel] + '20', color: RISK_COLORS[selectedOpp.riskLevel] }}>{selectedOpp.riskLevel}</Badge>
              </div>
              <Progress value={selectedOpp.riskScore} className="h-2 mb-2" />
              {selectedOpp.riskFactors && (
                <div className="flex flex-wrap gap-1.5">
                  {JSON.parse(selectedOpp.riskFactors).map((f: string, i: number) => (
                    <Badge key={i} variant="outline" className="text-[10px]">{f}</Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Pros & Cons */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs font-medium text-emerald-600 mb-2">✓ Pros</p>
                <div className="space-y-1">
                  {JSON.parse(selectedOpp.pros || '[]').map((p: string, i: number) => (
                    <div key={i} className="flex items-start gap-2 text-xs"><Check className="h-3 w-3 text-emerald-600 mt-0.5 shrink-0" />{p}</div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-red-500 mb-2">✗ Cons</p>
                <div className="space-y-1">
                  {JSON.parse(selectedOpp.cons || '[]').map((c: string, i: number) => (
                    <div key={i} className="flex items-start gap-2 text-xs"><AlertTriangle className="h-3 w-3 text-red-500 mt-0.5 shrink-0" />{c}</div>
                  ))}
                </div>
              </div>
            </div>

            {/* Requirements */}
            {selectedOpp.requirements && (
              <div>
                <p className="text-xs font-medium mb-2">📋 Requirements</p>
                <div className="flex flex-wrap gap-1.5">
                  {JSON.parse(selectedOpp.requirements).map((r: string, i: number) => (
                    <Badge key={i} variant="secondary" className="text-[10px]">{r}</Badge>
                  ))}
                </div>
              </div>
            )}

            <Separator />

            {/* Application Form */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium flex items-center gap-2"><Target className="h-4 w-4 text-[#FF5722]" /> Apply for This Opportunity</h4>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Your Name</Label><Input value={applyForm.applicantName} onChange={(e) => setApplyForm({ ...applyForm, applicantName: e.target.value })} /></div>
                <div><Label>Email</Label><Input type="email" value={applyForm.applicantEmail} onChange={(e) => setApplyForm({ ...applyForm, applicantEmail: e.target.value })} dir="ltr" /></div>
                <div><Label>Phone (optional)</Label><Input value={applyForm.applicantPhone} onChange={(e) => setApplyForm({ ...applyForm, applicantPhone: e.target.value })} dir="ltr" /></div>
                <div><Label>Business Name (optional)</Label><Input value={applyForm.businessName} onChange={(e) => setApplyForm({ ...applyForm, businessName: e.target.value })} /></div>
                <div><Label>Planned Investment ($)</Label><Input type="number" value={applyForm.plannedInvestment} onChange={(e) => setApplyForm({ ...applyForm, plannedInvestment: e.target.value })} dir="ltr" /></div>
                <div><Label>Experience</Label><Select value={applyForm.experience} onValueChange={(v) => setApplyForm({ ...applyForm, experience: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="beginner">Beginner</SelectItem><SelectItem value="intermediate">Intermediate</SelectItem><SelectItem value="experienced">Experienced</SelectItem></SelectContent></Select></div>
              </div>
              <label className="flex items-center gap-2 text-xs">
                <input type="checkbox" checked={applyForm.agreedTerms} onChange={(e) => setApplyForm({ ...applyForm, agreedTerms: e.target.checked })} />
                I agree to the terms and conditions of this reseller opportunity
              </label>
            </div>

            <DialogFooter>
              <Button variant="ghost" onClick={() => setSelectedOpp(null)}>Cancel</Button>
              <Button className="gap-2 bg-[#FF5722] hover:bg-[#FF7043]" onClick={() => applyMutation.mutate({ id: selectedOpp.id, form: applyForm })} disabled={!applyForm.applicantName || !applyForm.applicantEmail || !applyForm.agreedTerms || applyMutation.isPending}>
                {applyMutation.isPending ? 'Submitting…' : <><Zap className="h-4 w-4" /> Apply & Start Earning</>}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

function Separator() {
  return <div className="h-px bg-border my-3" />
}
