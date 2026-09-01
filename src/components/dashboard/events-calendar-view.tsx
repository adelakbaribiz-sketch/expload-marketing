'use client'

import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { GuideTooltip } from '@/components/guides/guided-tour'
import { Calendar, Globe2, Sparkles, Loader2, Clock, TrendingUp, CheckCircle } from 'lucide-react'

const CATEGORY_COLORS: Record<string, string> = {
  holiday: '#ef4444', cultural: '#ec4899', sports: '#10b981',
  tech: '#3b82f6', business: '#f59e0b', religious: '#1B3A4B',
  seasonal: '#8CD4D8', trending: '#F26522',
}

export function EventsCalendarView() {
  const [days, setDays] = useState(30)
  const [schedulerForm, setSchedulerForm] = useState({
    campaignName: '', campaignType: 'multi_channel', totalBudget: '5000',
    depositReceived: '1000', industry: '',
  })

  const { data: eventsData, isLoading } = useQuery({
    queryKey: ['events-calendar', days],
    queryFn: async () => {
      const res = await fetch(`/api/events-calendar/range?days=${days}`)
      if (!res.ok) return { events: [] }
      return res.json()
    },
  })

  const { data: scheduleResult, isPending: scheduling } = useQuery({
    queryKey: ['schedule-result'],
    queryFn: async () => null,  // Will be set after mutation
    enabled: false,
  })

  const [result, setResult] = useState<any>(null)

  const suggest = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/campaign-scheduler/suggest', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignName: schedulerForm.campaignName || 'Untitled Campaign',
          campaignType: schedulerForm.campaignType,
          totalBudget: parseFloat(schedulerForm.totalBudget),
          depositReceived: parseFloat(schedulerForm.depositReceived),
          industry: schedulerForm.industry,
        }),
      })
      if (!res.ok) throw new Error('Failed')
      return res.json()
    },
    onSuccess: (data) => {
      setResult(data)
      toast.success('Campaign dates suggested!')
    },
    onError: () => toast.error('Suggestion failed — check LLM API key'),
  })

  const approve = useMutation({
    mutationFn: async (params: { id: string; startDate: string; endDate: string }) => {
      const res = await fetch(`/api/campaign-scheduler/${params.id}/approve`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startDate: params.startDate, endDate: params.endDate }),
      })
      if (!res.ok) throw new Error('Failed')
      return res.json()
    },
    onSuccess: () => toast.success('Campaign date approved!'),
  })

  const events = eventsData?.events ?? []

  if (isLoading) return <Skeleton className="h-96" />

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Calendar className="h-8 w-8 animate-float-3d" style={{ color: '#F26522' }} />
          Events & Smart Scheduler
          <GuideTooltip sectionId="calendar" />
        </h1>
        <p className="text-muted-foreground mt-1">
          World holidays, trending events, and AI-powered campaign date suggestions based on your deposit
        </p>
      </div>

      {/* Days selector */}
      <Card className="card-3d-flat">
        <CardContent className="p-4 flex items-center gap-3 flex-wrap">
          <span className="text-sm font-medium">Show events for next:</span>
          {[7, 30, 60, 90].map(d => (
            <Button
              key={d}
              size="sm"
              variant={days === d ? 'default' : 'outline'}
              onClick={() => setDays(d)}
            >
              {d} days
            </Button>
          ))}
          <Badge variant="outline">{events.length} events found</Badge>
        </CardContent>
      </Card>

      {/* Events list */}
      <Card className="card-3d">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Globe2 className="h-4 w-4" /> Upcoming Global Events
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 max-h-96 overflow-auto">
          {events.map((e: any) => {
            const color = CATEGORY_COLORS[e.category] ?? '#999'
            return (
              <div
                key={e.id}
                className="flex items-start gap-3 p-3 border-l-4 rounded-r transition-all hover:shadow-md"
                style={{ borderColor: color }}
              >
                <div className="text-2xl">{e.icon ?? '📅'}</div>
                <div className="flex-1">
                  <div className="font-medium text-sm">{e.name}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {new Date(e.startDate).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                    {e.endDate && ` → ${new Date(e.endDate).toLocaleDateString()}`}
                  </div>
                  <div className="flex items-center gap-1 mt-1 flex-wrap">
                    <Badge variant="outline" style={{ color, borderColor: color }}>{e.category}</Badge>
                    {e.marketingRelevance && (
                      <Badge variant="outline" className={
                        e.marketingRelevance === 'high' ? 'text-emerald-600' :
                        e.marketingRelevance === 'medium' ? 'text-amber-600' : 'text-muted-foreground'
                      }>
                        {e.marketingRelevance} relevance
                      </Badge>
                    )}
                    {e.countries?.length > 0 && (
                      <Badge variant="secondary" className="text-[10px]">{e.countries.slice(0, 3).join(', ')}{e.countries.length > 3 ? '+' : ''}</Badge>
                    )}
                  </div>
                  {e.suggestedCampaignTypes?.length > 0 && (
                    <div className="text-[10px] text-muted-foreground mt-1">
                      Suggested: {e.suggestedCampaignTypes.join(', ')}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
          {events.length === 0 && (
            <p className="text-sm text-muted-foreground p-4 text-center">No events in this period.</p>
          )}
        </CardContent>
      </Card>

      {/* Smart Scheduler */}
      <Card className="card-3d">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-brand-accent" />
            Smart Campaign Scheduler
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Enter your campaign details + deposit received. AI suggests optimal start dates aligned with global events.
          </p>
          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <Label className="text-xs">Campaign Name</Label>
              <Input value={schedulerForm.campaignName} onChange={e => setSchedulerForm({ ...schedulerForm, campaignName: e.target.value })} placeholder="Summer Sale 2026" />
            </div>
            <div>
              <Label className="text-xs">Campaign Type</Label>
              <Select value={schedulerForm.campaignType} onValueChange={(v) => setSchedulerForm({ ...schedulerForm, campaignType: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="social">Social Media</SelectItem>
                  <SelectItem value="ads">Advertising</SelectItem>
                  <SelectItem value="content">Content</SelectItem>
                  <SelectItem value="multi_channel">Multi-channel</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Industry</Label>
              <Input value={schedulerForm.industry} onChange={e => setSchedulerForm({ ...schedulerForm, industry: e.target.value })} placeholder="retail, saas, food..." />
            </div>
            <div>
              <Label className="text-xs">Total Budget ($)</Label>
              <Input type="number" value={schedulerForm.totalBudget} onChange={e => setSchedulerForm({ ...schedulerForm, totalBudget: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Deposit Received ($)</Label>
              <Input type="number" value={schedulerForm.depositReceived} onChange={e => setSchedulerForm({ ...schedulerForm, depositReceived: e.target.value })} />
            </div>
          </div>
          <Button
            className="bg-brand-accent-gradient text-white btn-3d"
            disabled={suggest.isPending}
            onClick={() => suggest.mutate()}
          >
            {suggest.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1" />}
            Suggest Optimal Dates
          </Button>
        </CardContent>
      </Card>

      {/* Suggestion results */}
      {result && (
        <Card className="card-3d border-2" style={{ borderColor: '#F26522' }}>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-emerald-500" />
              Suggested Campaign Dates
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {result.suggestions?.suggestions?.map((s: any, i: number) => (
              <div
                key={i}
                className={`border-2 rounded-lg p-3 ${i === result.suggestions.recommended_option ? 'border-emerald-500 bg-emerald-50/30' : 'border-muted'}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="font-semibold text-sm flex items-center gap-2">
                    Option {i + 1}
                    {i === result.suggestions.recommended_option && <Badge className="bg-emerald-600">RECOMMENDED</Badge>}
                    <Badge variant="outline" className={
                      s.confidence === 'high' ? 'text-emerald-600' :
                      s.confidence === 'medium' ? 'text-amber-600' : 'text-muted-foreground'
                    }>{s.confidence} confidence</Badge>
                  </div>
                  <div className="text-right text-xs">
                    <div>{new Date(s.start_date).toLocaleDateString()} → {new Date(s.end_date).toLocaleDateString()}</div>
                    <div className="text-muted-foreground">{s.duration_days} days</div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">{s.reasoning}</p>
                <div className="flex items-center gap-3 mt-2 text-xs">
                  {s.aligned_event && <Badge variant="secondary">🎯 {s.aligned_event}</Badge>}
                  <span className="text-emerald-600 flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" />
                    {s.expected_impact_multiplier}x expected impact
                  </span>
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {s.preparation_days_needed}d prep
                  </span>
                </div>
                {s.risks?.length > 0 && (
                  <div className="text-xs text-amber-600 mt-1">⚠ {s.risks.join('; ')}</div>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-2"
                  onClick={() => approve.mutate({
                    id: result.record.id,
                    startDate: s.start_date,
                    endDate: s.end_date,
                  })}
                >
                  Approve This Date
                </Button>
              </div>
            ))}
            <div className="text-xs text-muted-foreground pt-2 border-t">
              Deposit ${result.suggestions?.deposit_coverage_days ?? 0} days coverage · Minimum prep: {result.suggestions?.minimum_preparation_days ?? 0} days
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
