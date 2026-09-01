'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { toast } from 'sonner'
import { GuideTooltip } from '@/components/guides/guided-tour'
import { Users, Star, Clock, Briefcase, Award, Headset } from 'lucide-react'

const SKILL_COLORS: Record<string, string> = {
  seo: '#10b981', content: '#3b82f6', ads: '#f59e0b',
  social: '#ec4899', design: '#8b5cf6', development: '#06b6d4',
  email: '#f97316', full_marketing: '#1B3A4B',
}

export function VirtualAssistantView() {
  const qc = useQueryClient()

  const { data: assistantsData, isLoading } = useQuery({
    queryKey: ['virtual-assistants'],
    queryFn: async () => {
      const res = await fetch('/api/virtual-assistants')
      if (!res.ok) return { assistants: [] }
      return res.json()
    },
  })

  const { data: assignmentsData } = useQuery({
    queryKey: ['assistant-assignments'],
    queryFn: async () => {
      const res = await fetch('/api/virtual-assistants/assignments')
      if (!res.ok) return { assignments: [] }
      return res.json()
    },
  })

  const hire = useMutation({
    mutationFn: async (assistant: any) => {
      const res = await fetch('/api/virtual-assistants/assignments', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assistantId: assistant.id,
          projectName: `Project with ${assistant.name}`,
          pricingType: 'hourly',
          agreedRate: assistant.hourlyRate,
        }),
      })
      if (!res.ok) throw new Error('Failed')
      return res.json()
    },
    onSuccess: () => {
      toast.success('Assistant hired!')
      qc.invalidateQueries({ queryKey: ['assistant-assignments'] })
    },
    onError: () => toast.error('Hire failed'),
  })

  const assistants = assistantsData?.assistants ?? []
  const assignments = assignmentsData?.assignments ?? []

  if (isLoading) return <Skeleton className="h-96" />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Headset className="h-8 w-8 animate-float-3d" style={{ color: '#F26522' }} />
            Virtual Assistant Service
            <GuideTooltip sectionId="virtual-assistants" />
          </h1>
          <p className="text-muted-foreground mt-1">
            Hire trained assistants for customer projects — in-office or remote. Work-tracking + automatic salary included.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="card-3d-flat"><CardContent className="p-4">
          <div className="text-xs text-muted-foreground">Available Assistants</div>
          <div className="text-2xl font-bold text-brand-primary">{assistants.filter(a => a.isAvailable).length}</div>
        </CardContent></Card>
        <Card className="card-3d-flat"><CardContent className="p-4">
          <div className="text-xs text-muted-foreground">Active Assignments</div>
          <div className="text-2xl font-bold text-brand-accent">{assignments.filter(a => a.status === 'active').length}</div>
        </CardContent></Card>
        <Card className="card-3d-flat"><CardContent className="p-4">
          <div className="text-xs text-muted-foreground">Avg Rating</div>
          <div className="text-2xl font-bold flex items-center gap-1">
            {(assistants.reduce((s, a) => s + a.rating, 0) / (assistants.length || 1)).toFixed(1)}
            <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
          </div>
        </CardContent></Card>
        <Card className="card-3d-flat"><CardContent className="p-4">
          <div className="text-xs text-muted-foreground">Avg Hourly Rate</div>
          <div className="text-2xl font-bold">${(assistants.reduce((s, a) => s + a.hourlyRate, 0) / (assistants.length || 1)).toFixed(0)}</div>
        </CardContent></Card>
      </div>

      <Tabs defaultValue="browse">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="browse">Browse Assistants</TabsTrigger>
          <TabsTrigger value="assignments">My Assignments</TabsTrigger>
          <TabsTrigger value="timesheets">Work Tracking</TabsTrigger>
        </TabsList>

        <TabsContent value="browse" className="space-y-3">
          {assistants.map(a => (
            <Card key={a.id} className="card-3d">
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <Avatar className="h-14 w-14 ring-2 ring-brand-light">
                    <AvatarFallback style={{ background: '#1B3A4B', color: '#fff' }}>
                      {a.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <div className="font-semibold text-lg">{a.name}</div>
                      {a.isVerified && <Badge variant="secondary"><Award className="h-3 w-3 mr-1" /> Verified</Badge>}
                      <Badge variant="outline" style={{ color: SKILL_COLORS[a.primarySkill] ?? '#666', borderColor: SKILL_COLORS[a.primarySkill] }}>
                        {a.primarySkill}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{a.bio ?? 'No bio available'}</p>
                    <div className="flex items-center gap-4 mt-2 text-sm">
                      <span className="flex items-center gap-1"><Star className="h-4 w-4 text-yellow-500 fill-yellow-500" /> {a.rating.toFixed(1)}</span>
                      <span className="flex items-center gap-1"><Briefcase className="h-4 w-4 text-muted-foreground" /> {a.totalProjects} projects</span>
                      <span className="flex items-center gap-1"><Clock className="h-4 w-4 text-muted-foreground" /> {a.totalHours.toFixed(0)}h logged</span>
                      <span className="font-semibold text-brand-accent">${a.hourlyRate}/hr</span>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline">{a.workMode}</Badge>
                      {a.location && <Badge variant="outline">{a.location}</Badge>}
                      {a.isAvailable
                        ? <Badge variant="default" className="bg-emerald-600">Available</Badge>
                        : <Badge variant="outline">Busy</Badge>}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button
                      className="bg-brand-accent-gradient text-white btn-3d"
                      disabled={!a.isAvailable || hire.isPending}
                      onClick={() => hire.mutate(a)}
                    >
                      <Users className="h-4 w-4 mr-1" /> Hire
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {assistants.length === 0 && (
            <Card><CardContent className="p-8 text-center text-muted-foreground">No assistants available yet.</CardContent></Card>
          )}
        </TabsContent>

        <TabsContent value="assignments" className="space-y-3">
          {assignments.map(a => (
            <Card key={a.id} className="card-3d-flat">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold">{a.projectName}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {a.assistant?.name} · {a.assistant?.primarySkill} · {a.pricingType} ${a.agreedRate}/{a.pricingType === 'hourly' ? 'hr' : 'fixed'}
                    </p>
                    <div className="flex items-center gap-3 mt-2 text-xs">
                      <span>{a.hoursLogged.toFixed(1)}h / {a.hoursBudget ?? '∞'}h</span>
                      <span>{a.tasksCompleted}/{a.tasksTotal} tasks</span>
                      {a.expectedEndDate && <span>Due: {new Date(a.expectedEndDate).toLocaleDateString()}</span>}
                    </div>
                  </div>
                  <Badge variant="outline">{a.status}</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
          {assignments.length === 0 && (
            <Card><CardContent className="p-8 text-center text-muted-foreground">No assignments yet. Hire an assistant from the Browse tab.</CardContent></Card>
          )}
        </TabsContent>

        <TabsContent value="timesheets">
          <Card><CardContent className="p-6 text-center text-muted-foreground">
            Work-tracking dashboards appear here. Assistants log hours via the mobile app or browser extension;
            you see real-time productivity scores, screenshots, and deliverables.
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
