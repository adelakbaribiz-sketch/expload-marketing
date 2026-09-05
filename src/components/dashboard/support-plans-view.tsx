'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { GuideTooltip } from '@/components/guides/guided-tour'
import { LifeBuoy, Check, Zap, Crown, Clock, MessageCircle, Phone, Mail } from 'lucide-react'

const CHANNEL_ICONS: Record<string, any> = {
  email: Mail, chat: MessageCircle, phone: Phone, slack: MessageCircle,
}

export function SupportPlansView() {
  const qc = useQueryClient()

  const { data: plansData, isLoading } = useQuery({
    queryKey: ['support-plans'],
    queryFn: async () => {
      const res = await fetch('/api/support-plans')
      if (!res.ok) return { plans: [] }
      return res.json()
    },
  })

  const { data: subsData } = useQuery({
    queryKey: ['support-subs'],
    queryFn: async () => {
      const res = await fetch('/api/support-plans/subscriptions')
      if (!res.ok) return { subscriptions: [] }
      return res.json()
    },
  })

  const { data: ticketsData } = useQuery({
    queryKey: ['support-tickets'],
    queryFn: async () => {
      const res = await fetch('/api/support-plans/tickets')
      if (!res.ok) return { tickets: [] }
      return res.json()
    },
  })

  const subscribe = useMutation({
    mutationFn: async ({ planId, billingCycle }: { planId: string; billingCycle: string }) => {
      const res = await fetch('/api/support-plans/subscriptions', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId, billingCycle }),
      })
      if (!res.ok) throw new Error('Failed')
      return res.json()
    },
    onSuccess: () => {
      toast.success('Subscribed! Plan is now active.')
      qc.invalidateQueries({ queryKey: ['support-subs'] })
    },
  })

  const createTicket = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/support-plans/tickets', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Failed')
      return res.json()
    },
    onSuccess: () => {
      toast.success('Ticket created')
      qc.invalidateQueries({ queryKey: ['support-tickets'] })
    },
  })

  const plans = plansData?.plans ?? []
  const subs = subsData?.subscriptions ?? []
  const tickets = ticketsData?.tickets ?? []

  if (isLoading) return <Skeleton className="h-96" />

  // If no plans seeded, show defaults
  const displayPlans = plans.length > 0 ? plans : [
    { id: 'basic', name: 'Basic', monthlyPrice: 99, responseTimeHours: 48, features: ['Email support', '48h response time', '5 tickets/month', 'Knowledge base access'], channels: ['email'], color: '#C9CDD3', isFeatured: false },
    { id: 'premium', name: 'Premium', monthlyPrice: 499, responseTimeHours: 4, features: ['Email + chat support', '4h response time', 'Unlimited tickets', 'Dedicated CSM', 'Monthly strategy call'], channels: ['email', 'chat'], color: '#FF6A00', isFeatured: true },
    { id: 'enterprise', name: 'Enterprise', monthlyPrice: 1999, responseTimeHours: 1, features: ['24/7 phone + Slack', '1h response SLA', 'Unlimited everything', 'Dedicated team', 'Quarterly on-site visit', 'Custom integrations'], channels: ['email', 'chat', 'phone', 'slack'], color: '#0A0A0B', isFeatured: false },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <LifeBuoy className="h-8 w-8 animate-float-3d" style={{ color: '#FF6A00' }} />
          Support Plans
          <GuideTooltip sectionId="support-plans" />
        </h1>
        <p className="text-muted-foreground mt-1">
          Purchase dedicated support: Basic ($99/mo), Premium ($499/mo), Enterprise ($1999/mo). SLA-backed.
        </p>
      </div>

      {/* Plan cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {displayPlans.map((plan: any) => (
          <Card
            key={plan.id}
            className={`card-3d relative ${plan.isFeatured ? 'border-2 scale-105' : ''}`}
            style={plan.isFeatured ? { borderColor: '#FF6A00' } : undefined}
          >
            {plan.isFeatured && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-semibold text-white" style={{ background: '#FF6A00' }}>
                MOST POPULAR
              </div>
            )}
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {plan.name === 'Basic' && <Mail className="h-5 w-5" style={{ color: plan.color }} />}
                {plan.name === 'Premium' && <Zap className="h-5 w-5" style={{ color: plan.color }} />}
                {plan.name === 'Enterprise' && <Crown className="h-5 w-5" style={{ color: plan.color }} />}
                {plan.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <span className="text-4xl font-bold">${plan.monthlyPrice}</span>
                <span className="text-sm text-muted-foreground">/month</span>
              </div>
              <div className="flex items-center gap-1 text-sm">
                <Clock className="h-4 w-4 text-brand-accent" />
                <span>{plan.responseTimeHours}h response SLA</span>
              </div>
              <ul className="space-y-1.5 text-sm">
                {(typeof plan.features === 'string' ? JSON.parse(plan.features) : plan.features).map((f: string, i: number) => (
                  <li key={i} className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" /> {f}
                  </li>
                ))}
              </ul>
              <div className="flex gap-1">
                {(typeof plan.channels === 'string' ? JSON.parse(plan.channels) : plan.channels).map((c: string) => {
                  const Icon = CHANNEL_ICONS[c] ?? Mail
                  return <Badge key={c} variant="outline"><Icon className="h-3 w-3 mr-1" />{c}</Badge>
                })}
              </div>
              <Button
                className="w-full bg-brand-accent-gradient btn-3d"
                disabled={subs.some(s => s.planId === plan.id && s.status === 'active')}
                onClick={() => subscribe.mutate({ planId: plan.id, billingCycle: 'monthly' })}
              >
                {subs.some(s => s.planId === plan.id && s.status === 'active') ? 'Active' : 'Subscribe'}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="tickets">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="tickets">My Tickets</TabsTrigger>
          <TabsTrigger value="new">New Ticket</TabsTrigger>
        </TabsList>

        <TabsContent value="tickets" className="space-y-2">
          {tickets.map(t => (
            <Card key={t.id} className="card-3d-flat">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <div className="font-semibold flex items-center gap-2">
                    <code className="text-xs">{t.ticketNumber}</code>
                    {t.subject}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t.category} · {t.priority} · Created {new Date(t.createdAt).toLocaleString()}
                    {t.firstRespondedAt && ` · First response: ${new Date(t.firstRespondedAt).toLocaleString()}`}
                  </p>
                </div>
                <Badge variant="outline">{t.status}</Badge>
              </CardContent>
            </Card>
          ))}
          {tickets.length === 0 && (
            <Card><CardContent className="p-8 text-center text-muted-foreground">No support tickets yet.</CardContent></Card>
          )}
        </TabsContent>

        <TabsContent value="new">
          <Card className="card-3d">
            <CardContent className="p-4">
              <form className="space-y-3" onSubmit={(e) => {
                e.preventDefault()
                const fd = new FormData(e.currentTarget)
                createTicket.mutate({
                  subject: fd.get('subject'),
                  description: fd.get('description'),
                  category: fd.get('category'),
                  priority: fd.get('priority'),
                })
                ;(e.target as HTMLFormElement).reset()
              }}>
                <div><Label>Subject</Label><Input name="subject" required /></div>
                <div><Label>Description</Label><Textarea name="description" rows={4} required /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Category</Label>
                    <Select name="category" defaultValue="technical">
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="technical">Technical</SelectItem>
                        <SelectItem value="billing">Billing</SelectItem>
                        <SelectItem value="how_to">How-to</SelectItem>
                        <SelectItem value="bug">Bug</SelectItem>
                        <SelectItem value="feature_request">Feature Request</SelectItem>
                        <SelectItem value="account">Account</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Priority</Label>
                    <Select name="priority" defaultValue="normal">
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button type="submit" className="bg-brand-accent-gradient btn-3d">Submit Ticket</Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
