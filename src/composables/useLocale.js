import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { SUPPORTED_LOCALES, persistLocale } from '@/i18n/locale'

export function useLocale() {
  const { locale } = useI18n({ useScope: 'global' })
  const activeLocale = computed(() => locale.value)

  function setLocale(nextLocale) {
    if (!SUPPORTED_LOCALES.includes(nextLocale)) return
    locale.value = nextLocale
    persistLocale(nextLocale)
  }

  return { activeLocale, setLocale, supportedLocales: SUPPORTED_LOCALES }
}
