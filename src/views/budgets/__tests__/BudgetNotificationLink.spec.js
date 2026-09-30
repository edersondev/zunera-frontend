import { describe, expect, it } from 'vitest'
import { notificationDestination } from '@/services/notificationDestination'

describe('budget notification destination', () => {
  it('keeps the exact business month and category plan, including a previous month', () => {
    expect(notificationDestination({ kind: 'budget_plan', params: { year: 2026, month: 8, plan_id: 51 } })).toEqual({
      name: 'budgets', query: { year: '2026', month: '8', plan_id: '51' },
    })
  })

  it('rejects invalid month, plan, and arbitrary URL destinations', () => {
    expect(notificationDestination({ kind: 'budget_plan', params: { year: 2026, month: 13, plan_id: 51 } })).toBeNull()
    expect(notificationDestination({ kind: 'budget_plan', params: { year: 2026, month: 8, plan_id: -1 } })).toBeNull()
    expect(notificationDestination({ kind: 'external', params: { url: 'https://example.com' } })).toBeNull()
  })
})
