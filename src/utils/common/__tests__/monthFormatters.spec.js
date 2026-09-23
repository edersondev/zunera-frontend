import { describe, expect, it } from 'vitest'
import {
  businessMonth,
  formatMonth,
  monthBounds,
  monthFromDate,
  shiftMonth,
} from '../monthFormatters'

describe('monthFormatters', () => {
  it('renders the selected calendar month without shifting the day', () => {
    expect(formatMonth(2026, 9, 'pt-BR')).toBe('setembro de 2026')
    expect(formatMonth(2026, 1, 'en')).toBe('January 2026')
  })

  it('uses the São Paulo business month at timezone boundaries', () => {
    expect(businessMonth(new Date('2026-10-01T02:30:00Z'))).toEqual({ year: 2026, month: 9 })
    expect(businessMonth(new Date('2026-10-01T03:30:00Z'))).toEqual({ year: 2026, month: 10 })
  })

  it('shifts months across year boundaries', () => {
    expect(shiftMonth({ year: 2026, month: 12 }, 1)).toEqual({ year: 2027, month: 1 })
    expect(shiftMonth({ year: 2026, month: 1 }, -1)).toEqual({ year: 2025, month: 12 })
  })

  it('resolves the inclusive first and last day of a month', () => {
    expect(monthBounds({ year: 2026, month: 9 })).toEqual({
      from: '2026-09-01',
      to: '2026-09-30',
    })
    expect(monthBounds({ year: 2026, month: 12 })).toEqual({
      from: '2026-12-01',
      to: '2026-12-31',
    })
    expect(monthBounds({ year: 2024, month: 2 })).toEqual({
      from: '2024-02-01',
      to: '2024-02-29',
    })
    expect(monthBounds({ year: 2026, month: 2 })).toEqual({
      from: '2026-02-01',
      to: '2026-02-28',
    })
    expect(monthBounds({ year: 2026, month: 1 })).toEqual({
      from: '2026-01-01',
      to: '2026-01-31',
    })
  })

  it('reads the month out of a period bound', () => {
    expect(monthFromDate('2026-09-15')).toEqual({ year: 2026, month: 9 })
    expect(monthFromDate('2026-12-31')).toEqual({ year: 2026, month: 12 })
    expect(monthFromDate('')).toBeNull()
    expect(monthFromDate(undefined)).toBeNull()
    expect(monthFromDate('not-a-date')).toBeNull()
    expect(monthFromDate('2026-13-01')).toBeNull()
  })
})
