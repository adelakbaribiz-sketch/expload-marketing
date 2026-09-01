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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { Plus, Loader2, Users, Heart, TrendingUp, Award, ShieldCheck, BarChart3, Sparkles } from 'lucide-react'
import { useState } from 'react'

const PLATFORM_INFO: Record<string, { name: string; color: string; emoji: string }> = {
  youtube: { name: 'YouTube', color: '#ff0000', emoji: '▶️' },
  instagram: { name: 'Instagram', color: '#e4405f', emoji: '📷' },
  tiktok: { name: 'TikTok', color: '#000000', emoji: '🎵' },
  twitter: { name: 'Twitter / X', color: '#1da1f2', emoji: '🐦' },
  facebook: { name: 'Facebook', color: '#1877f2', emoji: '📘' },
  linkedin: { name: 'LinkedIn', color: '#0a66c2', emoji: '💼' },
}

export function SocialAnalyzerView() {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ platform: 'youtube', handle: '' })

  const { data, isLoading } = useQuery({
    queryKey: ['social-analyses'],
    queryFn: async () => {
      const res = await fetch('/api/analyzers/social')
      if (!res.ok) return { items: [] }
      return res.json()
    },
  })

  const analyzeMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch('/api/analyzers/social/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('analysis failed')
      return res.json()
    },
    onSuccess: (data) => {
      toast.success(`Analysis complete for ${data.analysis.handle} on ${PLATFORM_INFO[data.analysis.platform]?.name}`)
      qc.invalidateQueries({ queryKey: ['social-analyses'] })
      setOpen(false)
      setForm({ platform: 'youtube', handle: '' })
    },
    onError: (e: any) => toast.error(String(e?.message ?? e)),
  })

  const analyses = data?.items ?? []

  return (
    <div className="space-y-4 p-4 md:p-6 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-pink-600" />
            Social Media Analyzer
          </h2>
          <p className="text-xs text-muted-foreground">Deep analysis of YouTube, Instagram, TikTok, X, Facebook, LinkedIn accounts</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Analyze Account
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Analyze Social Account</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Platform</Label>
                <Select value={form.platform} onValueChange={(v) => setForm({ ...form, platform: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(PLATFORM_INFO).map(([key, info]) => (
                      <SelectItem key={key} value={key}>{info.emoji} {info.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Handle / Username</Label>
                <Input value={form.handle} onChange={(e) => setForm({ ...form, handle: e.target.value })} placeholder="@username" dir="ltr" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={() => analyzeMutation.mutate(form)} disabled={!form.handle || analyzeMutation.isPending}>
                {analyzeMutation.isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Analyzing…</> : 'Analyze'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid gap-3 md:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-64 w-full" />)}
        </div>
      ) : analyses.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <BarChart3 className="h-10 w-10 mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground mt-2">No social analyses yet.</p>
            <p className="text-xs text-muted-foreground">Analyze a YouTube channel, Instagram account, or any social profile to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {analyses.map((a: any) => {
            const info = PLATFORM_INFO[a.platform] ?? { name: a.platform, color: '#64748b', emoji: '📊' }
            return (
              <Card key={a.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="grid place-items-center h-10 w-10 rounded-full text-white shrink-0 text-lg" style={{ background: info.color }}>
                        {info.emoji}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{a.displayName || a.handle}</p>
                        <p className="text-xs text-muted-foreground" dir="ltr">@{a.handle} · {info.name}</p>
                      </div>
                    </div>
                    {a.competitorRank && <Badge variant="outline" className="shrink-0">Rank #{a.competitorRank}</Badge>}
                  </div>

                  {/* Key Metrics */}
                  <div className="grid grid-cols-3 gap-2 text-center mb-3">
                    <div className="rounded-md bg-muted/50 p-2">
                      <Users className="h-3 w-3 mx-auto text-blue-600" />
                      <p className="font-semibold text-sm mt-1">{(a.followerCount || 0).toLocaleString()}</p>
                      <p className="text-[9px] text-muted-foreground">Followers</p>
                    </div>
                    <div className="rounded-md bg-muted/50 p-2">
                      <Heart className="h-3 w-3 mx-auto text-red-600" />
                      <p className="font-semibold text-sm mt-1">{Math.round(a.avgLikes || 0).toLocaleString()}</p>
                      <p className="text-[9px] text-muted-foreground">Avg Likes</p>
                    </div>
                    <div className="rounded-md bg-muted/50 p-2">
                      <TrendingUp className="h-3 w-3 mx-auto text-emerald-600" />
                      <p className="font-semibold text-sm mt-1">{a.engagementRate || 0}%</p>
                      <p className="text-[9px] text-muted-foreground">Engagement</p>
                    </div>
                  </div>

                  {/* Quality Scores */}
                  <div className="space-y-2">
                    <ScoreBar label="Influence" value={a.influenceScore || 0} icon={Award} color="text-violet-600" />
                    <ScoreBar label="Authenticity" value={a.authenticityScore || 0} icon={ShieldCheck} color="text-emerald-600" />
                    <ScoreBar label="Brand Fit" value={a.brandFitScore || 0} icon={Sparkles} color="text-amber-600" />
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between mt-3 pt-3 border-t text-xs">
                    <span className="text-muted-foreground">Growth: <span className={a.followerGrowth > 0 ? 'text-emerald-600 font-medium' : 'text-red-600 font-medium'}>{a.followerGrowth > 0 ? '+' : ''}{a.followerGrowth}%</span></span>
                    <span className="text-muted-foreground">{a.postingFrequency || 0} posts/week</span>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

function ScoreBar({ label, value, icon: Icon, color }: { label: string; value: number; icon: any; color: string }) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="flex items-center gap-1"><Icon className={`h-3 w-3 ${color}`} /> {label}</span>
        <span className="text-muted-foreground">{value}/100</span>
      </div>
      <Progress value={value} className="h-1.5" />
    </div>
  )
}
