import { describe, expect, it } from 'vitest'
import { formatGoalDate, formatGoalMoney, formatGoalPercent } from '@/utils/goals/goalPresentation'

describe('goal presentation', () => {
  it('formats aggregate sums above the per-goal limit without losing cent precision', () => {
    expect(formatGoalMoney(1_000_000_000_000, 'pt-BR')).toMatch(/10\.000\.000\.000,00/)
  })

  it('keeps zero and tiny positive percentages distinct', () => {
    expect(formatGoalPercent(0, 'en')).toBe('0')
    expect(formatGoalPercent(0.0001, 'en')).toBe('<0.01')
  })

  it('formats date-only values without shifting the calendar day', () => {
    expect(formatGoalDate('2026-09-18', 'en')).toContain('Sep 18, 2026')
  })
})
