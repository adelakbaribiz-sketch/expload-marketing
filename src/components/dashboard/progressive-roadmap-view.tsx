'use client'

import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import {
  Users, Target, Lightbulb, Search, Megaphone, Share2, Link2,
  BarChart3, Brain, Bot, Lock, CheckCircle2, Clock, Rocket,
  TrendingUp, Zap, Calendar, ChevronRight, Sparkles,
} from 'lucide-react'
import { useAuthStore } from '@/store/auth-store'

const PHASE_ICONS: Record<string, any> = {
  Users, Target, Lightbulb, Search, Megaphone, Share2, Link2,
  BarChart3, Brain, Bot,
}

const PHASE_COLORS: Record<string, string> = {
  P1: '#0A2A3A', P2: '#FF5722', P3: '#80DEEA', P4: '#4FC3F7',
  P5: '#FF7043', P6: '#26C6DA', P7: '#42A5F5', P8: '#FFAB91',
  P9: '#7C4DFF', P10: '#0A2A3A',
}

export function ProgressiveRoadmapView() {
  const qc = useQueryClient()
  const { openAuthModal } = useAuthStore()

  const { data, isLoading } = useQuery({
    queryKey: ['progressive'],
    queryFn: async () => {
      const res = await fetch('/api/progressive')
      if (!res.ok) throw new Error('failed')
      return res.json()
    },
  })

  if (isLoading) {
    return (
      <div className="space-y-4 p-4 md:p-6">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  if (!data) return null

  const { roadmap, stats, milestones } = data

  return (
    <div className="space-y-6 p-4 md:p-6 animate-fade-in-up">
      {/* Header with overall progress */}
      <Card className="border-brand-primary/20 bg-gradient-to-br from-[#0A2A3A] to-[#0D47A1] text-white overflow-hidden relative">
        <div className="absolute top-0 right-0 h-40 w-40 rounded-full bg-[#FF5722]/20 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-32 w-32 rounded-full bg-[#80DEEA]/20 blur-3xl" />
        <CardContent className="relative p-6">
          <div className="flex items-start justify-between flex-wrap gap-4 mb-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Rocket className="h-6 w-6 text-[#FF5722]" />
                <h2 className="text-xl font-bold">Your Marketing Roadmap</h2>
              </div>
              <p className="text-sm text-white/70">
                Phases unlock progressively based on your plan, budget, and activity
              </p>
            </div>
            <div className="text-right">
              <p className="text-4xl font-bold">{stats.overallProgress}%</p>
              <p className="text-xs text-white/60">Overall Progress</p>
            </div>
          </div>

          {/* Overall progress bar */}
          <div className="mb-4">
            <div className="h-3 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#FF5722] to-[#FFAB91] transition-all duration-500"
                style={{ width: `${stats.overallProgress}%` }}
              />
            </div>
            <div className="flex items-center justify-between mt-2 text-xs text-white/60">
              <span>{stats.unlockedCount} of {stats.totalPhases} phases unlocked</span>
              <span>Plan: <span className="font-medium capitalize text-white">{stats.plan}</span></span>
            </div>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="rounded-lg bg-white/10 p-3">
              <Zap className="h-4 w-4 text-[#FF5722] mb-1" />
              <p className="text-lg font-bold capitalize">{stats.plan}</p>
              <p className="text-[10px] text-white/60">Current Plan</p>
            </div>
            <div className="rounded-lg bg-white/10 p-3">
              <TrendingUp className="h-4 w-4 text-[#80DEEA] mb-1" />
              <p className="text-lg font-bold">{stats.acceleration}</p>
              <p className="text-[10px] text-white/60">Budget Boost</p>
            </div>
            <div className="rounded-lg bg-white/10 p-3">
              <Calendar className="h-4 w-4 text-[#FF5722] mb-1" />
              <p className="text-lg font-bold">{stats.daysSinceSignup}</p>
              <p className="text-[10px] text-white/60">Days Active</p>
            </div>
            <div className="rounded-lg bg-white/10 p-3">
              <Clock className="h-4 w-4 text-[#80DEEA] mb-1" />
              <p className="text-lg font-bold">{stats.nextPhaseUnlock || '—'}</p>
              <p className="text-[10px] text-white/60">Next Unlock</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Phase Timeline */}
      <div className="space-y-3">
        {roadmap.map((phase: any, index: number) => {
          const Icon = PHASE_ICONS[phase.icon] ?? Rocket
          const phaseColor = PHASE_COLORS[phase.id] ?? '#0A2A3A'
          const isLast = index === roadmap.length - 1

          return (
            <div key={phase.id} className="relative">
              {/* Connection line */}
              {!isLast && (
                <div
                  className="absolute left-[24px] top-[56px] w-[2px] z-0"
                  style={{
                    height: 'calc(100% - 16px)',
                    background: phase.unlocked ? phaseColor : '#E0E0E0',
                    opacity: phase.unlocked ? 0.3 : 0.5,
                  }}
                />
              )}

              <Card
                className={`relative z-10 transition-all ${phase.locked ? 'phase-locked' : ''} ${phase.isCurrent ? 'ring-2 ring-[#FF5722] animate-brand-pulse' : ''}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    {/* Phase number/icon */}
                    <div
                      className="grid place-items-center h-12 w-12 rounded-xl shrink-0 text-white shadow-md"
                      style={{ background: phase.unlocked ? phaseColor : '#B0BEC5' }}
                    >
                      {phase.locked ? (
                        <Lock className="h-5 w-5" />
                      ) : phase.progress >= 100 ? (
                        <CheckCircle2 className="h-6 w-6" />
                      ) : (
                        <Icon className="h-5 w-5" />
                      )}
                    </div>

                    {/* Phase content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-[10px] font-mono text-muted-foreground">{phase.id}</span>
                            {phase.isCurrent && (
                              <Badge className="text-[9px] gap-1 bg-[#FF5722]">
                                <Sparkles className="h-2.5 w-2.5" /> Active
                              </Badge>
                            )}
                            {phase.progress >= 100 && (
                              <Badge variant="outline" className="text-[9px] gap-1 text-emerald-600 border-emerald-500/30">
                                <CheckCircle2 className="h-2.5 w-2.5" /> Complete
                              </Badge>
                            )}
                          </div>
                          <h3 className="font-semibold text-sm">{phase.title}</h3>
                          <p className="text-xs text-muted-foreground line-clamp-2">{phase.desc}</p>
                        </div>
                        {phase.locked && phase.estimatedUnlock && (
                          <Badge variant="outline" className="text-[10px] gap-1 shrink-0">
                            <Clock className="h-2.5 w-2.5" />
                            {new Date(phase.estimatedUnlock).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                          </Badge>
                        )}
                      </div>

                      {/* Progress bar for unlocked phases */}
                      {phase.unlocked && (
                        <div className="mt-2">
                          <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                            <span>Progress</span>
                            <span className="font-medium">{phase.progress}%</span>
                          </div>
                          <Progress value={phase.progress} className="h-1.5" />
                        </div>
                      )}

                      {/* CTA for current phase */}
                      {phase.isCurrent && phase.progress < 100 && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="mt-2 gap-1.5 text-xs h-7"
                          style={{ borderColor: phaseColor, color: phaseColor }}
                          onClick={() => {
                            // Navigate to the phase's view
                            const phaseViewMap: Record<string, string> = {
                              P1: 'leads', P2: 'crm', P3: 'content', P4: 'seo',
                              P5: 'ads', P6: 'social', P7: 'backlinks', P8: 'analytics',
                              P9: 'advisor', P10: 'autonomous',
                            }
                            // This would need to be wired to the parent's view state
                            // For now, show a toast
                            toast.info(`Continue working on ${phase.title} to unlock the next phase!`)
                          }}
                        >
                          Continue <ChevronRight className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )
        })}
      </div>

      {/* Milestones */}
      {milestones.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-[#FF5722]" />
              Milestones Achieved
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {milestones.map((m: any, i: number) => (
                <Badge
                  key={i}
                  variant={m.completed ? 'default' : 'secondary'}
                  className="gap-1.5 py-1.5 px-3"
                  style={m.completed ? { background: '#0A2A3A' } : {}}
                >
                  {m.completed && <CheckCircle2 className="h-3 w-3" />}
                  {m.phase}: {m.title}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upgrade CTA for locked phases */}
      {stats.unlockedCount < stats.maxPhasesForPlan && (
        <Card className="border-[#FF5722]/20 bg-gradient-to-br from-[#FF5722]/5 to-[#FF7043]/5">
          <CardContent className="p-6 text-center">
            <Rocket className="h-10 w-10 mx-auto text-[#FF5722] mb-3" />
            <h3 className="font-semibold mb-1">Unlock More Phases Faster</h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
              Upgrade your plan or increase your budget to accelerate phase unlocking and get access to more marketing automation features.
            </p>
            <Button
              className="gap-2 bg-[#FF5722] hover:bg-[#FF7043]"
              onClick={() => openAuthModal('signup')}
            >
              <Zap className="h-4 w-4" />
              Upgrade Plan
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
