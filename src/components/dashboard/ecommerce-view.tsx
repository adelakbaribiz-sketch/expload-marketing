'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import {
  Package, Search, Calculator, DollarSign, TrendingUp, Star, Zap,
  Loader2, AlertTriangle, Check, Clock, Target, BarChart3, ShoppingBag,
} from 'lucide-react'
import { useState } from 'react'

const PLATFORM_INFO: Record<string, { name: string; color: string; emoji: string }> = {
  amazon: { name: 'Amazon', color: '#FF9900', emoji: '📦' },
  aliexpress: { name: 'AliExpress', color: '#E62E04', emoji: '🛒' },
  alibaba: { name: 'Alibaba', color: '#FF6A00', emoji: '🏭' },
  ebay: { name: 'eBay', color: '#E53238', emoji: '🔄' },
  shopify: { name: 'Shopify', color: '#96BF48', emoji: '🏪' },
  etsy: { name: 'Etsy', color: '#F16432', emoji: '🎨' },
}

const RISK_COLORS: Record<string, string> = { low: '#22c55e', medium: '#f59e0b', high: '#ef4444', very_high: '#dc2626' }

export function EcommerceView() {
  const qc = useQueryClient()
  const [tab, setTab] = useState('analyze')
  const [analyzeForm, setAnalyzeForm] = useState({ platform: 'amazon', keyword: '', category: 'general' })
  const [calcForm, setCalcForm] = useState({
    productPrice: '29.99', productCost: '8', platform: 'amazon',
    monthlyVolume: '200', shippingCost: '2', advertisingCost: '150', otherCosts: '50', initialInvestment: '1000',
  })
  const [calcResult, setCalcResult] = useState<any>(null)

  const { data: productsData } = useQuery({
    queryKey: ['ecommerce-products'],
    queryFn: async () => {
      const res = await fetch('/api/ecommerce/products')
      if (!res.ok) return { items: [] }
      return res.json()
    },
  })

  const analyzeMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch('/api/ecommerce/analyze', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('analyze failed')
      return res.json()
    },
    onSuccess: (data) => {
      toast.success(`${data.analyzed} products analyzed on ${data.platform}`)
      qc.invalidateQueries({ queryKey: ['ecommerce-products'] })
    },
  })

  const calcMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch('/api/ecommerce/profit-calculator', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('calc failed')
      return res.json()
    },
    onSuccess: (data) => {
      setCalcResult(data)
      toast.success('Profit calculated!')
    },
  })

  const products = productsData?.items ?? []

  return (
    <div className="space-y-4 p-4 md:p-6 animate-fade-in-up">
      <div>
        <h2 className="text-base font-semibold flex items-center gap-2">
          <ShoppingBag className="h-5 w-5 text-[#0A0A0B]" />
          Ecommerce Analyzer
        </h2>
        <p className="text-xs text-muted-foreground">Research products on Amazon, AliExpress, Alibaba, eBay — analyze profit, competition, and trends</p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="analyze">Product Research</TabsTrigger>
          <TabsTrigger value="calculator">Profit Calculator</TabsTrigger>
          <TabsTrigger value="saved">Saved Products</TabsTrigger>
        </TabsList>

        {/* Analyze Tab */}
        <TabsContent value="analyze" className="space-y-3">
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>Platform</Label>
                  <Select value={analyzeForm.platform} onValueChange={(v) => setAnalyzeForm({ ...analyzeForm, platform: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(PLATFORM_INFO).map(([key, info]) => (
                        <SelectItem key={key} value={key}>{info.emoji} {info.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Keyword / Product Name</Label>
                  <Input value={analyzeForm.keyword} onChange={(e) => setAnalyzeForm({ ...analyzeForm, keyword: e.target.value })} placeholder="wireless earbuds" dir="ltr" />
                </div>
                <div>
                  <Label>Category</Label>
                  <Select value={analyzeForm.category} onValueChange={(v) => setAnalyzeForm({ ...analyzeForm, category: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['general', 'electronics', 'home', 'beauty', 'toys', 'fashion', 'sports'].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                  </Select>
                </div>
              </div>
              <Button className="w-full gap-2" onClick={() => analyzeMutation.mutate(analyzeForm)} disabled={!analyzeForm.keyword || analyzeMutation.isPending}>
                {analyzeMutation.isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Analyzing…</> : <><Search className="h-4 w-4" /> Analyze Products</>}
              </Button>
            </CardContent>
          </Card>

          {/* Results */}
          {analyzeMutation.data && (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {analyzeMutation.data.products.map((p: any) => {
                const info = PLATFORM_INFO[p.platform] ?? PLATFORM_INFO.amazon
                return (
                  <Card key={p.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-lg">{info.emoji}</span>
                            <Badge variant="outline" className="text-[10px]" style={{ borderColor: info.color, color: info.color }}>{info.name}</Badge>
                          </div>
                          <p className="font-medium text-sm truncate">{p.title}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                        <div><span className="text-muted-foreground">Price:</span> <span className="font-medium">${p.price}</span></div>
                        <div><span className="text-muted-foreground">Cost:</span> <span className="font-medium">${p.costEstimate}</span></div>
                        <div><span className="text-muted-foreground">Profit:</span> <span className="font-medium text-emerald-600">${p.estimatedProfit}</span></div>
                        <div><span className="text-muted-foreground">Margin:</span> <span className="font-medium">{p.estimatedMargin}%</span></div>
                        <div><span className="text-muted-foreground">Sales/mo:</span> <span className="font-medium">{p.salesPerMonth?.toLocaleString()}</span></div>
                        <div><span className="text-muted-foreground">Rating:</span> <span className="font-medium">⭐ {p.rating}</span></div>
                      </div>
                      <div className="flex items-center justify-between text-[10px]">
                        <Badge variant="outline" className="capitalize" style={{ background: RISK_COLORS[p.competitionLevel] + '20', color: RISK_COLORS[p.competitionLevel] }}>{p.competitionLevel} competition</Badge>
                        <span className="text-muted-foreground capitalize">{p.trendDirection} 📈</span>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>

        {/* Calculator Tab */}
        <TabsContent value="calculator" className="space-y-3">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardContent className="p-4 space-y-3">
                <h3 className="text-sm font-medium flex items-center gap-2"><Calculator className="h-4 w-4 text-[#FF6A00]" /> Profit Calculator</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Selling Price ($)</Label><Input type="number" value={calcForm.productPrice} onChange={(e) => setCalcForm({ ...calcForm, productPrice: e.target.value })} dir="ltr" /></div>
                  <div><Label>Sourcing Cost ($)</Label><Input type="number" value={calcForm.productCost} onChange={(e) => setCalcForm({ ...calcForm, productCost: e.target.value })} dir="ltr" /></div>
                  <div><Label>Platform</Label><Select value={calcForm.platform} onValueChange={(v) => setCalcForm({ ...calcForm, platform: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(PLATFORM_INFO).map(([k, i]) => <SelectItem key={k} value={k}>{i.emoji} {i.name}</SelectItem>)}</SelectContent></Select></div>
                  <div><Label>Monthly Volume</Label><Input type="number" value={calcForm.monthlyVolume} onChange={(e) => setCalcForm({ ...calcForm, monthlyVolume: e.target.value })} dir="ltr" /></div>
                  <div><Label>Shipping/Unit ($)</Label><Input type="number" value={calcForm.shippingCost} onChange={(e) => setCalcForm({ ...calcForm, shippingCost: e.target.value })} dir="ltr" /></div>
                  <div><Label>Monthly Ads ($)</Label><Input type="number" value={calcForm.advertisingCost} onChange={(e) => setCalcForm({ ...calcForm, advertisingCost: e.target.value })} dir="ltr" /></div>
                  <div><Label>Other Costs ($)</Label><Input type="number" value={calcForm.otherCosts} onChange={(e) => setCalcForm({ ...calcForm, otherCosts: e.target.value })} dir="ltr" /></div>
                  <div><Label>Initial Investment ($)</Label><Input type="number" value={calcForm.initialInvestment} onChange={(e) => setCalcForm({ ...calcForm, initialInvestment: e.target.value })} dir="ltr" /></div>
                </div>
                <Button className="w-full gap-2" onClick={() => calcMutation.mutate({ ...calcForm, productPrice: Number(calcForm.productPrice), productCost: Number(calcForm.productCost), monthlyVolume: Number(calcForm.monthlyVolume), shippingCost: Number(calcForm.shippingCost), advertisingCost: Number(calcForm.advertisingCost), otherCosts: Number(calcForm.otherCosts), initialInvestment: Number(calcForm.initialInvestment) })} disabled={calcMutation.isPending}>
                  {calcMutation.isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Calculating…</> : <><Calculator className="h-4 w-4" /> Calculate Profit</>}
                </Button>
              </CardContent>
            </Card>

            {calcResult ? (
              <div className="space-y-3">
                <Card className="border-[#0A0A0B]/20">
                  <CardContent className="p-4">
                    <h4 className="text-sm font-medium mb-3">Results</h4>
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div className="rounded-lg bg-muted/50 p-3 text-center"><DollarSign className="h-4 w-4 mx-auto text-emerald-600 mb-1" /><p className="text-xl font-bold text-emerald-600">${calcResult.estimate.monthlyProfit}</p><p className="text-[10px] text-muted-foreground">Monthly Profit</p></div>
                      <div className="rounded-lg bg-muted/50 p-3 text-center"><TrendingUp className="h-4 w-4 mx-auto text-[#FF6A00] mb-1" /><p className="text-xl font-bold text-[#FF6A00]">{calcResult.estimate.margin}%</p><p className="text-[10px] text-muted-foreground">Margin</p></div>
                      <div className="rounded-lg bg-muted/50 p-3 text-center"><Target className="h-4 w-4 mx-auto text-[#C9CDD3] mb-1" /><p className="text-xl font-bold">{calcResult.estimate.roi}%</p><p className="text-[10px] text-muted-foreground">ROI</p></div>
                      <div className="rounded-lg bg-muted/50 p-3 text-center"><Clock className="h-4 w-4 mx-auto text-amber-600 mb-1" /><p className="text-xl font-bold">{calcResult.estimate.breakEvenMonths}</p><p className="text-[10px] text-muted-foreground">Break-even (months)</p></div>
                    </div>
                    <div className="pt-3 border-t">
                      <Badge variant="outline" className="capitalize mb-2" style={{ background: RISK_COLORS[calcResult.analysis.riskLevel] + '20', color: RISK_COLORS[calcResult.analysis.riskLevel] }}>Risk: {calcResult.analysis.riskLevel}</Badge>
                      <p className="text-xs text-muted-foreground mb-2">{calcResult.analysis.summary}</p>
                      <div className="space-y-1">
                        {calcResult.analysis.recommendations.map((r: string, i: number) => (
                          <div key={i} className="flex items-start gap-2 text-xs"><AlertTriangle className="h-3 w-3 text-amber-500 mt-0.5 shrink-0" /><span>{r}</span></div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card><CardContent className="p-12 text-center"><Calculator className="h-12 w-12 mx-auto text-muted-foreground/50" /><p className="text-sm text-muted-foreground mt-4">Fill in the form and calculate your profit potential.</p></CardContent></Card>
            )}
          </div>
        </TabsContent>

        {/* Saved Products Tab */}
        <TabsContent value="saved" className="space-y-3">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm">Saved Products ({products.length})</CardTitle></CardHeader>
            <CardContent>
              {products.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">No products saved yet. Use the Product Research tab to analyze products.</p>
              ) : (
                <div className="overflow-x-auto scroll-thin">
                  <table className="w-full text-xs">
                    <thead><tr className="text-right text-muted-foreground border-b"><th className="pb-2 font-medium">Product</th><th className="pb-2 font-medium">Platform</th><th className="pb-2 font-medium">Price</th><th className="pb-2 font-medium">Profit</th><th className="pb-2 font-medium">Margin</th><th className="pb-2 font-medium">Competition</th></tr></thead>
                    <tbody>
                      {products.slice(0, 20).map((p: any) => (
                        <tr key={p.id} className="border-b last:border-0">
                          <td className="py-2 font-medium truncate max-w-[150px]">{p.title}</td>
                          <td className="py-2"><Badge variant="outline" className="text-[9px]">{p.platform}</Badge></td>
                          <td className="py-2">${p.price}</td>
                          <td className="py-2 text-emerald-600 font-medium">${p.estimatedProfit}</td>
                          <td className="py-2">{p.estimatedMargin}%</td>
                          <td className="py-2"><Badge variant="outline" className="text-[9px] capitalize" style={{ background: RISK_COLORS[p.competitionLevel] + '20', color: RISK_COLORS[p.competitionLevel] }}>{p.competitionLevel}</Badge></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
