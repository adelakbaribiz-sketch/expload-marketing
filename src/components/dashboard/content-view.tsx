'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
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
import { Plus, Trash2, Lightbulb, FileText, Calendar, Sparkles, Loader2 } from 'lucide-react'
import { useState } from 'react'

export function ContentView() {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', contentType: 'blog', topic: '' })

  const { data: ideasData, isLoading } = useQuery({
    queryKey: ['content-ideas'],
    queryFn: async () => {
      const res = await fetch('/api/content/ideas')
      if (!res.ok) return { items: [] }
      return res.json()
    },
  })

  const { data: piecesData } = useQuery({
    queryKey: ['content-pieces'],
    queryFn: async () => {
      const res = await fetch('/api/content/pieces')
      if (!res.ok) return { items: [] }
      return res.json()
    },
  })

  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch('/api/content/ideas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('create failed')
      return res.json()
    },
    onSuccess: () => {
      toast.success('Content idea created')
      qc.invalidateQueries({ queryKey: ['content-ideas'] })
      setOpen(false)
      setForm({ title: '', description: '', contentType: 'blog', topic: '' })
    },
  })

  const ideas = ideasData?.items ?? []
  const pieces = piecesData?.items ?? []

  return (
    <div className="space-y-4 p-4 md:p-6 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-amber-600" />
            Content Strategy
          </h2>
          <p className="text-xs text-muted-foreground">Generate ideas, create content, plan your calendar</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              New Idea
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Content Idea</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Title</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="10 Ways to Boost Your SEO" />
              </div>
              <div>
                <Label>Topic</Label>
                <Input value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} placeholder="SEO, Marketing, Growth..." />
              </div>
              <div>
                <Label>Content Type</Label>
                <Select value={form.contentType} onValueChange={(v) => setForm({ ...form, contentType: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="blog">Blog Post</SelectItem>
                    <SelectItem value="social">Social Media</SelectItem>
                    <SelectItem value="video">Video</SelectItem>
                    <SelectItem value="infographic">Infographic</SelectItem>
                    <SelectItem value="podcast">Podcast</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Description</Label>
                <Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={() => createMutation.mutate(form)} disabled={!form.title || createMutation.isPending}>
                {createMutation.isPending ? 'Creating…' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Content Ideas */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-amber-600" />
            Ideas ({ideas.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
          ) : ideas.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No content ideas yet. Generate some with AI or create manually.</p>
          ) : (
            <div className="grid gap-2 md:grid-cols-2">
              {ideas.map((idea: any) => (
                <div key={idea.id} className="rounded-lg border p-3 hover:bg-muted/40 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">{idea.title}</p>
                      {idea.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{idea.description}</p>}
                    </div>
                    {idea.aiScore && (
                      <Badge variant="outline" className="text-[10px] shrink-0">AI: {idea.aiScore}</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 mt-2">
                    <Badge variant="secondary" className="text-[10px] capitalize">{idea.contentType}</Badge>
                    <Badge variant="outline" className="text-[10px] capitalize">{idea.status}</Badge>
                    {idea.source === 'ai' && <Badge variant="outline" className="text-[10px] gap-1"><Sparkles className="h-2.5 w-2.5" />AI</Badge>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Content Pieces */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <FileText className="h-4 w-4 text-blue-600" />
            Content Pieces ({pieces.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pieces.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No content pieces created yet.</p>
          ) : (
            <div className="space-y-2">
              {pieces.map((p: any) => (
                <div key={p.id} className="flex items-center gap-3 p-2 rounded-md bg-muted/30">
                  <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{p.title}</p>
                    <p className="text-[11px] text-muted-foreground">{p.wordCount} words · {p.contentType}</p>
                  </div>
                  <Badge variant="outline" className="text-[10px] capitalize">{p.status}</Badge>
                  {p.aiGenerated && <Badge variant="secondary" className="text-[10px] gap-1"><Sparkles className="h-2.5 w-2.5" />AI</Badge>}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
