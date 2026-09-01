'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Building2, Plus, Globe, Users, FolderKanban, Trash2, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { useAppStore } from '@/store/app-store'
import { useI18n } from '@/i18n/provider'

export function TenantsView() {
  const { t } = useI18n()
  const qc = useQueryClient()
  const setActiveTenant = useAppStore((s) => s.setActiveTenant)
  const activeTenantId = useAppStore((s) => s.activeTenantId)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ name: '', domain: '', plan: 'free' })

  const { data, isLoading } = useQuery({
    queryKey: ['tenants'],
    queryFn: async () => {
      const res = await fetch('/api/tenants')
      if (!res.ok) throw new Error('failed')
      return res.json()
    },
  })

  const createMutation = useMutation({
    mutationFn: async (payload: typeof form) => {
      const res = await fetch('/api/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const e = await res.json().catch(() => ({}))
        throw new Error(JSON.stringify(e))
      }
      return res.json()
    },
    onSuccess: (data) => {
      toast.success(t('tenants.created'))
      setActiveTenant(data.tenant.id)
      qc.invalidateQueries({ queryKey: ['tenants'] })
      setOpen(false)
      setForm({ name: '', domain: '', plan: 'free' })
    },
    onError: (e: any) => toast.error(t('tenants.tenantCreateError'), { description: String(e?.message ?? e) }),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/tenants/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('delete failed')
      return res.json()
    },
    onSuccess: () => {
      toast.success(t('tenants.deleted'))
      qc.invalidateQueries({ queryKey: ['tenants'] })
    },
  })

  return (
    <div className="space-y-4 p-4 md:p-6 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold">{t('tenants.title')}</h2>
          <p className="text-xs text-muted-foreground">{t('tenants.subtitle')}</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              {t('tenants.newTenant')}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('tenants.createTitle')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>{t('tenants.name')}</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Expload Inc."
                />
              </div>
              <div>
                <Label>{t('tenants.domain')}</Label>
                <Input
                  value={form.domain}
                  onChange={(e) => setForm({ ...form, domain: e.target.value })}
                  placeholder="example.com"
                  dir="ltr"
                />
              </div>
              <div>
                <Label>{t('tenants.plan')}</Label>
                <div className="flex gap-2">
                  {['free', 'pro', 'enterprise'].map((p) => (
                    <Button
                      key={p}
                      variant={form.plan === p ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setForm({ ...form, plan: p })}
                    >
                      {t(`tenants.${p}`)}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpen(false)}>{t('common.cancel')}</Button>
              <Button
                onClick={() => createMutation.mutate(form)}
                disabled={!form.name || !form.domain || createMutation.isPending}
              >
                {createMutation.isPending ? t('tenants.creating') : t('tenants.create')}
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
                <div className="h-20 bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        {(data?.tenants ?? []).map((tnt: any) => {
          const isActive = tnt.id === activeTenantId
          return (
            <Card
              key={tnt.id}
              className={`transition-all hover:shadow-md ${isActive ? 'border-emerald-500 ring-1 ring-emerald-500/30' : ''}`}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="grid place-items-center h-10 w-10 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white shrink-0">
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium truncate">{tnt.name}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1" dir="ltr">
                        <Globe className="h-3 w-3" />
                        {tnt.domain}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px] capitalize">
                    {tnt.plan}
                  </Badge>
                </div>

                <div className="grid grid-cols-3 gap-2 mt-4 text-center">
                  <div className="rounded-md bg-muted/50 p-2">
                    <Users className="h-3.5 w-3.5 mx-auto text-muted-foreground" />
                    <p className="font-semibold mt-1">{tnt._count?.users ?? 0}</p>
                    <p className="text-[10px] text-muted-foreground">{t('tenants.users')}</p>
                  </div>
                  <div className="rounded-md bg-muted/50 p-2">
                    <FolderKanban className="h-3.5 w-3.5 mx-auto text-muted-foreground" />
                    <p className="font-semibold mt-1">{tnt._count?.projects ?? 0}</p>
                    <p className="text-[10px] text-muted-foreground">{t('tenants.projects')}</p>
                  </div>
                  <div className="rounded-md bg-muted/50 p-2">
                    <Building2 className="h-3.5 w-3.5 mx-auto text-muted-foreground" />
                    <p className="font-semibold mt-1">{tnt._count?.leads ?? 0}</p>
                    <p className="text-[10px] text-muted-foreground">{t('tenants.leads')}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-3 pt-3 border-t">
                  {isActive ? (
                    <Badge variant="secondary" className="text-[11px] gap-1">
                      <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                      {t('tenants.active')}
                    </Badge>
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setActiveTenant(tnt.id)
                        toast.success(tnt.name)
                      }}
                    >
                      {t('tenants.select')}
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:bg-destructive/10"
                    onClick={() => {
                      if (confirm(t('tenants.deleteConfirm'))) deleteMutation.mutate(tnt.id)
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
        {!isLoading && (data?.tenants ?? []).length === 0 && (
          <Card className="md:col-span-2 lg:col-span-3">
            <CardContent className="p-12 text-center">
              <p className="text-sm text-muted-foreground">{t('tenants.noTenants')}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
