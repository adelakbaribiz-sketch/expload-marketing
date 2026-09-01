'use client'

import { useState, useMemo } from 'react'
import { useI18n } from '@/i18n/provider'
import { LOCALES, type Locale } from '@/i18n/config'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Globe, Search, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  /** Trigger button — defaults to a globe icon button. */
  trigger?: React.ReactNode
}

export function LanguageSwitcher({ trigger }: Props) {
  const { locale, setLocale } = useI18n()
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  const current = LOCALES.find((l) => l.code === locale) ?? LOCALES[0]

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return LOCALES
    return LOCALES.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        l.nativeName.toLowerCase().includes(q) ||
        l.code.toLowerCase().includes(q),
    )
  }, [search])

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="gap-1.5 px-2"
        onClick={() => setOpen(true)}
        title="Switch language"
        aria-label="Switch language"
      >
        <Globe className="h-4 w-4" />
        <span className="hidden sm:inline text-sm">{current.flag}</span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Select Language
              <Badge variant="secondary" className="ml-auto text-[10px]">
                {LOCALES.length} languages
              </Badge>
            </DialogTitle>
          </DialogHeader>

          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              autoFocus
              placeholder="Search language…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pr-9"
            />
          </div>

          <ScrollArea className="h-[60vh] pr-2 -mr-2 scroll-thin">
            <div className="grid grid-cols-1 gap-1">
              {filtered.map((l) => {
                const active = l.code === locale
                return (
                  <button
                    key={l.code}
                    onClick={() => {
                      setLocale(l.code as Locale)
                      setOpen(false)
                      setSearch('')
                    }}
                    className={cn(
                      'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all hover:bg-accent',
                      active && 'bg-accent',
                    )}
                  >
                    <span className="text-xl shrink-0">{l.flag}</span>
                    <div className="flex-1 min-w-0 text-left">
                      <p className="font-medium truncate flex items-center gap-1.5">
                        {l.nativeName}
                        {l.direction === 'rtl' && (
                          <Badge variant="outline" className="text-[9px] px-1 py-0 font-mono">
                            RTL
                          </Badge>
                        )}
                      </p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {l.name}
                      </p>
                    </div>
                    {active && <Check className="h-4 w-4 text-emerald-600 shrink-0" />}
                  </button>
                )
              })}
              {filtered.length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-8">
                  No language matches "{search}"
                </p>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  )
}
