'use client'

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react'
import {
  LOCALES,
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  LOCALE_COOKIE_MAX_AGE,
  getLocaleMeta,
  isRtl,
  type Locale,
} from '@/i18n/config'

// Static imports for all 30 locales. Next.js will code-split them.
import en from '@/messages/en.json'
import zh from '@/messages/zh.json'
import ja from '@/messages/ja.json'
import de from '@/messages/de.json'
import fr from '@/messages/fr.json'
import es from '@/messages/es.json'
import ptBR from '@/messages/pt-BR.json'
import it from '@/messages/it.json'
import ko from '@/messages/ko.json'
import ar from '@/messages/ar.json'
import ru from '@/messages/ru.json'
import hi from '@/messages/hi.json'
import tr from '@/messages/tr.json'
import nl from '@/messages/nl.json'
import pl from '@/messages/pl.json'
import he from '@/messages/he.json'
import id from '@/messages/id.json'
import vi from '@/messages/vi.json'
import th from '@/messages/th.json'
import fa from '@/messages/fa.json'
import da from '@/messages/da.json'
import sv from '@/messages/sv.json'
import deCH from '@/messages/de-CH.json'
import no from '@/messages/no.json'
import fi from '@/messages/fi.json'
import cs from '@/messages/cs.json'
import uk from '@/messages/uk.json'
import ms from '@/messages/ms.json'
import bn from '@/messages/bn.json'

const DICTIONARIES: Record<Locale, any> = {
  en, zh, ja, de, fr, es, 'pt-BR': ptBR, it, ko, ar, ru, hi, tr, nl, pl, he, id, vi, th, fa,
  da, sv, 'de-CH': deCH, no, fi, cs, uk, ms, bn,
}

interface I18nContextValue {
  locale: Locale
  setLocale: (l: Locale) => void
  t: (key: string, params?: Record<string, string | number>) => string
  dir: 'ltr' | 'rtl'
  isLoaded: boolean
}

const I18nContext = createContext<I18nContextValue | null>(null)

/** Get a nested value by dot-path. */
function getPath(obj: any, path: string): any {
  const parts = path.split('.')
  let cur = obj
  for (const p of parts) {
    if (cur == null) return undefined
    cur = cur[p]
  }
  return cur
}

/** Replace {placeholder} tokens in a string. */
function interpolate(s: string, params?: Record<string, string | number>): string {
  if (!params) return s
  return s.replace(/\{(\w+)\}/g, (_, k) => {
    const v = params[k]
    return v === undefined ? `{${k}}` : String(v)
  })
}

export function I18nProvider({
  children,
  initialLocale,
}: {
  children: ReactNode
  initialLocale?: Locale
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale ?? DEFAULT_LOCALE)
  const [isLoaded, setIsLoaded] = useState(false)

  // On mount: read cookie if no initialLocale was provided.
  // All setState calls are deferred to microtasks to comply with
  // React 19's set-state-in-effect rule.
  useEffect(() => {
    if (initialLocale) {
      Promise.resolve().then(() => setIsLoaded(true))
      return
    }
    const match = document.cookie.match(new RegExp(`(?:^|;)\\s*${LOCALE_COOKIE}=([^;]+)`))
    if (match) {
      const val = decodeURIComponent(match[1])
      if (LOCALES.some((l) => l.code === val)) {
        Promise.resolve().then(() => setLocaleState(val as Locale))
      }
    }
    Promise.resolve().then(() => setIsLoaded(true))
  }, [initialLocale])

  // Apply <html lang> + dir whenever locale changes
  useEffect(() => {
    if (typeof document === 'undefined') return
    const meta = getLocaleMeta(locale)
    document.documentElement.lang = meta.bcp47
    document.documentElement.dir = meta.direction
  }, [locale])

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l)
    // Persist in cookie
    document.cookie = `${LOCALE_COOKIE}=${encodeURIComponent(l)}; path=/; max-age=${LOCALE_COOKIE_MAX_AGE}; samesite=lax`
    // Update html attributes immediately
    if (typeof document !== 'undefined') {
      const meta = getLocaleMeta(l)
      document.documentElement.lang = meta.bcp47
      document.documentElement.dir = meta.direction
    }
  }, [])

  const t = useCallback(
    (key: string, params?: Record<string, string | number>) => {
      const dict = DICTIONARIES[locale] ?? DICTIONARIES[DEFAULT_LOCALE]
      let val = getPath(dict, key)
      if (val === undefined) {
        // Fallback to English
        val = getPath(DICTIONARIES[DEFAULT_LOCALE], key)
      }
      if (typeof val !== 'string') {
        // Key not found at all — return the key itself for debugging
        return key
      }
      return interpolate(val, params)
    },
    [locale],
  )

  const dir = isRtl(locale) ? 'rtl' : 'ltr'

  return (
    <I18nContext.Provider value={{ locale, setLocale, t, dir, isLoaded }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext)
  if (!ctx) {
    throw new Error('useI18n must be used within an I18nProvider')
  }
  return ctx
}
