import { describe, expect, it } from 'vitest'
import {
  formatRecurrenceAmount,
  formatRecurrenceDate,
  frequencyLabel,
  nextExpectedLabel,
  occurrenceStatusLabel,
  sourceLabel,
  stateLabel,
} from '../recurringTransactionFormatters'

const t = (key, params) =>
  params ? `${key}:${JSON.stringify(params)}` : key

describe('recurring transaction formatters', () => {
  it('formats amounts and dates for the active locale', () => {
    expect(formatRecurrenceAmount({ amount_centavos: 123456 })).toContain('1.234,56')
    expect(formatRecurrenceDate('2026-09-14')).toMatch(/14\/09\/2026/)
    expect(formatRecurrenceDate(null)).toBe('—')
  })

  it('labels states, frequencies, and the next expected occurrence', () => {
    expect(frequencyLabel('weekly', t)).toBe('recurringTransactions.frequencies.weekly')
    expect(stateLabel({ state: 'paused', paused_reason: 'user' }, t)).toBe('recurringTransactions.pausedByUser')
    expect(stateLabel({ state: 'paused', paused_reason: 'association_archived' }, t)).toBe(
      'recurringTransactions.pausedByArchive',
    )
    expect(stateLabel({ state: 'active' }, t)).toBe('recurringTransactions.active')
    expect(nextExpectedLabel({ next_expected_occurrence: null }, t)).toBe('recurringTransactions.noNextExpected')
  })

  it('marks removed occurrences and describes the recurrence source', () => {
    expect(occurrenceStatusLabel({ status: 'pending', removed_at: '2026-09-14T10:00:00Z' }, t)).toBe(
      'recurringTransactions.removedOccurrence',
    )
    expect(occurrenceStatusLabel({ status: 'effective' }, t)).toBe('recurringTransactions.effective')
    expect(sourceLabel(null, t)).toBeNull()
    expect(
      sourceLabel({ id: 7, scheduled_date: '2026-09-14' }, t, 'pt-BR'),
    ).toContain('recurringTransactions.generatedBy')
  })
})
