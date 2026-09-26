import { i18n } from '@/i18n'

const activeLocale = (locale) => locale ?? i18n.global.locale.value

export function formatGoalMoney(centavos, locale) {
  if (!Number.isSafeInteger(centavos)) throw new RangeError('Goal amount must be safe whole centavos.')
  return new Intl.NumberFormat(activeLocale(locale), { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(centavos / 100)
}

export function formatGoalPercent(value, locale) {
  const percent = Number(value)
  if (!Number.isFinite(percent) || percent <= 0) return new Intl.NumberFormat(activeLocale(locale)).format(0)
  const formatter = new Intl.NumberFormat(activeLocale(locale), { maximumFractionDigits: 2 })
  return percent < 0.01 ? `<${formatter.format(0.01)}` : formatter.format(percent)
}

export function formatGoalDate(value, locale) {
  return new Intl.DateTimeFormat(activeLocale(locale), { dateStyle: 'medium' }).format(new Date(`${value}T12:00:00`))
}

export function formatGoalCompletionDate(value, locale) {
  return new Intl.DateTimeFormat(activeLocale(locale), { dateStyle: 'medium', timeZone: 'America/Sao_Paulo' }).format(new Date(value))
}
