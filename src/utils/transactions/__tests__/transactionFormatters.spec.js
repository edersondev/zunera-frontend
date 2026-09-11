import { describe, expect, it } from 'vitest'
import { formatTransactionAmount, formatTransactionDate } from '../transactionFormatters'

describe('transaction formatters', () => {
  it('shows financial direction without relying on color', () => {
    expect(formatTransactionAmount({ type: 'income', amount_centavos: 1250 })).toContain('+')
    expect(formatTransactionAmount({ type: 'expense', amount_centavos: 1250 })).toContain('−')
  })

  it('formats calendar dates in Brazilian locale', () => expect(formatTransactionDate('2026-09-11')).toContain('2026'))
})
