'use client'

import { Menu, Moon, Sun, Plus } from 'lucide-react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import { useAppStore } from '@/store/app-store'
import { useQuery } from '@tanstack/react-query'
import { useI18n } from '@/i18n/provider'
import { LanguageSwitcher } from '@/components/i18n/language-switcher'
import { Badge } from '@/components/ui/badge'
import { Keyboard } from 'lucide-react'

interface HeaderProps {
  title: string
  subtitle?: string
  onPrimary?: () => void
  primaryLabel?: string
  onOpenCommand?: () => void
}

export function Header({ title, subtitle, onPrimary, primaryLabel, onOpenCommand }: HeaderProps) {
  const { toggleSidebar } = useAppStore()
  const { theme, setTheme } = useTheme()
  const { t } = useI18n()

  const { data: tenantsData } = useQuery({
    queryKey: ['tenants'],
    queryFn: async () => {
      const res = await fetch('/api/tenants')
      if (!res.ok) return { tenants: [] }
      return res.json()
    },
  })

  const activeTenant = tenantsData?.tenants?.find(
    (t: any) => t.id === useAppStore.getState().activeTenantId,
  )

  return (
    <header className="sticky top-0 z-20 flex items-center gap-3 border-b bg-background/80 backdrop-blur-md px-4 py-3 md:px-6">
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        onClick={toggleSidebar}
        aria-label={t('header.openMenu')}
      >
        <Menu className="h-5 w-5" />
      </Button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h1 className="text-lg md:text-xl font-semibold truncate">{title}</h1>
          {activeTenant && (
            <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 text-[11px] font-medium">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {activeTenant.name}
            </span>
          )}
        </div>
        {subtitle && (
          <p className="text-xs md:text-sm text-muted-foreground truncate">{subtitle}</p>
        )}
      </div>

      {/* Command palette trigger */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onOpenCommand}
        className="hidden md:flex gap-2 text-muted-foreground hover:text-foreground"
        title={t('header.commandPalette')}
      >
        <Keyboard className="h-4 w-4" />
        <kbd className="text-[10px] font-mono rounded bg-muted px-1.5 py-0.5">⌘K</kbd>
      </Button>

      <LanguageSwitcher />

      <Button
        variant="ghost"
        size="icon"
        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        aria-label={t('header.themeToggle')}
      >
        <Sun className="h-4 w-4 dark:hidden" />
        <Moon className="h-4 w-4 hidden dark:block" />
      </Button>

      {onPrimary && primaryLabel && (
        <Button onClick={onPrimary} className="gap-2">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">{primaryLabel}</span>
        </Button>
      )}
    </header>
  )
}
