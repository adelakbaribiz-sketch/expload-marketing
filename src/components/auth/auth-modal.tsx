'use client'

import { useState } from 'react'
import { useAuth } from '@/components/auth/session-provider'
import { useAuthStore } from '@/store/auth-store'
import { useI18n } from '@/i18n/provider'
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
  const { t } = useI18n()
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
      toast.error(t('auth.errorEnterCredentials'))
      return
    }
    setLoading(true)
    try {
      const result = await login(loginEmail, loginPassword)
      if (result.success) {
        toast.success(t('auth.welcomeBack'))
        closeAuthModal()
      } else {
        toast.error(result.error || t('auth.loginFailed'))
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
      toast.error(t('auth.errorFillFields'))
      return
    }
    if (signupPassword.length < 8) {
      toast.error(t('auth.errorPasswordLength'))
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
        toast.error(data.error || t('auth.signupFailed'))
        return
      }
      // Auto-login after signup
      const loginResult = await login(signupEmail, signupPassword)
      if (loginResult.success) {
        const setupCount = data.autoSetup?.length ?? 0
        toast.success(t('auth.accountCreatedAutoSetup', { count: setupCount }))
        closeAuthModal()
        // Reload to enter the fully-configured dashboard
        setTimeout(() => window.location.reload(), 500)
      } else {
        toast.success(t('auth.accountCreatedPleaseSignIn'))
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
    toast.info(t('auth.demoFilled'))
  }

  return (
    <Dialog open={authModalOpen} onOpenChange={(o) => !o && closeAuthModal()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="grid place-items-center h-12 w-12 rounded-2xl bg-brand-accent-gradient text-primary-foreground mx-auto mb-2 shadow-lg shadow-primary/20">
            <Rocket className="h-6 w-6" />
          </div>
          <DialogTitle className="text-center">{t('auth.title')}</DialogTitle>
          <DialogDescription className="text-center">
            {t('auth.subtitle')}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={authModalMode} onValueChange={(v) => setAuthModalMode(v as 'login' | 'signup')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">{t('auth.tabSignIn')}</TabsTrigger>
            <TabsTrigger value="signup">{t('auth.tabSignUp')}</TabsTrigger>
          </TabsList>

          {/* Login */}
          <TabsContent value="login">
            <form onSubmit={handleLogin} className="space-y-3">
              <div>
                <Label htmlFor="login-email">{t('auth.email')}</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="login-email"
                    type="email"
                    placeholder={t('auth.emailPlaceholder')}
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="pl-9"
                    dir="ltr"
                    autoComplete="email"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="login-password">{t('auth.password')}</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="login-password"
                    type="password"
                    placeholder={t('auth.passwordPlaceholder')}
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="pl-9"
                    dir="ltr"
                    autoComplete="current-password"
                  />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t('auth.signInButton')}
              </Button>
              <button
                type="button"
                onClick={fillDemo}
                className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {t('auth.demoHint')}
              </button>
            </form>
          </TabsContent>

          {/* Signup */}
          <TabsContent value="signup">
            <form onSubmit={handleSignup} className="space-y-3">
              <div>
                <Label>{t('auth.yourName')}</Label>
                <div className="relative">
                  <User className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={t('auth.namePlaceholder')}
                    value={signupName}
                    onChange={(e) => setSignupName(e.target.value)}
                    className="ps-9"
                  />
                </div>
              </div>
              <div>
                <Label>{t('auth.email')}</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder={t('auth.emailPlaceholder')}
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    className="pl-9"
                    dir="ltr"
                  />
                </div>
              </div>
              <div>
                <Label>{t('auth.passwordMin')}</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="password"
                    placeholder={t('auth.passwordPlaceholder')}
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    className="pl-9"
                    dir="ltr"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>{t('auth.orgName')}</Label>
                  <div className="relative">
                    <Building2 className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder={t('auth.orgPlaceholder')}
                      value={tenantName}
                      onChange={(e) => setTenantName(e.target.value)}
                      className="ps-9"
                    />
                  </div>
                </div>
                <div>
                  <Label>{t('auth.domain')}</Label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder={t('auth.domainPlaceholder')}
                      value={tenantDomain}
                      onChange={(e) => setTenantDomain(e.target.value)}
                      className="pl-9"
                      dir="ltr"
                    />
                  </div>
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t('auth.createAccount')}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
