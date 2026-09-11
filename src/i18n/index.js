import { createI18n } from 'vue-i18n'
import { getStoredLocale } from './locale'
import { messages } from './messages'

export const i18n = createI18n({
  legacy: false,
  locale: getStoredLocale(),
  fallbackLocale: 'en',
  messages,
})
