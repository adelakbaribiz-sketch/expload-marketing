'use client'

import { useState } from 'react'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { Mail, MessageCircle, Star, Bot, Send, TrendingUp, AlertCircle, Plus, Smartphone, BellRing } from 'lucide-react'

const PLATFORM_ICONS: Record<string, string> = {
  google: '🔍',
  yelp: '⭐',
  trustpilot: '✅',
  facebook: '📘',
}

const emptyPushForm = { title: '', body: '', segment: '', platform: 'both' }
const emptySmsForm = { to: '', body: '' }

export function EngagementHubView() {
  const qc = useQueryClient()
  const [tab, setTab] = useState('whatsapp')
  const [pushDialogOpen, setPushDialogOpen] = useState(false)
  const [pushForm, setPushForm] = useState(emptyPushForm)
  const [smsDialogOpen, setSmsDialogOpen] = useState(false)
  const [smsForm, setSmsForm] = useState(emptySmsForm)

  const { data: waMessages } = useQuery({
    queryKey: ['whatsapp-messages'],
    queryFn: async () => {
      const res = await fetch('/api/whatsapp/messages')
      if (!res.ok) return { items: [] }
      return res.json()
    },
  })

  const { data: reviews } = useQuery({
    queryKey: ['review-monitors'],
    queryFn: async () => {
      const res = await fetch('/api/reviews/monitors')
      if (!res.ok) return { items: [] }
      return res.json()
    },
  })

  const { data: conversations } = useQuery({
    queryKey: ['chatbot-conversations'],
    queryFn: async () => {
      const res = await fetch('/api/chatbot/conversations')
      if (!res.ok) return { items: [] }
      return res.json()
    },
  })

  const { data: widgets } = useQuery({
    queryKey: ['chatbot-widgets'],
    queryFn: async () => {
      const res = await fetch('/api/chatbot/widgets')
      if (!res.ok) return { items: [] }
      return res.json()
    },
  })

  const { data: pushData } = useQuery({
    queryKey: ['push-notifications'],
    queryFn: async () => {
      const res = await fetch('/api/messaging/push')
      if (!res.ok) return { items: [] }
      return res.json()
    },
  })

  const { data: smsData } = useQuery({
    queryKey: ['sms-messages'],
    queryFn: async () => {
      const res = await fetch('/api/messaging/sms')
      if (!res.ok) return { items: [] }
      return res.json()
    },
  })

  const createPush = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch('/api/messaging/push', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('Failed to create push notification')
      return res.json()
    },
    onSuccess: () => {
      toast.success('Push notification saved as draft')
      qc.invalidateQueries({ queryKey: ['push-notifications'] })
      setPushDialogOpen(false)
      setPushForm(emptyPushForm)
    },
    onError: (err: any) => toast.error(String(err?.message ?? err)),
  })

  const markPushSent = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/messaging/push/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'sent', sentAt: new Date().toISOString() }),
      })
      if (!res.ok) throw new Error('Failed')
      return res.json()
    },
    onSuccess: () => {
      toast.success('Marked as sent')
      qc.invalidateQueries({ queryKey: ['push-notifications'] })
    },
    onError: (err: any) => toast.error(String(err?.message ?? err)),
  })

  const createSms = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch('/api/messaging/sms', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('Failed to create SMS')
      return res.json()
    },
    onSuccess: () => {
      toast.success('SMS queued')
      qc.invalidateQueries({ queryKey: ['sms-messages'] })
      setSmsDialogOpen(false)
      setSmsForm(emptySmsForm)
    },
    onError: (err: any) => toast.error(String(err?.message ?? err)),
  })

  const submitPush = () => {
    if (!pushForm.title.trim() || !pushForm.body.trim()) {
      toast.error('Title and body are required')
      return
    }
    createPush.mutate({ ...pushForm, segment: pushForm.segment || undefined, status: 'draft' })
  }

  const submitSms = () => {
    if (!smsForm.to.trim() || !smsForm.body.trim()) {
      toast.error('Phone number and message are required')
      return
    }
    createSms.mutate({ ...smsForm, status: 'pending' })
  }

  const messages = waMessages?.items ?? []
  const reviewMonitors = reviews?.items ?? []
  const chatbotConvs = conversations?.items ?? []
  const chatbotWidgets = widgets?.items ?? []
  const pushNotifications = pushData?.items ?? []
  const smsMessages = smsData?.items ?? []

  return (
    <div className="space-y-4 p-4 md:p-6 animate-fade-in-up">
      <div>
        <h2 className="text-base font-semibold flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-blue-600" />
          Engagement Hub
        </h2>
        <p className="text-xs text-muted-foreground">WhatsApp, Conversational AI, and Review Monitoring</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <MessageCircle className="h-4 w-4 text-emerald-600 mb-1" />
            <p className="text-2xl font-bold">{messages.length}</p>
            <p className="text-xs text-muted-foreground">WhatsApp Messages</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <Bot className="h-4 w-4 text-violet-600 mb-1" />
            <p className="text-2xl font-bold">{chatbotConvs.length}</p>
            <p className="text-xs text-muted-foreground">Chatbot Conversations</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <Star className="h-4 w-4 text-amber-600 mb-1" />
            <p className="text-2xl font-bold">{reviewMonitors.length}</p>
            <p className="text-xs text-muted-foreground">Review Sources</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <Bot className="h-4 w-4 text-blue-600 mb-1" />
            <p className="text-2xl font-bold">{chatbotWidgets.length}</p>
            <p className="text-xs text-muted-foreground">Chatbot Widgets</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
          <TabsTrigger value="chatbot">Conversational AI</TabsTrigger>
          <TabsTrigger value="reviews">Reviews</TabsTrigger>
          <TabsTrigger value="messaging">Push &amp; SMS</TabsTrigger>
        </TabsList>

        {/* WhatsApp Tab */}
        <TabsContent value="whatsapp" className="space-y-3">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm">WhatsApp Messages ({messages.length})</CardTitle></CardHeader>
            <CardContent>
              {messages.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">No WhatsApp messages yet. Connect WhatsApp Business API to start.</p>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto scroll-thin">
                  {messages.map((m: any) => (
                    <div key={m.id} className="flex items-center gap-3 p-2 rounded-md bg-muted/30">
                      <Badge variant="outline" className="text-[10px] capitalize">{m.direction}</Badge>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate" dir="ltr">{m.body}</p>
                        <p className="text-[11px] text-muted-foreground" dir="ltr">To: {m.to}</p>
                      </div>
                      <Badge variant="secondary" className="text-[10px] capitalize">{m.status}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Chatbot Tab */}
        <TabsContent value="chatbot" className="space-y-3">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm">Chatbot Widgets ({chatbotWidgets.length})</CardTitle></CardHeader>
            <CardContent>
              {chatbotWidgets.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No chatbot widgets created. Create one to embed on your website.</p>
              ) : (
                <div className="grid gap-2 md:grid-cols-2">
                  {chatbotWidgets.map((w: any) => (
                    <div key={w.id} className="rounded-lg border p-3">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-medium text-sm">{w.name}</p>
                        <Badge variant={w.isActive ? 'default' : 'secondary'} className="text-[10px]">{w.isActive ? 'Active' : 'Inactive'}</Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center text-xs">
                        <div><p className="font-semibold">{w.totalConversations}</p><p className="text-muted-foreground">Convos</p></div>
                        <div><p className="font-semibold">{w.totalMessages}</p><p className="text-muted-foreground">Messages</p></div>
                        <div><p className="font-semibold">{w.leadsCaptured}</p><p className="text-muted-foreground">Leads</p></div>
                      </div>
                      <div className="mt-2 text-[10px] text-muted-foreground" dir="ltr">
                        Embed: &lt;script src="/api/chatbot/embed/{w.widgetKey}"&gt;&lt;/script&gt;
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm">Recent Conversations ({chatbotConvs.length})</CardTitle></CardHeader>
            <CardContent>
              {chatbotConvs.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No conversations yet.</p>
              ) : (
                <div className="space-y-2">
                  {chatbotConvs.slice(0, 10).map((c: any) => (
                    <div key={c.id} className="flex items-center gap-3 p-2 rounded-md bg-muted/30">
                      <Badge variant="outline" className="text-[10px] capitalize">{c.channel}</Badge>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{c.visitorName || c.visitorEmail || 'Anonymous'}</p>
                        <p className="text-[11px] text-muted-foreground">{c.messages?.length || 0} messages</p>
                      </div>
                      <Badge variant="secondary" className="text-[10px] capitalize">{c.status}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reviews Tab */}
        <TabsContent value="reviews" className="space-y-3">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm">Review Monitoring ({reviewMonitors.length})</CardTitle></CardHeader>
            <CardContent>
              {reviewMonitors.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">No review sources monitored. Add your Google Business profile to start tracking reviews.</p>
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  {reviewMonitors.map((rm: any) => {
                    const reviews = rm.reviews ?? []
                    const positive = reviews.filter((r: any) => r.sentiment === 'positive').length
                    const negative = reviews.filter((r: any) => r.sentiment === 'negative').length
                    return (
                      <div key={rm.id} className="rounded-lg border p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{PLATFORM_ICONS[rm.platform] ?? '⭐'}</span>
                            <div>
                              <p className="font-medium text-sm">{rm.businessName}</p>
                              <p className="text-xs text-muted-foreground capitalize">{rm.platform}</p>
                            </div>
                          </div>
                          <div className="text-center">
                            <p className="text-2xl font-bold text-amber-600">{rm.avgRating.toFixed(1)}</p>
                            <p className="text-[10px] text-muted-foreground">{rm.reviewCount} reviews</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <Badge variant="outline" className="text-[10px] gap-1"><span className="text-emerald-600">▲</span> {positive}</Badge>
                          <Badge variant="outline" className="text-[10px] gap-1"><span className="text-red-600">▼</span> {negative}</Badge>
                          {rm.autoRespond && <Badge variant="secondary" className="text-[10px]">Auto-respond ON</Badge>}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Push & SMS Tab */}
        <TabsContent value="messaging" className="space-y-3">
          <Card>
            <CardHeader className="pb-3 flex-row items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2"><BellRing className="h-4 w-4 text-[#FF6A00]" /> Push Notifications ({pushNotifications.length})</CardTitle>
              <Dialog open={pushDialogOpen} onOpenChange={(o) => { setPushDialogOpen(o); if (!o) setPushForm(emptyPushForm) }}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline" className="gap-1.5"><Plus className="h-3.5 w-3.5" /> New Push</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>New Push Notification</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <div>
                      <Label className="text-xs">Title</Label>
                      <Input value={pushForm.title} onChange={(e) => setPushForm({ ...pushForm, title: e.target.value })} placeholder="Check out our new feature!" />
                    </div>
                    <div>
                      <Label className="text-xs">Body</Label>
                      <Input value={pushForm.body} onChange={(e) => setPushForm({ ...pushForm, body: e.target.value })} placeholder="Tap to learn more" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs">Segment (optional)</Label>
                        <Input value={pushForm.segment} onChange={(e) => setPushForm({ ...pushForm, segment: e.target.value })} placeholder="all" />
                      </div>
                      <div>
                        <Label className="text-xs">Platform</Label>
                        <Select value={pushForm.platform} onValueChange={(v) => setPushForm({ ...pushForm, platform: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="both">both</SelectItem>
                            <SelectItem value="ios">ios</SelectItem>
                            <SelectItem value="android">android</SelectItem>
                            <SelectItem value="web">web</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="ghost" onClick={() => setPushDialogOpen(false)}>Cancel</Button>
                    <Button onClick={submitPush} disabled={createPush.isPending}>{createPush.isPending ? 'Saving…' : 'Save Draft'}</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {pushNotifications.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No push notifications yet.</p>
              ) : (
                <div className="space-y-2">
                  {pushNotifications.map((p: any) => (
                    <div key={p.id} className="flex items-center justify-between gap-3 p-2 rounded-md bg-muted/30">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{p.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{p.body}</p>
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {p.segment || 'all'} · {p.platform} · sent {p.sentCount} · delivered {p.deliveredCount} · clicked {p.clickedCount}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant={p.status === 'sent' ? 'default' : 'secondary'} className="text-[10px] capitalize">{p.status}</Badge>
                        {p.status === 'draft' && (
                          <Button size="sm" variant="outline" onClick={() => markPushSent.mutate(p.id)} disabled={markPushSent.isPending}>
                            Mark Sent
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3 flex-row items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2"><Smartphone className="h-4 w-4 text-[#0A0A0B]" /> SMS Messages ({smsMessages.length})</CardTitle>
              <Dialog open={smsDialogOpen} onOpenChange={(o) => { setSmsDialogOpen(o); if (!o) setSmsForm(emptySmsForm) }}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline" className="gap-1.5"><Plus className="h-3.5 w-3.5" /> New SMS</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>New SMS Message</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <div>
                      <Label className="text-xs">To (phone number)</Label>
                      <Input value={smsForm.to} onChange={(e) => setSmsForm({ ...smsForm, to: e.target.value })} placeholder="+1 555 0100" dir="ltr" />
                    </div>
                    <div>
                      <Label className="text-xs">Message</Label>
                      <Input value={smsForm.body} onChange={(e) => setSmsForm({ ...smsForm, body: e.target.value })} placeholder="Your appointment is confirmed for..." />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="ghost" onClick={() => setSmsDialogOpen(false)}>Cancel</Button>
                    <Button onClick={submitSms} disabled={createSms.isPending}>{createSms.isPending ? 'Queuing…' : 'Queue SMS'}</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {smsMessages.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No SMS messages yet.</p>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto scroll-thin">
                  {smsMessages.map((s: any) => (
                    <div key={s.id} className="flex items-center gap-3 p-2 rounded-md bg-muted/30">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{s.body}</p>
                        <p className="text-[11px] text-muted-foreground" dir="ltr">To: {s.to} · {s.provider}</p>
                      </div>
                      <Badge variant="secondary" className="text-[10px] capitalize shrink-0">{s.status}</Badge>
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
