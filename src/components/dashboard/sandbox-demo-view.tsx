'use client'

import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { onActivateKey } from '@/lib/a11y'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import {
  Play, Sparkles, Loader2, CheckCircle, Lock, ArrowRight,
  LayoutDashboard, Search, Mail, BarChart3, Network,
} from 'lucide-react'

const DEMO_MODULES = [
  { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard, color: '#0A0A0B' },
  { id: 'leads', name: 'Find Leads', icon: Search, color: '#3b82f6' },
  { id: 'campaigns', name: 'Email Campaigns', icon: Mail, color: '#f59e0b' },
  { id: 'analytics', name: 'Analytics', icon: BarChart3, color: '#10b981' },
  { id: 'graph-agent', name: 'Graph Agent', icon: Network, color: '#FF6A00' },
]

export function SandboxDemoView() {
  const [session, setSession] = useState<any>(null)
  const [visitorInfo, setVisitorInfo] = useState({
    visitorName: '', visitorEmail: '', industry: 'general', demoType: 'marketing_platform',
  })
  const [conversionForm, setConversionForm] = useState({ email: '', password: '', name: '' })

  const startSession = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/sandbox/start', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(visitorInfo),
      })
      if (!res.ok) throw new Error('Failed')
      return res.json()
    },
    onSuccess: (data) => {
      setSession(data)
      toast.success(`Demo started! ${data.maxActions} actions available.`)
    },
    onError: () => toast.error('Failed to start demo'),
  })

  const logAction = useMutation({
    mutationFn: async (module: string) => {
      const res = await fetch('/api/sandbox/action', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: session.sessionId, actionType: `view_${module}`, module }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? 'failed')
      }
      return res.json()
    },
    onSuccess: (data) => {
      setSession({ ...session, actionsUsed: data.actionsUsed, actionsRemaining: data.actionsRemaining })
      if (data.showUpgradePrompt) {
        toast.info('Running low on demo actions — create a real account below to keep going with no limit.')
      }
    },
    onError: (err: Error) => {
      // Distinguish the two real causes (previously both showed a generic
      // "Action failed" and — per the API's own upgradeUrl:'/signup' — would
      // have pointed at a route that doesn't exist anywhere in this app.
      if (err.message === 'action_limit_reached') {
        toast.error("You've used all your demo actions — create a real account below to keep exploring with no limit.")
      } else if (err.message === 'session_expired') {
        toast.error('This demo session has expired. Start a new one below.')
        setSession(null)
      } else {
        toast.error('Action failed. Please try again.')
      }
    },
  })

  const convert = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/sandbox/convert', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: session.sessionId,
          email: conversionForm.email,
          password: conversionForm.password,
          name: conversionForm.name,
        }),
      })
      if (!res.ok) throw new Error('Failed')
      return res.json()
    },
    onSuccess: (data) => {
      toast.success('Account created! You can now log in.')
      setSession(null)
      window.location.href = '/'
    },
    onError: () => toast.error('Conversion failed — email may already be registered'),
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Play className="h-8 w-8 animate-float-3d" style={{ color: '#FF6A00' }} />
          Demo & Simulation Sandbox
        </h1>
        <p className="text-muted-foreground mt-1">
          Try the platform without signing up — 20 actions, 24-hour access, no credit card required
        </p>
      </div>

      {/* Start demo */}
      {!session && (
        <Card className="card-3d">
          <CardContent className="p-6 space-y-4">
            <h2 className="text-lg font-semibold">Start Your Demo</h2>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <Label>Your Name (optional)</Label>
                <Input value={visitorInfo.visitorName} onChange={e => setVisitorInfo({ ...visitorInfo, visitorName: e.target.value })} />
              </div>
              <div>
                <Label>Email (optional — for saving progress)</Label>
                <Input type="email" value={visitorInfo.visitorEmail} onChange={e => setVisitorInfo({ ...visitorInfo, visitorEmail: e.target.value })} />
              </div>
              <div>
                <Label>Industry Scenario</Label>
                <Select value={visitorInfo.industry} onValueChange={(v) => setVisitorInfo({ ...visitorInfo, industry: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General Business</SelectItem>
                    <SelectItem value="saas">SaaS / Tech</SelectItem>
                    <SelectItem value="retail">Retail / E-commerce</SelectItem>
                    <SelectItem value="restaurant">Restaurant / Food</SelectItem>
                    <SelectItem value="realestate">Real Estate</SelectItem>
                    <SelectItem value="healthcare">Healthcare</SelectItem>
                    <SelectItem value="agency">Marketing Agency</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Demo Type</Label>
                <Select value={visitorInfo.demoType} onValueChange={(v) => setVisitorInfo({ ...visitorInfo, demoType: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="marketing_platform">Full Marketing Platform</SelectItem>
                    <SelectItem value="negotiation">Negotiation Engine Only</SelectItem>
                    <SelectItem value="graph_agent">Graph Agent Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="bg-brand-light/20 border border-brand-light/40 rounded p-3 text-xs">
              <strong>Demo limits:</strong> 20 actions · 24 hours · Mock data only · No real payments processed
            </div>
            <Button
              className="bg-brand-accent-gradient btn-3d"
              disabled={startSession.isPending}
              onClick={() => startSession.mutate()}
            >
              {startSession.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Play className="h-4 w-4 mr-1" />}
              Launch Demo
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Active demo session */}
      {session && (
        <>
          <Card className="card-3d border-2" style={{ borderColor: '#FF6A00' }}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-emerald-500" />
                    Demo Active
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Industry: {session.industry} · Type: {session.demoType} · Expires: {new Date(session.expiresAt).toLocaleString()}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-brand-accent">{session.actionsRemaining ?? session.maxActions}</div>
                  <div className="text-xs text-muted-foreground">actions left</div>
                </div>
              </div>
              {/* Progress bar */}
              <div className="h-2 bg-muted rounded-full mt-3 overflow-hidden">
                <div
                  className="h-full bg-brand-accent-gradient transition-all"
                  style={{ width: `${((session.maxActions - (session.actionsRemaining ?? session.maxActions)) / session.maxActions) * 100}%` }}
                />
              </div>
            </CardContent>
          </Card>

          {/* Module shortcuts */}
          <div>
            <h2 className="text-lg font-semibold mb-3">Try These Modules</h2>
            <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-5">
              {DEMO_MODULES.map(mod => {
                const Icon = mod.icon
                return (
                  <Card
                    key={mod.id}
                    role="button"
                    tabIndex={0}
                    className="card-3d cursor-pointer hover:border-brand-accent transition-all focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                    onClick={() => logAction.mutate(mod.id)}
                    onKeyDown={onActivateKey(() => logAction.mutate(mod.id))}
                  >
                    <CardContent className="p-4 text-center">
                      <div
                        className="grid place-items-center h-12 w-12 rounded-xl mx-auto mb-2 text-white"
                        style={{ background: mod.color }}
                      >
                        <Icon className="h-6 w-6" />
                      </div>
                      <div className="text-sm font-medium">{mod.name}</div>
                      <Badge variant="outline" className="text-[10px] mt-1">click to try</Badge>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>

          {/* Simulated dashboard preview */}
          <Card className="card-3d">
            <CardHeader>
              <CardTitle className="text-sm">Simulated Dashboard Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-4">
                {[
                  { label: 'Total Leads', value: '247', change: '+12%' },
                  { label: 'Active Campaigns', value: '8', change: '+2' },
                  { label: 'Revenue (MTD)', value: '$24,580', change: '+18%' },
                  { label: 'Conversion Rate', value: '4.7%', change: '+0.8%' },
                ].map((stat, i) => (
                  <div key={i} className="border rounded p-3">
                    <div className="text-xs text-muted-foreground">{stat.label}</div>
                    <div className="text-xl font-bold">{stat.value}</div>
                    <div className="text-xs text-emerald-600">{stat.change}</div>
                  </div>
                ))}
              </div>
              <div className="text-xs text-muted-foreground mt-3 text-center">
                * Sample data shown for demo purposes only
              </div>
            </CardContent>
          </Card>

          {/* Upgrade prompt */}
          <Card className="card-3d bg-brand-primary/5 border-2 border-dashed border-brand-primary/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Lock className="h-8 w-8 text-brand-accent" />
                  <div>
                    <h3 className="font-semibold">Ready for the real thing?</h3>
                    <p className="text-sm text-muted-foreground">
                      Sign up for unlimited access, real data, payment processing, and AI-powered features.
                    </p>
                  </div>
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-3 mt-4">
                <div>
                  <Label>Email</Label>
                  <Input type="email" value={conversionForm.email} onChange={e => setConversionForm({ ...conversionForm, email: e.target.value })} />
                </div>
                <div>
                  <Label>Name</Label>
                  <Input value={conversionForm.name} onChange={e => setConversionForm({ ...conversionForm, name: e.target.value })} />
                </div>
                <div>
                  <Label>Password</Label>
                  <Input type="password" value={conversionForm.password} onChange={e => setConversionForm({ ...conversionForm, password: e.target.value })} />
                </div>
              </div>
              <Button
                className="mt-3 bg-brand-accent-gradient btn-3d"
                disabled={!conversionForm.email || !conversionForm.password || convert.isPending}
                onClick={() => convert.mutate()}
              >
                {convert.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <ArrowRight className="h-4 w-4 mr-1" />}
                Create Account & Upgrade
              </Button>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
