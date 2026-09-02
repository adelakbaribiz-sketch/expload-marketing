'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import {
  Users, Building2, Activity, UserPlus, Shield, Crown,
} from 'lucide-react'

const ROLE_COLORS: Record<string, string> = {
  staff: '#6b7280', senior: '#3b82f6', lead: '#8b5cf6',
  manager: '#f59e0b', director: '#ef4444', vp: '#a78bfa', c_level: '#0A0A0B',
}
const PLATFORM_ROLE_COLORS: Record<string, string> = {
  employee: '#6b7280', admin: '#f59e0b', super_admin: '#0A0A0B',
}

export function InternalPortalView() {
  const qc = useQueryClient()

  const { data: employeesData, isLoading } = useQuery({
    queryKey: ['internal-employees'],
    queryFn: async () => {
      const res = await fetch('/api/internal/employees')
      if (!res.ok) return { employees: [] }
      return res.json()
    },
  })

  const { data: departmentsData } = useQuery({
    queryKey: ['internal-departments'],
    queryFn: async () => {
      const res = await fetch('/api/internal/departments')
      if (!res.ok) return { departments: [] }
      return res.json()
    },
  })

  const { data: activitiesData } = useQuery({
    queryKey: ['internal-activities'],
    queryFn: async () => {
      const res = await fetch('/api/internal/activities')
      if (!res.ok) return { activities: [] }
      return res.json()
    },
  })

  const createEmployee = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/internal/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Failed')
      return res.json()
    },
    onSuccess: () => {
      toast.success('Employee added')
      qc.invalidateQueries({ queryKey: ['internal-employees'] })
    },
    onError: () => toast.error('Failed to add employee'),
  })

  const createDepartment = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/internal/departments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Failed')
      return res.json()
    },
    onSuccess: () => {
      toast.success('Department created')
      qc.invalidateQueries({ queryKey: ['internal-departments'] })
    },
    onError: () => toast.error('Failed to create department'),
  })

  const employees = employeesData?.employees ?? []
  const departments = departmentsData?.departments ?? []
  const activities = activitiesData?.activities ?? []

  if (isLoading) return <Skeleton className="h-96" />

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Shield className="h-8 w-8" style={{ color: '#0A0A0B' }} />
          Internal Portal
        </h1>
        <p className="text-muted-foreground mt-1">
          Platform employees, departments, and partner management team
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total Staff</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{employees.length}</div>
            <p className="text-xs text-muted-foreground">{employees.filter(e => e.status === 'active').length} active</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Departments</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{departments.length}</div>
            <p className="text-xs text-muted-foreground">{departments.filter(d => d.isActive).length} active</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Admins</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{employees.filter(e => e.platformRole === 'admin').length}</div>
            <p className="text-xs text-muted-foreground">expandable by super_admin</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Recent Activity</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activities.length}</div>
            <p className="text-xs text-muted-foreground">last 200 actions</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="employees">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="employees">Employees</TabsTrigger>
          <TabsTrigger value="departments">Departments</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="add">Add Staff</TabsTrigger>
        </TabsList>

        <TabsContent value="employees" className="space-y-2">
          {employees.map(e => (
            <Card key={e.id}>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <div className="font-semibold flex items-center gap-2">
                    {e.user?.name ?? e.user?.email}
                    <Badge style={{ background: ROLE_COLORS[e.employeeRole] ?? '#6b7280', color: '#fff' }}>
                      {e.employeeRole}
                    </Badge>
                    <Badge style={{ background: PLATFORM_ROLE_COLORS[e.platformRole] ?? '#6b7280', color: '#fff' }}>
                      {e.platformRole}
                    </Badge>
                    {e.platformRole === 'super_admin' && <Crown className="h-4 w-4 text-yellow-500" />}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {e.jobTitle ?? '—'} · {e.department?.displayName ?? 'Unassigned'}
                    {e.manager?.user?.name ? ` · reports to ${e.manager.user.name}` : ''}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {e.workEmail ?? e.user?.email} · {e.employmentType} · {e.assignedRegion ?? 'no region'}
                  </p>
                </div>
                <Badge variant="outline">{e.status}</Badge>
              </CardContent>
            </Card>
          ))}
          {employees.length === 0 && (
            <Card><CardContent className="p-8 text-center text-muted-foreground">No internal employees yet.</CardContent></Card>
          )}
        </TabsContent>

        <TabsContent value="departments" className="space-y-2">
          {departments.map(d => (
            <Card key={d.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      {d.displayName}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {d.description ?? 'No description'}
                      {d.parent && ` · under ${d.parent.displayName}`}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Scope: {d.accessScope} · {d._count?.employees ?? 0} staff · {d._count?.children ?? 0} sub-teams
                    </p>
                  </div>
                  <Badge variant="outline">{d.isActive ? 'active' : 'inactive'}</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
          {departments.length === 0 && (
            <Card><CardContent className="p-8 text-center text-muted-foreground">No departments yet.</CardContent></Card>
          )}
        </TabsContent>

        <TabsContent value="activity" className="space-y-1">
          {activities.slice(0, 50).map(a => (
            <div key={a.id} className="text-sm border-l-2 pl-3 py-1" style={{ borderColor: '#0A0A0B' }}>
              <div className="flex justify-between">
                <span className="font-medium">{a.action.replace(/_/g, ' ')}</span>
                <span className="text-xs text-muted-foreground">{new Date(a.createdAt).toLocaleString()}</span>
              </div>
              <p className="text-xs text-muted-foreground">{a.description}</p>
            </div>
          ))}
          {activities.length === 0 && (
            <Card><CardContent className="p-8 text-center text-muted-foreground">No recent activity.</CardContent></Card>
          )}
        </TabsContent>

        <TabsContent value="add">
          <Card>
            <CardContent className="p-4">
              <form
                className="grid gap-3 md:grid-cols-2"
                onSubmit={(e) => {
                  e.preventDefault()
                  const fd = new FormData(e.currentTarget)
                  createEmployee.mutate({
                    email: fd.get('email'),
                    name: fd.get('name'),
                    departmentId: fd.get('departmentId') || undefined,
                    employeeRole: fd.get('employeeRole') || 'staff',
                    platformRole: fd.get('platformRole') || 'employee',
                    jobTitle: fd.get('jobTitle') || undefined,
                    employmentType: fd.get('employmentType') || 'full_time',
                    assignedRegion: fd.get('assignedRegion') || undefined,
                    workPhone: fd.get('workPhone') || undefined,
                    workEmail: fd.get('workEmail') || fd.get('email'),
                    location: fd.get('location') || undefined,
                  })
                  ;(e.target as HTMLFormElement).reset()
                }}
              >
                <div>
                  <Label className="text-xs">Name</Label>
                  <Input name="name" required />
                </div>
                <div>
                  <Label className="text-xs">Email</Label>
                  <Input name="email" type="email" required />
                </div>
                <div>
                  <Label className="text-xs">Department</Label>
                  <Select name="departmentId">
                    <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>
                      {departments.map(d => <SelectItem key={d.id} value={d.id}>{d.displayName}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Employee Role</Label>
                  <Select name="employeeRole" defaultValue="staff">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['staff', 'senior', 'lead', 'manager', 'director', 'vp', 'c_level'].map(r =>
                        <SelectItem key={r} value={r}>{r}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Platform Role</Label>
                  <Select name="platformRole" defaultValue="employee">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="employee">employee</SelectItem>
                      <SelectItem value="admin">admin</SelectItem>
                      <SelectItem value="super_admin">super_admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Job Title</Label>
                  <Input name="jobTitle" />
                </div>
                <div>
                  <Label className="text-xs">Employment Type</Label>
                  <Select name="employmentType" defaultValue="full_time">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['full_time', 'part_time', 'contractor', 'intern'].map(t =>
                        <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Assigned Region</Label>
                  <Input name="assignedRegion" placeholder="e.g. MENA, EU, Asia" />
                </div>
                <div>
                  <Label className="text-xs">Work Phone</Label>
                  <Input name="workPhone" />
                </div>
                <div>
                  <Label className="text-xs">Location</Label>
                  <Input name="location" />
                </div>
                <div className="md:col-span-2">
                  <Button type="submit" disabled={createEmployee.isPending}>
                    <UserPlus className="h-4 w-4 mr-1" /> Add Employee
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
