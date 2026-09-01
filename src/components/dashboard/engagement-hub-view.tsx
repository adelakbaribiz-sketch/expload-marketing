'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { Mail, MessageCircle, Star, Bot, Send, TrendingUp, AlertCircle } from 'lucide-react'

const PLATFORM_ICONS: Record<string, string> = {
  google: '🔍',
  yelp: '⭐',
  trustpilot: '✅',
  facebook: '📘',
}

export function EngagementHubView() {
  const qc = useQueryClient()
  const [tab, setTab] = useState('whatsapp')

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

  const messages = waMessages?.items ?? []
  const reviewMonitors = reviews?.items ?? []
  const chatbotConvs = conversations?.items ?? []
  const chatbotWidgets = widgets?.items ?? []

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
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
          <TabsTrigger value="chatbot">Conversational AI</TabsTrigger>
          <TabsTrigger value="reviews">Reviews</TabsTrigger>
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
      </Tabs>
    </div>
  )
}
