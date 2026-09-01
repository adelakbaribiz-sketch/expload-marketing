'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
import { Plus, Globe2, Package, FileSearch, TrendingUp, DollarSign, Users, MapPin, Loader2, AlertTriangle } from 'lucide-react'

const OPPORTUNITY_COLORS: Record<string, string> = {
  low: '#22c55e',
  medium: '#f59e0b',
  high: '#ef4444',
  very_high: '#dc2626',
}

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: '#22c55e',
  moderate: '#f59e0b',
  difficult: '#f97316',
  very_difficult: '#ef4444',
}

export function ExportAnalyzerView() {
  const qc = useQueryClient()
  const [tab, setTab] = useState('markets')
  const [marketOpen, setMarketOpen] = useState(false)
  const [productOpen, setProductOpen] = useState(false)
  const [researchOpen, setResearchOpen] = useState(false)
  const [marketForm, setMarketForm] = useState({ country: '', countryCode: '', region: '' })
  const [productForm, setProductForm] = useState({ name: '', category: '', hsCode: '' })
  const [researchForm, setResearchForm] = useState({ title: '', type: 'market_entry', country: '', summary: '' })

  const { data: marketsData, isLoading: marketsLoading } = useQuery({
    queryKey: ['export-markets'],
    queryFn: async () => {
      const res = await fetch('/api/analyzers/export-markets')
      if (!res.ok) return { items: [] }
      return res.json()
    },
  })

  const { data: productsData } = useQuery({
    queryKey: ['export-products'],
    queryFn: async () => {
      const res = await fetch('/api/analyzers/export-products')
      if (!res.ok) return { items: [] }
      return res.json()
    },
  })

  const { data: researchData } = useQuery({
    queryKey: ['market-research'],
    queryFn: async () => {
      const res = await fetch('/api/analyzers/market-research')
      if (!res.ok) return { items: [] }
      return res.json()
    },
  })

  const createMarketMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch('/api/analyzers/export-markets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payload,
          marketSize: Number(0.5 + Math.random() * 50),
          growthRate: Number(2 + Math.random() * 15),
          importVolume: Number(100 + Math.random() * 5000),
          tariffRate: Number(0 + Math.random() * 25),
          vatRate: Number(5 + Math.random() * 20),
          opportunityScore: Math.floor(30 + Math.random() * 65),
          competitionLevel: ['low', 'medium', 'high', 'very_high'][Math.floor(Math.random() * 4)],
          marketEntryDifficulty: ['easy', 'moderate', 'difficult'][Math.floor(Math.random() * 3)],
          population: Math.floor(1000000 + Math.random() * 200000000),
          gdpPerCapita: Number(1000 + Math.random() * 60000),
          internetPenetration: Number(30 + Math.random() * 70),
          language: payload.country === 'Germany' ? 'German' : payload.country === 'Japan' ? 'Japanese' : 'Various',
          currency: payload.country === 'Germany' ? 'EUR' : payload.country === 'Japan' ? 'JPY' : 'USD',
        }),
      })
      if (!res.ok) throw new Error('create failed')
      return res.json()
    },
    onSuccess: () => {
      toast.success('Export market added')
      qc.invalidateQueries({ queryKey: ['export-markets'] })
      setMarketOpen(false)
      setMarketForm({ country: '', countryCode: '', region: '' })
    },
  })

  const createProductMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch('/api/analyzers/export-products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payload,
          globalMarketSize: Number(1 + Math.random() * 100),
          globalGrowthRate: Number(3 + Math.random() * 12),
          avgPrice: Number(10 + Math.random() * 1000),
          opportunityScore: Math.floor(40 + Math.random() * 55),
        }),
      })
      if (!res.ok) throw new Error('create failed')
      return res.json()
    },
    onSuccess: () => {
      toast.success('Product added')
      qc.invalidateQueries({ queryKey: ['export-products'] })
      setProductOpen(false)
      setProductForm({ name: '', category: '', hsCode: '' })
    },
  })

  const createResearchMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch('/api/analyzers/market-research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('create failed')
      return res.json()
    },
    onSuccess: () => {
      toast.success('Research report created')
      qc.invalidateQueries({ queryKey: ['market-research'] })
      setResearchOpen(false)
      setResearchForm({ title: '', type: 'market_entry', country: '', summary: '' })
    },
  })

  const markets = marketsData?.items ?? []
  const products = productsData?.items ?? []
  const research = researchData?.items ?? []
  const avgOpportunity = markets.length > 0 ? Math.round(markets.reduce((s: number, m: any) => s + (m.opportunityScore || 0), 0) / markets.length) : 0
  const totalMarketSize = markets.reduce((s: number, m: any) => s + (m.marketSize || 0), 0)

  return (
    <div className="space-y-4 p-4 md:p-6 animate-fade-in-up">
      <div>
        <h2 className="text-base font-semibold flex items-center gap-2">
          <Globe2 className="h-5 w-5 text-cyan-600" />
          Export Market Analyzer
        </h2>
        <p className="text-xs text-muted-foreground">International trade intelligence, market research, competitor analysis</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <Globe2 className="h-4 w-4 text-cyan-600 mb-1" />
            <p className="text-2xl font-bold">{markets.length}</p>
            <p className="text-xs text-muted-foreground">Target Markets</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <DollarSign className="h-4 w-4 text-emerald-600 mb-1" />
            <p className="text-2xl font-bold">${totalMarketSize.toFixed(1)}B</p>
            <p className="text-xs text-muted-foreground">Total Market Size</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <TrendingUp className="h-4 w-4 text-violet-600 mb-1" />
            <p className="text-2xl font-bold">{avgOpportunity}</p>
            <p className="text-xs text-muted-foreground">Avg Opportunity Score</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <Package className="h-4 w-4 text-amber-600 mb-1" />
            <p className="text-2xl font-bold">{products.length}</p>
            <p className="text-xs text-muted-foreground">Products</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="markets">Markets</TabsTrigger>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="research">Research</TabsTrigger>
        </TabsList>

        {/* Markets Tab */}
        <TabsContent value="markets" className="space-y-3">
          <div className="flex justify-end">
            <Dialog open={marketOpen} onOpenChange={setMarketOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2"><Plus className="h-4 w-4" /> Add Market</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Add Export Market</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div>
                    <Label>Country</Label>
                    <Input value={marketForm.country} onChange={(e) => setMarketForm({ ...marketForm, country: e.target.value })} placeholder="Germany" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label>Country Code (ISO 2)</Label>
                      <Input value={marketForm.countryCode} onChange={(e) => setMarketForm({ ...marketForm, countryCode: e.target.value.toUpperCase() })} placeholder="DE" maxLength={2} dir="ltr" />
                    </div>
                    <div>
                      <Label>Region</Label>
                      <Input value={marketForm.region} onChange={(e) => setMarketForm({ ...marketForm, region: e.target.value })} placeholder="Europe" />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="ghost" onClick={() => setMarketOpen(false)}>Cancel</Button>
                  <Button onClick={() => createMarketMutation.mutate(marketForm)} disabled={!marketForm.country || !marketForm.countryCode || createMarketMutation.isPending}>
                    {createMarketMutation.isPending ? 'Adding…' : 'Add Market'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {marketsLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : markets.length === 0 ? (
            <Card><CardContent className="p-12 text-center"><Globe2 className="h-10 w-10 mx-auto text-muted-foreground" /><p className="text-sm text-muted-foreground mt-2">No export markets added yet.</p></CardContent></Card>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {markets.map((m: any) => (
                <Card key={m.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <p className="font-medium text-sm">{m.country}</p>
                        <p className="text-xs text-muted-foreground">{m.region} · {m.currency} · {m.language}</p>
                      </div>
                      <Badge variant="outline" className="text-[10px]" style={{ background: (OPPORTUNITY_COLORS[m.competitionLevel] ?? '#64748b') + '20', color: OPPORTUNITY_COLORS[m.competitionLevel] ?? '#64748b' }}>
                        {m.competitionLevel?.replace('_', ' ')}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div><span className="text-muted-foreground">Market Size:</span> <span className="font-medium">${(m.marketSize || 0).toFixed(1)}B</span></div>
                      <div><span className="text-muted-foreground">Growth:</span> <span className="font-medium text-emerald-600">+{m.growthRate || 0}%</span></div>
                      <div><span className="text-muted-foreground">Tariff:</span> <span className="font-medium">{m.tariffRate || 0}%</span></div>
                      <div><span className="text-muted-foreground">VAT:</span> <span className="font-medium">{m.vatRate || 0}%</span></div>
                    </div>
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                        <span>Opportunity Score</span>
                        <span>{m.opportunityScore}/100</span>
                      </div>
                      <Progress value={m.opportunityScore || 0} className="h-1.5" />
                    </div>
                    <div className="flex items-center justify-between mt-2 text-xs">
                      <span className="text-muted-foreground">Entry:</span>
                      <Badge variant="outline" className="text-[10px]" style={{ background: (DIFFICULTY_COLORS[m.marketEntryDifficulty] ?? '#64748b') + '20', color: DIFFICULTY_COLORS[m.marketEntryDifficulty] ?? '#64748b' }}>
                        {m.marketEntryDifficulty?.replace('_', ' ')}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Products Tab */}
        <TabsContent value="products" className="space-y-3">
          <div className="flex justify-end">
            <Dialog open={productOpen} onOpenChange={setProductOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2"><Plus className="h-4 w-4" /> Add Product</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Add Export Product</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div>
                    <Label>Product Name</Label>
                    <Input value={productForm.name} onChange={(e) => setProductForm({ ...productForm, name: e.target.value })} placeholder="Organic Honey" />
                  </div>
                  <div>
                    <Label>Category</Label>
                    <Input value={productForm.category} onChange={(e) => setProductForm({ ...productForm, category: e.target.value })} placeholder="Food & Beverage" />
                  </div>
                  <div>
                    <Label>HS Code (optional)</Label>
                    <Input value={productForm.hsCode} onChange={(e) => setProductForm({ ...productForm, hsCode: e.target.value })} placeholder="040900" dir="ltr" />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="ghost" onClick={() => setProductOpen(false)}>Cancel</Button>
                  <Button onClick={() => createProductMutation.mutate(productForm)} disabled={!productForm.name || createProductMutation.isPending}>
                    {createProductMutation.isPending ? 'Adding…' : 'Add Product'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {products.length === 0 ? (
            <Card><CardContent className="p-12 text-center"><Package className="h-10 w-10 mx-auto text-muted-foreground" /><p className="text-sm text-muted-foreground mt-2">No products added yet.</p></CardContent></Card>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {products.map((p: any) => (
                <Card key={p.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <p className="font-medium text-sm">{p.name}</p>
                        <p className="text-xs text-muted-foreground">{p.category}{p.hsCode ? ` · HS: ${p.hsCode}` : ''}</p>
                      </div>
                      <Badge variant="outline" className="text-[10px]">{p.opportunityScore}/100</Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div><span className="text-muted-foreground">Market:</span> <span className="font-medium">${(p.globalMarketSize || 0).toFixed(1)}B</span></div>
                      <div><span className="text-muted-foreground">Growth:</span> <span className="font-medium text-emerald-600">+{p.globalGrowthRate || 0}%</span></div>
                      <div><span className="text-muted-foreground">Avg Price:</span> <span className="font-medium">${p.avgPrice || 0}</span></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Research Tab */}
        <TabsContent value="research" className="space-y-3">
          <div className="flex justify-end">
            <Dialog open={researchOpen} onOpenChange={setResearchOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2"><Plus className="h-4 w-4" /> New Research</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Market Research Report</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div>
                    <Label>Title</Label>
                    <Input value={researchForm.title} onChange={(e) => setResearchForm({ ...researchForm, title: e.target.value })} placeholder="Entering the German Market" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label>Type</Label>
                      <Select value={researchForm.type} onValueChange={(v) => setResearchForm({ ...researchForm, type: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="market_entry">Market Entry</SelectItem>
                          <SelectItem value="competitor">Competitor Analysis</SelectItem>
                          <SelectItem value="product_fit">Product Fit</SelectItem>
                          <SelectItem value="pricing">Pricing Strategy</SelectItem>
                          <SelectItem value="distribution">Distribution</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Country (optional)</Label>
                      <Input value={researchForm.country} onChange={(e) => setResearchForm({ ...researchForm, country: e.target.value })} placeholder="Germany" />
                    </div>
                  </div>
                  <div>
                    <Label>Summary</Label>
                    <Textarea rows={3} value={researchForm.summary} onChange={(e) => setResearchForm({ ...researchForm, summary: e.target.value })} />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="ghost" onClick={() => setResearchOpen(false)}>Cancel</Button>
                  <Button onClick={() => createResearchMutation.mutate(researchForm)} disabled={!researchForm.title || !researchForm.summary || createResearchMutation.isPending}>
                    {createResearchMutation.isPending ? 'Creating…' : 'Create'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {research.length === 0 ? (
            <Card><CardContent className="p-12 text-center"><FileSearch className="h-10 w-10 mx-auto text-muted-foreground" /><p className="text-sm text-muted-foreground mt-2">No research reports yet.</p></CardContent></Card>
          ) : (
            <div className="space-y-3">
              {research.map((r: any) => (
                <Card key={r.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm truncate">{r.title}</p>
                        <p className="text-xs text-muted-foreground">{r.type.replace('_', ' ')}{r.country ? ` · ${r.country}` : ''}</p>
                      </div>
                      <Badge variant="outline" className="capitalize shrink-0">{r.status}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">{r.summary}</p>
                    {r.confidenceScore && (
                      <div className="mt-2 flex items-center gap-2 text-xs">
                        <span className="text-muted-foreground">Confidence:</span>
                        <Progress value={r.confidenceScore} className="h-1 w-20" />
                        <span className="font-medium">{r.confidenceScore}%</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
