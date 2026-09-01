'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import {
  Sparkles,
  Search,
  MapPin,
  Bot,
  Database,
  Wand2,
  CheckCircle2,
  Info,
} from 'lucide-react'
import { useI18n } from '@/i18n/provider'

export function GeneratorView() {
  const { t } = useI18n()
  const qc = useQueryClient()
  const [query, setQuery] = useState('')
  const [location, setLocation] = useState('')
  const [maxResults, setMaxResults] = useState('8')
  const [useMaps, setUseMaps] = useState(true)
  const [enrich, setEnrich] = useState(true)
  const [persist, setPersist] = useState(true)
  const [projectId, setProjectId] = useState<string>('')
  const [result, setResult] = useState<any>(null)

  const { data: projectsData } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const res = await fetch('/api/projects')
      if (!res.ok) return { projects: [] }
      return res.json()
    },
  })

  const searchMutation = useMutation({
    mutationFn: async (payload: Record<string, any>) => {
      const res = await fetch('/api/leads/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'request failed' }))
        throw new Error(err.error ?? 'request failed')
      }
      return res.json()
    },
    onSuccess: (data) => {
      setResult(data)
      toast.success(`${data.createdCount} ${t('generator.created')}`)
      qc.invalidateQueries({ queryKey: ['leads'] })
      qc.invalidateQueries({ queryKey: ['stats'] })
    },
    onError: (e: any) => toast.error(String(e?.message ?? e)),
  })

  const handleSearch = () => {
    if (!query.trim()) {
      toast.error(t('generator.queryLabel'))
      return
    }
    searchMutation.mutate({
      query,
      location: location || undefined,
      maxResults: Number(maxResults),
      useMaps,
      enrich,
      persist,
      projectId: projectId || undefined,
    })
  }

  return (
    <div className="space-y-4 p-4 md:p-6 animate-fade-in-up">
      <Card className="border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-teal-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <div className="grid place-items-center h-8 w-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
              <Wand2 className="h-4 w-4" />
            </div>
            {t('generator.title')}
          </CardTitle>
          <CardDescription>{t('generator.subtitle')}</CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Form */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              {t('generator.searchParams')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-xs">{t('generator.queryLabel')}</Label>
              <Input
                placeholder={t('generator.queryPlaceholder')}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <div>
              <Label className="text-xs">{t('generator.locationLabel')}</Label>
              <div className="relative">
                <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder={t('generator.locationPlaceholder')}
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="pr-9"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">{t('generator.resultsCount')}</Label>
                <Select value={maxResults} onValueChange={setMaxResults}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[3, 5, 8, 10, 15, 20].map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {n}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">{t('generator.targetProject')}</Label>
                <Select value={projectId} onValueChange={setProjectId}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('generator.noProject')} />
                  </SelectTrigger>
                  <SelectContent>
                    {(projectsData?.projects ?? []).map((p: any) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t">
              <ToggleRow
                icon={MapPin}
                label={t('generator.scrapeMaps')}
                hint="places"
                checked={useMaps}
                onChange={setUseMaps}
              />
              <ToggleRow
                icon={Bot}
                label={t('generator.enrichAI')}
                hint="LLM"
                checked={enrich}
                onChange={setEnrich}
              />
              <ToggleRow
                icon={Database}
                label={t('generator.persistDb')}
                hint="persist"
                checked={persist}
                onChange={setPersist}
              />
            </div>

            <Button
              onClick={handleSearch}
              disabled={searchMutation.isPending || !query.trim()}
              className="w-full gap-2"
            >
              <Sparkles className="h-4 w-4" />
              {searchMutation.isPending ? t('generator.processing') : t('generator.startGeneration')}
            </Button>

            <div className="flex items-start gap-2 text-[11px] text-muted-foreground bg-muted/40 rounded-md p-2">
              <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <p>{t('generator.demoNotice')}</p>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-sm">{t('generator.results')}</CardTitle>
            {result && (
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[11px]">
                  {result.serperMocked ? t('generator.demoMode') : t('generator.liveMode')}
                </Badge>
                <Badge variant="secondary" className="text-[11px]">
                  {result.createdCount} {t('generator.created')}
                </Badge>
              </div>
            )}
          </CardHeader>
          <CardContent>
            {searchMutation.isPending ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="space-y-1.5">
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-3/4" />
                  </div>
                ))}
              </div>
            ) : result ? (
              <div className="space-y-3 max-h-[600px] overflow-y-auto scroll-thin pr-1">
                {(result.leads ?? []).map((l: any, i: number) => (
                  <div
                    key={l.id ?? i}
                    className="rounded-lg border p-3 hover:bg-muted/40 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm truncate">{l.name}</p>
                        {l.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {l.description}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Badge
                          variant="outline"
                          className="text-[11px]"
                          style={{
                            background: scoreColor(l.score).bg,
                            color: scoreColor(l.score).fg,
                          }}
                        >
                          {l.score}
                        </Badge>
                        {l.id && (
                          <Badge variant="secondary" className="text-[10px]">
                            <CheckCircle2 className="h-2.5 w-2.5 ml-1" />
                            {t('generator.saved')}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {l.industry && (
                        <Badge variant="outline" className="text-[10px]">
                          {l.industry}
                        </Badge>
                      )}
                      {l.email && (
                        <Badge variant="outline" className="text-[10px]">
                          {l.email}
                        </Badge>
                      )}
                      {l.source && (
                        <Badge variant="secondary" className="text-[10px] font-mono">
                          {l.source}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
                {(result.skipped ?? []).length > 0 && (
                  <p className="text-xs text-muted-foreground pt-2 border-t">
                    {t('generator.skipped', { count: result.skipped.length })}
                  </p>
                )}
              </div>
            ) : (
              <div className="grid place-items-center h-64 text-center">
                <div className="space-y-2">
                  <div className="grid place-items-center h-12 w-12 rounded-full bg-muted mx-auto">
                    <Sparkles className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">{t('generator.noSearchYet')}</p>
                  <p className="text-xs text-muted-foreground">{t('generator.noSearchHint')}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function ToggleRow({
  icon: Icon,
  label,
  hint,
  checked,
  onChange,
}: {
  icon: React.ElementType
  label: string
  hint: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-2 py-1.5">
      <div className="flex items-center gap-2">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-sm">{label}</span>
        <Badge variant="secondary" className="text-[10px] font-mono">
          {hint}
        </Badge>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  )
}

function scoreColor(score: number): { bg: string; fg: string } {
  if (score >= 75) return { bg: '#22c55e20', fg: '#22c55e' }
  if (score >= 50) return { bg: '#eab30820', fg: '#eab308' }
  if (score >= 25) return { bg: '#f9731620', fg: '#f97316' }
  return { bg: '#ef444420', fg: '#ef4444' }
}
