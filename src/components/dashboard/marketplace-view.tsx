'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Key, Plus, Trash2, DollarSign, Zap, Code, Copy, Eye, TrendingUp, Lock } from 'lucide-react'
import { useState } from 'react'

const CATEGORY_COLORS: Record<string, string> = {
  marketing: '#0A2A3A',
  seo: '#FF5722',
  leads: '#80DEEA',
  ai: '#7C4DFF',
  social: '#EC4899',
  analytics: '#10B981',
}

export function MarketplaceView() {
  const qc = useQueryClient()
  const [tab, setTab] = useState('products')
  const [keyOpen, setKeyOpen] = useState(false)
  const [keyName, setKeyName] = useState('')
  const [newKey, setNewKey] = useState<string | null>(null)

  const { data: productsData } = useQuery({
    queryKey: ['api-products'],
    queryFn: async () => {
      const res = await fetch('/api/marketplace/products')
      if (!res.ok) return { products: [] }
      return res.json()
    },
  })

  const { data: keysData } = useQuery({
    queryKey: ['api-keys'],
    queryFn: async () => {
      const res = await fetch('/api/marketplace/keys')
      if (!res.ok) return { keys: [] }
      return res.json()
    },
  })

  const { data: usageData } = useQuery({
    queryKey: ['api-usage'],
    queryFn: async () => {
      const res = await fetch('/api/marketplace/usage')
      if (!res.ok) return null
      return res.json()
    },
  })

  const createKeyMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await fetch('/api/marketplace/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, billingCycle: 'prepaid', balance: 10 }),
      })
      if (!res.ok) throw new Error('create failed')
      return res.json()
    },
    onSuccess: (data) => {
      toast.success('API key created — copy it now, you won\'t see it again!')
      setNewKey(data.apiKey.key)
      qc.invalidateQueries({ queryKey: ['api-keys'] })
      qc.invalidateQueries({ queryKey: ['api-usage'] })
      setKeyOpen(false)
      setKeyName('')
    },
  })

  const revokeKeyMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/marketplace/keys/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('revoke failed')
      return res.json()
    },
    onSuccess: () => {
      toast.success('API key revoked')
      qc.invalidateQueries({ queryKey: ['api-keys'] })
    },
  })

  const products = productsData?.products ?? []
  const keys = keysData?.keys ?? []
  const usage = usageData

  return (
    <div className="space-y-4 p-4 md:p-6 animate-fade-in-up">
      <div>
        <h2 className="text-base font-semibold flex items-center gap-2">
          <Code className="h-5 w-5 text-[#0A2A3A]" />
          API Marketplace
        </h2>
        <p className="text-xs text-muted-foreground">Sell API access to your platform's capabilities and earn revenue</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <Code className="h-4 w-4 text-[#0A2A3A] mb-1" />
            <p className="text-2xl font-bold">{products.length}</p>
            <p className="text-xs text-muted-foreground">API Products</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <Key className="h-4 w-4 text-[#FF5722] mb-1" />
            <p className="text-2xl font-bold">{keys.filter((k: any) => k.isActive).length}</p>
            <p className="text-xs text-muted-foreground">Active Keys</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <Zap className="h-4 w-4 text-[#80DEEA] mb-1" />
            <p className="text-2xl font-bold">{usage?.totalCalls?.toLocaleString() ?? 0}</p>
            <p className="text-xs text-muted-foreground">Total Calls</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <DollarSign className="h-4 w-4 text-emerald-600 mb-1" />
            <p className="text-2xl font-bold">${(usage?.totalCost ?? 0).toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">Revenue</p>
          </CardContent>
        </Card>
      </div>

      {newKey && (
        <Card className="border-[#FF5722]/30 bg-[#FF5722]/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Key className="h-4 w-4 text-[#FF5722]" />
              <p className="text-sm font-medium">Your new API key (copy now — shown only once)</p>
            </div>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded-md bg-muted p-2 text-xs font-mono break-all" dir="ltr">{newKey}</code>
              <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(newKey); toast.success('Copied!') }}>
                <Copy className="h-3.5 w-3.5" />
              </Button>
            </div>
            <Button size="sm" variant="ghost" className="mt-2" onClick={() => setNewKey(null)}>Dismiss</Button>
          </CardContent>
        </Card>
      )}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="products">API Products</TabsTrigger>
          <TabsTrigger value="keys">API Keys</TabsTrigger>
          <TabsTrigger value="usage">Usage & Revenue</TabsTrigger>
        </TabsList>

        {/* Products Tab */}
        <TabsContent value="products" className="space-y-3">
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {products.map((p: any) => (
              <Card key={p.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-[10px]" style={{ borderColor: CATEGORY_COLORS[p.category] ?? '#0A2A3A', color: CATEGORY_COLORS[p.category] ?? '#0A2A3A' }}>{p.category}</Badge>
                        {p.isFeatured && <Badge className="text-[9px] bg-[#FF5722]">Featured</Badge>}
                      </div>
                      <p className="font-medium text-sm">{p.name}</p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{p.description}</p>
                  <div className="flex items-center justify-between text-xs">
                    <div>
                      <span className="font-medium text-[#0A2A3A]">${p.pricePerCall}</span>
                      <span className="text-muted-foreground">/call</span>
                      {p.pricePerMonth > 0 && <span className="text-muted-foreground ml-2">or ${p.pricePerMonth}/mo</span>}
                    </div>
                    <span className="text-muted-foreground">{p._count?.keys ?? 0} subscribers</span>
                  </div>
                  <div className="mt-2 pt-2 border-t">
                    <code className="text-[10px] font-mono text-muted-foreground" dir="ltr">{p.method} {p.endpoint}</code>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Keys Tab */}
        <TabsContent value="keys" className="space-y-3">
          <div className="flex justify-end">
            <Dialog open={keyOpen} onOpenChange={setKeyOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2"><Plus className="h-4 w-4" /> Generate API Key</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Generate New API Key</DialogTitle></DialogHeader>
                <div>
                  <Label>Key Name</Label>
                  <Input value={keyName} onChange={(e) => setKeyName(e.target.value)} placeholder="Production API Key" />
                  <p className="text-[11px] text-muted-foreground mt-2">Each key gets $10 prepaid balance to start. You can top up later.</p>
                </div>
                <DialogFooter>
                  <Button variant="ghost" onClick={() => setKeyOpen(false)}>Cancel</Button>
                  <Button onClick={() => createKeyMutation.mutate(keyName)} disabled={!keyName || createKeyMutation.isPending}>
                    {createKeyMutation.isPending ? 'Generating…' : 'Generate Key'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {keys.length === 0 ? (
            <Card><CardContent className="p-12 text-center"><Key className="h-10 w-10 mx-auto text-muted-foreground" /><p className="text-sm text-muted-foreground mt-2">No API keys yet. Generate one to start using the API.</p></CardContent></Card>
          ) : (
            <div className="space-y-2">
              {keys.map((k: any) => (
                <Card key={k.id}>
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className={`grid place-items-center h-8 w-8 rounded-md ${k.isActive ? 'bg-[#0A2A3A] text-white' : 'bg-muted text-muted-foreground'}`}>
                          <Key className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{k.name}</p>
                          <code className="text-[10px] font-mono text-muted-foreground" dir="ltr">{k.key}</code>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-xs shrink-0">
                        <div className="text-center">
                          <p className="font-medium">{k.totalCalls.toLocaleString()}</p>
                          <p className="text-[9px] text-muted-foreground">calls</p>
                        </div>
                        <div className="text-center">
                          <p className="font-medium">${k.totalCost.toFixed(2)}</p>
                          <p className="text-[9px] text-muted-foreground">spent</p>
                        </div>
                        <div className="text-center">
                          <p className="font-medium text-emerald-600">${k.balance.toFixed(2)}</p>
                          <p className="text-[9px] text-muted-foreground">balance</p>
                        </div>
                        <Badge variant={k.isActive ? 'default' : 'secondary'} className="text-[10px]">{k.isActive ? 'Active' : 'Revoked'}</Badge>
                        {k.isActive && (
                          <Button size="sm" variant="ghost" className="text-destructive hover:bg-destructive/10 h-7 w-7 p-0" onClick={() => revokeKeyMutation.mutate(k.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Usage Tab */}
        <TabsContent value="usage" className="space-y-3">
          {usage && (
            <>
              <Card>
                <CardHeader className="pb-3"><CardTitle className="text-sm">Revenue Overview</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div><p className="text-2xl font-bold text-[#0A2A3A]">{usage.totalCalls.toLocaleString()}</p><p className="text-xs text-muted-foreground">Total API Calls</p></div>
                    <div><p className="text-2xl font-bold text-[#FF5722]">${usage.totalCost.toFixed(2)}</p><p className="text-xs text-muted-foreground">Total Revenue</p></div>
                    <div><p className="text-2xl font-bold text-emerald-600">{usage.activeKeys}</p><p className="text-xs text-muted-foreground">Active Keys</p></div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3"><CardTitle className="text-sm">Recent API Calls</CardTitle></CardHeader>
                <CardContent>
                  {usage.recentUsage.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">No API calls yet.</p>
                  ) : (
                    <div className="space-y-1.5 max-h-64 overflow-y-auto scroll-thin">
                      {usage.recentUsage.map((u: any) => (
                        <div key={u.id} className="flex items-center gap-3 p-2 rounded-md bg-muted/30 text-xs">
                          <Badge variant="outline" className="text-[9px] font-mono">{u.statusCode}</Badge>
                          <span className="font-mono truncate flex-1" dir="ltr">{u.method} {u.endpoint}</span>
                          <span className="text-muted-foreground">${u.cost.toFixed(4)}</span>
                          <span className="text-muted-foreground">{new Date(u.createdAt).toLocaleTimeString()}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
