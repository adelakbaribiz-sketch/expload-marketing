'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import { Brain, Activity, Zap, AlertTriangle, Key, BarChart3, RotateCcw } from 'lucide-react'

const PROVIDER_INFO: Record<string, { signupUrl: string; docs: string }> = {
  groq: { signupUrl: 'https://console.groq.com/keys', docs: 'https://console.groq.com/docs' },
  cerebras: { signupUrl: 'https://cloud.cerebras.ai/', docs: 'https://inference-docs.cerebras.ai/' },
  openrouter: { signupUrl: 'https://openrouter.ai/keys', docs: 'https://openrouter.ai/docs' },
  mistral: { signupUrl: 'https://console.mistral.ai/', docs: 'https://docs.mistral.ai/' },
  huggingface: { signupUrl: 'https://huggingface.co/settings/tokens', docs: 'https://huggingface.co/docs/api-inference/' },
}

export function LlmSettingsView() {
  const qc = useQueryClient()

  const { data: providersData, isLoading } = useQuery({
    queryKey: ['llm-providers'],
    queryFn: async () => {
      const res = await fetch('/api/llm/providers')
      if (!res.ok) return { providers: [] }
      return res.json()
    },
  })

  const { data: usageData } = useQuery({
    queryKey: ['llm-usage', 'today'],
    queryFn: async () => {
      const res = await fetch('/api/llm/usage?period=today')
      if (!res.ok) return null
      return res.json()
    },
  })

  const { data: auditData } = useQuery({
    queryKey: ['llm-audit'],
    queryFn: async () => {
      const res = await fetch('/api/llm/audit?limit=20')
      if (!res.ok) return { events: [] }
      return res.json()
    },
  })

  const saveProvider = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/llm/providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Failed')
      return res.json()
    },
    onSuccess: () => {
      toast.success('Provider saved')
      qc.invalidateQueries({ queryKey: ['llm-providers'] })
    },
    onError: () => toast.error('Save failed'),
  })

  const resetProvider = useMutation({
    mutationFn: async (providerId: string) => {
      const res = await fetch(`/api/llm/providers?provider=${encodeURIComponent(providerId)}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed')
      return res.json()
    },
    onSuccess: () => {
      toast.success('Provider config reset to defaults')
      qc.invalidateQueries({ queryKey: ['llm-providers'] })
    },
    onError: () => toast.error('Reset failed'),
  })

  const providers = providersData?.providers ?? []
  const byProvider = usageData?.byProvider ?? []
  const totals = usageData?.totals
  const events = auditData?.events ?? []

  if (isLoading) return <Skeleton className="h-96" />

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Brain className="h-8 w-8" style={{ color: '#0A0A0B' }} />
          Multi-LLM Aggregator
        </h1>
        <p className="text-muted-foreground mt-1">
          Free-tier LLM providers with auto-fallback, token quota tracking & audit trail
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Active Providers</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{providers.filter(p => p.isActive && p.hasApiKey).length}</div>
            <p className="text-xs text-muted-foreground">of {providers.length} configured</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Tokens Today</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(totals?.totalTokens ?? 0).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">{totals?.requests ?? 0} requests</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Cost Today</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${(totals?.costUsd ?? 0).toFixed(4)}</div>
            <p className="text-xs text-muted-foreground">all free tier</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Recent Switches</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {events.filter(e => e.eventType === 'rate_limited' || e.eventType === 'provider_switched').length}
            </div>
            <p className="text-xs text-muted-foreground">last 20 events</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="providers">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="providers">Providers</TabsTrigger>
          <TabsTrigger value="usage">Usage</TabsTrigger>
          <TabsTrigger value="audit">Audit Trail</TabsTrigger>
        </TabsList>

        <TabsContent value="providers" className="space-y-3">
          {providers.map(p => {
            const info = PROVIDER_INFO[p.id]
            return (
              <Card key={p.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-semibold flex items-center gap-2">
                        <Zap className="h-4 w-4" style={{ color: '#FF6A00' }} />
                        {p.displayName}
                        <Badge variant="outline">{p.id}</Badge>
                        {p.isFreeTier && <Badge variant="secondary">FREE</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Default model: <code>{p.defaultModel}</code>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Daily limit: {(p.dailyTokenLimit ?? 0).toLocaleString()} tokens · {p.models.length} models available
                      </p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {p.models.slice(0, 4).map(m => (
                          <Badge key={m.id} variant="outline" className="text-[10px]">
                            {m.name.length > 24 ? m.id : m.name}
                          </Badge>
                        ))}
                        {p.models.length > 4 && <Badge variant="outline" className="text-[10px]">+{p.models.length - 4}</Badge>}
                      </div>
                      {info && (
                        <p className="text-xs mt-2">
                          <a href={info.signupUrl} target="_blank" rel="noopener" className="text-blue-600 underline">Get free API key →</a>
                          {' · '}
                          <a href={info.docs} target="_blank" rel="noopener" className="text-blue-600 underline">Docs</a>
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge variant={p.hasApiKey ? 'default' : 'outline'}>
                        {p.hasApiKey ? 'key set' : 'no key'}
                      </Badge>
                      {p.failureCount > 0 && (
                        <Badge variant="outline" style={{ color: '#ef4444' }}>
                          <AlertTriangle className="h-3 w-3 mr-1" /> {p.failureCount} failures
                        </Badge>
                      )}
                      <Switch
                        checked={p.isActive}
                        onCheckedChange={(checked) => saveProvider.mutate({
                          provider: p.id, isActive: checked,
                          displayName: p.displayName, apiKey: '',
                        })}
                      />
                      {p.hasApiKey && (
                        <Button
                          size="sm" variant="ghost" className="h-7 gap-1 text-xs text-destructive"
                          onClick={() => resetProvider.mutate(p.id)}
                          disabled={resetProvider.isPending}
                        >
                          <RotateCcw className="h-3 w-3" /> Reset
                        </Button>
                      )}
                    </div>
                  </div>
                  <ApiKeyInput
                    providerId={p.id}
                    displayName={p.displayName}
                    hasKey={p.hasApiKey}
                    onSave={(apiKey) => saveProvider.mutate({
                      provider: p.id, apiKey, displayName: p.displayName, isActive: true,
                    })}
                  />
                </CardContent>
              </Card>
            )
          })}
        </TabsContent>

        <TabsContent value="usage" className="space-y-3">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><BarChart3 className="h-4 w-4" /> Usage by Provider (Today)</CardTitle></CardHeader>
            <CardContent>
              {byProvider.length === 0 ? (
                <p className="text-sm text-muted-foreground">No usage today.</p>
              ) : (
                <div className="space-y-2">
                  {byProvider.map((u: any) => (
                    <div key={u.provider} className="flex justify-between items-center p-2 border rounded">
                      <div className="font-medium capitalize">{u.provider}</div>
                      <div className="text-right text-sm">
                        <div>{(u._sum.totalTokens ?? 0).toLocaleString()} tokens</div>
                        <div className="text-xs text-muted-foreground">{u._count} requests · ${(u._sum.costUsd ?? 0).toFixed(4)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit" className="space-y-1">
          {events.map((e: any) => (
            <div key={e.id} className="text-sm border-l-2 pl-3 py-1" style={{
              borderColor: e.eventType.includes('error') || e.eventType.includes('exceeded') ? '#ef4444'
                : e.eventType.includes('switched') || e.eventType.includes('limited') ? '#f59e0b'
                : '#10b981',
            }}>
              <div className="flex justify-between">
                <span className="font-medium capitalize">{e.provider} · {e.eventType.replace(/_/g, ' ')}</span>
                <span className="text-xs text-muted-foreground">{new Date(e.createdAt).toLocaleString()}</span>
              </div>
              <p className="text-xs text-muted-foreground">{e.message}</p>
            </div>
          ))}
          {events.length === 0 && <p className="text-sm text-muted-foreground p-8 text-center">No audit events.</p>}
        </TabsContent>
      </Tabs>
    </div>
  )
}

function ApiKeyInput({ providerId, displayName, hasKey, onSave }: {
  providerId: string; displayName: string; hasKey: boolean; onSave: (apiKey: string) => void
}) {
  return (
    <div className="mt-3 flex items-end gap-2">
      <div className="flex-1">
        <Label className="text-xs">API Key</Label>
        <Input
          type="password"
          placeholder={hasKey ? '•••••••• (saved)' : `Enter ${displayName} API key`}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              const value = (e.target as HTMLInputElement).value
              if (value) onSave(value); (e.target as HTMLInputElement).value = ''
            }
          }}
        />
      </div>
      <Key className="h-4 w-4 mb-2 text-muted-foreground" />
    </div>
  )
}
