/**
 * Internationalization configuration.
 *
 * 20 languages selected by B2B sales potential (GDP × tech market size ×
 * English penetration). Three are RTL (Arabic, Hebrew, Persian).
 *
 * Locales are stored in a cookie (`locale`) and reflected on <html lang dir>.
 * We avoid URL-based routing so the single `/` route constraint stays intact.
 */

export type LocaleDirection = 'ltr' | 'rtl'

export interface LocaleMeta {
  code: string
  name: string
  nativeName: string
  flag: string // emoji flag
  direction: LocaleDirection
  /** BCP-47 tag used for <html lang> */
  bcp47: string
  /** Optional Latin regional variant for number/date formatting */
  region?: string
}

export type Locale = string

export const LOCALES: readonly LocaleMeta[] = [
  { code: 'en',    name: 'English',              nativeName: 'English',     flag: '🇺🇸', direction: 'ltr', bcp47: 'en-US' },
  { code: 'zh',    name: 'Chinese (Simplified)', nativeName: '简体中文',     flag: '🇨🇳', direction: 'ltr', bcp47: 'zh-CN' },
  { code: 'ja',    name: 'Japanese',             nativeName: '日本語',       flag: '🇯🇵', direction: 'ltr', bcp47: 'ja-JP' },
  { code: 'de',    name: 'German',               nativeName: 'Deutsch',     flag: '🇩🇪', direction: 'ltr', bcp47: 'de-DE' },
  { code: 'fr',    name: 'French',               nativeName: 'Français',    flag: '🇫🇷', direction: 'ltr', bcp47: 'fr-FR' },
  { code: 'es',    name: 'Spanish',              nativeName: 'Español',     flag: '🇪🇸', direction: 'ltr', bcp47: 'es-ES' },
  { code: 'pt-BR', name: 'Portuguese (Brazil)',  nativeName: 'Português',   flag: '🇧🇷', direction: 'ltr', bcp47: 'pt-BR', region: 'BR' },
  { code: 'it',    name: 'Italian',              nativeName: 'Italiano',    flag: '🇮🇹', direction: 'ltr', bcp47: 'it-IT' },
  { code: 'ko',    name: 'Korean',               nativeName: '한국어',       flag: '🇰🇷', direction: 'ltr', bcp47: 'ko-KR' },
  { code: 'ar',    name: 'Arabic',               nativeName: 'العربية',      flag: '🇸🇦', direction: 'rtl', bcp47: 'ar-SA' },
  { code: 'ru',    name: 'Russian',              nativeName: 'Русский',     flag: '🇷🇺', direction: 'ltr', bcp47: 'ru-RU' },
  { code: 'hi',    name: 'Hindi',                nativeName: 'हिन्दी',        flag: '🇮🇳', direction: 'ltr', bcp47: 'hi-IN' },
  { code: 'tr',    name: 'Turkish',              nativeName: 'Türkçe',      flag: '🇹🇷', direction: 'ltr', bcp47: 'tr-TR' },
  { code: 'nl',    name: 'Dutch',                nativeName: 'Nederlands',  flag: '🇳🇱', direction: 'ltr', bcp47: 'nl-NL' },
  { code: 'pl',    name: 'Polish',               nativeName: 'Polski',      flag: '🇵🇱', direction: 'ltr', bcp47: 'pl-PL' },
  { code: 'he',    name: 'Hebrew',               nativeName: 'עברית',        flag: '🇮🇱', direction: 'rtl', bcp47: 'he-IL' },
  { code: 'id',    name: 'Indonesian',           nativeName: 'Indonesia',   flag: '🇮🇩', direction: 'ltr', bcp47: 'id-ID' },
  { code: 'vi',    name: 'Vietnamese',           nativeName: 'Tiếng Việt',  flag: '🇻🇳', direction: 'ltr', bcp47: 'vi-VN' },
  { code: 'th',    name: 'Thai',                 nativeName: 'ไทย',          flag: '🇹🇭', direction: 'ltr', bcp47: 'th-TH' },
  { code: 'fa',    name: 'Persian',              nativeName: 'فارسی',        flag: '🇮🇷', direction: 'rtl', bcp47: 'fa-IR' },
  { code: 'da',    name: 'Danish',               nativeName: 'Dansk',       flag: '🇩🇰', direction: 'ltr', bcp47: 'da-DK' },
  { code: 'sv',    name: 'Swedish',              nativeName: 'Svenska',     flag: '🇸🇪', direction: 'ltr', bcp47: 'sv-SE' },
  { code: 'de-CH', name: 'Swiss German',         nativeName: 'Schweizerdeutsch', flag: '🇨🇭', direction: 'ltr', bcp47: 'de-CH' },
  { code: 'no',    name: 'Norwegian',            nativeName: 'Norsk',       flag: '🇳🇴', direction: 'ltr', bcp47: 'nb-NO' },
  { code: 'fi',    name: 'Finnish',              nativeName: 'Suomi',       flag: '🇫🇮', direction: 'ltr', bcp47: 'fi-FI' },
  { code: 'cs',    name: 'Czech',                nativeName: 'Čeština',     flag: '🇨🇿', direction: 'ltr', bcp47: 'cs-CZ' },
  { code: 'uk',    name: 'Ukrainian',            nativeName: 'Українська',   flag: '🇺🇦', direction: 'ltr', bcp47: 'uk-UA' },
  { code: 'ms',    name: 'Malay',                nativeName: 'Bahasa Melayu', flag: '🇲🇾', direction: 'ltr', bcp47: 'ms-MY' },
  { code: 'bn',    name: 'Bengali',              nativeName: 'বাংলা',         flag: '🇧🇩', direction: 'ltr', bcp47: 'bn-BD' },
] as const

export const DEFAULT_LOCALE: Locale = 'en'

export const RTL_LOCALES: readonly Locale[] = LOCALES
  .filter((l) => l.direction === 'rtl')
  .map((l) => l.code)

export function getLocaleMeta(code: string | undefined | null): LocaleMeta {
  if (!code) return LOCALES[0]
  const found = LOCALES.find((l) => l.code === code)
  return found ?? LOCALES[0]
}

export function isRtl(code: string | undefined | null): boolean {
  return getLocaleMeta(code).direction === 'rtl'
}

export function getDirection(code: string | undefined | null): LocaleDirection {
  return getLocaleMeta(code).direction
}

export const LOCALE_COOKIE = 'locale'
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365 // 1 year
