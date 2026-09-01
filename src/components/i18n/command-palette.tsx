'use client'

import { useEffect, useState, useMemo } from 'react'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import { useI18n } from '@/i18n/provider'
import {
  LayoutDashboard,
  UserSearch,
  Sparkles,
  FolderKanban,
  Building2,
  Activity as ActivityIcon,
  Settings,
  Moon,
  Sun,
  Globe,
  type LucideIcon,
} from 'lucide-react'
import { useTheme } from 'next-themes'

interface CommandPaletteProps {
  onNavigate: (view: string) => void
  onOpenLanguages: () => void
}

export function CommandPalette({ onNavigate, onOpenLanguages }: CommandPaletteProps) {
  const { t } = useI18n()
  const { theme, setTheme } = useTheme()
  const [open, setOpen] = useState(false)

  // Listen for Cmd+K / Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((o) => !o)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const navItems: { id: string; label: string; icon: LucideIcon }[] = [
    { id: 'dashboard', label: t('command.goDashboard'), icon: LayoutDashboard },
    { id: 'leads', label: t('command.goLeads'), icon: UserSearch },
    { id: 'generator', label: t('command.goGenerator'), icon: Sparkles },
    { id: 'projects', label: t('command.goProjects'), icon: FolderKanban },
    { id: 'tenants', label: t('command.goTenants'), icon: Building2 },
    { id: 'activity', label: t('command.goActivity'), icon: ActivityIcon },
    { id: 'settings', label: t('command.goSettings'), icon: Settings },
  ]

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder={t('command.placeholder')} />
      <CommandList className="scroll-thin">
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading={t('command.navigate')}>
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <CommandItem
                key={item.id}
                onSelect={() => {
                  onNavigate(item.id)
                  setOpen(false)
                }}
                className="gap-2"
              >
                <Icon className="h-4 w-4 text-muted-foreground" />
                <span>{item.label}</span>
              </CommandItem>
            )
          })}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading={t('command.actions')}>
          <CommandItem
            onSelect={() => {
              setTheme(theme === 'dark' ? 'light' : 'dark')
              setOpen(false)
            }}
            className="gap-2"
          >
            {theme === 'dark' ? (
              <Sun className="h-4 w-4 text-muted-foreground" />
            ) : (
              <Moon className="h-4 w-4 text-muted-foreground" />
            )}
            <span>{t('command.toggleTheme')}</span>
          </CommandItem>
          <CommandItem
            onSelect={() => {
              onOpenLanguages()
              setOpen(false)
            }}
            className="gap-2"
          >
            <Globe className="h-4 w-4 text-muted-foreground" />
            <span>{t('command.switchLanguage')}</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
