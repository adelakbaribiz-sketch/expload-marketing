import 'server-only'

/**
 * Server-side locale detection.
 * Reads the locale from the cookie via next/headers.
 */
import { LOCALES, DEFAULT_LOCALE, LOCALE_COOKIE, type Locale } from './config'

export async function getServerLocale(): Promise<Locale> {
  try {
    const { cookies } = await import('next/headers')
    const cookieStore = await cookies()
    const val = cookieStore.get(LOCALE_COOKIE)?.value
    if (val && LOCALES.some((l) => l.code === val)) {
      return val as Locale
    }
  } catch {
    // ignore
  }
  return DEFAULT_LOCALE
}
