import { businessMonth, formatMonth, shiftMonth } from '@/utils/common/monthFormatters'

const DEFAULT_LOCALE = 'pt-BR'

// Budget screens keep their historical names; the implementations are shared with
// the transactions month navigator.
export { businessMonth, shiftMonth }
export const formatBudgetMonth = formatMonth

export function formatBRL(amountCentavos, locale = DEFAULT_LOCALE) {
  const value = Number(amountCentavos ?? 0) / 100

  return new Intl.NumberFormat(locale, { style: 'currency', currency: 'BRL' }).format(value)
}

export function formatPercent(value, locale = DEFAULT_LOCALE, notApplicable = '—') {
  if (value === null || value === undefined) return notApplicable

  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(value)}%`
}

export function statusLabel(status, translate, notApplicable = '') {
  if (!status || status === 'not_applicable') return notApplicable

  return translate(`budgets.status.${status}`)
}

export function statusTagType(status) {
  if (status === 'within') return 'success'
  if (status === 'approaching' || status === 'reached') return 'warning'
  if (status === 'exceeded') return 'danger'

  return 'info'
}

export function excessLabel(excessCentavos, locale, translate) {
  if (!excessCentavos || excessCentavos <= 0) return null

  return translate('budgets.excess', { amount: formatBRL(excessCentavos, locale) })
}

export function projectionLabel(plan, locale, translate) {
  if (plan?.projected_spending === null || plan?.projected_spending === undefined) return null

  return translate('budgets.projected', {
    amount: formatBRL(plan.projected_spending.amount_centavos, locale),
  })
}

export function availabilityLabel(availableCentavos, locale, translate) {
  if (availableCentavos < 0) {
    return translate('budgets.excess', { amount: formatBRL(Math.abs(availableCentavos), locale) })
  }

  return translate('budgets.availableAmount', { amount: formatBRL(availableCentavos, locale) })
}

export function monthKey(year, month) {
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}`
}
