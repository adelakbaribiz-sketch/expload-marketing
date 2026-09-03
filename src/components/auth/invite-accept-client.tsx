'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/auth/session-provider'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Rocket, Loader2, CheckCircle2, XCircle } from 'lucide-react'

interface InvitationInfo {
  email: string
  role: string
  tenantName: string
  status: string
  expired: boolean
  userExists: boolean
}

export function InviteAcceptClient({ token }: { token: string }) {
  const router = useRouter()
  const { login, refresh } = useAuth()
  const [invitation, setInvitation] = useState<InvitationInfo | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [accepted, setAccepted] = useState(false)
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')

  useEffect(() => {
    fetch(`/api/team/invite/${token}`)
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.error || 'This invitation could not be found.')
        }
        return res.json()
      })
      .then(setInvitation)
      .catch((err) => setLoadError(String(err.message ?? err)))
  }, [token])

  const acceptExisting = async () => {
    setSubmitting(true)
    try {
      const res = await fetch(`/api/team/invite/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'accept' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to accept invitation')
      setAccepted(true)
      toast.success('Invitation accepted! Please sign in to continue.')
      await refresh()
      setTimeout(() => router.push('/'), 1500)
    } catch (err: any) {
      toast.error(String(err?.message ?? err))
    } finally {
      setSubmitting(false)
    }
  }

  const acceptNew = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      toast.error('Please enter your name.')
      return
    }
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters.')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch(`/api/team/invite/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'accept', name, password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error?.formErrors?.[0] || data.error || 'Failed to accept invitation')
      const loginResult = await login(invitation!.email, password)
      if (loginResult.success) {
        setAccepted(true)
        toast.success('Welcome! Your account is ready.')
        setTimeout(() => router.push('/'), 800)
      } else {
        toast.success('Account created — please sign in.')
        router.push('/')
      }
    } catch (err: any) {
      toast.error(String(err?.message ?? err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen grid place-items-center p-4 bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="grid place-items-center h-12 w-12 rounded-2xl bg-brand-accent-gradient text-primary-foreground mx-auto mb-2 shadow-lg shadow-primary/20">
            <Rocket className="h-6 w-6" />
          </div>
          <CardTitle>Team Invitation</CardTitle>
          <CardDescription>
            {invitation ? `You've been invited to join ${invitation.tenantName}` : 'Loading invitation…'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadError && (
            <div className="text-center space-y-2 py-4">
              <XCircle className="h-8 w-8 mx-auto text-destructive" />
              <p className="text-sm text-muted-foreground">{loadError}</p>
            </div>
          )}

          {!invitation && !loadError && (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {invitation && invitation.expired && (
            <div className="text-center space-y-2 py-4">
              <XCircle className="h-8 w-8 mx-auto text-destructive" />
              <p className="text-sm text-muted-foreground">This invitation has expired. Ask the team admin to send a new one.</p>
            </div>
          )}

          {invitation && !invitation.expired && invitation.status !== 'pending' && (
            <div className="text-center space-y-2 py-4">
              <XCircle className="h-8 w-8 mx-auto text-muted-foreground" />
              <p className="text-sm text-muted-foreground">This invitation has already been {invitation.status}.</p>
            </div>
          )}

          {invitation && !invitation.expired && invitation.status === 'pending' && accepted && (
            <div className="text-center space-y-2 py-4">
              <CheckCircle2 className="h-8 w-8 mx-auto text-emerald-500" />
              <p className="text-sm text-muted-foreground">Invitation accepted. Redirecting…</p>
            </div>
          )}

          {invitation && !invitation.expired && invitation.status === 'pending' && !accepted && (
            invitation.userExists ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  An account already exists for <span dir="ltr">{invitation.email}</span> as role{' '}
                  <span className="font-medium">{invitation.role}</span>. Accept to join {invitation.tenantName} with
                  this account, then sign in as usual.
                </p>
                <Button className="w-full" onClick={acceptExisting} disabled={submitting}>
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Accept Invitation'}
                </Button>
              </div>
            ) : (
              <form onSubmit={acceptNew} className="space-y-3">
                <div>
                  <Label>Email</Label>
                  <Input value={invitation.email} disabled dir="ltr" />
                </div>
                <div>
                  <Label>Your Name</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Doe" />
                </div>
                <div>
                  <Label>Choose a Password (min 8 characters)</Label>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    dir="ltr"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : `Join ${invitation.tenantName}`}
                </Button>
              </form>
            )
          )}
        </CardContent>
      </Card>
    </div>
  )
}
