'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import {
  Users, Crown, Shield, UserPlus, Mail, Trash2, UserCog,
  Check, X, Eye, Edit, ShieldCheck, AlertTriangle,
} from 'lucide-react'
import { useState } from 'react'

const ROLE_ICONS: Record<string, any> = {
  owner: Crown, admin: Shield, manager: UserCog, editor: Edit, viewer: Eye, super_admin: ShieldCheck,
}
const ROLE_COLORS: Record<string, string> = {
  owner: '#FF6A00', admin: '#0A0A0B', manager: '#7C4DFF', editor: '#C9CDD3', viewer: '#B0BEC5', super_admin: '#FFD700',
}

export function TeamView() {
  const qc = useQueryClient()
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteForm, setInviteForm] = useState({ email: '', name: '', roleName: 'member', roleId: '' })
  const [tab, setTab] = useState('members')

  const { data: membersData, isLoading } = useQuery({
    queryKey: ['team-members'],
    queryFn: async () => {
      const res = await fetch('/api/team/members')
      if (!res.ok) return { members: [], roles: [] }
      return res.json()
    },
  })

  const { data: rolesData } = useQuery({
    queryKey: ['team-roles'],
    queryFn: async () => {
      const res = await fetch('/api/team/roles')
      if (!res.ok) return { roles: [], allPermissions: [] }
      return res.json()
    },
  })

  const { data: auditData } = useQuery({
    queryKey: ['audit-log'],
    queryFn: async () => {
      const res = await fetch('/api/audit-log?limit=20')
      if (!res.ok) return { logs: [] }
      return res.json()
    },
  })

  const inviteMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch('/api/team/invite', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('invite failed')
      return res.json()
    },
    onSuccess: () => {
      toast.success('Invitation sent!')
      qc.invalidateQueries({ queryKey: ['team-members'] })
      setInviteOpen(false)
      setInviteForm({ email: '', name: '', roleName: 'member', roleId: '' })
    },
  })

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, roleId, roleName }: { userId: string; roleId: string; roleName: string }) => {
      const res = await fetch('/api/team/members', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, roleId, roleName }),
      })
      if (!res.ok) throw new Error('update failed')
      return res.json()
    },
    onSuccess: () => {
      toast.success('Role updated')
      qc.invalidateQueries({ queryKey: ['team-members'] })
    },
  })

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const res = await fetch(`/api/team/members/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !isActive }),
      })
      if (!res.ok) throw new Error('update failed')
      return res.json()
    },
    onSuccess: () => {
      toast.success('User status updated')
      qc.invalidateQueries({ queryKey: ['team-members'] })
    },
  })

  const members = membersData?.members ?? []
  const roles = rolesData?.roles ?? []
  const allPermissions = rolesData?.allPermissions ?? []
  const auditLogs = auditData?.logs ?? []

  return (
    <div className="space-y-4 p-4 md:p-6 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold flex items-center gap-2">
            <Users className="h-5 w-5 text-[#0A0A0B]" />
            Team & Access Control
          </h2>
          <p className="text-xs text-muted-foreground">Manage team members, roles, permissions, and project access</p>
        </div>
        <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><UserPlus className="h-4 w-4" /> Invite Member</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Invite Team Member</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Email Address</Label>
                <Input type="email" value={inviteForm.email} onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })} placeholder="colleague@company.com" dir="ltr" />
              </div>
              <div>
                <Label>Name</Label>
                <Input value={inviteForm.name} onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })} placeholder="John Doe" />
              </div>
              <div>
                <Label>Role</Label>
                <Select value={inviteForm.roleName} onValueChange={(v) => setInviteForm({ ...inviteForm, roleName: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {roles.map((r: any) => (
                      <SelectItem key={r.id} value={r.name}>
                        {r.icon} {r.displayName} {r.description ? `— ${r.description.slice(0, 40)}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setInviteOpen(false)}>Cancel</Button>
              <Button onClick={() => inviteMutation.mutate(inviteForm)} disabled={!inviteForm.email || !inviteForm.name || inviteMutation.isPending}>
                {inviteMutation.isPending ? 'Sending…' : 'Send Invitation'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="roles">Roles & Permissions</TabsTrigger>
          <TabsTrigger value="audit">Audit Log</TabsTrigger>
        </TabsList>

        {/* Members Tab */}
        <TabsContent value="members" className="space-y-3">
          {isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : members.length === 0 ? (
            <Card><CardContent className="p-12 text-center"><Users className="h-10 w-10 mx-auto text-muted-foreground" /><p className="text-sm text-muted-foreground mt-2">No team members yet.</p></CardContent></Card>
          ) : (
            <div className="space-y-2">
              {members.map((m: any) => {
                const RoleIcon = ROLE_ICONS[m.role] ?? Eye
                const roleColor = ROLE_COLORS[m.role] ?? '#B0BEC5'
                return (
                  <Card key={m.id}>
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="grid place-items-center h-10 w-10 rounded-full text-white shrink-0" style={{ background: roleColor }}>
                            <RoleIcon className="h-5 w-5" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{m.name || m.email}</p>
                            <p className="text-xs text-muted-foreground truncate" dir="ltr">{m.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge variant="outline" className="capitalize" style={{ background: roleColor + '20', color: roleColor }}>{m.roleName || m.role}</Badge>
                          <Badge variant={m.isActive ? 'default' : 'secondary'} className="text-[10px]">{m.isActive ? 'Active' : 'Disabled'}</Badge>
                          {/* Role selector */}
                          <Select
                            value={m.roleId || ''}
                            onValueChange={(v) => {
                              const role = roles.find((r: any) => r.id === v)
                              updateRoleMutation.mutate({ userId: m.id, roleId: v, roleName: role?.name || 'member' })
                            }}
                          >
                            <SelectTrigger className="w-[130px] h-8 text-xs"><SelectValue placeholder="Change role" /></SelectTrigger>
                            <SelectContent>
                              {roles.map((r: any) => (
                                <SelectItem key={r.id} value={r.id}>{r.icon} {r.displayName}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => toggleActiveMutation.mutate({ id: m.id, isActive: m.isActive })}>
                            {m.isActive ? <X className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>

        {/* Roles Tab */}
        <TabsContent value="roles" className="space-y-3">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm">Roles ({roles.length})</CardTitle></CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {roles.map((role: any) => {
                  const Icon = ROLE_ICONS[role.name] ?? Eye
                  return (
                    <div key={role.id} className="rounded-lg border p-3">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="grid place-items-center h-9 w-9 rounded-lg text-white shrink-0" style={{ background: role.color }}>{role.icon}</div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium">{role.displayName}</p>
                          <p className="text-[10px] text-muted-foreground">Level {role.level} · {role._count?.users || 0} users</p>
                        </div>
                        {role.isSystem && <Badge variant="outline" className="text-[9px] ml-auto">System</Badge>}
                      </div>
                      {role.description && <p className="text-xs text-muted-foreground mb-2">{role.description}</p>}
                      <div className="flex flex-wrap gap-1">
                        {role.permissions?.slice(0, 5).map((rp: any) => (
                          <Badge key={rp.id} variant="secondary" className="text-[9px]">{rp.permission.displayName}</Badge>
                        ))}
                        {role.permissions?.length > 5 && <Badge variant="outline" className="text-[9px]">+{role.permissions.length - 5} more</Badge>}
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Permissions reference */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm">All Permissions ({allPermissions.length})</CardTitle></CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-1.5">
                {allPermissions.map((p: any) => (
                  <Badge key={p.id} variant="outline" className="text-[10px] gap-1">
                    <span className="text-muted-foreground">{p.category}:</span> {p.displayName}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Audit Log Tab */}
        <TabsContent value="audit" className="space-y-3">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><Shield className="h-4 w-4 text-[#0A0A0B]" /> Audit Log ({auditLogs.length})</CardTitle></CardHeader>
            <CardContent>
              {auditLogs.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No audit entries yet.</p>
              ) : (
                <div className="space-y-1.5 max-h-96 overflow-y-auto scroll-thin">
                  {auditLogs.map((log: any) => (
                    <div key={log.id} className="flex items-center gap-3 p-2 rounded-md bg-muted/30 text-xs">
                      <Badge variant="outline" className="text-[9px] capitalize" style={{
                        background: log.severity === 'critical' ? '#ef444420' : log.severity === 'warning' ? '#f59e0b20' : '#0A0A0B20',
                        color: log.severity === 'critical' ? '#ef4444' : log.severity === 'warning' ? '#f59e0b' : '#0A0A0B',
                      }}>{log.severity}</Badge>
                      <Badge variant="outline" className="text-[9px]">{log.action}</Badge>
                      <span className="flex-1 truncate">{log.description}</span>
                      {log.userName && <span className="text-muted-foreground shrink-0">by {log.userName}</span>}
                      <span className="text-muted-foreground shrink-0">{new Date(log.createdAt).toLocaleString()}</span>
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
