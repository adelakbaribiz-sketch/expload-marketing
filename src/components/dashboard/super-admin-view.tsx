'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import {
  ShieldCheck, Building2, Users, DollarSign, TrendingUp,
  Activity, AlertTriangle, Crown, Eye, Server, Search, CheckCircle2, XCircle,
} from 'lucide-react'
import { useState } from 'react'

const SEVERITY_COLORS: Record<string, string> = {
  info: '#0A0A0B', warning: '#f59e0b', critical: '#ef4444',
}

export function SuperAdminView() {
  const qc = useQueryClient()
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[] | null>(null)
  const [searching, setSearching] = useState(false)

  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const res = await fetch('/api/admin/stats')
      if (!res.ok) return null
      return res.json()
    },
  })

  const { data: tenantsData } = useQuery({
    queryKey: ['admin-tenants'],
    queryFn: async () => {
      const res = await fetch('/api/admin/tenants')
      if (!res.ok) return { tenants: [] }
      return res.json()
    },
  })

  const { data: usersData } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const res = await fetch('/api/admin/users')
      if (!res.ok) return { users: [] }
      return res.json()
    },
  })

  const { data: auditData } = useQuery({
    queryKey: ['admin-audit'],
    queryFn: async () => {
      const res = await fetch('/api/admin/audit?limit=30')
      if (!res.ok) return { logs: [] }
      return res.json()
    },
  })

  const { data: queueData } = useQuery({
    queryKey: ['job-queue'],
    queryFn: async () => {
      const res = await fetch('/api/queue')
      if (!res.ok) return { jobs: [], total: 0, pending: 0, processing: 0, completed: 0, failed: 0 }
      return res.json()
    },
    refetchInterval: (query) => (query.state.data as any)?.unavailable ? false : 10000,
  })

  const { data: vectorStatus } = useQuery({
    queryKey: ['vector-search-status'],
    queryFn: async () => {
      const res = await fetch('/api/vector-search')
      if (!res.ok) return null
      return res.json()
    },
  })

  const runSearch = async () => {
    if (!searchQuery.trim()) return
    setSearching(true)
    try {
      const res = await fetch('/api/vector-search', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'search', query: searchQuery }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Search failed')
      setSearchResults(data.results ?? [])
    } catch (err: any) {
      toast.error(String(err?.message ?? err))
      setSearchResults([])
    } finally {
      setSearching(false)
    }
  }

  const toggleTenantMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const res = await fetch(`/api/admin/tenants/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !isActive }),
      })
      if (!res.ok) throw new Error('failed')
      return res.json()
    },
    onSuccess: () => {
      toast.success('Tenant updated')
      qc.invalidateQueries({ queryKey: ['admin-tenants'] })
    },
  })

  const promoteMutation = useMutation({
    mutationFn: async ({ id, make }: { id: string; make: boolean }) => {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ makeSuperAdmin: make }),
      })
      if (!res.ok) throw new Error('failed')
      return res.json()
    },
    onSuccess: () => {
      toast.success('User updated')
      qc.invalidateQueries({ queryKey: ['admin-users'] })
    },
  })

  const stats = statsData
  const tenants = tenantsData?.tenants ?? []
  const users = usersData?.users ?? []
  const auditLogs = auditData?.logs ?? []
  const queue = queueData ?? { jobs: [], total: 0, pending: 0, processing: 0, completed: 0, failed: 0 }

  if (statsLoading) {
    return <div className="p-6"><Skeleton className="h-40 w-full" /></div>
  }

  return (
    <div className="space-y-4 p-4 md:p-6 animate-fade-in-up">
      <div>
        <h2 className="text-base font-semibold flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-[#FFD700]" />
          Super Admin Panel
        </h2>
        <p className="text-xs text-muted-foreground">Platform-wide management — all tenants, users, revenue, and audit logs</p>
      </div>

      {/* Platform Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <Card><CardContent className="p-3"><Building2 className="h-4 w-4 text-[#0A0A0B] mb-1" /><p className="text-xl font-bold">{stats?.tenants ?? 0}</p><p className="text-[10px] text-muted-foreground">Tenants</p></CardContent></Card>
        <Card><CardContent className="p-3"><Users className="h-4 w-4 text-[#FF6A00] mb-1" /><p className="text-xl font-bold">{stats?.users ?? 0}</p><p className="text-[10px] text-muted-foreground">Users</p></CardContent></Card>
        <Card><CardContent className="p-3"><DollarSign className="h-4 w-4 text-emerald-600 mb-1" /><p className="text-xl font-bold text-emerald-600">${(stats?.mrr ?? 0).toLocaleString()}</p><p className="text-[10px] text-muted-foreground">MRR</p></CardContent></Card>
        <Card><CardContent className="p-3"><TrendingUp className="h-4 w-4 text-violet-600 mb-1" /><p className="text-xl font-bold">${(stats?.arr ?? 0).toLocaleString()}</p><p className="text-[10px] text-muted-foreground">ARR</p></CardContent></Card>
        <Card><CardContent className="p-3"><Activity className="h-4 w-4 text-[#C9CDD3] mb-1" /><p className="text-xl font-bold">{stats?.activeSubs ?? 0}</p><p className="text-[10px] text-muted-foreground">Active Subs</p></CardContent></Card>
        <Card><CardContent className="p-3"><Eye className="h-4 w-4 text-amber-600 mb-1" /><p className="text-xl font-bold">{stats?.apiProducts ?? 0}</p><p className="text-[10px] text-muted-foreground">API Products</p></CardContent></Card>
      </div>

      <Tabs defaultValue="tenants">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="tenants">Tenants ({tenants.length})</TabsTrigger>
          <TabsTrigger value="users">Users ({users.length})</TabsTrigger>
          <TabsTrigger value="audit">Audit Log ({auditLogs.length})</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
        </TabsList>

        {/* Tenants */}
        <TabsContent value="tenants" className="space-y-3">
          <div className="space-y-2 max-h-[500px] overflow-y-auto scroll-thin">
            {tenants.map((t: any) => (
              <Card key={t.id}>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="grid place-items-center h-10 w-10 rounded-lg bg-[#0A0A0B] text-white shrink-0">
                        <Building2 className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{t.name}</p>
                        <p className="text-xs text-muted-foreground truncate" dir="ltr">{t.domain} · {t.plan}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs shrink-0">
                      <Badge variant="outline" className="text-[10px]">{t._count?.users} users</Badge>
                      <Badge variant="outline" className="text-[10px]">{t._count?.leads} leads</Badge>
                      <Badge variant="outline" className="text-[10px]">{t._count?.projects} projects</Badge>
                      <Badge variant={t.isActive ? 'default' : 'secondary'} className="text-[10px]">{t.isActive ? 'Active' : 'Disabled'}</Badge>
                      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => toggleTenantMutation.mutate({ id: t.id, isActive: t.isActive })}>
                        {t.isActive ? 'Disable' : 'Enable'}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Users */}
        <TabsContent value="users" className="space-y-3">
          <div className="space-y-2 max-h-[500px] overflow-y-auto scroll-thin">
            {users.map((u: any) => (
              <Card key={u.id}>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className={`grid place-items-center h-9 w-9 rounded-full text-white shrink-0 ${u.superAdmin ? 'bg-[#FFD700] text-black' : 'bg-[#0A0A0B]'}`}>
                        {u.superAdmin ? <Crown className="h-4 w-4" /> : <Users className="h-4 w-4" />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{u.name || u.email}</p>
                        <p className="text-xs text-muted-foreground truncate" dir="ltr">{u.email} · {u.tenant?.name || 'No tenant'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="outline" className="text-[10px] capitalize">{u.role}</Badge>
                      {u.superAdmin && <Badge className="text-[10px] bg-[#FFD700] text-black">Super Admin</Badge>}
                      <Badge variant={u.isActive ? 'default' : 'secondary'} className="text-[10px]">{u.isActive ? 'Active' : 'Disabled'}</Badge>
                      <Button
                        size="sm"
                        variant={u.superAdmin ? 'destructive' : 'outline'}
                        className="h-7 text-xs"
                        onClick={() => promoteMutation.mutate({ id: u.id, make: !u.superAdmin })}
                      >
                        {u.superAdmin ? 'Demote' : 'Make Super Admin'}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Audit Log */}
        <TabsContent value="audit" className="space-y-3">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm">Platform Audit Log</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-1.5 max-h-[500px] overflow-y-auto scroll-thin">
                {auditLogs.map((log: any) => (
                  <div key={log.id} className="flex items-center gap-3 p-2 rounded-md bg-muted/30 text-xs">
                    <Badge variant="outline" className="text-[9px] capitalize" style={{ background: (SEVERITY_COLORS[log.severity] ?? '#0A0A0B') + '20', color: SEVERITY_COLORS[log.severity] ?? '#0A0A0B' }}>
                      {log.severity === 'critical' && <AlertTriangle className="h-2.5 w-2.5 mr-1" />}
                      {log.severity}
                    </Badge>
                    <Badge variant="outline" className="text-[9px]">{log.action}</Badge>
                    <span className="flex-1 truncate">{log.description}</span>
                    {log.tenant?.name && <span className="text-muted-foreground shrink-0">{log.tenant.name}</span>}
                    <span className="text-muted-foreground shrink-0">{new Date(log.createdAt).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* System */}
        <TabsContent value="system" className="space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Card><CardContent className="p-3"><Server className="h-4 w-4 text-[#0A0A0B] mb-1" /><p className="text-xl font-bold">{queue.total}</p><p className="text-[10px] text-muted-foreground">Total Jobs</p></CardContent></Card>
            <Card><CardContent className="p-3"><Activity className="h-4 w-4 text-amber-600 mb-1" /><p className="text-xl font-bold">{queue.pending}</p><p className="text-[10px] text-muted-foreground">Queued</p></CardContent></Card>
            <Card><CardContent className="p-3"><Activity className="h-4 w-4 text-blue-600 mb-1" /><p className="text-xl font-bold">{queue.processing}</p><p className="text-[10px] text-muted-foreground">Processing</p></CardContent></Card>
            <Card><CardContent className="p-3"><CheckCircle2 className="h-4 w-4 text-emerald-600 mb-1" /><p className="text-xl font-bold">{queue.completed}</p><p className="text-[10px] text-muted-foreground">Completed</p></CardContent></Card>
            <Card><CardContent className="p-3"><XCircle className="h-4 w-4 text-red-600 mb-1" /><p className="text-xl font-bold">{queue.failed}</p><p className="text-[10px] text-muted-foreground">Failed</p></CardContent></Card>
          </div>

          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm">Background Job Queue</CardTitle></CardHeader>
            <CardContent>
              {(queue as any).unavailable ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  Queue backend unreachable (Redis not connected). Jobs will appear here once it's running.
                </p>
              ) : queue.jobs.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No jobs in the queue.</p>
              ) : (
                <div className="space-y-1.5 max-h-72 overflow-y-auto scroll-thin">
                  {queue.jobs.map((j: any, i: number) => (
                    <div key={j.id ?? i} className="flex items-center gap-3 p-2 rounded-md bg-muted/30 text-xs">
                      <Badge variant="outline" className="text-[9px] capitalize">{j.type ?? 'job'}</Badge>
                      <span className="flex-1 truncate">{j.name ?? j.id}</span>
                      <Badge
                        variant="outline" className="text-[9px] capitalize"
                        style={{
                          color: j.status === 'failed' ? '#ef4444' : j.status === 'completed' ? '#22c55e' : j.status === 'processing' ? '#3b82f6' : '#f59e0b',
                        }}
                      >
                        {j.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Search className="h-4 w-4 text-violet-600" /> Semantic Search
                <Badge variant={vectorStatus?.qdrantEnabled ? 'default' : 'secondary'} className="text-[9px] ml-2">
                  {vectorStatus?.qdrantEnabled ? 'Qdrant connected' : 'Qdrant not configured'}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 mb-3">
                <Input
                  value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search indexed content across your tenant..."
                  onKeyDown={(e) => e.key === 'Enter' && runSearch()}
                />
                <Button onClick={runSearch} disabled={searching || !searchQuery.trim()}>{searching ? 'Searching…' : 'Search'}</Button>
              </div>
              {searchResults && (
                searchResults.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">No matches found.</p>
                ) : (
                  <div className="space-y-1.5">
                    {searchResults.map((r: any, i: number) => (
                      <div key={i} className="p-2 rounded-md bg-muted/30 text-xs">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-[9px]">{r.sourceType}</Badge>
                          {r.score !== undefined && <span className="text-muted-foreground">score: {Number(r.score).toFixed(3)}</span>}
                        </div>
                        <p className="truncate">{r.textChunk ?? r.text ?? JSON.stringify(r)}</p>
                      </div>
                    ))}
                  </div>
                )
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
