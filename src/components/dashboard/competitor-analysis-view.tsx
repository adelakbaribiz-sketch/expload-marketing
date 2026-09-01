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
import { toast } from 'sonner'
import {
  Microscope, Target, TrendingUp, Eye, Heart, MessageCircle,
  Share2, Clock, DollarSign, Globe, Users, Sparkles, Loader2,
  CheckCircle2, AlertTriangle, Lightbulb, Zap,
} from 'lucide-react'
import { useState } from 'react'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

export function CompetitorAnalysisView() {
  const qc = useQueryClient()
  const [selectedCompetitor, setSelectedCompetitor] = useState('')

  const { data: competitorsData } = useQuery({
    queryKey: ['competitors-list'],
    queryFn: async () => {
      const res = await fetch('/api/analyzers/competitors')
      if (!res.ok) return { items: [] }
      return res.json()
    },
  })

  const { data: analysesData, isLoading } = useQuery({
    queryKey: ['competitor-analyses'],
    queryFn: async () => {
      const res = await fetch('/api/competitor-analysis')
      if (!res.ok) return { items: [] }
      return res.json()
    },
  })

  const runMutation = useMutation({
    mutationFn: async (competitorId: string) => {
      const res = await fetch('/api/competitor-analysis/run', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ competitorId }),
      })
      if (!res.ok) throw new Error('analysis failed')
      return res.json()
    },
    onSuccess: () => {
      toast.success('Deep analysis completed!')
      qc.invalidateQueries({ queryKey: ['competitor-analyses'] })
    },
    onError: (e: any) => toast.error(String(e?.message ?? e)),
  })

  const competitors = competitorsData?.items ?? []
  const analyses = analysesData?.items ?? []

  return (
    <div className="space-y-4 p-4 md:p-6 animate-fade-in-up">
      <div>
        <h2 className="text-base font-semibold flex items-center gap-2">
          <Microscope className="h-5 w-5 text-[#0A2A3A]" />
          Competitor Deep Analysis
        </h2>
        <p className="text-xs text-muted-foreground">10-factor comprehensive analysis: content, frequency, engagement, SEO, thumbnails, audience, monetization, cross-platform, SWOT</p>
      </div>

      {/* Run Analysis */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <Label>Select Competitor to Analyze</Label>
              <Select value={selectedCompetitor} onValueChange={setSelectedCompetitor}>
                <SelectTrigger><SelectValue placeholder="Choose a competitor..." /></SelectTrigger>
                <SelectContent>
                  {competitors.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button className="gap-2 bg-[#FF5722] hover:bg-[#FF7043]" onClick={() => runMutation.mutate(selectedCompetitor)} disabled={!selectedCompetitor || runMutation.isPending}>
              {runMutation.isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Analyzing...</> : <><Sparkles className="h-4 w-4" /> Run Deep Analysis</>}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Analysis Results */}
      {isLoading ? (
        <Skeleton className="h-96 w-full" />
      ) : analyses.length === 0 ? (
        <Card><CardContent className="p-12 text-center"><Microscope className="h-10 w-10 mx-auto text-muted-foreground" /><p className="text-sm text-muted-foreground mt-2">No analyses yet. Select a competitor and run a deep analysis.</p></CardContent></Card>
      ) : (
        <div className="space-y-4">
          {analyses.map((analysis: any) => {
            const ai = analysis.aiAnalysis ? JSON.parse(analysis.aiAnalysis) : null
            const strengths = analysis.strengths ? JSON.parse(analysis.strengths) : []
            const weaknesses = analysis.weaknesses ? JSON.parse(analysis.weaknesses) : []
            const opportunities = analysis.improvementOpportunities ? JSON.parse(analysis.improvementOpportunities) : []
            return (
              <Card key={analysis.id} className="overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-[#0A2A3A] to-[#0D47A1] text-white p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">{analysis.competitor?.name || 'Competitor'} — Deep Analysis</h3>
                      <p className="text-xs text-white/60">Analyzed: {new Date(analysis.analysisDate).toLocaleString()}</p>
                    </div>
                    {ai && (
                      <Badge className="capitalize" style={{ background: ai.threat_level === 'high' ? '#ef4444' : ai.threat_level === 'medium' ? '#f59e0b' : '#22c55e' }}>
                        Threat: {ai.threat_level}
                      </Badge>
                    )}
                  </div>
                </div>

                <CardContent className="p-4">
                  <Tabs defaultValue="content">
                    <TabsList className="grid w-full grid-cols-5 mb-4">
                      <TabsTrigger value="content">Content</TabsTrigger>
                      <TabsTrigger value="engagement">Engagement</TabsTrigger>
                      <TabsTrigger value="seo">SEO & Design</TabsTrigger>
                      <TabsTrigger value="audience">Audience</TabsTrigger>
                      <TabsTrigger value="swot">SWOT & AI</TabsTrigger>
                    </TabsList>

                    {/* Content & Frequency */}
                    <TabsContent value="content" className="space-y-3">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <StatBox icon={Target} label="Content Type" value={analysis.contentType || '—'} color="text-[#0A2A3A]" />
                        <StatBox icon={Clock} label="Posts/Week" value={analysis.postsPerWeek || '—'} color="text-[#FF5722]" />
                        <StatBox icon={Clock} label="Posts/Month" value={analysis.postsPerMonth || '—'} color="text-[#80DEEA]" />
                        <StatBox icon={CheckCircle2} label="Consistency" value={`${analysis.consistencyScore || 0}/100`} color="text-emerald-600" />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <InfoCard title="Topic Diversity" items={[analysis.topicDiversity || '—']} />
                        <InfoCard title="Top Topics" items={analysis.topTopics ? JSON.parse(analysis.topTopics) : []} />
                        <InfoCard title="Title Keywords" items={analysis.titleKeywords ? JSON.parse(analysis.titleKeywords) : []} />
                        <InfoCard title="Description Style" items={[analysis.descriptionStyle || '—']} />
                      </div>
                    </TabsContent>

                    {/* Engagement & Metrics */}
                    <TabsContent value="engagement" className="space-y-3">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <StatBox icon={Eye} label="Avg Views" value={(analysis.avgViews || 0).toLocaleString()} color="text-[#0A2A3A]" />
                        <StatBox icon={Heart} label="Avg Likes" value={(analysis.avgLikes || 0).toLocaleString()} color="text-[#FF5722]" />
                        <StatBox icon={MessageCircle} label="Avg Comments" value={(analysis.avgComments || 0).toLocaleString()} color="text-[#80DEEA]" />
                        <StatBox icon={Share2} label="Avg Shares" value={(analysis.avgShares || 0).toLocaleString()} color="text-violet-600" />
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <StatBox icon={TrendingUp} label="Engagement Rate" value={`${analysis.engagementRate || 0}%`} color="text-emerald-600" />
                        <StatBox icon={MessageCircle} label="Response Rate" value={`${analysis.commentResponseRate || 0}%`} color="text-amber-600" />
                        <StatBox icon={Clock} label="Response Time" value={analysis.avgResponseTime || '—'} color="text-[#FF5722]" />
                        <StatBox icon={Target} label="CTR" value={`${analysis.ctr || 0}%`} color="text-violet-600" />
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <StatBox icon={Users} label="Subscribers" value={(analysis.totalSubscribers || 0).toLocaleString()} color="text-[#0A2A3A]" />
                        <StatBox icon={TrendingUp} label="Growth Rate" value={`${analysis.subscriberGrowth || 0}%`} color="text-emerald-600" />
                        <StatBox icon={Clock} label="Avg Watch Time" value={analysis.avgWatchTime || '—'} color="text-[#FF5722]" />
                      </div>
                    </TabsContent>

                    {/* SEO & Design */}
                    <TabsContent value="seo" className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <InfoCard title="SEO Keywords" items={analysis.seoKeywords ? JSON.parse(analysis.seoKeywords) : []} />
                        <div className="rounded-lg border p-3 space-y-2">
                          <p className="text-xs font-medium text-muted-foreground">Optimization Status</p>
                          <div className="flex items-center gap-2 text-sm"><CheckCircle2 className={`h-3.5 w-3.5 ${analysis.descriptionOptimized ? 'text-emerald-600' : 'text-red-500'}`} /> Description Optimized</div>
                          <div className="flex items-center gap-2 text-sm"><CheckCircle2 className={`h-3.5 w-3.5 ${analysis.usesEndCards ? 'text-emerald-600' : 'text-red-500'}`} /> Uses End Cards</div>
                          <div className="flex items-center gap-2 text-sm"><CheckCircle2 className={`h-3.5 w-3.5 ${analysis.usesPlaylists ? 'text-emerald-600' : 'text-red-500'}`} /> Uses Playlists</div>
                          <div className="flex items-center gap-2 text-sm"><CheckCircle2 className={`h-3.5 w-3.5 ${analysis.usesBranding ? 'text-emerald-600' : 'text-red-500'}`} /> Consistent Branding</div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <StatBox icon={Target} label="Tag Strategy" value={analysis.tagStrategy || '—'} color="text-[#0A2A3A]" />
                        <StatBox icon={Eye} label="Visual Consistency" value={`${analysis.visualConsistency || 0}/100`} color="text-[#FF5722]" />
                        <StatBox icon={Lightbulb} label="Thumbnail Style" value={analysis.thumbnailStyle || '—'} color="text-violet-600" />
                        <StatBox icon={Globe} label="Tone of Voice" value={analysis.toneOfVoice || '—'} color="text-[#80DEEA]" />
                      </div>
                    </TabsContent>

                    {/* Audience & Monetization */}
                    <TabsContent value="audience" className="space-y-3">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <StatBox icon={Users} label="Age Range" value={analysis.audienceAgeRange || '—'} color="text-[#0A2A3A]" />
                        <StatBox icon={Users} label="Gender" value={analysis.audienceGender || '—'} color="text-[#FF5722]" />
                        <StatBox icon={DollarSign} label="Monthly Earnings" value={`$${(analysis.estimatedMonthlyEarnings || 0).toLocaleString()}`} color="text-emerald-600" />
                        <StatBox icon={Globe} label="Total Followers" value={(analysis.totalFollowersAll || 0).toLocaleString()} color="text-violet-600" />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <InfoCard title="Audience Countries" items={analysis.audienceCountries ? JSON.parse(analysis.audienceCountries) : []} />
                        <InfoCard title="Monetization Methods" items={analysis.monetizationMethods ? JSON.parse(analysis.monetizationMethods) : []} />
                        <InfoCard title="Sponsor Brands" items={analysis.sponsorBrands ? JSON.parse(analysis.sponsorBrands) : []} />
                        <InfoCard title="Affiliate Programs" items={analysis.affiliatePrograms ? JSON.parse(analysis.affiliatePrograms) : []} />
                      </div>
                    </TabsContent>

                    {/* SWOT & AI Recommendations */}
                    <TabsContent value="swot" className="space-y-3">
                      {ai && (
                        <Card className="border-violet-500/30 bg-violet-500/5">
                          <CardContent className="p-4">
                            <div className="flex items-center gap-2 mb-2"><Sparkles className="h-4 w-4 text-violet-600" /><p className="text-sm font-medium">AI Analysis Summary</p></div>
                            <p className="text-sm text-muted-foreground mb-3">{ai.summary}</p>
                            <div className="flex items-center gap-3 mb-3">
                              <Badge variant="outline" className="capitalize">Threat: {ai.threat_level}</Badge>
                              <Badge variant="outline">Opportunity Score: {ai.opportunity_score}/100</Badge>
                            </div>
                            <div className="space-y-1">
                              <p className="text-xs font-medium mb-1">Recommendations:</p>
                              {ai.recommendations?.map((r: string, i: number) => (
                                <div key={i} className="flex items-start gap-2 text-xs"><Zap className="h-3 w-3 text-[#FF5722] mt-0.5 shrink-0" />{r}</div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      )}
                      <div className="grid grid-cols-2 gap-3">
                        <Card className="border-emerald-500/20"><CardContent className="p-3"><p className="text-xs font-medium text-emerald-600 mb-2 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Strengths</p>{strengths.map((s: string, i: number) => <div key={i} className="text-xs flex items-start gap-1.5 mb-1"><span className="text-emerald-600">+</span>{s}</div>)}</CardContent></Card>
                        <Card className="border-red-500/20"><CardContent className="p-3"><p className="text-xs font-medium text-red-500 mb-2 flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Weaknesses</p>{weaknesses.map((w: string, i: number) => <div key={i} className="text-xs flex items-start gap-1.5 mb-1"><span className="text-red-500">−</span>{w}</div>)}</CardContent></Card>
                      </div>
                      <Card className="border-[#FF5722]/20 bg-[#FF5722]/5">
                        <CardContent className="p-3">
                          <p className="text-xs font-medium text-[#FF5722] mb-2 flex items-center gap-1"><Lightbulb className="h-3 w-3" /> Your Improvement Opportunities</p>
                          <div className="grid grid-cols-2 gap-1">
                            {opportunities.map((o: string, i: number) => (
                              <div key={i} className="text-xs flex items-start gap-1.5"><Zap className="h-2.5 w-2.5 text-[#FF5722] mt-0.5 shrink-0" />{o}</div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

function StatBox({ icon: Icon, label, value, color }: { icon: any; label: string; value: any; color: string }) {
  return (
    <div className="rounded-lg bg-muted/50 p-3 text-center">
      <Icon className={`h-4 w-4 mx-auto ${color} mb-1`} />
      <p className="text-sm font-bold">{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  )
}

function InfoCard({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-xs font-medium text-muted-foreground mb-2">{title}</p>
      <div className="flex flex-wrap gap-1">
        {items.map((item, i) => <Badge key={i} variant="secondary" className="text-[10px]">{item}</Badge>)}
      </div>
    </div>
  )
}
