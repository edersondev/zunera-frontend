import { describe, expect, it } from 'vitest'
import { hasNonDateFilters, monthBounds, periodFromBounds } from '../transactionPeriod'

describe('transaction period', () => {
  it('handles leap month and year boundaries', () => {
    expect(monthBounds({ year: 2028, month: 2 })).toEqual({ from: '2028-02-01', to: '2028-02-29' })
    expect(monthBounds({ year: 2026, month: 12 })).toEqual({ from: '2026-12-01', to: '2026-12-31' })
  })

  it('distinguishes full months and custom ranges', () => {
    expect(periodFromBounds('2026-09-01', '2026-09-30')).toMatchObject({ custom: false, month: { year: 2026, month: 9 } })
    expect(periodFromBounds('2026-09-10', '2026-09-20')).toMatchObject({ custom: true, month: { year: 2026, month: 9 } })
  })

  it('marks non-date filters as incompatible with period-only summary', () => {
    expect(hasNonDateFilters({ from: '2026-09-01', to: '2026-09-30' })).toBe(false)
    expect(hasNonDateFilters({ from: '2026-09-01', q: 'market' })).toBe(true)
  })
})
