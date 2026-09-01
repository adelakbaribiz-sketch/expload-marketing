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
import { Plus, Trash2, Share2, Users, Heart, MessageCircle, Eye, Calendar } from 'lucide-react'
import { useState } from 'react'

const PLATFORM_COLORS: Record<string, string> = {
  linkedin: '#0a66c2',
  twitter: '#1da1f2',
  facebook: '#1877f2',
  instagram: '#e4405f',
  youtube: '#ff0000',
}

export function SocialView() {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ platform: 'linkedin', handle: '', displayName: '' })

  const { data: accountsData, isLoading } = useQuery({
    queryKey: ['social-accounts'],
    queryFn: async () => {
      const res = await fetch('/api/social/accounts')
      if (!res.ok) return { items: [] }
      return res.json()
    },
  })

  const { data: postsData } = useQuery({
    queryKey: ['social-posts'],
    queryFn: async () => {
      const res = await fetch('/api/social/posts')
      if (!res.ok) return { items: [] }
      return res.json()
    },
  })

  const createAccountMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch('/api/social/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('create failed')
      return res.json()
    },
    onSuccess: () => {
      toast.success('Social account added')
      qc.invalidateQueries({ queryKey: ['social-accounts'] })
      setOpen(false)
      setForm({ platform: 'linkedin', handle: '', displayName: '' })
    },
  })

  const accounts = accountsData?.items ?? []
  const posts = postsData?.items ?? []
  const totalFollowers = accounts.reduce((sum: number, a: any) => sum + (a.followerCount || 0), 0)
  const totalEngagement = posts.reduce((sum: number, p: any) => sum + (p.likes || 0) + (p.comments || 0) + (p.shares || 0), 0)

  return (
    <div className="space-y-4 p-4 md:p-6 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold flex items-center gap-2">
            <Share2 className="h-5 w-5 text-blue-600" />
            Social Media
          </h2>
          <p className="text-xs text-muted-foreground">Manage accounts, schedule posts, track engagement</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Connect Account
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Connect Social Account</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Platform</Label>
                <Select value={form.platform} onValueChange={(v) => setForm({ ...form, platform: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="linkedin">LinkedIn</SelectItem>
                    <SelectItem value="twitter">Twitter / X</SelectItem>
                    <SelectItem value="facebook">Facebook</SelectItem>
                    <SelectItem value="instagram">Instagram</SelectItem>
                    <SelectItem value="youtube">YouTube</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Handle</Label>
                <Input value={form.handle} onChange={(e) => setForm({ ...form, handle: e.target.value })} placeholder="@yourcompany" dir="ltr" />
              </div>
              <div>
                <Label>Display Name</Label>
                <Input value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} placeholder="Your Company" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={() => createAccountMutation.mutate(form)} disabled={!form.handle || createAccountMutation.isPending}>
                {createAccountMutation.isPending ? 'Connecting…' : 'Connect'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <Users className="h-4 w-4 text-blue-600 mb-1" />
            <p className="text-2xl font-bold">{accounts.length}</p>
            <p className="text-xs text-muted-foreground">Accounts</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <Users className="h-4 w-4 text-violet-600 mb-1" />
            <p className="text-2xl font-bold">{totalFollowers.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Followers</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <Share2 className="h-4 w-4 text-emerald-600 mb-1" />
            <p className="text-2xl font-bold">{posts.length}</p>
            <p className="text-xs text-muted-foreground">Posts</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <Heart className="h-4 w-4 text-red-600 mb-1" />
            <p className="text-2xl font-bold">{totalEngagement.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Engagement</p>
          </CardContent>
        </Card>
      </div>

      {/* Accounts */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Connected Accounts</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-20 w-full" />
          ) : accounts.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No social accounts connected yet.</p>
          ) : (
            <div className="grid gap-2 md:grid-cols-2">
              {accounts.map((a: any) => (
                <div key={a.id} className="flex items-center gap-3 p-3 rounded-lg border">
                  <div className="grid place-items-center h-10 w-10 rounded-full text-white shrink-0" style={{ background: PLATFORM_COLORS[a.platform] ?? '#64748b' }}>
                    <Share2 className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{a.displayName || a.handle}</p>
                    <p className="text-xs text-muted-foreground" dir="ltr">{a.handle} · {a.followerCount?.toLocaleString() || 0} followers</p>
                  </div>
                  <Badge variant="outline" className="text-[10px] capitalize">{a.platform}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Posts */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Recent Posts</CardTitle>
        </CardHeader>
        <CardContent>
          {posts.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No posts published yet.</p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto scroll-thin">
              {posts.map((p: any) => (
                <div key={p.id} className="p-3 rounded-lg border">
                  <p className="text-sm line-clamp-2">{p.content}</p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Heart className="h-3 w-3" /> {p.likes || 0}</span>
                    <span className="flex items-center gap-1"><MessageCircle className="h-3 w-3" /> {p.comments || 0}</span>
                    <span className="flex items-center gap-1"><Share2 className="h-3 w-3" /> {p.shares || 0}</span>
                    <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> {p.impressions || 0}</span>
                    <Badge variant="outline" className="text-[10px] capitalize ml-auto">{p.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
