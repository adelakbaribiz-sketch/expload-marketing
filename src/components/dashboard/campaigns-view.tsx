'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
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
import {
  Mail,
  Plus,
  Send,
  Trash2,
  Eye,
  MousePointerClick,
  AlertCircle,
  CheckCircle2,
  Clock,
  Loader2,
  FileText,
} from 'lucide-react'
import { useI18n } from '@/i18n/provider'

const STATUS_COLORS: Record<string, string> = {
  draft: '#64748b',
  queued: '#3b82f6',
  sending: '#f59e0b',
  sent: '#22c55e',
  failed: '#ef4444',
  cancelled: '#94a3b8',
}

export function CampaignsView() {
  const { t } = useI18n()
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: '',
    subject: '',
    body: '',
    templateId: '',
    filterStatus: '',
    filterIndustry: '',
    filterMinScore: '',
  })

  const { data, isLoading } = useQuery({
    queryKey: ['campaigns'],
    queryFn: async () => {
      const res = await fetch('/api/campaigns')
      if (!res.ok) throw new Error('failed')
      return res.json()
    },
  })

  const { data: templatesData } = useQuery({
    queryKey: ['templates'],
    queryFn: async () => {
      const res = await fetch('/api/templates')
      if (!res.ok) return { templates: [] }
      return res.json()
    },
  })

  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('create failed')
      return res.json()
    },
    onSuccess: () => {
      toast.success('Campaign created')
      qc.invalidateQueries({ queryKey: ['campaigns'] })
      setOpen(false)
      setForm({ name: '', subject: '', body: '', templateId: '', filterStatus: '', filterIndustry: '', filterMinScore: '' })
    },
  })

  const sendMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/campaigns/${id}/send`, { method: 'POST' })
      if (!res.ok) {
        const e = await res.json().catch(() => ({}))
        throw new Error(e.error || 'send failed')
      }
      return res.json()
    },
    onSuccess: (data) => {
      toast.success(`Campaign queued (job: ${data.jobId?.slice(0, 12)}…)`)
      qc.invalidateQueries({ queryKey: ['campaigns'] })
    },
    onError: (e: any) => toast.error(String(e?.message ?? e)),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/campaigns/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('delete failed')
      return res.json()
    },
    onSuccess: () => {
      toast.success('Campaign deleted')
      qc.invalidateQueries({ queryKey: ['campaigns'] })
    },
  })

  const handleCreate = () => {
    if (!form.name || !form.subject || !form.body) {
      toast.error('Name, subject, and body are required')
      return
    }
    const payload: any = {
      name: form.name,
      subject: form.subject,
      body: form.body,
      templateId: form.templateId || undefined,
      recipientFilter: {} as any,
    }
    if (form.filterStatus) payload.recipientFilter.status = form.filterStatus
    if (form.filterIndustry) payload.recipientFilter.industry = form.filterIndustry
    if (form.filterMinScore) payload.recipientFilter.minScore = Number(form.filterMinScore)
    createMutation.mutate(payload)
  }

  const loadTemplate = (templateId: string) => {
    if (!templateId) {
      setForm({ ...form, templateId: '' })
      return
    }
    const tpl = templatesData?.templates?.find((t: any) => t.id === templateId)
    if (tpl) {
      setForm({ ...form, templateId, subject: tpl.subject, body: tpl.body })
    }
  }

  return (
    <div className="space-y-4 p-4 md:p-6 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold flex items-center gap-2">
            <Mail className="h-5 w-5 text-violet-600" />
            Email Campaigns
          </h2>
          <p className="text-xs text-muted-foreground">
            Create, send, and track email marketing campaigns
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              New Campaign
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto scroll-thin">
            <DialogHeader>
              <DialogTitle>Create Email Campaign</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>From Template (optional)</Label>
                <Select value={form.templateId} onValueChange={loadTemplate}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a template…" />
                  </SelectTrigger>
                  <SelectContent>
                    {(templatesData?.templates ?? []).map((tpl: any) => (
                      <SelectItem key={tpl.id} value={tpl.id}>
                        {tpl.name} ({tpl.category})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Campaign Name</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Q3 Outreach Campaign"
                />
              </div>
              <div>
                <Label>Subject Line</Label>
                <Input
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  placeholder="Helping {{company}} grow…"
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  Variables: {'{{name}}, {{email}}, {{industry}}, {{company}}'}
                </p>
              </div>
              <div>
                <Label>Email Body</Label>
                <Textarea
                  rows={8}
                  value={form.body}
                  onChange={(e) => setForm({ ...form, body: e.target.value })}
                  placeholder="Hi {{name}}, …"
                  className="font-mono text-xs"
                />
              </div>
              <div className="border-t pt-3">
                <Label className="text-xs font-semibold uppercase text-muted-foreground">
                  Recipient Filters
                </Label>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  <div>
                    <Label className="text-xs">Lead Status</Label>
                    <Select
                      value={form.filterStatus}
                      onValueChange={(v) => setForm({ ...form, filterStatus: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All</SelectItem>
                        <SelectItem value="new">New</SelectItem>
                        <SelectItem value="contacted">Contacted</SelectItem>
                        <SelectItem value="qualified">Qualified</SelectItem>
                        <SelectItem value="won">Won</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Industry</Label>
                    <Input
                      placeholder="Any"
                      value={form.filterIndustry}
                      onChange={(e) => setForm({ ...form, filterIndustry: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Min Score</Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      placeholder="0"
                      value={form.filterMinScore}
                      onChange={(e) => setForm({ ...form, filterMinScore: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Creating…' : 'Create Campaign'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Campaign list */}
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {isLoading &&
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-24 w-full" />
              </CardContent>
            </Card>
          ))}
        {(data?.campaigns ?? []).map((c: any) => (
          <Card key={c.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">{c.name}</p>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{c.subject}</p>
                </div>
                <Badge
                  variant="outline"
                  className="text-[10px] capitalize shrink-0"
                  style={{
                    background: (STATUS_COLORS[c.status] ?? '#94a3b8') + '20',
                    color: STATUS_COLORS[c.status] ?? '#94a3b8',
                  }}
                >
                  {c.status}
                </Badge>
              </div>

              {/* Stats */}
              {c.sentCount > 0 && (
                <div className="grid grid-cols-4 gap-1 mt-3 text-center">
                  <Stat icon={Send} label="Sent" value={c.sentCount} color="text-blue-600" />
                  <Stat icon={Eye} label="Opened" value={c.openCount} color="text-emerald-600" />
                  <Stat icon={MousePointerClick} label="Clicked" value={c.clickCount} color="text-violet-600" />
                  <Stat icon={AlertCircle} label="Bounced" value={c.bounceCount} color="text-red-600" />
                </div>
              )}

              {/* Progress for sending */}
              {c.status === 'sending' && c.recipientCount > 0 && (
                <div className="mt-3">
                  <Progress value={(c.sentCount / c.recipientCount) * 100} className="h-1.5" />
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {c.sentCount} / {c.recipientCount} sent
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-1 mt-3 pt-3 border-t">
                <Button
                  size="sm"
                  variant="ghost"
                  className="gap-1.5 text-xs"
                  onClick={() => setDetailId(c.id)}
                >
                  <FileText className="h-3.5 w-3.5" />
                  Details
                </Button>
                {c.status === 'draft' && (
                  <Button
                    size="sm"
                    variant="default"
                    className="gap-1.5 text-xs ml-auto"
                    onClick={() => sendMutation.mutate(c.id)}
                    disabled={sendMutation.isPending}
                  >
                    {sendMutation.isPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Send className="h-3.5 w-3.5" />
                    )}
                    Send
                  </Button>
                )}
                {c.status === 'queued' && (
                  <Badge variant="secondary" className="ml-auto text-[10px] gap-1">
                    <Clock className="h-3 w-3 animate-pulse" />
                    Queued
                  </Badge>
                )}
                {c.status === 'sent' && (
                  <Badge variant="secondary" className="ml-auto text-[10px] gap-1">
                    <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                    {c.sentCount} sent
                  </Badge>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:bg-destructive/10 h-7 w-7 p-0"
                  onClick={() => {
                    if (confirm('Delete this campaign?')) deleteMutation.mutate(c.id)
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {!isLoading && (data?.campaigns ?? []).length === 0 && (
          <Card className="md:col-span-2 lg:col-span-3">
            <CardContent className="p-12 text-center">
              <Mail className="h-10 w-10 mx-auto text-muted-foreground" />
              <p className="text-sm text-muted-foreground mt-2">
                No campaigns yet. Click "New Campaign" to create your first email marketing campaign.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Detail dialog */}
      {detailId && <CampaignDetail id={detailId} onClose={() => setDetailId(null)} />}
    </div>
  )
}

function Stat({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType
  label: string
  value: number
  color: string
}) {
  return (
    <div className="rounded-md bg-muted/50 p-1.5">
      <Icon className={`h-3 w-3 mx-auto ${color}`} />
      <p className="font-semibold text-sm mt-0.5">{value}</p>
      <p className="text-[9px] text-muted-foreground">{label}</p>
    </div>
  )
}

function CampaignDetail({ id, onClose }: { id: string; onClose: () => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ['campaign', id],
    queryFn: async () => {
      const res = await fetch(`/api/campaigns/${id}`)
      if (!res.ok) throw new Error('failed')
      return res.json()
    },
  })

  const campaign = data?.campaign
  const logs = campaign?.logs ?? []

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto scroll-thin">
        <DialogHeader>
          <DialogTitle>{campaign?.name ?? 'Campaign Details'}</DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : campaign ? (
          <div className="space-y-4">
            {/* Stats */}
            <div className="grid grid-cols-4 gap-2">
              <Stat icon={Send} label="Sent" value={campaign.sentCount} color="text-blue-600" />
              <Stat icon={Eye} label="Opened" value={campaign.openCount} color="text-emerald-600" />
              <Stat icon={MousePointerClick} label="Clicked" value={campaign.clickCount} color="text-violet-600" />
              <Stat icon={AlertCircle} label="Bounced" value={campaign.bounceCount} color="text-red-600" />
            </div>

            {/* Email content */}
            <div>
              <Label className="text-xs font-semibold uppercase text-muted-foreground">Subject</Label>
              <p className="text-sm mt-1 p-2 rounded-md bg-muted/50">{campaign.subject}</p>
            </div>
            <div>
              <Label className="text-xs font-semibold uppercase text-muted-foreground">Body</Label>
              <pre className="text-xs mt-1 p-3 rounded-md bg-muted/50 whitespace-pre-wrap font-mono max-h-48 overflow-y-auto scroll-thin">
                {campaign.body}
              </pre>
            </div>

            {/* Logs */}
            {logs.length > 0 && (
              <div>
                <Label className="text-xs font-semibold uppercase text-muted-foreground">
                  Recent Sends ({logs.length})
                </Label>
                <div className="space-y-1.5 mt-2 max-h-48 overflow-y-auto scroll-thin">
                  {logs.map((log: any) => (
                    <div key={log.id} className="flex items-center gap-2 text-xs p-2 rounded-md bg-muted/30">
                      <Badge
                        variant="outline"
                        className="text-[9px] capitalize"
                        style={{
                          background:
                            (STATUS_COLORS[log.status] ?? '#94a3b8') + '20',
                          color: STATUS_COLORS[log.status] ?? '#94a3b8',
                        }}
                      >
                        {log.status}
                      </Badge>
                      <span className="truncate flex-1" dir="ltr">{log.to}</span>
                      <span className="text-muted-foreground text-[10px]">
                        {log.sentAt ? new Date(log.sentAt).toLocaleTimeString() : '—'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
