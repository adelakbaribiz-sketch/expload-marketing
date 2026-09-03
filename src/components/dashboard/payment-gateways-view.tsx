'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { CreditCard, Bitcoin, Wallet, Settings, Plus } from 'lucide-react'

export function PaymentGatewaysView() {
  const qc = useQueryClient()

  const { data: gatewaysData, isLoading } = useQuery({
    queryKey: ['payment-gateways'],
    queryFn: async () => {
      const res = await fetch('/api/payments/gateways')
      if (!res.ok) return { gateways: [] }
      return res.json()
    },
  })

  const { data: cryptoData } = useQuery({
    queryKey: ['crypto-rates'],
    queryFn: async () => {
      const res = await fetch('/api/payments/crypto/create')
      if (!res.ok) return { currencies: [], rates: {} }
      return res.json()
    },
  })

  const toggleGateway = useMutation({
    mutationFn: async ({ provider, isActive }: { provider: string; isActive: boolean }) => {
      const res = await fetch('/api/payments/gateways', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, isActive }),
      })
      if (!res.ok) throw new Error('Failed')
      return res.json()
    },
    onSuccess: () => {
      toast.success('Gateway updated')
      qc.invalidateQueries({ queryKey: ['payment-gateways'] })
    },
    onError: () => toast.error('Failed to update gateway'),
  })

  const addGateway = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch('/api/payments/gateways', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to add gateway')
      }
      return res.json()
    },
    onSuccess: () => {
      toast.success('Gateway added')
      qc.invalidateQueries({ queryKey: ['payment-gateways'] })
    },
    onError: (err: any) => toast.error(String(err?.message ?? err)),
  })

  const gateways = gatewaysData?.gateways ?? []
  const currencies = cryptoData?.currencies ?? ['BTC', 'ETH', 'USDT', 'USDC', 'TRX', 'BNB', 'SOL']
  const rates = cryptoData?.rates ?? {}

  if (isLoading) return <Skeleton className="h-96" />

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Wallet className="h-8 w-8" style={{ color: '#0A0A0B' }} />
          Payment Gateways & Crypto
        </h1>
        <p className="text-muted-foreground mt-1">
          International payment methods, crypto wallets, and gateway configuration
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Active Gateways</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{gateways.filter(g => g.isActive).length}</div>
            <p className="text-xs text-muted-foreground">of {gateways.length} configured</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Crypto Currencies</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currencies.length}</div>
            <p className="text-xs text-muted-foreground">{currencies.join(', ')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Sandbox Mode</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{gateways.filter(g => g.isSandbox).length}</div>
            <p className="text-xs text-muted-foreground">in test mode</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Avg Fee</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">~2.9%</div>
            <p className="text-xs text-muted-foreground">+ $0.30 fixed</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="gateways">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="gateways">Gateways</TabsTrigger>
          <TabsTrigger value="crypto">Crypto</TabsTrigger>
          <TabsTrigger value="add">Add Gateway</TabsTrigger>
        </TabsList>

        <TabsContent value="gateways" className="space-y-2">
          {gateways.map(g => {
            const currencies = g.supportedCurrencies ? JSON.parse(g.supportedCurrencies) : []
            const methods = g.supportedMethods ? JSON.parse(g.supportedMethods) : []
            return (
              <Card key={g.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold flex items-center gap-2">
                        <CreditCard className="h-4 w-4" />
                        {g.displayName}
                        <Badge variant="outline">{g.provider}</Badge>
                        {g.isSandbox && <Badge variant="outline" style={{ color: '#f59e0b' }}>sandbox</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Priority: {g.priority} · Routes by {g.routeBy} · settles in {g.settlementTime ?? 'T+2'}
                      </p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {currencies.slice(0, 6).map((c: string) => (
                          <Badge key={c} variant="secondary" className="text-xs">{c}</Badge>
                        ))}
                        {currencies.length > 6 && <Badge variant="secondary">+{currencies.length - 6}</Badge>}
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {methods.map((m: string) => (
                          <Badge key={m} variant="outline" className="text-xs">{m}</Badge>
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge variant={g.isActive ? 'default' : 'outline'}>
                        {g.isActive ? 'active' : 'inactive'}
                      </Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toggleGateway.mutate({ provider: g.provider, isActive: !g.isActive })}
                      >
                        {g.isActive ? 'Disable' : 'Enable'}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
          {gateways.length === 0 && (
            <Card><CardContent className="p-8 text-center text-muted-foreground">No gateways configured yet.</CardContent></Card>
          )}
        </TabsContent>

        <TabsContent value="crypto" className="space-y-3">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Bitcoin className="h-5 w-5" /> Supported Crypto Currencies</CardTitle></CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-3">
                {currencies.map((c: string) => (
                  <div key={c} className="border rounded p-3">
                    <div className="flex justify-between items-center">
                      <div className="font-semibold">{c}</div>
                      <Badge variant="outline">${rates[c]?.toLocaleString() ?? '—'}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">live rate vs USD</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">
                Configure platform treasury wallets via env vars:
                <code className="block mt-2 p-2 bg-muted rounded text-xs">
                  PLATFORM_WALLET_BTC_BITCOIN=bc1q...<br />
                  PLATFORM_WALLET_USDT_TRON=T...<br />
                  PLATFORM_WALLET_ETH_ETHEREUM=0x...<br />
                  NOWPAYMENTS_API_KEY=...<br />
                  NOWPAYMENTS_WEBHOOK_SECRET=...<br />
                  CRYPTO_GATEWAY=nowpayments | manual
                </code>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="add">
          <Card>
            <CardContent className="p-4">
              <form className="grid gap-3 md:grid-cols-2" onSubmit={(e) => {
                e.preventDefault()
                const fd = new FormData(e.currentTarget)
                const provider = String(fd.get('provider') || '')
                const displayName = String(fd.get('displayName') || '')
                if (!provider || !displayName) {
                  toast.error('Provider and display name are required')
                  return
                }
                addGateway.mutate({
                  provider,
                  displayName,
                  apiKey: String(fd.get('apiKey') || '') || undefined,
                  secretKey: String(fd.get('secretKey') || '') || undefined,
                  webhookSecret: String(fd.get('webhookSecret') || '') || undefined,
                  merchantId: String(fd.get('merchantId') || '') || undefined,
                  priority: Number(fd.get('priority') || 100),
                  routeBy: String(fd.get('routeBy') || 'currency'),
                }, {
                  onSuccess: () => (e.target as HTMLFormElement).reset(),
                })
              }}>
                <div>
                  <label className="text-xs">Provider</label>
                  <select name="provider" className="w-full border rounded p-2">
                    <option value="stripe">Stripe</option>
                    <option value="paypal">PayPal</option>
                    <option value="razorpay">Razorpay (IN)</option>
                    <option value="moyasar">Moyasar (SA)</option>
                    <option value="paystack">Paystack (NG)</option>
                    <option value="flutterwave">Flutterwave (Africa)</option>
                    <option value="tap">Tap (MENA)</option>
                    <option value="hyperpay">HyperPay (MENA)</option>
                    <option value="mollie">Mollie (EU)</option>
                    <option value="midtrans">Midtrans (ID)</option>
                    <option value="iyzico">Iyzico (TR)</option>
                    <option value="nowpayments">NOWPayments (Crypto)</option>
                    <option value="coinpayments">CoinPayments (Crypto)</option>
                    <option value="coinbase_commerce">Coinbase Commerce</option>
                    <option value="bitpay">BitPay</option>
                  </select>
                </div>
                <div><label className="text-xs">Display Name</label><input name="displayName" className="w-full border rounded p-2" /></div>
                <div><label className="text-xs">API Key</label><input name="apiKey" type="password" className="w-full border rounded p-2" /></div>
                <div><label className="text-xs">Secret Key</label><input name="secretKey" type="password" className="w-full border rounded p-2" /></div>
                <div><label className="text-xs">Webhook Secret</label><input name="webhookSecret" type="password" className="w-full border rounded p-2" /></div>
                <div><label className="text-xs">Merchant ID</label><input name="merchantId" className="w-full border rounded p-2" /></div>
                <div><label className="text-xs">Priority (lower = preferred)</label><input name="priority" type="number" defaultValue={100} className="w-full border rounded p-2" /></div>
                <div><label className="text-xs">Route By</label><select name="routeBy" className="w-full border rounded p-2">
                  <option value="currency">currency</option>
                  <option value="country">country</option>
                  <option value="amount">amount</option>
                  <option value="method">method</option>
                </select></div>
                <div className="md:col-span-2">
                  <Button type="submit" disabled={addGateway.isPending}>
                    <Plus className="h-4 w-4 mr-1" /> {addGateway.isPending ? 'Adding…' : 'Add Gateway'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
