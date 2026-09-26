import { expect, test } from '@playwright/test'
import { pinLocale } from './support/locale.js'

const now = Date.now()
const session = { data: { user: { id: 1, email: 'scale@example.com' }, session: { idle_expires_at: new Date(now + 900000).toISOString(), absolute_expires_at: new Date(now + 28800000).toISOString() } } }
const goals = Array.from({ length: 100 }, (_, index) => ({
  id: index + 1, name: `Scale goal ${index + 1}`, status: 'active', target_centavos: 100000,
  allocated_centavos: 40000, remaining_centavos: 60000, excess_centavos: 0,
  progress_percentage: 40, currency_code: 'BRL', target_date: null,
  target_date_state: null, remaining_calendar_days: null, contribution_periods_remaining: null,
  suggested_monthly_centavos: null, financial_account: {
    id: index % 5 + 1, name: `Savings ${index % 5 + 1}`, status: 'active',
    current_balance_centavos: 10000000, designated_centavos: 800000,
    unallocated_centavos: 9200000, shortfall_centavos: 0,
  },
  account_backing: 'available', description: null, completed_at: null, archived_at: null,
  created_at: '2026-09-25T12:00:00Z', updated_at: '2026-09-25T12:00:00Z',
}))
const events = Array.from({ length: 1000 }, (_, index) => ({
  id: index + 1, goal_id: 1, type: index % 2 ? 'withdrawn' : 'allocated',
  amount_centavos: 100, occurred_at: '2026-09-25T12:00:00Z', business_date: '2026-09-25',
  account_at_time: { id: 1, name: 'Savings 1' }, details: {},
}))
const summary = {
  active_count: 100, completed_count: 0, archived_count: 0,
  active_target_centavos: 10000000, active_allocated_centavos: 4000000,
  active_remaining_centavos: 6000000, active_excess_centavos: 0,
  active_unverified_centavos: 0,
  attention_counts: { overdue_underfunded_active_goals: 0, shortfall_linked_goals: 0, inactive_or_unavailable_linked_goals: 0 },
  linked_accounts: [],
}
const pageData = (items, total, page = 1) => ({ data: items, meta: { current_page: page, last_page: Math.ceil(total / 20), total }, links: {} })

function p95(values) {
  return [...values].sort((a, b) => a - b)[Math.ceil(values.length * 0.95) - 1]
}

test('100 goals and 1000 activities show usable content within two seconds', async ({ page }) => {
  test.setTimeout(180000)
  await pinLocale(page, 'en')
  await page.route('**/api/v1/auth/session', (route) => route.fulfill({ json: session }))
  await page.route('**/api/v1/financial-accounts**', (route) => route.fulfill({ json: { data: [] } }))
  await page.route('**/api/v1/financial-goals**', (route) => {
    const url = new URL(route.request().url())
    if (url.pathname.endsWith('/summary')) return route.fulfill({ json: { data: summary } })
    if (url.pathname.endsWith('/activities')) {
      const number = Number(url.searchParams.get('page') ?? 1)
      return route.fulfill({ json: pageData(events.slice((number - 1) * 20, number * 20), events.length, number) })
    }
    if (url.pathname.endsWith('/financial-goals')) {
      const number = Number(url.searchParams.get('page') ?? 1)
      return route.fulfill({ json: pageData(goals.slice((number - 1) * 20, number * 20), goals.length, number) })
    }
    return route.fulfill({ json: { data: goals[0] } })
  })

  for (const viewport of [{ width: 1280, height: 800 }, { width: 320, height: 800 }]) {
    await page.setViewportSize(viewport)
    const overview = []
    const detail = []
    await page.goto('/app/goals')
    await expect(page.getByText('Scale goal 1').first()).toBeVisible()
    await page.goto('/app/goals/1')
    await expect(page.getByRole('progressbar')).toBeVisible()
    for (let i = 0; i < 20; i++) {
      const startOverview = performance.now()
      await page.goto('/app/goals')
      await expect(page.getByRole('heading', { name: 'Financial goals' })).toBeVisible()
      await expect(page.getByText('Scale goal 1').first()).toBeVisible()
      overview.push(performance.now() - startOverview)
      const startDetail = performance.now()
      await page.goto('/app/goals/1')
      await expect(page.getByRole('heading', { name: 'Scale goal 1' })).toBeVisible()
      await expect(page.getByRole('progressbar')).toBeVisible()
      detail.push(performance.now() - startDetail)
    }
    console.log(JSON.stringify({ viewport: viewport.width, goals: goals.length, activities: events.length, overview_p95_ms: Math.round(p95(overview)), detail_p95_ms: Math.round(p95(detail)), samples_per_route: overview.length }))
    expect(p95(overview)).toBeLessThan(2000)
    expect(p95(detail)).toBeLessThan(2000)
  }
})
