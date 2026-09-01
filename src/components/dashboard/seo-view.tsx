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
import { Plus, Globe, Search, AlertTriangle, CheckCircle2, Link2, Loader2, TrendingUp } from 'lucide-react'
import { useState } from 'react'

const SEVERITY_COLORS: Record<string, string> = {
  info: '#3b82f6',
  warning: '#f59e0b',
  error: '#ef4444',
  critical: '#dc2626',
}

export function SeoView() {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ name: '', domain: '' })

  const { data, isLoading } = useQuery({
    queryKey: ['seo-projects'],
    queryFn: async () => {
      const res = await fetch('/api/seo')
      if (!res.ok) throw new Error('failed')
      return res.json()
    },
  })

  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch('/api/seo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('create failed')
      return res.json()
    },
    onSuccess: () => {
      toast.success('SEO project created')
      qc.invalidateQueries({ queryKey: ['seo-projects'] })
      setOpen(false)
      setForm({ name: '', domain: '' })
    },
  })

  const crawlMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/seo/${id}/crawl`, { method: 'POST' })
      if (!res.ok) throw new Error('crawl failed')
      return res.json()
    },
    onSuccess: (data) => {
      toast.success(`Crawl completed: ${data.pagesCrawled} pages, ${data.issuesFound} issues found`)
      qc.invalidateQueries({ queryKey: ['seo-projects'] })
    },
    onError: (e: any) => toast.error(String(e?.message ?? e)),
  })

  const projects = data?.items ?? []

  return (
    <div className="space-y-4 p-4 md:p-6 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold flex items-center gap-2">
            <Search className="h-5 w-5 text-blue-600" />
            SEO Platform
          </h2>
          <p className="text-xs text-muted-foreground">Crawl websites, track keywords, monitor backlinks</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add Website
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add SEO Project</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Project Name</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="My Website" />
              </div>
              <div>
                <Label>Domain</Label>
                <Input value={form.domain} onChange={(e) => setForm({ ...form, domain: e.target.value })} placeholder="example.com" dir="ltr" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={() => createMutation.mutate(form)} disabled={!form.name || !form.domain || createMutation.isPending}>
                {createMutation.isPending ? 'Creating…' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid gap-3 md:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-48 w-full" />)}
        </div>
      ) : projects.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Globe className="h-10 w-10 mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground mt-2">No SEO projects yet. Add your first website to start tracking.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {projects.map((p: any) => {
            const issues = p.issues ?? []
            const pages = p.pages ?? []
            const keywords = p.keywords ?? []
            const backlinks = p.backlinks ?? []
            const unresolvedIssues = issues.filter((i: any) => !i.resolved).length
            const avgScore = pages.length > 0 ? Math.round(pages.reduce((s: number, pg: any) => s + (pg.score || 0), 0) / pages.length) : 0

            return (
              <Card key={p.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{p.name}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1" dir="ltr">
                        <Globe className="h-3 w-3" />
                        {p.domain}
                      </p>
                    </div>
                    <Button size="sm" variant="default" className="gap-1.5" onClick={() => crawlMutation.mutate(p.id)} disabled={crawlMutation.isPending}>
                      {crawlMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
                      Crawl
                    </Button>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-4 gap-2 mt-3 text-center">
                    <div className="rounded-md bg-muted/50 p-2">
                      <TrendingUp className="h-3 w-3 mx-auto text-emerald-600" />
                      <p className="font-semibold text-sm mt-1">{avgScore}</p>
                      <p className="text-[9px] text-muted-foreground">Score</p>
                    </div>
                    <div className="rounded-md bg-muted/50 p-2">
                      <Globe className="h-3 w-3 mx-auto text-blue-600" />
                      <p className="font-semibold text-sm mt-1">{pages.length}</p>
                      <p className="text-[9px] text-muted-foreground">Pages</p>
                    </div>
                    <div className="rounded-md bg-muted/50 p-2">
                      <AlertTriangle className="h-3 w-3 mx-auto text-amber-600" />
                      <p className="font-semibold text-sm mt-1">{unresolvedIssues}</p>
                      <p className="text-[9px] text-muted-foreground">Issues</p>
                    </div>
                    <div className="rounded-md bg-muted/50 p-2">
                      <Link2 className="h-3 w-3 mx-auto text-violet-600" />
                      <p className="font-semibold text-sm mt-1">{backlinks.length}</p>
                      <p className="text-[9px] text-muted-foreground">Backlinks</p>
                    </div>
                  </div>

                  {/* Recent Issues */}
                  {issues.length > 0 && (
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-xs text-muted-foreground mb-2">Recent Issues</p>
                      <div className="space-y-1 max-h-32 overflow-y-auto scroll-thin">
                        {issues.slice(0, 5).map((issue: any) => (
                          <div key={issue.id} className="flex items-center gap-2 text-xs">
                            <span className="h-2 w-2 rounded-full shrink-0" style={{ background: SEVERITY_COLORS[issue.severity] ?? '#94a3b8' }} />
                            <span className="truncate flex-1">{issue.message}</span>
                            {issue.resolved && <CheckCircle2 className="h-3 w-3 text-emerald-600 shrink-0" />}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {p.lastCrawlAt && (
                    <p className="text-[10px] text-muted-foreground mt-2">
                      Last crawl: {new Date(p.lastCrawlAt).toLocaleString()}
                    </p>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
