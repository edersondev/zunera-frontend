export const RECURRENCE_STATES = Object.freeze(['active', 'paused', 'ended'])

export const RECURRENCE_FREQUENCIES = Object.freeze(['weekly', 'monthly', 'yearly'])

export function formatCentavos(centavos, locale = 'pt-BR') {
  return new Intl.NumberFormat(locale, { style: 'currency', currency: 'BRL' }).format(
    (centavos ?? 0) / 100,
  )
}

export function formatRecurrenceAmount(rule, locale = 'pt-BR') {
  return formatCentavos(rule?.amount_centavos ?? 0, locale)
}

export function formatRecurrenceDate(value, locale = 'pt-BR') {
  if (!value) return '—'
  const [year, month, day] = String(value).slice(0, 10).split('-')

  return new Intl.DateTimeFormat(locale, { dateStyle: 'short' }).format(
    new Date(Number(year), Number(month) - 1, Number(day)),
  )
}

export function frequencyLabel(frequency, t) {
  return t(`recurringTransactions.frequencies.${frequency}`)
}

export function stateLabel(rule, t) {
  if (rule?.state === 'paused') {
    return rule.paused_reason === 'association_archived'
      ? t('recurringTransactions.pausedByArchive')
      : t('recurringTransactions.pausedByUser')
  }

  return t(`recurringTransactions.${rule?.state ?? 'active'}`)
}

export function nextExpectedLabel(rule, t, locale = 'pt-BR') {
  return rule?.next_expected_occurrence
    ? formatRecurrenceDate(rule.next_expected_occurrence, locale)
    : t('recurringTransactions.noNextExpected')
}

export function occurrenceStatusLabel(occurrence, t) {
  if (occurrence?.removed_at) return t('recurringTransactions.removedOccurrence')

  return occurrence?.status === 'effective'
    ? t('recurringTransactions.effective')
    : t('recurringTransactions.pending')
}

export function sourceLabel(recurrenceSource, t, locale = 'pt-BR') {
  if (!recurrenceSource?.id) return null

  return t('recurringTransactions.generatedBy', {
    id: recurrenceSource.id,
    date: formatRecurrenceDate(recurrenceSource.scheduled_date, locale),
  })
}

export function frequencyOptions(t) {
  return RECURRENCE_FREQUENCIES.map((value) => ({ value, label: frequencyLabel(value, t) }))
}

export function stateOptions(t) {
  return RECURRENCE_STATES.map((value) => ({
    value,
    label: t(`recurringTransactions.${value}`),
  }))
}
