'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
import { toast } from 'sonner'
import { Plus, FlaskConical, FileCode2, TrendingUp, Loader2, Trophy } from 'lucide-react'
import { useState } from 'react'

export function GrowthView() {
  const qc = useQueryClient()
  const [tab, setTab] = useState('experiments')
  const [expOpen, setExpOpen] = useState(false)
  const [pageOpen, setPageOpen] = useState(false)
  const [expForm, setExpForm] = useState({ name: '', description: '', controlData: '', variantData: '', trafficSplit: '50' })
  const [pageForm, setPageForm] = useState({ name: '', slug: '', html: '', metaTitle: '', metaDescription: '' })

  const { data: experiments } = useQuery({
    queryKey: ['ab-experiments'],
    queryFn: async () => {
      const res = await fetch('/api/ab-testing/experiments')
      if (!res.ok) return { items: [] }
      return res.json()
    },
  })

  const { data: pages } = useQuery({
    queryKey: ['landing-pages'],
    queryFn: async () => {
      const res = await fetch('/api/landing-pages')
      if (!res.ok) return { items: [] }
      return res.json()
    },
  })

  const createExpMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch('/api/ab-testing/experiments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, trafficSplit: Number(payload.trafficSplit) }),
      })
      if (!res.ok) throw new Error('create failed')
      return res.json()
    },
    onSuccess: () => {
      toast.success('Experiment created')
      qc.invalidateQueries({ queryKey: ['ab-experiments'] })
      setExpOpen(false)
      setExpForm({ name: '', description: '', controlData: '', variantData: '', trafficSplit: '50' })
    },
  })

  const createPageMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch('/api/landing-pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('create failed')
      return res.json()
    },
    onSuccess: () => {
      toast.success('Landing page created')
      qc.invalidateQueries({ queryKey: ['landing-pages'] })
      setPageOpen(false)
      setPageForm({ name: '', slug: '', html: '', metaTitle: '', metaDescription: '' })
    },
  })

  const exps = experiments?.items ?? []
  const landingPages = pages?.items ?? []

  return (
    <div className="space-y-4 p-4 md:p-6 animate-fade-in-up">
      <div>
        <h2 className="text-base font-semibold flex items-center gap-2">
          <FlaskConical className="h-5 w-5 text-amber-600" />
          Growth & Optimization
        </h2>
        <p className="text-xs text-muted-foreground">A/B testing experiments and landing page builder</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <FlaskConical className="h-4 w-4 text-amber-600 mb-1" />
            <p className="text-2xl font-bold">{exps.length}</p>
            <p className="text-xs text-muted-foreground">Experiments</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <Trophy className="h-4 w-4 text-emerald-600 mb-1" />
            <p className="text-2xl font-bold">{exps.filter((e: any) => e.winner).length}</p>
            <p className="text-xs text-muted-foreground">Completed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <FileCode2 className="h-4 w-4 text-blue-600 mb-1" />
            <p className="text-2xl font-bold">{landingPages.length}</p>
            <p className="text-xs text-muted-foreground">Landing Pages</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <TrendingUp className="h-4 w-4 text-violet-600 mb-1" />
            <p className="text-2xl font-bold">{landingPages.filter((p: any) => p.status === 'published').length}</p>
            <p className="text-xs text-muted-foreground">Published</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="experiments">A/B Experiments</TabsTrigger>
          <TabsTrigger value="pages">Landing Pages</TabsTrigger>
        </TabsList>

        {/* Experiments Tab */}
        <TabsContent value="experiments" className="space-y-3">
          <div className="flex justify-end">
            <Dialog open={expOpen} onOpenChange={setExpOpen}>
              <Button className="gap-2" onClick={() => setExpOpen(true)}>
                <Plus className="h-4 w-4" /> New Experiment
              </Button>
              <DialogContent>
                <DialogHeader><DialogTitle>Create A/B Experiment</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div>
                    <Label>Experiment Name</Label>
                    <Input value={expForm.name} onChange={(e) => setExpForm({ ...expForm, name: e.target.value })} placeholder="Homepage CTA Test" />
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Textarea rows={2} value={expForm.description} onChange={(e) => setExpForm({ ...expForm, description: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label>Control (JSON)</Label>
                      <Textarea rows={3} value={expForm.controlData} onChange={(e) => setExpForm({ ...expForm, controlData: e.target.value })} placeholder='{"cta":"Sign Up"}' dir="ltr" />
                    </div>
                    <div>
                      <Label>Variant (JSON)</Label>
                      <Textarea rows={3} value={expForm.variantData} onChange={(e) => setExpForm({ ...expForm, variantData: e.target.value })} placeholder='{"cta":"Get Started Free"}' dir="ltr" />
                    </div>
                  </div>
                  <div>
                    <Label>Traffic Split to Variant (%)</Label>
                    <Input type="number" min={1} max={99} value={expForm.trafficSplit} onChange={(e) => setExpForm({ ...expForm, trafficSplit: e.target.value })} />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="ghost" onClick={() => setExpOpen(false)}>Cancel</Button>
                  <Button onClick={() => createExpMutation.mutate(expForm)} disabled={!expForm.name || createExpMutation.isPending}>
                    {createExpMutation.isPending ? 'Creating…' : 'Create'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {exps.length === 0 ? (
            <Card><CardContent className="p-12 text-center"><FlaskConical className="h-10 w-10 mx-auto text-muted-foreground" /><p className="text-sm text-muted-foreground mt-2">No experiments yet.</p></CardContent></Card>
          ) : (
            <div className="space-y-3">
              {exps.map((exp: any) => (
                <Card key={exp.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm">{exp.name}</p>
                        {exp.description && <p className="text-xs text-muted-foreground">{exp.description}</p>}
                      </div>
                      <Badge variant="outline" className="capitalize shrink-0">{exp.status}</Badge>
                    </div>
                    {/* Results */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-md border p-2">
                        <p className="text-xs text-muted-foreground mb-1">{exp.controlName}</p>
                        <div className="flex items-center justify-between text-sm">
                          <span>{exp.controlVisitors} visitors</span>
                          <span className="font-medium">{exp.controlConversions} conv</span>
                        </div>
                        {exp.controlConversionRate != null && (
                          <Progress value={exp.controlConversionRate} className="h-1 mt-1" />
                        )}
                      </div>
                      <div className="rounded-md border p-2">
                        <p className="text-xs text-muted-foreground mb-1">{exp.variantName}</p>
                        <div className="flex items-center justify-between text-sm">
                          <span>{exp.variantVisitors} visitors</span>
                          <span className="font-medium">{exp.variantConversions} conv</span>
                        </div>
                        {exp.variantConversionRate != null && (
                          <Progress value={exp.variantConversionRate} className="h-1 mt-1" />
                        )}
                      </div>
                    </div>
                    {exp.winner && (
                      <div className="mt-2 flex items-center gap-2 text-xs">
                        <Trophy className="h-3.5 w-3.5 text-amber-600" />
                        <span>Winner: <span className="font-medium capitalize">{exp.winner}</span></span>
                        {exp.confidenceLevel != null && <span className="text-muted-foreground">({Math.round(exp.confidenceLevel)}% confidence)</span>}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Landing Pages Tab */}
        <TabsContent value="pages" className="space-y-3">
          <div className="flex justify-end">
            <Dialog open={pageOpen} onOpenChange={setPageOpen}>
              <Button className="gap-2" onClick={() => setPageOpen(true)}>
                <Plus className="h-4 w-4" /> New Landing Page
              </Button>
              <DialogContent>
                <DialogHeader><DialogTitle>Create Landing Page</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label>Name</Label>
                      <Input value={pageForm.name} onChange={(e) => setPageForm({ ...pageForm, name: e.target.value })} placeholder="Q4 Promo" />
                    </div>
                    <div>
                      <Label>Slug</Label>
                      <Input value={pageForm.slug} onChange={(e) => setPageForm({ ...pageForm, slug: e.target.value })} placeholder="q4-promo" dir="ltr" />
                    </div>
                  </div>
                  <div>
                    <Label>HTML</Label>
                    <Textarea rows={5} value={pageForm.html} onChange={(e) => setPageForm({ ...pageForm, html: e.target.value })} placeholder="<h1>Welcome</h1><p>...</p>" dir="ltr" className="font-mono text-xs" />
                  </div>
                  <div>
                    <Label>Meta Title</Label>
                    <Input value={pageForm.metaTitle} onChange={(e) => setPageForm({ ...pageForm, metaTitle: e.target.value })} />
                  </div>
                  <div>
                    <Label>Meta Description</Label>
                    <Input value={pageForm.metaDescription} onChange={(e) => setPageForm({ ...pageForm, metaDescription: e.target.value })} />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="ghost" onClick={() => setPageOpen(false)}>Cancel</Button>
                  <Button onClick={() => createPageMutation.mutate(pageForm)} disabled={!pageForm.name || !pageForm.slug || createPageMutation.isPending}>
                    {createPageMutation.isPending ? 'Creating…' : 'Create'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {landingPages.length === 0 ? (
            <Card><CardContent className="p-12 text-center"><FileCode2 className="h-10 w-10 mx-auto text-muted-foreground" /><p className="text-sm text-muted-foreground mt-2">No landing pages yet.</p></CardContent></Card>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {landingPages.map((p: any) => (
                <Card key={p.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm truncate">{p.name}</p>
                        <p className="text-xs text-muted-foreground" dir="ltr">/{p.slug}</p>
                      </div>
                      <Badge variant="outline" className="capitalize shrink-0">{p.status}</Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div><p className="text-muted-foreground">Visitors</p><p className="font-semibold">{p.visitors}</p></div>
                      <div><p className="text-muted-foreground">Conv.</p><p className="font-semibold">{p.conversions}</p></div>
                      <div><p className="text-muted-foreground">Rate</p><p className="font-semibold">{p.conversionRate ? p.conversionRate.toFixed(1) + '%' : '—'}</p></div>
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
