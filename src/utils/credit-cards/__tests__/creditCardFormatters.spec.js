import { describe, expect, it } from 'vitest'

import {
  availableCreditPresentation,
  billingCycleSummary,
  businessToday,
  cardIdentityLabel,
  formatBRL,
  formatIsoDate,
  installmentLabel,
  paymentStatus,
  recognitionStatus,
  statementStatus,
} from '../creditCardFormatters'

describe('creditCardFormatters', () => {
  it('formats centavos as BRL without losing precision', () => {
    expect(formatBRL(500_000)).toMatch(/5\.000,00/)
    expect(formatBRL(1)).toMatch(/0,01/)
    expect(formatBRL(0)).toMatch(/0,00/)

    const overLimit = formatBRL(-50_000)
    expect(overLimit).toContain('500,00')
    expect(overLimit.startsWith('-')).toBe(true)
  })

  it('formats ISO dates in the Brazilian business locale', () => {
    expect(formatIsoDate('2026-03-10')).toBe('10/03/2026')
    expect(formatIsoDate('2026-10-10')).toBe('10/10/2026')
    expect(formatIsoDate(null)).toBe('')
    expect(formatIsoDate('not-a-date')).toBe('not-a-date')
  })

  it('derives the business date in America/Sao_Paulo', () => {
    expect(businessToday(new Date('2026-03-10T02:00:00Z'))).toBe('2026-03-09')
    expect(businessToday(new Date('2026-03-10T15:00:00Z'))).toBe('2026-03-10')
  })

  it('labels installments and billing days', () => {
    expect(installmentLabel(1, 1)).toBe('1/1')
    expect(installmentLabel(3, 6)).toBe('3/6')
    expect(installmentLabel(undefined, undefined)).toBe('1/1')
    expect(billingCycleSummary({ closing_day: 10, due_day: 17 })).toEqual({
      closingDay: 10,
      dueDay: 17,
      label: '10/17',
    })
  })

  it('maps statement, recognition, and payment states to text tones', () => {
    expect(statementStatus('open').tone).toBe('info')
    expect(statementStatus('partially_paid').labelKey).toBe('creditCards.statementStatus.partiallyPaid')
    expect(statementStatus('paid').tone).toBe('success')
    expect(statementStatus('overdue').tone).toBe('danger')
    expect(statementStatus('unknown').tone).toBe('neutral')

    expect(recognitionStatus('pending').tone).toBe('info')
    expect(recognitionStatus('effective').tone).toBe('success')
    expect(paymentStatus('pending').tone).toBe('info')
    expect(paymentStatus('effective').tone).toBe('success')
  })

  it('presents negative available credit as an explicit over-limit state', () => {
    const overLimit = availableCreditPresentation(-50_000)
    expect(overLimit.isOverLimit).toBe(true)
    expect(overLimit.overLimitAmountCentavos).toBe(50_000)
    expect(overLimit.tone).toBe('danger')
    expect(overLimit.formatted).toContain('500,00')
    expect(overLimit.formatted.startsWith('-')).toBe(true)

    const withinLimit = availableCreditPresentation(480_000)
    expect(withinLimit.isOverLimit).toBe(false)
    expect(withinLimit.overLimitAmountCentavos).toBe(0)
    expect(withinLimit.tone).toBe('success')
  })

  it('builds a non-sensitive card identity label', () => {
    expect(cardIdentityLabel({ institution_name: 'Nubank', last_four: '1234' })).toBe('Nubank •••• 1234')
    expect(cardIdentityLabel({ institution_name: 'Nubank', last_four: null })).toBe('Nubank')
    expect(cardIdentityLabel({ last_four: '9876' })).toBe('•••• 9876')
    expect(cardIdentityLabel({})).toBe('')
  })
})
