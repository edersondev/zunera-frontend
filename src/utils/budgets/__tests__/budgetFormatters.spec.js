import { describe, expect, it } from 'vitest'
import {
  availabilityLabel,
  businessMonth,
  excessLabel,
  formatBRL,
  formatBudgetMonth,
  formatPercent,
  monthKey,
  shiftMonth,
  statusLabel,
} from '../budgetFormatters'

const translate = (key, params) => `${key}${params ? `:${JSON.stringify(params)}` : ''}`

describe('budgetFormatters', () => {
  it('renders exact BRL values from centavos', () => {
    // Intl inserts a non-breaking space between the symbol and the amount.
    expect(formatBRL(1, 'pt-BR')).toBe('R$\u00A00,01')
    expect(formatBRL(999_999_999_99, 'pt-BR')).toContain('999.999.999,99')
    expect(formatBRL(-7_000, 'pt-BR')).toContain('70,00')
  })

  it('renders the selected calendar month without shifting the day', () => {
    expect(formatBudgetMonth(2026, 9, 'pt-BR')).toBe('setembro de 2026')
    expect(formatBudgetMonth(2026, 1, 'en')).toBe('January 2026')
  })

  it('uses the São Paulo business month at timezone boundaries', () => {
    expect(businessMonth(new Date('2026-10-01T02:30:00Z'))).toEqual({ year: 2026, month: 9 })
    expect(businessMonth(new Date('2026-10-01T03:30:00Z'))).toEqual({ year: 2026, month: 10 })
  })

  it('labels utilisation and the not-applicable empty budget state', () => {
    expect(formatPercent(0, 'pt-BR')).toBe('0%')
    expect(formatPercent(0.1, 'pt-BR')).toBe('0,1%')
    expect(formatPercent(0.25, 'pt-BR')).toBe('0,25%')
    expect(formatPercent(72, 'pt-BR')).toBe('72%')
    expect(formatPercent(72.5, 'pt-BR')).toBe('72,5%')
    expect(formatPercent(107.25, 'pt-BR')).toBe('107,25%')
    expect(formatPercent(null, 'pt-BR', 'Não aplicável')).toBe('Não aplicável')
    expect(statusLabel('not_applicable', translate, 'Não aplicável')).toBe('Não aplicável')
    expect(statusLabel('approaching', translate, 'Não aplicável')).toBe(
      'budgets.status.approaching',
    )
  })

  it('describes excess and availability with explicit money values', () => {
    expect(excessLabel(0, 'pt-BR', translate)).toBeNull()
    expect(excessLabel(7_000, 'pt-BR', translate)).toContain('budgets.excess')
    expect(availabilityLabel(-7_000, 'pt-BR', translate)).toContain('budgets.excess')
    expect(availabilityLabel(28_000, 'pt-BR', translate)).toContain('budgets.availableAmount')
  })

  it('shifts months across year boundaries', () => {
    expect(shiftMonth({ year: 2026, month: 12 }, 1)).toEqual({ year: 2027, month: 1 })
    expect(shiftMonth({ year: 2026, month: 1 }, -1)).toEqual({ year: 2025, month: 12 })
    expect(monthKey(2026, 9)).toBe('2026-09')
  })
})
