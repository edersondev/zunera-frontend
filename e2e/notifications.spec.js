import { expect, test } from '@playwright/test'
import { pinLocale } from './support/locale.js'

const headers = {
  'Access-Control-Allow-Origin': 'http://localhost:4173',
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Allow-Headers': 'Content-Type, X-XSRF-TOKEN, X-Requested-With, Accept, Accept-Language',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
  'Content-Type': 'application/json',
}

function item(id, overrides = {}) {
  return {
    id, type: 'statement_due_today', category: 'credit_cards', severity: 'attention',
    title: `Statement ${id}`, summary: 'R$ 100,00 due', origin: 'credit_cards',
    event_at: '2026-09-29T12:00:00Z', created_at: '2026-09-29T12:00:00Z',
    read_at: null, resolved_at: null, requires_action: true, source_available: true,
    destination: { kind: 'credit_card_statement', params: { statement_id: id } },
    ...overrides,
  }
}

async function mockCenter(page, initial = [item(2), item(1)]) {
  const state = { items: initial, active: true, summaryCalls: 0, openCalls: 0, preferences: { credit_cards: true, recurring_transactions: true, budgets: true, financial_goals: true } }
  const fulfill = (route, json, status = 200) => route.fulfill({ status, json, headers })
  await page.route('**/api/v1/auth/session', (route) => {
    if (route.request().method() === 'DELETE') {
      state.active = false
      return fulfill(route, null, 204)
    }
    return state.active
      ? fulfill(route, { data: { user: { id: 7, name: 'Person', email: 'person@example.com' }, session: { idle_expires_at: new Date(Date.now() + 900000).toISOString(), absolute_expires_at: new Date(Date.now() + 28800000).toISOString() } } })
      : fulfill(route, { message: 'Unauthenticated' }, 401)
  })
  await page.route('**/sanctum/csrf-cookie', (route) => route.fulfill({ status: 204, headers }))
  await page.route('**/api/v1/notification-preferences**', (route) => {
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers })
    const category = new URL(route.request().url()).pathname.split('/').at(-1)
    if (route.request().method() === 'PATCH' && Object.hasOwn(state.preferences, category)) {
      state.preferences = { ...state.preferences, [category]: route.request().postDataJSON().enabled }
    }
    return fulfill(route, { data: state.preferences })
  })
  await page.route('**/api/v1/notifications**', (route) => {
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers })
    const url = new URL(route.request().url())
    const path = url.pathname
    if (path.endsWith('/summary')) {
      state.summaryCalls += 1
      return fulfill(route, { data: {
        unread_count: state.items.filter((entry) => !entry.read_at).length,
        requires_action_count: state.items.filter((entry) => entry.requires_action).length,
      } })
    }
    if (path.endsWith('/read-all')) {
      const changed = state.items.filter((entry) => !entry.read_at).length
      state.items = state.items.map((entry) => ({ ...entry, read_at: entry.read_at ?? '2026-09-29T12:01:00Z' }))
      return fulfill(route, { data: { changed_count: changed, summary: { unread_count: 0, requires_action_count: state.items.filter((entry) => entry.requires_action).length } } })
    }
    const match = path.match(/\/notifications\/(\d+)\/(read|open)$/)
    if (match) {
      const id = Number(match[1])
      if (match[2] === 'open') state.openCalls += 1
      state.items = state.items.map((entry) => entry.id === id ? { ...entry, read_at: entry.read_at ?? '2026-09-29T12:01:00Z' } : entry)
      return fulfill(route, { data: state.items.find((entry) => entry.id === id) })
    }
    const view = url.searchParams.get('view') ?? 'all'
    const filtered = state.items.filter((entry) => view === 'unread' ? !entry.read_at : view === 'requires_action' ? entry.requires_action : true)
    const cursor = url.searchParams.get('cursor')
    const pageItems = cursor ? filtered.slice(25, 50) : filtered.slice(0, 25)
    return fulfill(route, { data: pageItems, next_cursor: !cursor && filtered.length > 25 ? 'next' : null })
  })
  return state
}

test('center keeps read and action separate across filters, mark-all, and safe open', async ({ page }) => {
  await pinLocale(page, 'en')
  const state = await mockCenter(page)
  await page.goto('/app/notifications')
  await expect(page.getByRole('heading', { name: 'Notifications' })).toBeVisible()
  await expect(page.getByRole('link', { name: '2 unread notifications' })).toBeVisible()
  await page.getByLabel('Show notifications').getByText('Unread', { exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Statement 2' })).toBeVisible()
  await page.getByRole('button', { name: 'Mark as read' }).first().click()
  await expect(page.getByRole('link', { name: '1 unread notification' })).toBeVisible()
  await page.getByLabel('Show notifications').getByText('Requires attention', { exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Statement 2' })).toBeVisible()
  await expect(page.getByText('Requires attention').first()).toBeVisible()
  await page.getByRole('button', { name: 'Mark all as read' }).click()
  await expect(page.getByRole('link', { name: 'Notifications, none unread' })).toBeVisible()
  expect(state.items.every((entry) => entry.read_at)).toBe(true)
  expect(state.items.every((entry) => entry.requires_action)).toBe(true)
  await page.getByRole('button', { name: 'View statement' }).first().click()
  await expect(page).toHaveURL(/\/app\/credit-card-statements\/2$/)
  expect(state.openCalls).toBe(1)
})

test('compact feed groups history, preserves order, and offers actions only for valid sources', async ({ page }) => {
  await pinLocale(page, 'en')
  const now = Date.now()
  const state = await mockCenter(page, [
    item(63, { created_at: new Date(now).toISOString(), event_at: new Date(now).toISOString() }),
    item(62, { created_at: new Date(now - 86400000).toISOString(), event_at: new Date(now - 86400000).toISOString(), read_at: new Date(now).toISOString(), requires_action: false, resolved_at: new Date(now).toISOString() }),
    item(61, { created_at: new Date(now - 3 * 86400000).toISOString(), event_at: new Date(now - 3 * 86400000).toISOString(), source_available: false, destination: null, requires_action: false }),
  ])
  await page.goto('/app/notifications')
  await expect(page.getByText('2 unread · 1 require attention')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Today' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Yesterday' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Earlier' })).toBeVisible()
  await expect(page.locator('.notification-item h2')).toHaveText(['Statement 63', 'Statement 62', 'Statement 61'])
  await expect(page.locator('.notification-item.is-unread')).toHaveCount(2)
  await expect(page.locator('.notification-item.needs-attention')).toHaveCount(1)
  await expect(page.locator('.notification-item').last().locator('[role="button"]')).toHaveCount(0)
  await expect(page.locator('.notification-item').last().getByRole('button', { name: 'View statement' })).toHaveCount(0)
  const content = page.locator('.notification-item').first().locator('[role="button"]')
  await content.focus()
  await content.press('Enter')
  await expect(page).toHaveURL(/\/app\/credit-card-statements\/63$/)
  expect(state.openCalls).toBe(1)
})

test('empty center and attention filter use distinct compact messages', async ({ page }) => {
  await pinLocale(page, 'en')
  await mockCenter(page, [])
  await page.goto('/app/notifications')
  await expect(page.getByText('No notifications yet. Important financial notices will appear here.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Mark all as read' })).toBeDisabled()
  await page.getByLabel('Show notifications').getByText('Requires attention', { exact: true }).click()
  await expect(page.getByText('Nothing requires your attention right now.')).toBeVisible()
})

test('indicator refreshes on focus, history pages, and empty state stay usable', async ({ page }) => {
  await pinLocale(page, 'en')
  const state = await mockCenter(page, Array.from({ length: 26 }, (_, index) => item(26 - index)))
  await page.goto('/app/notifications')
  await expect(page.getByRole('link', { name: '26 unread notifications' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Statement 26' })).toBeVisible()
  await page.getByRole('button', { name: 'Load more' }).click()
  await expect(page.getByRole('heading', { name: 'Statement 1', exact: true })).toBeVisible()
  const before = state.summaryCalls
  await page.evaluate(() => window.dispatchEvent(new Event('focus')))
  await expect.poll(() => state.summaryCalls).toBeGreaterThan(before)
  state.items = []
  await page.getByLabel('Show notifications').getByText('Unread', { exact: true }).click()
  await expect(page.getByText('No unread notifications.')).toBeVisible()
})

test('preference choice preserves history and accepts a later distinct event', async ({ page }) => {
  await pinLocale(page, 'en')
  const state = await mockCenter(page, [item(4, { category: 'budgets', title: 'Old budget event' })])
  await page.goto('/app/notifications')
  await expect(page.getByRole('heading', { name: 'Old budget event' })).toBeVisible()
  await page.getByRole('button', { name: 'Notification settings' }).click()
  const switchControl = page.getByRole('switch', { name: 'Budgets' })
  const switchButton = page.locator('.preference-row').filter({ hasText: 'Budgets' }).locator('.el-switch')
  await expect(switchControl).toBeChecked()
  await switchButton.click()
  await expect(switchControl).not.toBeChecked()
  expect(state.preferences.budgets).toBe(false)
  await expect(page.getByRole('heading', { name: 'Old budget event' })).toBeVisible()
  await switchButton.click()
  await expect(switchControl).toBeChecked()
  state.items.unshift(item(5, { category: 'budgets', title: 'New budget event' }))
  await page.keyboard.press('Escape')
  await expect(page.getByRole('button', { name: 'Notification settings' })).toBeFocused()
  await page.getByLabel('Show notifications').getByText('Unread', { exact: true }).click()
  await expect(page.getByRole('heading', { name: 'New budget event' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Old budget event' })).toBeVisible()
})

test('card review opens the exact failed occurrence, not a newer expected one', async ({ page }) => {
  await pinLocale(page, 'en')
  const card = { id: 3, name: 'Visa', institution_name: 'Bank', last_four: '1234', status: 'active' }
  const category = { id: 5, name: 'Groceries', classification: 'expense', status: 'active' }
  const rule = {
    id: 7, type: 'expense', destination_type: 'credit_card', amount_centavos: 10000,
    currency_code: 'BRL', description: 'Membership', frequency: 'monthly', start_date: '2026-08-01',
    end_date: null, state: 'active', paused_reason: null, financial_account: null,
    credit_card: card, generation_mode: 'automatic', category,
    next_expected_occurrence: '2026-10-01', generated_occurrence_count: 2,
    reviewable_occurrence_count: 2,
  }
  const occurrence = (id, state) => ({ id, state, scheduled_date: '2026-09-01', generation_mode: 'automatic',
    scheduled_amount_centavos: 10000, actual_amount_centavos: null, actual_purchase_date: null,
    card, category, purchase_id: null })
  await mockCenter(page, [item(8, { type: 'recurrence_review', category: 'recurring_transactions',
    origin: 'recurring_card_purchases', title: 'Review failed occurrence', summary: 'Retry this exact occurrence',
    destination: { kind: 'recurring_card_occurrence', params: { rule_id: 7, occurrence_id: 42 } },
  })])
  const fulfill = (route, data) => route.fulfill({ json: data, headers })
  await page.route('**/api/v1/financial-accounts**', (route) => fulfill(route, { data: [] }))
  await page.route('**/api/v1/categories**', (route) => fulfill(route, { data: [category] }))
  await page.route('**/api/v1/credit-cards**', (route) => fulfill(route, { data: [card] }))
  await page.route(/\/api\/v1\/recurring-transactions\/(\d+)\/occurrences(?:\?.*)?$/, (route) => {
    const pageNumber = Number(new URL(route.request().url()).searchParams.get('page') ?? 1)
    return fulfill(route, { data: [pageNumber === 2 ? occurrence(42, 'failed') : occurrence(99, 'expected')], meta: { current_page: pageNumber, last_page: 2 } })
  })
  await page.route(/\/api\/v1\/recurring-transactions\/7$/, (route) => fulfill(route, { data: rule }))
  await page.route(/\/api\/v1\/recurring-transactions(?:\?.*)?$/, (route) => fulfill(route, { data: [rule], meta: { current_page: 1, last_page: 1 } }))
  await page.goto('/app/notifications')
  await page.getByRole('button', { name: 'Review occurrence' }).click()
  await expect(page).toHaveURL(/recurring-transactions\?highlight=7&occurrence_id=42/)
  await expect(page.locator('[data-test="notification-occurrence-target"]')).toContainText('#42')
  await expect(page.locator('[data-test="occurrence-failed"]')).toBeVisible()
  await expect(page.locator('[data-test="occurrence-state"]')).toContainText('Failed')
})

test('resolved old-month budget notice opens its exact plan and month', async ({ page }) => {
  await pinLocale(page, 'en')
  const selected = item(16, { type: 'budget_exceeded', category: 'budgets', origin: 'budgets',
    title: 'Groceries exceeded', summary: 'Realized spending exceeded the plan',
    read_at: '2026-09-29T12:01:00Z', resolved_at: '2026-09-29T13:00:00Z', requires_action: false,
    destination: { kind: 'budget_plan', params: { year: 2026, month: 8, plan_id: 51 } },
  })
  await mockCenter(page, [selected])
  const money = (amount_centavos) => ({ amount_centavos, currency_code: 'BRL' })
  const period = { year: 2026, month: 8, from: '2026-08-01', to: '2026-08-31' }
  const plan = { id: 51, category: { id: 5, name: 'Groceries', classification: 'expense', status: 'active' },
    planned: money(10000), realized: money(12000), available: money(-2000), utilization_percent: 120,
    status: 'exceeded', excess: money(2000), expected: null, projected_spending: null,
    projected_available: null, projected_status: null, is_read_only: false }
  const budget = { id: 9, period, plans: [plan], summary: { total_planned: money(10000),
    budgeted_realized: money(12000), actual_available: money(-2000), overall_utilization_percent: 120,
    overall_status: 'exceeded', unbudgeted_expenses: money(0), total_expenses: money(12000),
    expected: null, projected_spending: null, projected_available: null, projected_status: null } }
  const months = []
  await page.route(/\/api\/v1\/budgets\/\d+\/\d+$/, (route) => {
    months.push(new URL(route.request().url()).pathname)
    return route.fulfill({ json: { data: { period, budget } }, headers })
  })
  await page.goto('/app/notifications')
  await expect(page.getByText('Resolved')).toBeVisible()
  await page.getByRole('button', { name: 'View budget' }).click()
  await expect(page).toHaveURL(/\/app\/budgets\?year=2026&month=8&plan_id=51$/)
  await expect(page.locator('[data-test="notification-budget-target"]')).toContainText('Groceries')
  await expect(page.locator('#notification-budget-plan')).toHaveAttribute('aria-current', 'location')
  expect(months).toContain('/api/v1/budgets/2026/8')
})

test('informational goal milestone opens goal without completing it', async ({ page }) => {
  await pinLocale(page, 'en')
  const state = await mockCenter(page, [item(17, { type: 'goal_reached', category: 'financial_goals',
    origin: 'financial_goals', title: 'Trip target reached', summary: 'R$ 3.000,00 reached',
    requires_action: false, destination: { kind: 'goal', params: { goal_id: 8 } },
  })])
  const mutations = []
  const goal = { id: 8, name: 'Trip', status: 'active', target_centavos: 300000,
    allocated_centavos: 300000, remaining_centavos: 0, excess_centavos: 0, progress_percentage: 100,
    currency_code: 'BRL', target_date: null, target_date_state: null, remaining_calendar_days: null,
    contribution_periods_remaining: null, suggested_monthly_centavos: null, financial_account: null,
    account_backing: 'unverified', description: null, completed_at: null, archived_at: null,
    created_at: '2026-09-25T12:00:00Z', updated_at: '2026-09-25T12:00:00Z' }
  await page.route('**/api/v1/financial-accounts**', (route) => route.fulfill({ json: { data: [] }, headers }))
  await page.route('**/api/v1/financial-goals**', (route) => {
    if (route.request().method() !== 'GET' && route.request().method() !== 'OPTIONS') mutations.push(route.request().url())
    const path = new URL(route.request().url()).pathname
    if (path.endsWith('/activities')) return route.fulfill({ json: { data: [], meta: { current_page: 1, last_page: 1 }, links: {} }, headers })
    return route.fulfill({ json: { data: goal }, headers })
  })
  await page.goto('/app/notifications')
  await expect(page.getByText('Informational')).toBeVisible()
  await expect(page.getByText('Requires attention', { exact: true })).toHaveCount(1)
  await page.getByRole('button', { name: 'View goal' }).click()
  await expect(page).toHaveURL(/\/app\/goals\/8$/)
  await expect(page.getByRole('heading', { name: 'Trip' })).toBeVisible()
  expect(mutations).toEqual([])
  expect(state.items).toHaveLength(1)
})

test('statement stages keep masked context and read does not pay or clear action', async ({ page }) => {
  await pinLocale(page, 'en')
  const stage = (id, type, title) => item(id, { type, title,
    summary: 'Visa •••• 1234 · R$ 50,00 remaining after partial payment',
    destination: { kind: 'credit_card_statement', params: { statement_id: 27 } },
  })
  const state = await mockCenter(page, [
    stage(23, 'statement_overdue', 'Statement overdue'),
    stage(22, 'statement_due_today', 'Statement due today'),
    stage(21, 'statement_approaching', 'Statement due soon'),
  ])
  const paymentRequests = []
  await page.route(/\/api\/v1\/credit-card-statements\/\d+\/payments/, (route) => {
    paymentRequests.push(route.request().method())
    return route.fulfill({ status: 500, json: { message: 'Unexpected payment' }, headers })
  })
  await page.goto('/app/notifications')
  for (const title of ['Statement overdue', 'Statement due today', 'Statement due soon']) {
    await expect(page.getByRole('heading', { name: title })).toBeVisible()
  }
  await expect(page.getByText('Visa •••• 1234 · R$ 50,00 remaining after partial payment').first()).toBeVisible()
  expect(await page.locator('main').innerText()).not.toMatch(/\d{12,19}/)
  await page.getByRole('button', { name: 'Mark as read' }).first().click()
  await expect(page.getByRole('link', { name: '2 unread notifications' })).toBeVisible()
  expect(await page.getByText('Requires attention', { exact: true }).count()).toBeGreaterThan(1)
  expect(paymentRequests).toEqual([])
  state.items = state.items.map((entry) => entry.id === 23 ? { ...entry, requires_action: false, resolved_at: '2026-09-29T14:00:00Z' } : entry)
  await page.getByLabel('Show notifications').getByText('Requires attention', { exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Statement overdue' })).toHaveCount(0)
})

test('ordinary recurrence notice requests its generated transaction, not another occurrence', async ({ page }) => {
  await pinLocale(page, 'en')
  await mockCenter(page, [item(31, { type: 'recurrence_review', category: 'recurring_transactions',
    origin: 'recurring_transactions', title: 'Review generated transaction',
    destination: { kind: 'transaction', params: { transaction_id: 73 } },
  })])
  const selectedRequests = []
  await page.route('**/api/v1/financial-accounts**', (route) => route.fulfill({ json: { data: [] }, headers }))
  await page.route('**/api/v1/categories**', (route) => route.fulfill({ json: { data: [] }, headers }))
  await page.route('**/api/v1/transactions**', (route) => {
    const path = new URL(route.request().url()).pathname
    if (path.endsWith('/73')) selectedRequests.push(path)
    return route.fulfill({ json: path.endsWith('/73') ? { data: { id: 73, description: 'Generated' } } : { data: [], meta: { current_page: 1, last_page: 1 } }, headers })
  })
  await page.goto('/app/notifications')
  await page.getByRole('button', { name: 'View transaction' }).click()
  await expect(page).toHaveURL(/\/app\/transactions\?highlight=73(?:&|$)/)
  await expect.poll(() => selectedRequests.length).toBeGreaterThan(0)
  expect(selectedRequests).toEqual(['/api/v1/transactions/73'])
})

test('focus, visibility return, and minute interval refresh the quiet indicator', async ({ page }) => {
  await pinLocale(page, 'en')
  await page.clock.install()
  const state = await mockCenter(page, [item(41)])
  await page.goto('/app/notifications')
  await expect(page.getByRole('link', { name: '1 unread notification' })).toBeVisible()
  const initial = state.summaryCalls
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')))
  await expect.poll(() => state.summaryCalls).toBeGreaterThan(initial)
  const afterVisibility = state.summaryCalls
  await page.clock.runFor(60_100)
  await expect.poll(() => state.summaryCalls).toBeGreaterThan(afterVisibility)
  await expect(page.locator('.notification-indicator [aria-live]')).toHaveCount(0)
})

test('notification center stays keyboard usable in Portuguese, dark mode, and narrow layouts', async ({ page }) => {
  await pinLocale(page, 'pt-BR')
  // A 320 CSS-pixel viewport also represents a 640-pixel window at 200% browser zoom.
  await page.setViewportSize({ width: 320, height: 800 })
  await page.emulateMedia({ colorScheme: 'dark' })
  await mockCenter(page, [item(51, { title: '<script>alert(1)</script>', summary: 'Cartão •••• 1234' })])
  await page.goto('/app/notifications')
  await expect(page.getByRole('heading', { name: 'Notificações' })).toBeVisible()
  await expect(page.getByRole('heading', { name: '<script>alert(1)</script>' })).toBeVisible()
  await expect(page.locator('main script')).toHaveCount(0)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true)
  const indicator = page.getByRole('link', { name: '1 notificação não lida' })
  await indicator.focus()
  await expect(indicator).toBeFocused()
  await indicator.press('Enter')
  await expect(page).toHaveURL(/\/app\/notifications$/)
  await page.emulateMedia({ colorScheme: 'light' })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true)
})
