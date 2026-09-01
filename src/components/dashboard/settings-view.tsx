'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Database, Bot, Search, Server, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { useI18n } from '@/i18n/provider'

export function SettingsView() {
  const { t } = useI18n()
  const qc = useQueryClient()

  const seedDemo = async () => {
    try {
      const res = await fetch('/api/seed', { method: 'POST' })
      const data = await res.json()
      if (data.seeded) {
        toast.success(t('settings.seeded'))
      } else {
        toast.info(t('settings.alreadySeeded'))
      }
      qc.invalidateQueries({ queryKey: ['tenants'] })
      qc.invalidateQueries({ queryKey: ['leads'] })
      qc.invalidateQueries({ queryKey: ['stats'] })
    } catch (e: any) {
      toast.error(String(e?.message ?? e))
    }
  }

  return (
    <div className="space-y-4 p-4 md:p-6 animate-fade-in-up max-w-3xl">
      <div>
        <h2 className="text-base font-semibold">{t('settings.title')}</h2>
        <p className="text-xs text-muted-foreground">{t('settings.subtitle')}</p>
      </div>

      {/* Security posture card */}
      <Card className="border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-teal-500/5">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            {t('settings.security')}
          </CardTitle>
          <CardDescription>{t('settings.securityDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-center">
            <SecurityBadge label={t('settings.rateLimit')} active />
            <SecurityBadge label={t('settings.auditLog')} active />
            <SecurityBadge label={t('settings.inputValidation')} active />
            <SecurityBadge label={t('settings.securityHeaders')} active />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Database className="h-4 w-4 text-emerald-600" />
            {t('settings.database')}
          </CardTitle>
          <CardDescription>{t('settings.databaseDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Row label={t('settings.type')} value="SQLite (file:./db/custom.db)" />
          <Row label={t('settings.orm')} value="Prisma 6.x" />
          <Row label={t('settings.models')} value="7 entities" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Search className="h-4 w-4 text-sky-600" />
            {t('settings.serper')}
          </CardTitle>
          <CardDescription>{t('settings.serperDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{t('settings.apiKey')}</span>
            {process.env.NEXT_PUBLIC_SERPER_API_KEY ? (
              <Badge variant="secondary" className="gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                {t('settings.configured')}
              </Badge>
            ) : (
              <Badge variant="outline" className="gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                {t('settings.demoMode')}
              </Badge>
            )}
          </div>
          <div className="rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">
            <p className="font-mono">SERPER_API_KEY=your_key_here</p>
            <p className="mt-1">{t('settings.serperHint')}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Bot className="h-4 w-4 text-violet-600" />
            {t('settings.ai')}
          </CardTitle>
          <CardDescription>{t('settings.aiDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Row label={t('settings.sdk')} value="z-ai-web-dev-sdk" />
          <Row label={t('settings.usage')} value="Lead Enrichment" />
          <div className="rounded-md bg-violet-500/5 border border-violet-500/20 p-3 text-xs text-muted-foreground">
            {t('settings.aiDescLong')}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Server className="h-4 w-4 text-muted-foreground" />
            {t('settings.multiTenant')}
          </CardTitle>
          <CardDescription>{t('settings.multiTenantDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="rounded-md bg-muted/50 p-2">
              <p className="text-muted-foreground">{t('settings.strategy')}</p>
              <p className="font-medium mt-0.5">Cookie + Header</p>
            </div>
            <div className="rounded-md bg-muted/50 p-2">
              <p className="text-muted-foreground">{t('settings.isolation')}</p>
              <p className="font-medium mt-0.5">{t('settings.rowLevel')}</p>
            </div>
            <div className="rounded-md bg-muted/50 p-2">
              <p className="text-muted-foreground">{t('settings.auth')}</p>
              <p className="font-medium mt-0.5">{t('settings.nextAuthReady')}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">{t('settings.demoData')}</CardTitle>
          <CardDescription>{t('settings.demoDataDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={seedDemo} variant="outline">
            {t('settings.seedData')}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <Badge variant="outline">{value}</Badge>
    </div>
  )
}

function SecurityBadge({ label, active }: { label: string; active: boolean }) {
  return (
    <div className="rounded-md bg-muted/50 p-2">
      <div className="flex items-center justify-center gap-1">
        <span className={`h-1.5 w-1.5 rounded-full ${active ? 'bg-emerald-500' : 'bg-muted-foreground'}`} />
        <span className="text-[10px] text-muted-foreground">{active ? 'on' : 'off'}</span>
      </div>
      <p className="text-[11px] font-medium mt-1">{label}</p>
    </div>
  )
}
