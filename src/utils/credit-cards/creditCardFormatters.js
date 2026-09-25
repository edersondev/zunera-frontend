const DEFAULT_LOCALE = 'pt-BR'
const BUSINESS_TIME_ZONE = 'America/Sao_Paulo'

export function formatBRL(amountCentavos, locale = DEFAULT_LOCALE) {
  const value = Number(amountCentavos ?? 0) / 100

  return new Intl.NumberFormat(locale, { style: 'currency', currency: 'BRL' }).format(value)
}

export function formatIsoDate(isoDate, locale = DEFAULT_LOCALE) {
  if (!isoDate) return ''

  const [year, month, day] = String(isoDate).slice(0, 10).split('-').map(Number)
  if (!year || !month || !day) return String(isoDate)

  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: BUSINESS_TIME_ZONE,
  }).format(new Date(Date.UTC(year, month - 1, day, 12)))
}

/** Formats the authoritative statement closing date as a localized month and year. */
export function formatStatementMonth(isoDate, locale = DEFAULT_LOCALE) {
  if (!isoDate) return ''

  const [year, month] = String(isoDate).slice(0, 10).split('-').map(Number)
  if (!year || !month) return String(isoDate)

  return new Intl.DateTimeFormat(locale, {
    month: 'long',
    year: 'numeric',
    timeZone: BUSINESS_TIME_ZONE,
  }).format(new Date(Date.UTC(year, month - 1, 1, 12)))
}

/**
 * Presentation-only utilization: source amounts remain server-provided, while
 * the visual width is safely capped without losing the exact numeric value.
 */
export function formatCreditUtilization(usedCentavos, limitCentavos, locale = DEFAULT_LOCALE) {
  const used = Number(usedCentavos ?? 0)
  const limit = Number(limitCentavos ?? 0)

  if (!Number.isFinite(used) || !Number.isFinite(limit) || limit <= 0) {
    return { isAvailable: false, percent: null, visualPercent: 0, formatted: '—' }
  }

  const percent = Number(((used / limit) * 100).toFixed(10))

  return {
    isAvailable: true,
    percent,
    visualPercent: Math.max(0, Math.min(100, percent)),
    formatted: new Intl.NumberFormat(locale, {
      maximumFractionDigits: 1,
      minimumFractionDigits: 0,
    })
      .format(percent)
      .concat('%'),
  }
}

/** Aggregates already-calculated server summaries for dashboard presentation. */
export function sumCreditCardSummaryAmount(cards, summaryKey) {
  return (Array.isArray(cards) ? cards : []).reduce(
    (total, card) => total + Number(card?.summary?.[summaryKey]?.amount_centavos ?? 0),
    0,
  )
}

/** Aggregates statement obligations already supplied by the active-card API. */
export function sumCreditCardCurrentStatementOutstanding(cards) {
  return (Array.isArray(cards) ? cards : []).reduce(
    (total, card) => total + Number(card?.current_statement?.outstanding_amount?.amount_centavos ?? 0),
    0,
  )
}

export function businessToday(now = new Date()) {
  const values = new Intl.DateTimeFormat('en-US', {
    timeZone: BUSINESS_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
    .formatToParts(now)
    .reduce((parts, part) => ({ ...parts, [part.type]: part.value }), {})

  return `${values.year}-${values.month}-${values.day}`
}

export function installmentLabel(sequence, totalCount) {
  const normalizedSequence = Number(sequence ?? 1)
  const normalizedTotal = Number(totalCount ?? 1)

  return normalizedTotal > 1 ? `${normalizedSequence}/${normalizedTotal}` : '1/1'
}

const STATUS_PRESENTATION = {
  open: { tone: 'info', labelKey: 'creditCards.statementStatus.open' },
  closed: { tone: 'warning', labelKey: 'creditCards.statementStatus.closed' },
  partially_paid: { tone: 'warning', labelKey: 'creditCards.statementStatus.partiallyPaid' },
  paid: { tone: 'success', labelKey: 'creditCards.statementStatus.paid' },
  overdue: { tone: 'danger', labelKey: 'creditCards.statementStatus.overdue' },
}

export function statementStatus(status) {
  return (
    STATUS_PRESENTATION[status] ?? { tone: 'neutral', labelKey: 'creditCards.statementStatus.open' }
  )
}

export function recognitionStatus(status) {
  return status === 'effective'
    ? { tone: 'success', labelKey: 'creditCards.recognition.effective' }
    : { tone: 'info', labelKey: 'creditCards.recognition.pending' }
}

export function paymentStatus(status) {
  return status === 'pending'
    ? { tone: 'info', labelKey: 'creditCards.paymentStatus.pending' }
    : { tone: 'success', labelKey: 'creditCards.paymentStatus.effective' }
}

/**
 * Available credit stays a server value: this only decides how to present it,
 * including the explicit over-limit state that never relies on colour alone.
 */
export function availableCreditPresentation(amountCentavos, locale = DEFAULT_LOCALE) {
  const amount = Number(amountCentavos ?? 0)

  return {
    amountCentavos: amount,
    isOverLimit: amount < 0,
    formatted: formatBRL(amount, locale),
    overLimitAmountCentavos: amount < 0 ? Math.abs(amount) : 0,
    tone: amount < 0 ? 'danger' : 'success',
  }
}

/** Card identity line: institution plus the optional non-sensitive last four. */
export function cardIdentityLabel(card) {
  const institution = String(card?.institution_name ?? '').trim()
  const lastFour = String(card?.last_four ?? '').trim()

  if (institution && lastFour) return `${institution} •••• ${lastFour}`

  return institution || (lastFour ? `•••• ${lastFour}` : '')
}

export function billingCycleSummary(card) {
  const closing = Number(card?.closing_day ?? 0)
  const due = Number(card?.due_day ?? 0)

  return { closingDay: closing, dueDay: due, label: `${closing}/${due}` }
}
