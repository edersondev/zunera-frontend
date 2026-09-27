import { describe, expect, it } from 'vitest'
import { normalizeReportScope, reportScopeQuery } from '../useReportScope'

describe('Reports URL scope', () => {
  it('restores completed historical month and all filters', () => {
    const scope = normalizeReportScope({ preset: 'historical_month', month: '2026-07', account_id: '4', category_id: '6', transaction_type: 'expense', from: '2026-01-01' })
    expect(scope).toEqual({ preset: 'historical_month', month: '2026-07', from: null, to: null, account_id: 4, category_id: 6, transaction_type: 'expense' })
    expect(reportScopeQuery(scope)).toEqual({ preset: 'historical_month', month: '2026-07', account_id: '4', category_id: '6', transaction_type: 'expense' })
  })

  it('normalizes invalid and unknown values to the default canonical query', () => {
    expect(reportScopeQuery(normalizeReportScope({ preset: 'future', month: 'bad', account_id: '-1', transaction_type: 'transfer' }))).toEqual({})
  })

  it('keeps custom inclusive boundaries without a historical month', () => {
    expect(reportScopeQuery(normalizeReportScope({ preset: 'custom', from: '2026-08-15', to: '2026-09-14', month: '2026-07' }))).toEqual({ preset: 'custom', from: '2026-08-15', to: '2026-09-14' })
  })
  it('drops impossible dates and unsafe numeric IDs from direct URLs', () => {
    expect(reportScopeQuery(normalizeReportScope({ preset: 'custom', from: '2026-02-30', to: '2026-03-01', account_id: '999999999999999999999' }))).toEqual({ preset: 'custom', to: '2026-03-01' })
  })
})
