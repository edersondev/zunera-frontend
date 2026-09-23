import { businessMonth } from '@/utils/budgets/budgetFormatters'

export function currentTransactionMonth() {
  return businessMonth()
}

export function monthBounds({ year, month }) {
  const start = `${year}-${String(month).padStart(2, '0')}-01`
  const endDay = new Date(Date.UTC(year, month, 0)).getUTCDate()

  return { from: start, to: `${year}-${String(month).padStart(2, '0')}-${endDay}` }
}

export function periodFromBounds(from, to) {
  if (!from && !to) return { month: currentTransactionMonth(), custom: false, missing: true }
  const match = typeof from === 'string' && /^(\d{4})-(\d{2})-\d{2}$/.exec(from)
  const month = match
    ? { year: Number(match[1]), month: Number(match[2]) }
    : currentTransactionMonth()
  const bounds = monthBounds(month)

  return { month, custom: from !== bounds.from || to !== bounds.to, missing: false }
}

export function hasNonDateFilters(filters) {
  return ['q', 'type', 'movement_kind', 'status', 'financial_account_id', 'category_id', 'include']
    .some((key) => filters[key] !== undefined && filters[key] !== null && filters[key] !== '')
}
