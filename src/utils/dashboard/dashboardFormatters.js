export const CURRENT_MONTH = 'current_month'
export const PREVIOUS_MONTH = 'previous_month'
export const CUSTOM = 'custom'

export function formatDashboardCurrency(
  amountCentavos,
  { currencyCode = 'BRL', locale = 'pt-BR' } = {},
) {
  const amount = Number.isFinite(amountCentavos) ? amountCentavos : 0

  return new Intl.NumberFormat(locale, { style: 'currency', currency: currencyCode }).format(
    amount / 100,
  )
}

export function formatDashboardDate(value, locale = 'pt-BR') {
  const normalized = typeof value === 'string' ? value.trim() : ''

  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return '—'

  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(
    new Date(`${normalized}T00:00:00`),
  )
}

export function formatDashboardPeriod(period, locale = 'pt-BR') {
  if (!period?.from || !period?.to) return '—'

  return `${formatDashboardDate(period.from, locale)} - ${formatDashboardDate(period.to, locale)}`
}

export function formatDashboardPercent(value, locale = 'pt-BR') {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'

  return new Intl.NumberFormat(locale, {
    style: 'percent',
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(value / 100)
}

export function movementSign(movementKind) {
  return movementKind === 'income' ? '+' : '−'
}

export function formatDashboardMovementAmount(amountCentavos, movementKind, locale = 'pt-BR') {
  return `${movementSign(movementKind)} ${formatDashboardCurrency(amountCentavos, { locale })}`
}

export function resultDirection(resultCentavos) {
  if (resultCentavos > 0) return 'positive'
  if (resultCentavos < 0) return 'negative'

  return 'neutral'
}

export function formatDashboardIntervalLabel(interval) {
  if (!interval?.from || !interval?.to) return '—'

  return interval.from === interval.to ? interval.from : `${interval.from} - ${interval.to}`
}
