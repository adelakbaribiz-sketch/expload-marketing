'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { Search, Sparkles, Trash2, RefreshCw, ExternalLink, Phone, Mail } from 'lucide-react'
import { useI18n } from '@/i18n/provider'
import { useAuth } from '@/components/auth/session-provider'

const STATUS_COLORS: Record<string, string> = {
  new: '#10b981',
  contacted: '#3b82f6',
  qualified: '#a855f7',
  won: '#22c55e',
  lost: '#ef4444',
}

// Status values are static; labels are resolved via i18n at call sites.
const STATUS_VALUES = ['new', 'contacted', 'qualified', 'won', 'lost'] as const

export function LeadsView() {
  const { t } = useI18n()
  const { user } = useAuth()
  // viewer is documented (src/lib/auth/rbac.ts) as read-only for leads —
  // hide write affordances rather than showing buttons whose click would
  // (today) silently succeed server-side with no role check either; this
  // establishes the intended UI-level pattern, see USER-JOURNEYS.md journey 6.
  const canWrite = user?.role !== 'viewer'
  const qc = useQueryClient()

  const STATUS_OPTIONS = STATUS_VALUES.map((v) => ({
    value: v,
    label: t(`statuses.${v}`),
  }))
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<string>('all')
  const [industry, setIndustry] = useState<string>('all')
  const [minScore, setMinScore] = useState<string>('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [sort, setSort] = useState('createdAt:desc')

  const params = new URLSearchParams()
  if (search) params.set('q', search)
  if (status !== 'all') params.set('status', status)
  if (industry !== 'all') params.set('industry', industry)
  if (minScore) params.set('minScore', minScore)
  params.set('sort', sort)

  const { data, isLoading } = useQuery({
    queryKey: ['leads', params.toString()],
    queryFn: async () => {
      const res = await fetch(`/api/leads?${params}`)
      if (!res.ok) throw new Error('failed')
      return res.json()
    },
  })

  const industries = useMemo(() => {
    const set = new Set<string>()
    for (const l of data?.leads ?? []) {
      if (l.industry) set.add(l.industry)
    }
    return Array.from(set)
  }, [data])

  const enrichMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/leads/${id}/enrich`, { method: 'POST' })
      if (!res.ok) throw new Error('enrich failed')
      return res.json()
    },
    onSuccess: () => {
      toast.success(t('leads.leadEnriched'))
      qc.invalidateQueries({ queryKey: ['leads'] })
      qc.invalidateQueries({ queryKey: ['stats'] })
    },
    onError: (e: any) => toast.error(String(e?.message ?? e)),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/leads/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('delete failed')
      return res.json()
    },
    onSuccess: () => {
      toast.success(t('leads.leadDeleted'))
      qc.invalidateQueries({ queryKey: ['leads'] })
      qc.invalidateQueries({ queryKey: ['stats'] })
      setSelectedId(null)
    },
    onError: (e: any) => toast.error(String(e?.message ?? e)),
  })

  return (
    <div className="space-y-4 p-4 md:p-6 animate-fade-in-up">
      {/* Filters */}
      <Card>
        <CardContent className="p-3 md:p-4">
          <div className="grid gap-2 md:grid-cols-6">
            <div className="relative md:col-span-2">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('leads.searchPlaceholder')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pr-9"
              />
            </div>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue placeholder={t('leads.status')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('leads.allStatuses')}</SelectItem>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={industry} onValueChange={setIndustry}>
              <SelectTrigger>
                <SelectValue placeholder={t('leads.industry')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('leads.allIndustries')}</SelectItem>
                {industries.map((i) => (
                  <SelectItem key={i} value={i}>
                    {i}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="number"
              min={0}
              max={100}
              placeholder={t('leads.minScore')}
              value={minScore}
              onChange={(e) => setMinScore(e.target.value)}
            />
            <Select value={sort} onValueChange={setSort}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="createdAt:desc">{t('leads.newest')}</SelectItem>
                <SelectItem value="createdAt:asc">{t('leads.oldest')}</SelectItem>
                <SelectItem value="score:desc">{t('leads.highestScore')}</SelectItem>
                <SelectItem value="score:asc">{t('leads.lowestScore')}</SelectItem>
                <SelectItem value="name:asc">{t('leads.nameAZ')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-sm">
            {t('leads.title')} ({data?.leads?.length ?? 0})
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => qc.invalidateQueries({ queryKey: ['leads'] })}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            {t('leads.refresh')}
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto scroll-thin">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-right text-xs text-muted-foreground border-b">
                  <th className="pb-2 pr-2 font-medium">{t('leads.name')}</th>
                  <th className="pb-2 font-medium hidden md:table-cell">{t('leads.industry')}</th>
                  <th className="pb-2 font-medium hidden lg:table-cell">{t('leads.website')}</th>
                  <th className="pb-2 font-medium">{t('leads.score')}</th>
                  <th className="pb-2 font-medium">{t('leads.status')}</th>
                  <th className="pb-2 font-medium hidden md:table-cell">{t('leads.source')}</th>
                  <th className="pb-2 font-medium">{t('leads.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {isLoading &&
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="py-2 pr-2"><Skeleton className="h-5 w-40" /></td>
                      <td className="py-2 hidden md:table-cell"><Skeleton className="h-5 w-20" /></td>
                      <td className="py-2 hidden lg:table-cell"><Skeleton className="h-5 w-32" /></td>
                      <td className="py-2"><Skeleton className="h-5 w-10" /></td>
                      <td className="py-2"><Skeleton className="h-5 w-16" /></td>
                      <td className="py-2 hidden md:table-cell"><Skeleton className="h-5 w-12" /></td>
                      <td className="py-2"><Skeleton className="h-5 w-20" /></td>
                    </tr>
                  ))}
                {!isLoading &&
                  (data?.leads ?? []).map((l: any) => (
                    <tr
                      key={l.id}
                      className="border-b last:border-0 hover:bg-muted/40 cursor-pointer transition-colors"
                      onClick={() => setSelectedId(l.id)}
                    >
                      <td className="py-2.5 pr-2 font-medium truncate max-w-[220px]">
                        {l.name}
                      </td>
                      <td className="py-2.5 text-muted-foreground hidden md:table-cell">
                        {l.industry ?? '—'}
                      </td>
                      <td className="py-2.5 hidden lg:table-cell">
                        {l.website ? (
                          <a
                            href={l.website}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 hover:underline text-xs"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <ExternalLink className="h-3 w-3" />
                            {t('leads.website')}
                          </a>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="py-2.5">
                        <Badge variant="outline">{l.score}</Badge>
                      </td>
                      <td className="py-2.5">
                        <Badge
                          style={{
                            background: (STATUS_COLORS[l.status] ?? '#94a3b8') + '20',
                            color: STATUS_COLORS[l.status] ?? '#94a3b8',
                          }}
                        >
                          {STATUS_OPTIONS.find((s) => s.value === l.status)?.label ?? l.status}
                        </Badge>
                      </td>
                      <td className="py-2.5 hidden md:table-cell">
                        <Badge variant="secondary" className="text-[10px] font-mono">
                          {l.source ?? 'manual'}
                        </Badge>
                      </td>
                      <td className="py-2.5">
                        <div className="flex items-center gap-1">
                          {canWrite ? (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  enrichMutation.mutate(l.id)
                                }}
                                disabled={enrichMutation.isPending}
                                title={t('leads.enrichWithAI')}
                              >
                                <Sparkles className="h-3.5 w-3.5 text-violet-600" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0 hover:bg-destructive/10 hover:text-destructive"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  if (confirm(t('leads.deleteConfirm'))) deleteMutation.mutate(l.id)
                                }}
                                title={t('common.delete')}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          ) : (
                            <span className="text-[11px] text-muted-foreground">View only</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                {!isLoading && (data?.leads ?? []).length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-muted-foreground">
                      {t('leads.noLeadsFound')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <LeadDetailDrawer
        id={selectedId}
        onClose={() => setSelectedId(null)}
        onEnrich={(id) => enrichMutation.mutate(id)}
        enriching={enrichMutation.isPending}
      />
    </div>
  )
}

function LeadDetailDrawer({
  id,
  onClose,
  onEnrich,
  enriching,
}: {
  id: string | null
  onClose: () => void
  onEnrich: (id: string) => void
  enriching: boolean
}) {
  const { t } = useI18n()
  const qc = useQueryClient()
  const [form, setForm] = useState<Record<string, any>>({})
  const lastSyncedIdRef = useRef<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['lead', id],
    queryFn: async () => {
      const res = await fetch(`/api/leads/${id}`)
      if (!res.ok) throw new Error('failed')
      return res.json()
    },
    enabled: !!id,
  })

  // Sync form when lead changes. We defer the setForm call into a microtask
  // so it does not fire synchronously inside the effect body.
  const leadData = data?.lead
  const leadId = leadData?.id
  useEffect(() => {
    if (!leadData || !leadId) return
    if (lastSyncedIdRef.current === leadId) return
    lastSyncedIdRef.current = leadId
    const snapshot = {
      name: leadData.name ?? '',
      email: leadData.email ?? '',
      phone: leadData.phone ?? '',
      website: leadData.website ?? '',
      industry: leadData.industry ?? '',
      description: leadData.description ?? '',
      score: leadData.score ?? 0,
      status: leadData.status ?? 'new',
      address: leadData.address ?? '',
    }
    Promise.resolve().then(() => setForm(snapshot))
  }, [leadData, leadId])

  // Reset the synced-id tracker when the drawer closes
  useEffect(() => {
    if (!id) lastSyncedIdRef.current = null
  }, [id])

  const saveMutation = useMutation({
    mutationFn: async (payload: Record<string, any>) => {
      const res = await fetch(`/api/leads/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('save failed')
      return res.json()
    },
    onSuccess: () => {
      toast.success(t('leads.leadSaved'))
      qc.invalidateQueries({ queryKey: ['leads'] })
      qc.invalidateQueries({ queryKey: ['lead', id] })
      qc.invalidateQueries({ queryKey: ['stats'] })
    },
    onError: (e: any) => toast.error(String(e?.message ?? e)),
  })

  const lead = data?.lead
  const services: string[] = lead?.services ? safeParse(lead.services) : []

  return (
    <Sheet open={!!id} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto scroll-thin">
        <SheetHeader>
          <SheetTitle className="truncate">{lead?.name ?? t('leads.details')}</SheetTitle>
        </SheetHeader>

        {isLoading ? (
          <div className="space-y-3 px-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full" />
            ))}
          </div>
        ) : lead ? (
          <div className="space-y-4 px-4 pb-6">
            {/* Quick contact */}
            <div className="flex flex-wrap gap-2">
              {lead.email && (
                <a
                  href={`mailto:${lead.email}`}
                  className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2.5 py-1 text-xs hover:bg-muted/70"
                >
                  <Mail className="h-3 w-3" /> {lead.email}
                </a>
              )}
              {lead.phone && (
                <a
                  href={`tel:${lead.phone}`}
                  className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2.5 py-1 text-xs hover:bg-muted/70"
                >
                  <Phone className="h-3 w-3" /> {lead.phone}
                </a>
              )}
              {lead.website && (
                <a
                  href={lead.website}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-md bg-emerald-500/10 px-2.5 py-1 text-xs text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20"
                >
                  <ExternalLink className="h-3 w-3" /> {t('leads.website')}
                </a>
              )}
            </div>

            {services.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs text-muted-foreground">{t('leads.services')}</p>
                <div className="flex flex-wrap gap-1.5">
                  {services.map((s, i) => (
                    <Badge key={i} variant="outline" className="text-[11px]">
                      {s}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Editable form */}
            <div className="space-y-3">
              <div>
                <Label className="text-xs">نام</Label>
                <Input value={form.name ?? ''} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">{t('leads.email')}</Label>
                  <Input value={form.email ?? ''} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs">{t('leads.phone')}</Label>
                  <Input value={form.phone ?? ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">{t('leads.industry')}</Label>
                  <Input value={form.industry ?? ''} onChange={(e) => setForm({ ...form, industry: e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs">{t('leads.score')} (0-100)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={form.score ?? 0}
                    onChange={(e) => setForm({ ...form, score: Number(e.target.value) })}
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs">{t('leads.status')}</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_VALUES.map((v) => (
                      <SelectItem key={v} value={v}>
                        {t(`statuses.${v}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">{t('leads.description')}</Label>
                <Textarea
                  rows={3}
                  value={form.description ?? ''}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
            </div>

            {/* Activity log */}
            {lead.activities?.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">{t('leads.history')}</p>
                <div className="space-y-1.5 max-h-40 overflow-y-auto scroll-thin rounded-md border p-2">
                  {lead.activities.map((a: any) => (
                    <div key={a.id} className="text-[11px] flex items-start gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                      <div className="flex-1">
                        <p>{a.message}</p>
                        <p className="text-muted-foreground">
                          {new Date(a.createdAt).toLocaleString('fa-IR')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : null}

        <SheetFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => lead && onEnrich(lead.id)}
            disabled={enriching}
            className="gap-2"
          >
            <Sparkles className="h-4 w-4 text-violet-600" />
            {enriching ? t('leads.enriching') : t('leads.enrichWithAI')}
          </Button>
          <Button
            onClick={() => saveMutation.mutate(form)}
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? t('common.saving') : t('leads.save')}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

function safeParse(s: string): any[] {
  try {
    const v = JSON.parse(s)
    return Array.isArray(v) ? v : []
  } catch {
    return []
  }
}
