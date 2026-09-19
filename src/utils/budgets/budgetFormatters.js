const DEFAULT_LOCALE = 'pt-BR'
const BUSINESS_TIME_ZONE = 'America/Sao_Paulo'

export function businessMonth(date = new Date()) {
  const values = new Intl.DateTimeFormat('en-US', {
    timeZone: BUSINESS_TIME_ZONE,
    year: 'numeric',
    month: 'numeric',
  })
    .formatToParts(date)
    .reduce((parts, part) => ({ ...parts, [part.type]: part.value }), {})

  return { year: Number(values.year), month: Number(values.month) }
}

export function formatBRL(amountCentavos, locale = DEFAULT_LOCALE) {
  const value = Number(amountCentavos ?? 0) / 100

  return new Intl.NumberFormat(locale, { style: 'currency', currency: 'BRL' }).format(value)
}

export function formatBudgetMonth(year, month, locale = DEFAULT_LOCALE) {
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, 1))

  return new Intl.DateTimeFormat(locale, {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date)
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

export function shiftMonth({ year, month }, offset) {
  const cursor = new Date(Date.UTC(Number(year), Number(month) - 1 + offset, 1))

  return { year: cursor.getUTCFullYear(), month: cursor.getUTCMonth() + 1 }
}
