import { describe, expect, it } from 'vitest'
import {
  formatDashboardCurrency,
  formatDashboardDate,
  formatDashboardMovementAmount,
  formatDashboardPercent,
  formatDashboardPeriod,
  resultDirection,
} from '../dashboardFormatters'

describe('dashboardFormatters', () => {
  it('formats exact centavos as Brazilian real currency', () => {
    expect(formatDashboardCurrency(123_456)).toContain('1.234,56')
    expect(formatDashboardCurrency(-5_050)).toContain('50,50')
    expect(formatDashboardCurrency(123_456, { locale: 'en' })).toContain('1,234.56')
  })

  it('formats inclusive ISO dates and period labels', () => {
    expect(formatDashboardDate('2026-09-17')).toContain('2026')
    expect(formatDashboardDate('not-a-date')).toBe('—')
    expect(formatDashboardPeriod({ from: '2026-09-01', to: '2026-09-17' })).toContain(' - ')
    expect(formatDashboardPeriod(null)).toBe('—')
  })

  it('keeps signed movement direction explicit next to the amount', () => {
    expect(formatDashboardMovementAmount(10_000, 'income')).toContain('+')
    expect(formatDashboardMovementAmount(10_000, 'expense')).toContain('−')
  })

  it('formats percent shares and reports unavailable values', () => {
    expect(formatDashboardPercent(75)).toBe('75%')
    expect(formatDashboardPercent(-100)).toBe('-100%')
    expect(formatDashboardPercent(null)).toBe('—')
  })

  it('classifies positive, neutral, and negative results', () => {
    expect(resultDirection(1)).toBe('positive')
    expect(resultDirection(0)).toBe('neutral')
    expect(resultDirection(-1)).toBe('negative')
  })
})
