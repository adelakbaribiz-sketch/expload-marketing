'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Plus, Ear, TrendingUp, AlertCircle, Globe, MessageSquare, Newspaper, MessageCircle } from 'lucide-react'
import { useState } from 'react'

const PLATFORM_ICONS: Record<string, any> = {
  twitter: MessageCircle,
  reddit: MessageSquare,
  news: Newspaper,
  blogs: Globe,
  forums: MessageSquare,
  review_sites: AlertCircle,
}

const SENTIMENT_COLORS: Record<string, string> = {
  positive: '#22c55e',
  neutral: '#64748b',
  negative: '#ef4444',
}

export function SocialListeningView() {
  const qc = useQueryClient()
  const [tab, setTab] = useState('mentions')
  const [open, setOpen] = useState(false)
  const [keyword, setKeyword] = useState('')

  const { data: mentions } = useQuery({
    queryKey: ['brand-mentions'],
    queryFn: async () => {
      const res = await fetch('/api/social-listening/mentions')
      if (!res.ok) return { items: [] }
      return res.json()
    },
  })

  const { data: keywords } = useQuery({
    queryKey: ['brand-keywords'],
    queryFn: async () => {
      const res = await fetch('/api/social-listening/keywords')
      if (!res.ok) return { items: [] }
      return res.json()
    },
  })

  const addKeywordMutation = useMutation({
    mutationFn: async (kw: string) => {
      const res = await fetch('/api/social-listening/keywords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword: kw }),
      })
      if (!res.ok) throw new Error('add failed')
      return res.json()
    },
    onSuccess: () => {
      toast.success('Keyword added')
      qc.invalidateQueries({ queryKey: ['brand-keywords'] })
      setOpen(false)
      setKeyword('')
    },
  })

  const updateMentionMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await fetch(`/api/social-listening/mentions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) throw new Error('update failed')
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['brand-mentions'] })
    },
  })

  const allMentions = mentions?.items ?? []
  const allKeywords = keywords?.items ?? []
  const positiveMentions = allMentions.filter((m: any) => m.sentiment === 'positive').length
  const negativeMentions = allMentions.filter((m: any) => m.sentiment === 'negative').length
  const newMentions = allMentions.filter((m: any) => m.status === 'new').length

  return (
    <div className="space-y-4 p-4 md:p-6 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold flex items-center gap-2">
            <Ear className="h-5 w-5 text-cyan-600" />
            Social Listening
          </h2>
          <p className="text-xs text-muted-foreground">Monitor brand mentions across the web and social media</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Track Keyword
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Track a Keyword</DialogTitle></DialogHeader>
            <div>
              <Label>Keyword or Brand Name</Label>
              <Input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="Your Brand Name" />
              <p className="text-[11px] text-muted-foreground mt-1">We'll monitor mentions of this keyword across social media, news, blogs, and review sites.</p>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={() => addKeywordMutation.mutate(keyword)} disabled={!keyword || addKeywordMutation.isPending}>
                {addKeywordMutation.isPending ? 'Adding…' : 'Start Tracking'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <Ear className="h-4 w-4 text-cyan-600 mb-1" />
            <p className="text-2xl font-bold">{allMentions.length}</p>
            <p className="text-xs text-muted-foreground">Total Mentions</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <TrendingUp className="h-4 w-4 text-emerald-600 mb-1" />
            <p className="text-2xl font-bold">{positiveMentions}</p>
            <p className="text-xs text-muted-foreground">Positive</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <AlertCircle className="h-4 w-4 text-red-600 mb-1" />
            <p className="text-2xl font-bold">{negativeMentions}</p>
            <p className="text-xs text-muted-foreground">Negative</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <MessageCircle className="h-4 w-4 text-amber-600 mb-1" />
            <p className="text-2xl font-bold">{newMentions}</p>
            <p className="text-xs text-muted-foreground">New / Unread</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="mentions">Mentions</TabsTrigger>
          <TabsTrigger value="keywords">Tracked Keywords</TabsTrigger>
        </TabsList>

        {/* Mentions Tab */}
        <TabsContent value="mentions" className="space-y-3">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm">Recent Mentions ({allMentions.length})</CardTitle></CardHeader>
            <CardContent>
              {allMentions.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">No mentions found yet. Add a keyword to start monitoring.</p>
              ) : (
                <div className="space-y-2 max-h-[500px] overflow-y-auto scroll-thin">
                  {allMentions.map((m: any) => {
                    const Icon = PLATFORM_ICONS[m.platform] ?? Globe
                    return (
                      <div key={m.id} className={`rounded-lg border p-3 ${m.status === 'new' ? 'border-amber-500/30 bg-amber-500/5' : ''}`}>
                        <div className="flex items-start gap-3">
                          <div className="grid place-items-center h-8 w-8 rounded-md bg-muted shrink-0">
                            <Icon className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <Badge variant="outline" className="text-[10px] capitalize">{m.platform}</Badge>
                              {m.sentiment && (
                                <Badge variant="outline" className="text-[10px] capitalize" style={{ background: (SENTIMENT_COLORS[m.sentiment] ?? '#64748b') + '20', color: SENTIMENT_COLORS[m.sentiment] ?? '#64748b' }}>
                                  {m.sentiment}
                                </Badge>
                              )}
                              <Badge variant="secondary" className="text-[10px] capitalize">{m.status}</Badge>
                              {m.isFlagged && <Badge variant="destructive" className="text-[10px]">Flagged</Badge>}
                            </div>
                            <p className="text-sm line-clamp-2">{m.snippet}</p>
                            <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground">
                              {m.author && <span>by {m.author}</span>}
                              <span>{new Date(m.mentionedAt).toLocaleDateString()}</span>
                              {m.reach && <span>Reach: {m.reach.toLocaleString()}</span>}
                              {m.url && <a href={m.url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">View source</a>}
                            </div>
                          </div>
                          {m.status === 'new' && (
                            <Button size="sm" variant="ghost" className="text-xs h-7 shrink-0" onClick={() => updateMentionMutation.mutate({ id: m.id, status: 'read' })}>
                              Mark Read
                            </Button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Keywords Tab */}
        <TabsContent value="keywords" className="space-y-3">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm">Tracked Keywords ({allKeywords.length})</CardTitle></CardHeader>
            <CardContent>
              {allKeywords.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">No keywords tracked yet. Click "Track Keyword" to start monitoring.</p>
              ) : (
                <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                  {allKeywords.map((kw: any) => (
                    <div key={kw.id} className="rounded-lg border p-3">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-medium text-sm" dir="ltr">"{kw.keyword}"</p>
                        <Badge variant={kw.isActive ? 'default' : 'secondary'} className="text-[10px]">{kw.isActive ? 'Active' : 'Paused'}</Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center text-xs">
                        <div><p className="font-semibold">{kw.totalMentions}</p><p className="text-muted-foreground">Mentions</p></div>
                        <div><p className="font-semibold">{kw.alertOnNegative ? 'ON' : 'OFF'}</p><p className="text-muted-foreground">Neg Alert</p></div>
                        <div><p className="font-semibold">{kw.alertOnPositive ? 'ON' : 'OFF'}</p><p className="text-muted-foreground">Pos Alert</p></div>
                      </div>
                      {kw.lastChecked && (
                        <p className="text-[10px] text-muted-foreground mt-2">Last checked: {new Date(kw.lastChecked).toLocaleString()}</p>
                      )}
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
