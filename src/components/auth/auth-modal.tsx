'use client'

import { useState } from 'react'
import { useAuth } from '@/components/auth/session-provider'
import { useAuthStore } from '@/store/auth-store'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Rocket, Mail, Lock, User, Building2, Globe, Loader2 } from 'lucide-react'

export function AuthModal() {
  const { login, refresh } = useAuth()
  const { authModalOpen, authModalMode, closeAuthModal, setAuthModalMode } = useAuthStore()
  const [loading, setLoading] = useState(false)

  // Login form
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')

  // Signup form
  const [signupName, setSignupName] = useState('')
  const [signupEmail, setSignupEmail] = useState('')
  const [signupPassword, setSignupPassword] = useState('')
  const [tenantName, setTenantName] = useState('')
  const [tenantDomain, setTenantDomain] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!loginEmail || !loginPassword) {
      toast.error('Please enter email and password')
      return
    }
    setLoading(true)
    try {
      const result = await login(loginEmail, loginPassword)
      if (result.success) {
        toast.success('Welcome back!')
        closeAuthModal()
      } else {
        toast.error(result.error || 'Login failed')
      }
    } catch (err: any) {
      toast.error(String(err?.message ?? err))
    } finally {
      setLoading(false)
    }
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!signupName || !signupEmail || !signupPassword || !tenantName || !tenantDomain) {
      toast.error('Please fill all fields')
      return
    }
    if (signupPassword.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: signupName,
          email: signupEmail,
          password: signupPassword,
          tenantName,
          tenantDomain,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Signup failed')
        return
      }
      // Auto-login after signup
      const loginResult = await login(signupEmail, signupPassword)
      if (loginResult.success) {
        const setupCount = data.autoSetup?.length ?? 0
        toast.success(`Account created! ${setupCount} items auto-configured. Welcome to Expload!`)
        closeAuthModal()
        // Reload to enter the fully-configured dashboard
        setTimeout(() => window.location.reload(), 500)
      } else {
        toast.success('Account created! Please sign in.')
        setAuthModalMode('login')
      }
    } catch (err: any) {
      toast.error(String(err?.message ?? err))
    } finally {
      setLoading(false)
    }
  }

  const fillDemo = () => {
    setLoginEmail('admin@expload.io')
    setLoginPassword('demo12345')
    toast.info('Demo credentials filled')
  }

  return (
    <Dialog open={authModalOpen} onOpenChange={(o) => !o && closeAuthModal()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="grid place-items-center h-12 w-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white mx-auto mb-2 shadow-lg shadow-emerald-500/20">
            <Rocket className="h-6 w-6" />
          </div>
          <DialogTitle className="text-center">Expload Marketing</DialogTitle>
          <DialogDescription className="text-center">
            Sign in to your account or create a new organization
          </DialogDescription>
        </DialogHeader>

        <Tabs value={authModalMode} onValueChange={(v) => setAuthModalMode(v as 'login' | 'signup')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Sign In</TabsTrigger>
            <TabsTrigger value="signup">Sign Up</TabsTrigger>
          </TabsList>

          {/* Login */}
          <TabsContent value="login">
            <form onSubmit={handleLogin} className="space-y-3">
              <div>
                <Label htmlFor="login-email">Email</Label>
                <div className="relative">
                  <Mail className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="you@company.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="pr-9"
                    dir="ltr"
                    autoComplete="email"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="login-password">Password</Label>
                <div className="relative">
                  <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="pr-9"
                    dir="ltr"
                    autoComplete="current-password"
                  />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Sign In'}
              </Button>
              <button
                type="button"
                onClick={fillDemo}
                className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Use demo credentials (admin@expload.io / demo12345)
              </button>
            </form>
          </TabsContent>

          {/* Signup */}
          <TabsContent value="signup">
            <form onSubmit={handleSignup} className="space-y-3">
              <div>
                <Label>Your Name</Label>
                <div className="relative">
                  <User className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="John Doe"
                    value={signupName}
                    onChange={(e) => setSignupName(e.target.value)}
                    className="pr-9"
                  />
                </div>
              </div>
              <div>
                <Label>Email</Label>
                <div className="relative">
                  <Mail className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder="you@company.com"
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    className="pr-9"
                    dir="ltr"
                  />
                </div>
              </div>
              <div>
                <Label>Password (min 8 chars)</Label>
                <div className="relative">
                  <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    className="pr-9"
                    dir="ltr"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Org Name</Label>
                  <div className="relative">
                    <Building2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Acme Inc"
                      value={tenantName}
                      onChange={(e) => setTenantName(e.target.value)}
                      className="pr-9"
                    />
                  </div>
                </div>
                <div>
                  <Label>Domain</Label>
                  <div className="relative">
                    <Globe className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="acme.com"
                      value={tenantDomain}
                      onChange={(e) => setTenantDomain(e.target.value)}
                      className="pr-9"
                      dir="ltr"
                    />
                  </div>
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create Account'}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
