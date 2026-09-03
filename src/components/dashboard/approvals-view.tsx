'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { ClipboardCheck, Plus, Trash2, Check, X, Clock } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '@/components/auth/session-provider'

const APPROVAL_TYPES = ['campaign', 'content', 'social_post', 'ad', 'workflow', 'budget']
const STATUS_COLORS: Record<string, string> = {
  pending: '#f59e0b', approved: '#22c55e', rejected: '#ef4444', changes_requested: '#7C4DFF',
}
const emptyForm = { type: 'campaign', itemId: '', itemData: '', comment: '' }

export function ApprovalsView() {
  const qc = useQueryClient()
  const { user } = useAuth()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending')

  const { data, isLoading } = useQuery({
    queryKey: ['approvals'],
    queryFn: async () => {
      const res = await fetch('/api/approvals')
      if (!res.ok) return { items: [] }
      return res.json()
    },
  })

  const createRequest = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch('/api/approvals', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('Failed to create request')
      return res.json()
    },
    onSuccess: () => {
      toast.success('Approval request created')
      qc.invalidateQueries({ queryKey: ['approvals'] })
      setDialogOpen(false)
      setForm(emptyForm)
    },
    onError: (err: any) => toast.error(String(err?.message ?? err)),
  })

  const review = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'approved' | 'rejected' }) => {
      const res = await fetch(`/api/approvals/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, reviewedBy: user?.id, reviewedAt: new Date().toISOString() }),
      })
      if (!res.ok) throw new Error('Failed')
      return res.json()
    },
    onSuccess: (_data, vars) => {
      toast.success(vars.status === 'approved' ? 'Request approved' : 'Request rejected')
      qc.invalidateQueries({ queryKey: ['approvals'] })
    },
    onError: (err: any) => toast.error(String(err?.message ?? err)),
  })

  const deleteRequest = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/approvals/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed')
      return res.json()
    },
    onSuccess: () => {
      toast.success('Request removed')
      qc.invalidateQueries({ queryKey: ['approvals'] })
    },
    onError: (err: any) => toast.error(String(err?.message ?? err)),
  })

  const submit = () => {
    if (!form.itemId.trim() || !form.itemData.trim()) {
      toast.error('Item ID and description are required')
      return
    }
    createRequest.mutate({
      type: form.type,
      itemId: form.itemId,
      itemData: form.itemData,
      requestedBy: user?.id ?? 'unknown',
      status: 'pending',
      comment: form.comment || undefined,
    })
  }

  const items: any[] = data?.items ?? []
  const filtered = filter === 'all' ? items : items.filter((r) => r.status === filter)
  const pendingCount = items.filter((r) => r.status === 'pending').length

  if (isLoading) return <Skeleton className="h-96" />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <ClipboardCheck className="h-8 w-8" style={{ color: '#0A0A0B' }} />
            Approval Queue
          </h1>
          <p className="text-muted-foreground mt-1">
            Review and approve campaigns, content, ads, and budget requests before they go live
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) setForm(emptyForm) }}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" /> New Request</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New Approval Request</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Type</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {APPROVAL_TYPES.map((t) => <SelectItem key={t} value={t}>{t.replace('_', ' ')}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Item ID</Label>
                <Input value={form.itemId} onChange={(e) => setForm({ ...form, itemId: e.target.value })} placeholder="e.g. campaign id or slug" dir="ltr" />
              </div>
              <div>
                <Label className="text-xs">What needs approval</Label>
                <Input value={form.itemData} onChange={(e) => setForm({ ...form, itemData: e.target.value })} placeholder="Summer sale campaign, $5,000 budget" />
              </div>
              <div>
                <Label className="text-xs">Comment (optional)</Label>
                <Input value={form.comment} onChange={(e) => setForm({ ...form, comment: e.target.value })} placeholder="Context for the reviewer" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={submit} disabled={createRequest.isPending}>{createRequest.isPending ? 'Submitting…' : 'Submit Request'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-2">
        {(['pending', 'approved', 'rejected', 'all'] as const).map((f) => (
          <Button key={f} size="sm" variant={filter === f ? 'default' : 'outline'} onClick={() => setFilter(f)} className="capitalize">
            {f} {f === 'pending' && pendingCount > 0 ? `(${pendingCount})` : ''}
          </Button>
        ))}
      </div>

      <div className="space-y-2">
        {filtered.map((r) => (
          <Card key={r.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="capitalize text-[10px]">{r.type.replace('_', ' ')}</Badge>
                    <Badge
                      className="text-[10px] capitalize"
                      style={{ background: (STATUS_COLORS[r.status] ?? '#64748b') + '20', color: STATUS_COLORS[r.status] ?? '#64748b' }}
                      variant="outline"
                    >
                      {r.status === 'pending' && <Clock className="h-2.5 w-2.5 mr-1" />}
                      {r.status.replace('_', ' ')}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{r.itemId}</span>
                  </div>
                  <p className="text-sm mt-1">{r.itemData}</p>
                  {r.comment && <p className="text-xs text-muted-foreground mt-1">"{r.comment}"</p>}
                  <p className="text-[10px] text-muted-foreground mt-2">
                    Requested {new Date(r.requestedAt).toLocaleString()}
                    {r.reviewedAt && ` · Reviewed ${new Date(r.reviewedAt).toLocaleString()}`}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {r.status === 'pending' ? (
                    <>
                      <Button size="sm" variant="outline" className="gap-1 text-emerald-600" onClick={() => review.mutate({ id: r.id, status: 'approved' })} disabled={review.isPending}>
                        <Check className="h-3.5 w-3.5" /> Approve
                      </Button>
                      <Button size="sm" variant="outline" className="gap-1 text-destructive" onClick={() => review.mutate({ id: r.id, status: 'rejected' })} disabled={review.isPending}>
                        <X className="h-3.5 w-3.5" /> Reject
                      </Button>
                    </>
                  ) : (
                    <Button size="icon" variant="ghost" className="text-destructive" onClick={() => deleteRequest.mutate(r.id)} disabled={deleteRequest.isPending}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && (
          <Card><CardContent className="p-8 text-center text-muted-foreground">No {filter !== 'all' ? filter : ''} approval requests.</CardContent></Card>
        )}
      </div>
    </div>
  )
}
