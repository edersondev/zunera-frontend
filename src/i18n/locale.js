export const DEFAULT_LOCALE = 'pt-BR'
export const SUPPORTED_LOCALES = Object.freeze(['pt-BR', 'en'])
const STORAGE_KEY = 'zunera.locale'

export function getStoredLocale() {
  if (typeof window === 'undefined') return DEFAULT_LOCALE

  const locale = window.localStorage.getItem(STORAGE_KEY)
  return SUPPORTED_LOCALES.includes(locale) ? locale : DEFAULT_LOCALE
}

export function persistLocale(locale) {
  if (typeof window !== 'undefined') window.localStorage.setItem(STORAGE_KEY, locale)
}
