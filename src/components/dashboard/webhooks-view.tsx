'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Webhook, Plus, Trash2, Power, CheckCircle2, XCircle } from 'lucide-react'
import { useState } from 'react'

const emptyForm = { url: '', events: '', secretToken: '' }

export function WebhooksView() {
  const qc = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)

  const { data, isLoading } = useQuery({
    queryKey: ['webhooks'],
    queryFn: async () => {
      const res = await fetch('/api/webhooks')
      if (!res.ok) return { items: [] }
      return res.json()
    },
  })

  const createWebhook = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch('/api/webhooks', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('Failed to create webhook')
      return res.json()
    },
    onSuccess: () => {
      toast.success('Webhook created')
      qc.invalidateQueries({ queryKey: ['webhooks'] })
      setDialogOpen(false)
      setForm(emptyForm)
    },
    onError: (err: any) => toast.error(String(err?.message ?? err)),
  })

  const toggleWebhook = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const res = await fetch(`/api/webhooks/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive }),
      })
      if (!res.ok) throw new Error('Failed')
      return res.json()
    },
    onSuccess: () => {
      toast.success('Webhook updated')
      qc.invalidateQueries({ queryKey: ['webhooks'] })
    },
    onError: (err: any) => toast.error(String(err?.message ?? err)),
  })

  const deleteWebhook = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/webhooks/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed')
      return res.json()
    },
    onSuccess: () => {
      toast.success('Webhook deleted')
      qc.invalidateQueries({ queryKey: ['webhooks'] })
    },
    onError: (err: any) => toast.error(String(err?.message ?? err)),
  })

  const submit = () => {
    let url: URL
    try {
      url = new URL(form.url)
      if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new Error()
    } catch {
      toast.error('Enter a valid http(s) URL')
      return
    }
    const events = form.events.split(',').map((e) => e.trim()).filter(Boolean)
    if (events.length === 0) {
      toast.error('List at least one event (comma-separated)')
      return
    }
    createWebhook.mutate({
      url: url.toString(),
      events,
      secretToken: form.secretToken || undefined,
      isActive: true,
    })
  }

  const webhooks = data?.items ?? []

  if (isLoading) return <Skeleton className="h-96" />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Webhook className="h-8 w-8" style={{ color: '#0A0A0B' }} />
            Webhooks
          </h1>
          <p className="text-muted-foreground mt-1">
            Register endpoints to receive real-time event notifications from your account
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) setForm(emptyForm) }}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" /> New Webhook</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New Webhook Subscription</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Endpoint URL</Label>
                <Input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://example.com/webhooks/inbound" dir="ltr" />
              </div>
              <div>
                <Label className="text-xs">Events (comma-separated)</Label>
                <Input
                  value={form.events} onChange={(e) => setForm({ ...form, events: e.target.value })}
                  placeholder="lead.created, deal.won, campaign.sent" dir="ltr"
                />
              </div>
              <div>
                <Label className="text-xs">Signing Secret (optional)</Label>
                <Input value={form.secretToken} onChange={(e) => setForm({ ...form, secretToken: e.target.value })} placeholder="whsec_..." type="password" dir="ltr" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={submit} disabled={createWebhook.isPending}>{createWebhook.isPending ? 'Creating…' : 'Create Webhook'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Active Webhooks</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{webhooks.filter((w: any) => w.isActive).length}</div><p className="text-xs text-muted-foreground">of {webhooks.length} configured</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total Delivered</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{webhooks.reduce((s: number, w: any) => s + (w.totalSent ?? 0), 0)}</div><p className="text-xs text-muted-foreground">successful deliveries</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Failed Deliveries</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-red-600">{webhooks.reduce((s: number, w: any) => s + (w.totalFailed ?? 0), 0)}</div><p className="text-xs text-muted-foreground">across all endpoints</p></CardContent>
        </Card>
      </div>

      <div className="space-y-2">
        {webhooks.map((w: any) => {
          const events: string[] = (() => { try { return JSON.parse(w.events) } catch { return [] } })()
          return (
            <Card key={w.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm truncate" dir="ltr">{w.url}</span>
                      <Badge variant={w.isActive ? 'default' : 'secondary'} className="text-[10px] shrink-0">{w.isActive ? 'active' : 'paused'}</Badge>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {events.map((e) => <Badge key={e} variant="outline" className="text-[10px]">{e}</Badge>)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2 flex items-center gap-3">
                      <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-emerald-600" /> {w.totalSent ?? 0} sent</span>
                      {(w.totalFailed ?? 0) > 0 && <span className="flex items-center gap-1"><XCircle className="h-3 w-3 text-red-600" /> {w.totalFailed} failed</span>}
                      {w.lastSentAt && <span>last: {new Date(w.lastSentAt).toLocaleString()}</span>}
                      {w.lastResponseStatus && <span>HTTP {w.lastResponseStatus}</span>}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      size="icon" variant="ghost"
                      onClick={() => toggleWebhook.mutate({ id: w.id, isActive: !w.isActive })}
                      disabled={toggleWebhook.isPending}
                      title={w.isActive ? 'Pause' : 'Resume'}
                    >
                      <Power className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon" variant="ghost" className="text-destructive"
                      onClick={() => { if (confirm(`Delete webhook "${w.url}"? Any integration relying on it will stop receiving events.`)) deleteWebhook.mutate(w.id) }}
                      disabled={deleteWebhook.isPending}
                      aria-label="Delete webhook"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
        {webhooks.length === 0 && (
          <Card><CardContent className="p-8 text-center text-muted-foreground">No webhooks yet. Add one to receive real-time event notifications.</CardContent></Card>
        )}
      </div>
    </div>
  )
}
