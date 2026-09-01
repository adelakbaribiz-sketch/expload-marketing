'use client'

import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Calendar, Mail, Share2, Search, FlaskConical, Workflow, Target, FileText, ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'

const SOURCE_ICONS: Record<string, any> = {
  campaign: Mail,
  social_post: Share2,
  content: FileText,
  seo_crawl: Search,
  ab_test: FlaskConical,
  workflow: Workflow,
  task: Target,
  manual: Calendar,
}

const SOURCE_COLORS: Record<string, string> = {
  campaign: '#3b82f6',
  social_post: '#ec4899',
  content: '#8b5cf6',
  seo_crawl: '#f59e0b',
  ab_test: '#10b981',
  workflow: '#6366f1',
  task: '#ef4444',
  manual: '#64748b',
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

export function CalendarView() {
  const [currentDate, setCurrentDate] = useState(new Date())

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const daysInMonth = lastDay.getDate()
  const startWeekday = firstDay.getDay()

  const startDate = new Date(year, month, 1)
  const endDate = new Date(year, month, daysInMonth, 23, 59, 59)

  const { data, isLoading } = useQuery({
    queryKey: ['calendar', year, month],
    queryFn: async () => {
      const res = await fetch(`/api/calendar?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`)
      if (!res.ok) return { events: [] }
      return res.json()
    },
  })

  const events = data?.events ?? []

  // Group events by day
  const eventsByDay: Record<number, any[]> = {}
  events.forEach((e: any) => {
    const day = new Date(e.startDate).getDate()
    if (!eventsByDay[day]) eventsByDay[day] = []
    eventsByDay[day].push(e)
  })

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1))
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1))
  const today = new Date()
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month

  return (
    <div className="space-y-4 p-4 md:p-6 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-600" />
            Marketing Calendar
          </h2>
          <p className="text-xs text-muted-foreground">Unified view of all marketing activities across channels</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="p-2 rounded-md hover:bg-muted"><ChevronLeft className="h-4 w-4" /></button>
          <span className="text-sm font-medium min-w-[120px] text-center">{MONTHS[month]} {year}</span>
          <button onClick={nextMonth} className="p-2 rounded-md hover:bg-muted"><ChevronRight className="h-4 w-4" /></button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(SOURCE_COLORS).map(([source, color]) => {
          const Icon = SOURCE_ICONS[source] ?? Calendar
          return (
            <Badge key={source} variant="outline" className="text-[10px] gap-1 capitalize">
              <span className="h-2 w-2 rounded-full" style={{ background: color }} />
              {source.replace('_', ' ')}
            </Badge>
          )
        })}
      </div>

      {/* Calendar Grid */}
      <Card>
        <CardContent className="p-4">
          {isLoading ? (
            <Skeleton className="h-96 w-full" />
          ) : (
            <div className="grid grid-cols-7 gap-1">
              {/* Day headers */}
              {DAYS.map((day) => (
                <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
                  {day}
                </div>
              ))}

              {/* Empty cells before first day */}
              {Array.from({ length: startWeekday }).map((_, i) => (
                <div key={`empty-${i}`} className="min-h-[80px] md:min-h-[100px] rounded-md bg-muted/20" />
              ))}

              {/* Day cells */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1
                const dayEvents = eventsByDay[day] ?? []
                const isToday = isCurrentMonth && today.getDate() === day
                return (
                  <div
                    key={day}
                    className={`min-h-[80px] md:min-h-[100px] rounded-md border p-1 ${isToday ? 'border-emerald-500 bg-emerald-500/5' : 'border-border'}`}
                  >
                    <div className={`text-xs font-medium mb-1 ${isToday ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                      {day}
                    </div>
                    <div className="space-y-0.5">
                      {dayEvents.slice(0, 3).map((e: any) => {
                        const Icon = SOURCE_ICONS[e.sourceType] ?? Calendar
                        return (
                          <div
                            key={e.id}
                            className="flex items-center gap-1 rounded px-1 py-0.5 text-[10px] truncate"
                            style={{ background: (SOURCE_COLORS[e.sourceType] ?? '#64748b') + '15', color: SOURCE_COLORS[e.sourceType] ?? '#64748b' }}
                            title={e.title}
                          >
                            <Icon className="h-2.5 w-2.5 shrink-0" />
                            <span className="truncate">{e.title}</span>
                          </div>
                        )
                      })}
                      {dayEvents.length > 3 && (
                        <p className="text-[9px] text-muted-foreground">+{dayEvents.length - 3} more</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upcoming Events List */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Upcoming Events ({events.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {events.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No events scheduled for this month.</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto scroll-thin">
              {events.slice(0, 20).map((e: any) => {
                const Icon = SOURCE_ICONS[e.sourceType] ?? Calendar
                return (
                  <div key={e.id} className="flex items-center gap-3 p-2 rounded-md bg-muted/30">
                    <div className="grid place-items-center h-7 w-7 rounded-md text-white shrink-0" style={{ background: SOURCE_COLORS[e.sourceType] ?? '#64748b' }}>
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{e.title}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {new Date(e.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        {e.channel && ` · ${e.channel}`}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-[10px] capitalize shrink-0">{e.sourceType.replace('_', ' ')}</Badge>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
