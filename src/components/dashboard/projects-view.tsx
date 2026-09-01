'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
import { FolderKanban, Plus, Trash2, FolderOpen, Pause, Archive } from 'lucide-react'
import { toast } from 'sonner'
import { useAppStore } from '@/store/app-store'
import { useI18n } from '@/i18n/provider'

export function ProjectsView() {
  const { t } = useI18n()
  const qc = useQueryClient()
  const activeTenantId = useAppStore((s) => s.activeTenantId)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', status: 'active' })

  const { data, isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const res = await fetch('/api/projects')
      if (!res.ok) throw new Error('failed')
      return res.json()
    },
    enabled: !!activeTenantId,
  })

  const createMutation = useMutation({
    mutationFn: async (payload: typeof form) => {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('create failed')
      return res.json()
    },
    onSuccess: () => {
      toast.success(t('projects.created'))
      qc.invalidateQueries({ queryKey: ['projects'] })
      setOpen(false)
      setForm({ name: '', description: '', status: 'active' })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/projects/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('delete failed')
      return res.json()
    },
    onSuccess: () => {
      toast.success(t('projects.deleted'))
      qc.invalidateQueries({ queryKey: ['projects'] })
    },
  })

  const STATUS_LABELS: Record<string, string> = {
    active: t('projects.active'),
    paused: t('projects.paused'),
    archived: t('projects.archived'),
  }

  const STATUS_ICONS: Record<string, React.ElementType> = {
    active: FolderOpen,
    paused: Pause,
    archived: Archive,
  }

  return (
    <div className="space-y-4 p-4 md:p-6 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold">{t('projects.title')}</h2>
          <p className="text-xs text-muted-foreground">{t('projects.subtitle')}</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2" disabled={!activeTenantId}>
              <Plus className="h-4 w-4" />
              {t('projects.newProject')}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('projects.createTitle')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>{t('projects.name')}</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div>
                <Label>{t('projects.description')}</Label>
                <Textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <div>
                <Label>{t('projects.status')}</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">{t('projects.active')}</SelectItem>
                    <SelectItem value="paused">{t('projects.paused')}</SelectItem>
                    <SelectItem value="archived">{t('projects.archived')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpen(false)}>{t('common.cancel')}</Button>
              <Button
                onClick={() => createMutation.mutate(form)}
                disabled={!form.name || createMutation.isPending}
              >
                {createMutation.isPending ? t('projects.creating') : t('projects.create')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {isLoading &&
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="h-24 bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        {(data?.projects ?? []).map((p: any) => {
          const StatusIcon = STATUS_ICONS[p.status] ?? FolderKanban
          return (
            <Card key={p.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="grid place-items-center h-10 w-10 rounded-lg bg-violet-500/15 text-violet-600 dark:text-violet-400 shrink-0">
                      <FolderKanban className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium truncate">{p.name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {new Date(p.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px] gap-1">
                    <StatusIcon className="h-3 w-3" />
                    {STATUS_LABELS[p.status] ?? p.status}
                  </Badge>
                </div>

                {p.description && (
                  <p className="text-xs text-muted-foreground mt-3 line-clamp-2">{p.description}</p>
                )}

                <div className="flex items-center justify-between mt-3 pt-3 border-t">
                  <Badge variant="secondary" className="text-[11px]">
                    {t('projects.leadsCount', { count: p._count?.leads ?? 0 })}
                  </Badge>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:bg-destructive/10 h-7 w-7 p-0"
                    onClick={() => {
                      if (confirm(t('projects.deleteConfirm'))) deleteMutation.mutate(p.id)
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
        {!isLoading && (data?.projects ?? []).length === 0 && (
          <Card className="md:col-span-2 lg:col-span-3">
            <CardContent className="p-12 text-center">
              <p className="text-sm text-muted-foreground">
                {activeTenantId ? t('projects.noProjects') : t('projects.selectTenantFirst')}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
