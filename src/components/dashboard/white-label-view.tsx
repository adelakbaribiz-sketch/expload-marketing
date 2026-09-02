'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import {
  Palette, Users, DollarSign, TrendingUp, Percent, Globe,
  Plus, Save, Eye, Building2, Crown,
} from 'lucide-react'
import { useState } from 'react'

export function WhiteLabelView() {
  const qc = useQueryClient()
  const [form, setForm] = useState<any>(null)
  const [customerOpen, setCustomerOpen] = useState(false)
  const [customerForm, setCustomerForm] = useState({ customerName: '', customerDomain: '', plan: 'starter', monthlyFee: '49', commissionRate: '20', trialDays: '14' })

  const { data, isLoading } = useQuery({
    queryKey: ['white-label'],
    queryFn: async () => {
      const res = await fetch('/api/white-label/config')
      if (!res.ok) return { config: null }
      const d = await res.json()
      setForm(d.config)
      return d
    },
  })

  const { data: customersData } = useQuery({
    queryKey: ['reseller-customers'],
    queryFn: async () => {
      const res = await fetch('/api/white-label/customers')
      if (!res.ok) return { customers: [], commissions: [], stats: {} }
      return res.json()
    },
  })

  const saveMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch('/api/white-label/config', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('save failed')
      return res.json()
    },
    onSuccess: () => {
      toast.success('White label settings saved')
      qc.invalidateQueries({ queryKey: ['white-label'] })
    },
  })

  const createCustomerMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch('/api/white-label/customers', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, monthlyFee: Number(payload.monthlyFee), commissionRate: Number(payload.commissionRate), trialDays: Number(payload.trialDays) }),
      })
      if (!res.ok) throw new Error('create failed')
      return res.json()
    },
    onSuccess: () => {
      toast.success('Customer created')
      qc.invalidateQueries({ queryKey: ['reseller-customers'] })
      setCustomerOpen(false)
      setCustomerForm({ customerName: '', customerDomain: '', plan: 'starter', monthlyFee: '49', commissionRate: '20', trialDays: '14' })
    },
  })

  const config = data?.config
  const customers = customersData?.customers ?? []
  const stats = customersData?.stats ?? {}

  if (isLoading || !form) {
    return <div className="p-6"><Skeleton className="h-40 w-full" /></div>
  }

  return (
    <div className="space-y-4 p-4 md:p-6 animate-fade-in-up">
      <div>
        <h2 className="text-base font-semibold flex items-center gap-2">
          <Palette className="h-5 w-5 text-[#0A0A0B]" />
          White Label & Reseller Hub
        </h2>
        <p className="text-xs text-muted-foreground">Custom branding, reseller customers, commissions, and pricing</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4"><Users className="h-4 w-4 text-[#0A0A0B] mb-1" /><p className="text-2xl font-bold">{stats.totalCustomers ?? 0}</p><p className="text-xs text-muted-foreground">Reseller Customers</p></CardContent></Card>
        <Card><CardContent className="p-4"><DollarSign className="h-4 w-4 text-emerald-600 mb-1" /><p className="text-2xl font-bold text-emerald-600">${(stats.totalRevenue ?? 0).toLocaleString()}</p><p className="text-xs text-muted-foreground">Total Revenue</p></CardContent></Card>
        <Card><CardContent className="p-4"><Percent className="h-4 w-4 text-[#FF6A00] mb-1" /><p className="text-2xl font-bold text-[#FF6A00]">${(stats.totalCommission ?? 0).toLocaleString()}</p><p className="text-xs text-muted-foreground">Total Commission</p></CardContent></Card>
        <Card><CardContent className="p-4"><TrendingUp className="h-4 w-4 text-amber-600 mb-1" /><p className="text-2xl font-bold text-amber-600">${(stats.pendingCommission ?? 0).toLocaleString()}</p><p className="text-xs text-muted-foreground">Pending Commission</p></CardContent></Card>
      </div>

      <Tabs defaultValue="branding">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="branding">Branding & Config</TabsTrigger>
          <TabsTrigger value="customers">Customers</TabsTrigger>
          <TabsTrigger value="commissions">Commissions</TabsTrigger>
        </TabsList>

        {/* Branding Tab */}
        <TabsContent value="branding" className="space-y-3">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><Palette className="h-4 w-4" /> White Label Configuration</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Label Type</Label>
                  <div className="flex gap-2 mt-1">
                    {['grey', 'white', 'co_branded'].map(type => (
                      <Button key={type} size="sm" variant={form.labelType === type ? 'default' : 'outline'} onClick={() => setForm({ ...form, labelType: type })}>
                        {type === 'grey' ? 'Grey Label' : type === 'white' ? 'White Label' : 'Co-Branded'}
                      </Button>
                    ))}
                  </div>
                </div>
                <div>
                  <Label>Brand Name</Label>
                  <Input value={form.brandName || ''} onChange={(e) => setForm({ ...form, brandName: e.target.value })} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Custom Domain</Label>
                  <Input value={form.customDomain || ''} onChange={(e) => setForm({ ...form, customDomain: e.target.value })} placeholder="marketing.yourbrand.com" dir="ltr" />
                </div>
                <div>
                  <Label>Support Email</Label>
                  <Input value={form.supportEmail || ''} onChange={(e) => setForm({ ...form, supportEmail: e.target.value })} placeholder="support@yourbrand.com" dir="ltr" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>Commission Rate (%)</Label>
                  <Input type="number" value={form.commissionRate || 20} onChange={(e) => setForm({ ...form, commissionRate: Number(e.target.value) })} dir="ltr" />
                </div>
                <div>
                  <Label>Reseller Tier</Label>
                  <div className="flex gap-1 mt-1">
                    {['standard', 'premium', 'enterprise'].map(tier => (
                      <Button key={tier} size="sm" variant={form.resellerTier === tier ? 'default' : 'outline'} onClick={() => setForm({ ...form, resellerTier: tier })}>{tier}</Button>
                    ))}
                  </div>
                </div>
                <div>
                  <Label>Max Sub-Tenants</Label>
                  <Input type="number" value={form.maxSubTenants || 10} onChange={(e) => setForm({ ...form, maxSubTenants: Number(e.target.value) })} dir="ltr" />
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t">
                <div className="flex items-center justify-between">
                  <Label>Hide Expload Branding</Label>
                  <Switch checked={form.hideExploadBranding || false} onCheckedChange={(v) => setForm({ ...form, hideExploadBranding: v })} />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Hide Blog Section</Label>
                  <Switch checked={form.hideBlogSection || false} onCheckedChange={(v) => setForm({ ...form, hideBlogSection: v })} />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Hide Pricing Calculator</Label>
                  <Switch checked={form.hidePricingCalc || false} onCheckedChange={(v) => setForm({ ...form, hidePricingCalc: v })} />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Enable Reseller Mode</Label>
                  <Switch checked={form.isReseller || false} onCheckedChange={(v) => setForm({ ...form, isReseller: v })} />
                </div>
              </div>

              <Button className="w-full gap-2" onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending}>
                <Save className="h-4 w-4" /> {saveMutation.isPending ? 'Saving…' : 'Save Configuration'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Customers Tab */}
        <TabsContent value="customers" className="space-y-3">
          <div className="flex justify-end">
            <Dialog open={customerOpen} onOpenChange={setCustomerOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2"><Plus className="h-4 w-4" /> Add Customer</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Add Reseller Customer</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div><Label>Customer Name</Label><Input value={customerForm.customerName} onChange={(e) => setCustomerForm({ ...customerForm, customerName: e.target.value })} /></div>
                  <div><Label>Domain (optional)</Label><Input value={customerForm.customerDomain} onChange={(e) => setCustomerForm({ ...customerForm, customerDomain: e.target.value })} placeholder="auto-generated" dir="ltr" /></div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><Label>Plan</Label><Input value={customerForm.plan} onChange={(e) => setCustomerForm({ ...customerForm, plan: e.target.value })} /></div>
                    <div><Label>Monthly Fee ($)</Label><Input type="number" value={customerForm.monthlyFee} onChange={(e) => setCustomerForm({ ...customerForm, monthlyFee: e.target.value })} dir="ltr" /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><Label>Commission (%)</Label><Input type="number" value={customerForm.commissionRate} onChange={(e) => setCustomerForm({ ...customerForm, commissionRate: e.target.value })} dir="ltr" /></div>
                    <div><Label>Trial Days</Label><Input type="number" value={customerForm.trialDays} onChange={(e) => setCustomerForm({ ...customerForm, trialDays: e.target.value })} dir="ltr" /></div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="ghost" onClick={() => setCustomerOpen(false)}>Cancel</Button>
                  <Button onClick={() => createCustomerMutation.mutate(customerForm)} disabled={!customerForm.customerName || createCustomerMutation.isPending}>
                    {createCustomerMutation.isPending ? 'Creating…' : 'Create Customer'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {customers.length === 0 ? (
            <Card><CardContent className="p-12 text-center"><Users className="h-10 w-10 mx-auto text-muted-foreground" /><p className="text-sm text-muted-foreground mt-2">No reseller customers yet. Add your first customer to start earning commission.</p></CardContent></Card>
          ) : (
            <div className="space-y-2">
              {customers.map((c: any) => (
                <Card key={c.id}>
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="grid place-items-center h-9 w-9 rounded-lg bg-[#0A0A0B] text-white shrink-0"><Building2 className="h-4 w-4" /></div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{c.customerTenant?.name || 'Unknown'}</p>
                          <p className="text-xs text-muted-foreground truncate" dir="ltr">{c.customerTenant?.domain} · ${c.monthlyFee}/mo</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="outline" className="text-[10px]">${c.totalRevenue.toLocaleString()}</Badge>
                        <Badge variant="outline" className="text-[10px]">{c.commissionRate}% comm</Badge>
                        <Badge variant={c.status === 'active' ? 'default' : 'secondary'} className="text-[10px] capitalize">{c.status}</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Commissions Tab */}
        <TabsContent value="commissions" className="space-y-3">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><DollarSign className="h-4 w-4 text-[#FF6A00]" /> Commission History</CardTitle></CardHeader>
            <CardContent>
              {customersData?.commissions?.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No commissions earned yet.</p>
              ) : (
                <div className="space-y-1.5 max-h-96 overflow-y-auto scroll-thin">
                  {(customersData?.commissions ?? []).map((comm: any) => (
                    <div key={comm.id} className="flex items-center gap-3 p-2 rounded-md bg-muted/30 text-xs">
                      <Badge variant="outline" className="text-[9px]">{comm.type}</Badge>
                      <span className="flex-1 truncate">{comm.description || 'Commission'}</span>
                      <span className="font-medium text-[#FF6A00]">${comm.amount}</span>
                      <Badge variant={comm.status === 'paid' ? 'default' : 'secondary'} className="text-[9px]">{comm.status}</Badge>
                      <span className="text-muted-foreground">{new Date(comm.createdAt).toLocaleDateString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
