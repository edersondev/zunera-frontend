import { expect, test } from '@playwright/test'
import { pinLocale } from './support/locale.js'

const money = (amount_centavos) => ({ amount_centavos, currency_code: 'BRL' })
const account = { id: 7, name: 'Main account', type: 'checking', status: 'active' }
const expenseCategory = { id: 3, name: 'Food', classification: 'expense', status: 'active' }
const incomeCategory = { id: 4, name: 'Salary', classification: 'income', status: 'active' }
const available = () => ({ status: 'available', message: null })
const headers = () => ({ 'Access-Control-Allow-Origin': 'http://localhost:4173', 'Access-Control-Allow-Credentials': 'true', 'Access-Control-Allow-Headers': 'Content-Type, X-XSRF-TOKEN, X-Requested-With, Accept', 'Access-Control-Allow-Methods': 'GET, OPTIONS', 'Content-Type': 'application/json' })
function session() { const now = Date.now(); return { data: { user: { id: 1, email: 'reports@example.com' }, session: { idle_expires_at: new Date(now + 900000).toISOString(), absolute_expires_at: new Date(now + 28800000).toISOString() } } } }
function scope(params) {
  const preset = params.get('preset') ?? 'current_month'
  const month = params.get('month')
  let from = '2026-09-01'; let to = '2026-09-26'; let previousFrom = '2026-08-01'; let previousTo = '2026-08-26'
  if (preset === 'previous_month') { from = '2026-08-01'; to = '2026-08-31'; previousFrom = '2026-07-01'; previousTo = '2026-07-31' }
  if (preset === 'historical_month' && month === '2026-07') { from = '2026-07-01'; to = '2026-07-31'; previousFrom = '2026-06-01'; previousTo = '2026-06-30' }
  if (preset === 'current_year') { from = '2026-01-01'; to = '2026-09-26'; previousFrom = '2025-01-01'; previousTo = '2025-09-26' }
  if (preset === 'previous_year') { from = '2025-01-01'; to = '2025-12-31'; previousFrom = '2024-01-01'; previousTo = '2024-12-31' }
  if (preset === 'custom') { from = params.get('from'); to = params.get('to'); previousFrom = from === '2026-07-01' && to === '2026-07-31' ? '2026-05-31' : '2026-07-15'; previousTo = from === '2026-07-01' && to === '2026-07-31' ? '2026-06-30' : '2026-08-14' }
  return { preset, month: preset === 'historical_month' ? month : null, current_period: { from, to, day_count: 26 }, previous_period: { from: previousFrom, to: previousTo, day_count: 26 }, filters: { account_id: params.get('account_id') ? Number(params.get('account_id')) : null, category_id: params.get('category_id') ? Number(params.get('category_id')) : null, transaction_type: params.get('transaction_type') }, is_filtered: ['account_id', 'category_id', 'transaction_type'].some((key) => params.has(key)) }
}
function comparison(current, previous, reason = null) { return { current: money(current), previous: money(previous), difference: money(current - previous), percent_change: reason ? null : 100, percent_unavailable_reason: reason } }
function overview(params, { empty = false, unavailable = false } = {}) {
  const applied = scope(params)
  const filtered = applied.is_filtered
  const income = empty ? 0 : filtered && applied.filters.transaction_type === 'expense' ? 0 : 500000
  const expenses = empty ? 0 : filtered && applied.filters.transaction_type === 'income' ? 0 : 300000
  const result = income - expenses
  const states = Object.fromEntries(['summary', 'evolution', 'expense_categories', 'income_categories', 'accounts', 'comparison'].map((name) => [name, available()]))
  if (unavailable) states.evolution = { status: 'unavailable', message: 'Temporarily unavailable' }
  return { scope: applied, section_states: states, summary: { realized_income: money(income), realized_expenses: money(expenses), financial_result: money(result) }, evolution_granularity: 'week', evolution: unavailable ? null : empty ? [] : [{ from: applied.current_period.from, to: applied.current_period.to, is_partial: true, realized_income: money(income), realized_expenses: money(expenses), financial_result: money(result) }], expense_categories: empty || expenses === 0 ? [] : [{ category: unavailable ? { ...expenseCategory, status: 'archived' } : expenseCategory, total: money(expenses), share_percent: 100 }], income_categories: empty || income === 0 ? [] : [{ category: incomeCategory, total: money(income), share_percent: 100 }], accounts: empty ? [] : [{ account, realized_income: money(income), direct_expenses: money(100000), net_financial_flow: money(income - 100000), transfer_in: money(30000), transfer_out: money(30000), card_settlement: money(10000) }], unattributed_card_expenses: money(empty ? 0 : 200000), comparison: { realized_income: comparison(income, 0, 'previous_nonpositive'), realized_expenses: comparison(expenses, 250000), financial_result: comparison(result, -250000, 'sign_crossing'), expense_categories: empty ? [] : [{ category: expenseCategory, amounts: comparison(expenses, 250000) }] }, empty_states: { no_activity: empty && !filtered, no_income: income === 0, no_expenses: expenses === 0, no_filter_matches: empty && filtered, no_previous_activity: true } }
}
function contribution(kind, id, amount, creditEvent = null) { return { source_kind: kind, source_id: id, recognized_date: '2026-09-12', classification: kind === 'card_credit_adjustment' ? 'expense' : 'expense', signed_amount: money(amount), description: kind === 'card_credit_adjustment' ? 'Paid purchase refund' : 'Food purchase', category: expenseCategory, account: kind === 'ordinary_transaction' ? account : null, related_purchase_id: kind.startsWith('card_') ? 51 : null, related_statement_id: kind.startsWith('card_') ? 62 : null, related_installment_id: kind.startsWith('card_') ? 73 : null, related_credit_event_id: creditEvent } }
function detail(params) {
  const metric = params.get('metric')
  const cursor = params.get('cursor')
  const category = metric === 'expense_category'
  const total = category ? 300000 : metric === 'financial_result' ? 200000 : metric === 'realized_income' ? 500000 : 300000
  const rows = category ? (cursor ? [contribution('card_credit_adjustment', 99, -20000, 99)] : [contribution('card_installment', 73, 320000)]) : [contribution('ordinary_transaction', 11, total)]
  if (['realized_income', 'income_category', 'account_income'].includes(metric)) rows.forEach((row) => { row.classification = 'income' })
  return { scope: scope(params), which_period: params.get('which_period') ?? 'current', metric, metric_id: params.get('metric_id') ? Number(params.get('metric_id')) : null, total: money(total), contributions: rows, next_cursor: category && !cursor ? 'page-2' : null }
}
async function mockReports(page, options = {}) {
  const requests = { overview: [], detail: [], revisions: { overview: [], detail: [] }, delayedFinished: 0 }
  await page.route('**/api/v1/auth/session', (route) => route.fulfill({ json: session(), headers: headers() }))
  await page.route('**/sanctum/csrf-cookie', (route) => route.fulfill({ status: 204, headers: headers() }))
  await page.route('**/api/v1/financial-accounts**', (route) => route.fulfill({ json: { data: new URL(route.request().url()).searchParams.get('status') === 'archived' ? [{ ...account, id: 8, name: 'Old account', status: 'archived' }] : [account] }, headers: headers() }))
  await page.route('**/api/v1/categories**', (route) => route.fulfill({ json: { data: new URL(route.request().url()).searchParams.get('status') === 'archived' ? [{ ...expenseCategory, id: 9, name: 'Old food', status: 'archived' }] : [expenseCategory, incomeCategory] }, headers: headers() }))
  await page.route('**/api/v1/financial-reports**', async (route) => {
    const url = new URL(route.request().url())
    if (url.pathname.endsWith('/contributions')) {
      requests.detail.push(Object.fromEntries(url.searchParams))
      if (options.changeOnFirstDetail && !options.changed) {
        options.changed = true
        options.revision = 'revised-source'
      }
      const body = detail(url.searchParams)
      body.source_revision = options.revision ?? 'mock-source'
      if (options.changed && url.searchParams.get('metric') === 'expense_category') {
        body.total = money(options.changeOnFirstDetail === 'amount' ? 310000 : 300000)
        body.contributions = [contribution('ordinary_transaction', 999, body.total.amount_centavos)]
        body.contributions[0].description = options.changeOnFirstDetail === 'amount' ? 'Updated Food purchase' : 'Replacement Food purchase'
        body.next_cursor = null
      }
      if (options.scale && url.searchParams.get('metric') === 'realized_expenses') {
        const pageNumber = Number(url.searchParams.get('cursor') ?? '1')
        body.total = money(1_000_000)
        body.contributions = Array.from({ length: 100 }, (_, index) => contribution('ordinary_transaction', (pageNumber - 1) * 100 + index + 1, 100))
        body.next_cursor = pageNumber < 100 ? String(pageNumber + 1) : null
      }
      requests.revisions.detail.push(body.source_revision)
      return route.fulfill({ json: { data: body }, headers: headers() })
    }
    requests.overview.push(Object.fromEntries(url.searchParams))
    if (options.failOnce) { options.failOnce = false; return route.fulfill({ status: 503, json: { message: 'Unavailable' }, headers: headers() }) }
    if (options.foreign && (url.searchParams.get('account_id') === '999' || url.searchParams.get('category_id') === '999')) return route.fulfill({ status: 404, json: { message: 'Not found' }, headers: headers() })
    if (url.searchParams.get('category_id') === '3' && url.searchParams.get('transaction_type') === 'income') return route.fulfill({ status: 422, json: { message: 'Incompatible filters' }, headers: headers() })
    if (options.delayCurrent && (!url.searchParams.has('preset') || url.searchParams.get('preset') === 'current_month')) {
      await new Promise((resolve) => setTimeout(resolve, 150))
      requests.delayedFinished += 1
    }
    const body = overview(url.searchParams, options)
    body.source_revision = options.revision ?? 'mock-source'
    if (options.changed && options.changeOnFirstDetail === 'amount') {
      body.summary.realized_expenses = money(310000)
      body.summary.financial_result = money(190000)
      body.expense_categories[0].total = money(310000)
      body.evolution[0].realized_expenses = money(310000)
      body.evolution[0].financial_result = money(190000)
    }
    if (options.scale) {
      body.summary.realized_expenses = money(1_000_000)
      body.summary.financial_result = money(-500_000)
      body.expense_categories = Array.from({ length: 100 }, (_, index) => ({ category: { ...expenseCategory, id: index + 1, name: `Category ${index + 1}` }, total: money(10_000), share_percent: 1 }))
      body.accounts = Array.from({ length: 50 }, (_, index) => ({ account: { ...account, id: index + 1, name: `Account ${index + 1}` }, realized_income: money(0), direct_expenses: money(20_000), net_financial_flow: money(-20_000), transfer_in: money(0), transfer_out: money(0), card_settlement: money(0) }))
      body.evolution[0].realized_expenses = money(1_000_000)
      body.evolution[0].financial_result = money(-500_000)
    }
    requests.revisions.overview.push(body.source_revision)
    return route.fulfill({ json: { data: body }, headers: headers() })
  })
  return requests
}

test.beforeEach(async ({ page }) => { await pinLocale(page, 'en') })

test('current summary reconciles with evolution, categories, and excluded movements', async ({ page }) => {
  const requests = await mockReports(page)
  await page.goto('/app/reports')
  await expect(page.getByRole('heading', { name: 'Financial reports' })).toBeVisible()
  await expect(page.locator('[data-test="report-financial_result"]')).toContainText('R$2,000.00')
  await expect(page.locator('[data-test="report-expense-categories"]')).toContainText('Food')
  await expect(page.locator('[data-test="report-detailed-breakdown"]')).not.toHaveAttribute('open', '')
  await page.locator('[data-test="report-detailed-breakdown"] summary').click()
  await expect(page.locator('[data-test="report-evolution"] table')).toContainText('R$3,000.00')
  await expect(page.getByText('Transfers, statement payments, goals, and pending amounts do not enter this result.')).toBeVisible()
  expect(requests.overview[0]).toEqual({ preset: 'current_month' })
})

test('income and expense currency use financial colors in light and dark modes', async ({ page }) => {
  await mockReports(page)
  for (const colorScheme of ['light', 'dark']) {
    await page.emulateMedia({ colorScheme })
    await page.goto('/app/reports')
    const tokenColor = (token) => page.evaluate((variable) => {
      const probe = document.createElement('span')
      probe.style.color = `var(${variable})`
      document.body.append(probe)
      const color = getComputedStyle(probe).color
      probe.remove()
      return color
    }, token)
    const income = await tokenColor('--color-financial-positive')
    const expense = await tokenColor('--color-financial-negative')
    await expect(page.locator('[data-test="report-realized_income"] .amount')).toHaveCSS('color', income)
    await expect(page.locator('[data-test="report-realized_expenses"] .amount')).toHaveCSS('color', expense)
    await expect(page.locator('[data-test="report-realized_income"] .difference span')).toHaveCSS('color', income)
    await expect(page.locator('[data-test="report-realized_expenses"] .difference span')).toHaveCSS('color', expense)
    await expect(page.locator('[data-test="report-expense-categories"] .category-heading span').first()).toHaveCSS('color', expense)
    await expect(page.locator('[data-test="report-income-categories"] .category-heading span').first()).toHaveCSS('color', income)
    await page.locator('[data-test="report-detailed-breakdown"] summary').click()
    await expect(page.locator('[data-test="report-detailed-breakdown"] tbody td').nth(0)).toHaveCSS('color', income)
    await expect(page.locator('[data-test="report-detailed-breakdown"] tbody td').nth(1)).toHaveCSS('color', expense)
    await expect(page.locator('[data-test="report-comparison"] table').first().locator('tbody tr').nth(0).locator('button').first()).toHaveCSS('color', income)
    await expect(page.locator('[data-test="report-comparison"] table').first().locator('tbody tr').nth(1).locator('button').first()).toHaveCSS('color', expense)
    await page.locator('[data-test="report-accounts"] details summary').first().click()
    await expect(page.locator('[data-test="report-accounts"] details button').nth(0)).toHaveCSS('color', income)
    await expect(page.locator('[data-test="report-accounts"] details button').nth(1)).toHaveCSS('color', expense)
    await expect(page.locator('[data-test="report-accounts"] .note .report-expense-amount')).toHaveCSS('color', expense)
    await page.locator('[data-test="report-category-comparison"] summary').click()
    await expect(page.locator('[data-test="report-category-comparison"] button').first()).toHaveCSS('color', expense)
    await page.locator('[data-test="report-expense-categories"] button').first().click()
    const drawer = page.locator('[data-test="report-contribution-drawer"]')
    await expect(drawer.locator('.total span')).toHaveCSS('color', expense)
    await expect(drawer.locator('.contribution-head span').first()).toHaveCSS('color', expense)
    await drawer.locator('[data-test="report-detail-close"]').click()
    await expect(drawer).toBeHidden()
    await page.locator('[data-test="report-income-categories"] button').first().click()
    await expect(drawer.locator('.total span')).toHaveCSS('color', income)
    await expect(drawer.locator('.contribution-head span').first()).toHaveCSS('color', income)
  }
})

test('category drill down pages through a paid refund and keeps all-record total', async ({ page }) => {
  const requests = await mockReports(page)
  await page.goto('/app/reports')
  await page.locator('[data-test="report-expense-categories"]').getByRole('button', { name: 'View contributions: Food' }).click()
  const drawer = page.locator('[data-test="report-contribution-drawer"]')
  await expect(drawer).toContainText('R$3,000.00')
  await expect(drawer).toContainText('Card installment')
  await expect(drawer).toContainText('R$3,200.00')
  await drawer.getByRole('button', { name: 'Load more' }).click()
  await expect(drawer).toContainText('Paid purchase refund')
  await expect(drawer).toContainText('Credit event #99')
  await expect(drawer).toContainText('-R$200.00')
  expect(requests.detail.map((item) => item.cursor ?? null)).toEqual([null, 'page-2'])
  await drawer.locator('[data-test="report-detail-close"]').click()
  await expect(drawer).toBeHidden()
})

for (const [change, amount, description] of [
  ['amount', 'R$3,100.00', 'Updated Food purchase'],
  ['contributors', 'R$3,000.00', 'Replacement Food purchase'],
]) {
  test(`opening detail refreshes changed ${change} with preserved custom category scope`, async ({ page }) => {
    const requests = await mockReports(page, { changeOnFirstDetail: change })
    await page.goto('/app/reports?preset=custom&from=2026-08-15&to=2026-09-14&category_id=3')
    await expect(page.locator('[data-test="report-expense-categories"]')).toBeVisible()
    await page.locator('[data-test="report-expense-categories"]').getByRole('button', { name: 'View contributions: Food' }).click()

    const drawer = page.locator('[data-test="report-contribution-drawer"]')
    await expect(page.locator('[data-test="report-source-changed"]')).toContainText('Records changed')
    await expect(drawer).toContainText(description)
    await expect(drawer).toContainText(amount)
    await expect(page).toHaveURL(/preset=custom.*category_id=3/)
    expect(requests.revisions.overview).toEqual(['mock-source', 'revised-source'])
    expect(requests.revisions.detail).toEqual(['revised-source', 'revised-source'])
    expect(requests.detail.every((item) => item.from === '2026-08-15' && item.to === '2026-09-14' && item.category_id === '3')).toBe(true)
  })
}

test('summary, both categories, account movements, and comparison open matching contributions', async ({ page }) => {
  test.setTimeout(120000)
  const requests = await mockReports(page)
  await page.goto('/app/reports')
  const drawer = page.locator('[data-test="report-contribution-drawer"]')
  let count = 0
  async function check(button, metric, whichPeriod = 'current') {
    await button.click()
    count += 1
    await expect.poll(() => requests.detail.length).toBe(count)
    expect(requests.detail.at(-1)).toMatchObject({ metric, which_period: whichPeriod })
    await drawer.locator('[data-test="report-detail-close"]').click()
    await expect(drawer).toBeHidden()
  }
  const summaryButtons = page.locator('[data-test="report-summary"] button')
  for (const [index, metric] of ['realized_income', 'realized_expenses', 'financial_result'].entries()) await check(summaryButtons.nth(index), metric)
  await check(page.locator('[data-test="report-expense-categories"] button').first(), 'expense_category')
  await check(page.locator('[data-test="report-income-categories"] button').first(), 'income_category')
  await page.locator('[data-test="report-accounts"] details summary').first().click()
  const accountButtons = page.locator('[data-test="report-accounts"] details').first().locator('button')
  for (const [index, metric] of ['account_income', 'account_expenses', 'account_net_flow', 'account_transfer_in', 'account_transfer_out', 'account_card_settlement'].entries()) await check(accountButtons.nth(index), metric)
  const comparisonButtons = page.locator('[data-test="report-comparison"] table').first().locator('button')
  for (const [index, metric] of ['realized_income', 'realized_expenses', 'financial_result'].entries()) {
    await check(comparisonButtons.nth(index * 2), metric)
    await check(comparisonButtons.nth(index * 2 + 1), metric, 'previous')
  }
  await page.locator('[data-test="report-category-comparison"] summary').click()
  const categoryButtons = page.locator('[data-test="report-category-comparison"] button')
  await check(categoryButtons.nth(0), 'expense_category')
  await check(categoryButtons.nth(1), 'expense_category', 'previous')
})

test('historical month, custom dates, prior comparison, and URL restoration share scope', async ({ page }) => {
  const requests = await mockReports(page)
  await page.goto('/app/reports?preset=historical_month&month=2026-07')
  await expect(page.locator('[data-test="report-applied-period"]')).toContainText('Jul')
  await expect(page.locator('[data-test="report-comparison"]')).toContainText('Jun')
  await expect(page.locator('[data-test="report-comparison"]')).toContainText('N/A*')
  await expect(page.locator('[data-test="report-comparison"]')).toContainText('Food')
  await page.locator('[data-test="report-comparison"]').getByRole('button', { name: 'R$0.00' }).first().click()
  await expect.poll(() => requests.detail.at(-1)?.which_period).toBe('previous')
  await page.goto('/app/reports?preset=custom&from=2026-08-15&to=2026-09-14')
  await expect(page.locator('[data-test="report-applied-period"]')).toContainText('Aug')
  expect(requests.overview.at(-1)).toMatchObject({ preset: 'custom', from: '2026-08-15', to: '2026-09-14' })
})

test('account and type filters update URL, cards, and detail requests; reset restores totals', async ({ page }) => {
  const requests = await mockReports(page)
  await page.goto('/app/reports')
  await page.locator('[data-test="report-filter-toggle"]').click()
  await page.locator('[data-test="report-type-filter"]').click()
  await page.getByRole('option', { name: 'Expense' }).click()
  await expect(page).toHaveURL(/transaction_type=expense/)
  await expect(page.locator('[data-test="report-realized_income"]')).toContainText('R$0.00')
  await page.locator('[data-test="report-expense-categories"]').getByRole('button', { name: 'View contributions: Food' }).click()
  expect(requests.detail.at(-1).transaction_type).toBe('expense')
  await page.locator('[data-test="report-detail-close"]').click()
  await page.getByRole('button', { name: 'Clear filters' }).click()
  await expect(page).not.toHaveURL(/transaction_type=/)
  await expect(page.locator('[data-test="report-realized_income"]')).toContainText('R$5,000.00')
})

test('empty, unavailable, and retry states stay distinct', async ({ page }) => {
  const options = { empty: true, unavailable: true, failOnce: true }
  await mockReports(page, options)
  await page.goto('/app/reports')
  await expect(page.locator('[data-test="report-error"]')).toBeVisible()
  await page.locator('[data-test="report-retry"]').click()
  await expect(page.locator('[data-test="report-empty"]')).toContainText('No realized activity')
  await expect(page.locator('[data-test="report-evolution-unavailable"]')).toBeVisible()
  await expect(page.locator('[data-test="report-summary"]')).toBeVisible()
})

test('foreign account filter is rejected without showing report data', async ({ page }) => {
  await mockReports(page, { foreign: true })
  await page.goto('/app/reports?account_id=999')
  await expect(page.locator('[data-test="report-error"]')).toBeVisible()
  await expect(page.locator('[data-test="report-summary"]')).toHaveCount(0)
  await page.goto('/app/reports?category_id=999')
  await expect(page.locator('[data-test="report-error"]')).toBeVisible()
  await expect(page.locator('[data-test="report-summary"]')).toHaveCount(0)
})

test('Portuguese, narrow viewport, keyboard focus, and dark theme remain readable', async ({ page }) => {
  await pinLocale(page, 'pt-BR')
  await mockReports(page)
  await page.setViewportSize({ width: 320, height: 800 })
  await page.emulateMedia({ colorScheme: 'dark' })
  await page.goto('/app/reports')
  await expect(page.getByRole('heading', { name: 'Relatórios financeiros' })).toBeVisible()
  await expect(page.locator('[data-test="report-financial_result"]')).toContainText('R$ 2.000,00')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true)
  await expect(page.locator('[data-test="report-evolution"] [role="img"]')).toHaveAttribute('aria-label', /Evolução financeira/)
  const breakdown = page.locator('[data-test="report-detailed-breakdown"]')
  await breakdown.locator('summary').focus()
  await breakdown.locator('summary').press('Enter')
  await expect(breakdown).toHaveAttribute('open', '')
  const accountDetails = page.locator('[data-test="report-accounts"] details').first()
  await accountDetails.locator('summary').focus()
  await accountDetails.locator('summary').press('Enter')
  await expect(accountDetails).toHaveAttribute('open', '')
  await expect(page.locator('[data-test="report-category-comparison"]')).not.toHaveAttribute('open', '')
  await page.locator('[data-test="report-category-comparison"] summary').press('Enter')
  await expect(page.locator('[data-test="report-category-comparison"]')).toHaveAttribute('open', '')
  const detailButton = page.locator('[data-test="report-summary"]').getByRole('button', { name: 'Ver contribuições: Resultado financeiro' })
  await detailButton.focus()
  await expect(detailButton).toBeFocused()
  await detailButton.press('Enter')
  await expect(page.locator('[data-test="report-contribution-drawer"]')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.locator('[data-test="report-contribution-drawer"]')).toBeHidden()
})

test('protected Reports route redirects unauthenticated visitors', async ({ page }) => {
  await page.route('**/api/v1/auth/session', (route) => route.fulfill({ status: 401, json: { message: 'Unauthenticated' }, headers: headers() }))
  await page.goto('/app/reports')
  await expect(page).toHaveURL(/\/login\?redirect=/)
})

test('quick periods, custom full month, and return to current month update exact boundaries', async ({ page }) => {
  const requests = await mockReports(page)
  await page.goto('/app/reports')
  for (const [label, preset] of [['Previous month', 'previous_month'], ['Current year', 'current_year'], ['Previous year', 'previous_year'], ['Current month', 'current_month']]) {
    await page.locator('[data-test="report-period"]').getByText(label, { exact: true }).click()
    await expect.poll(() => requests.overview.at(-1)?.preset).toBe(preset)
  }
  await page.goto('/app/reports?preset=custom&from=2026-07-01&to=2026-07-31')
  await expect(page.locator('[data-test="report-comparison"]')).toContainText('May 31, 2026')
  await expect(page.locator('[data-test="report-comparison"]')).toContainText('Jun 30, 2026')
  await page.locator('[data-test="report-period"]').getByText('Current month', { exact: true }).click()
  await expect(page.locator('[data-test="report-applied-period"]')).toContainText('Sep 26, 2026')
})

test('income-only, expense-only, category, account, and incompatible filters preserve scope', async ({ page }) => {
  const requests = await mockReports(page)
  await page.goto('/app/reports?transaction_type=income')
  await expect(page.locator('[data-test="report-realized_expenses"]')).toContainText('R$0.00')
  await expect(page.locator('[data-test="report-financial_result"]')).toContainText('R$5,000.00')
  await expect(page.locator('[data-test="report-accounts"]')).toContainText('Transfers and statement payments do not apply')
  await expect(page.locator('[data-test="report-accounts"]')).not.toContainText('Transfers received')
  await page.goto('/app/reports?transaction_type=expense&account_id=7&category_id=3')
  await expect(page.locator('[data-test="report-realized_income"]')).toContainText('R$0.00')
  await expect(page.locator('[data-test="report-financial_result"]')).toContainText('-R$3,000.00')
  await expect(page.locator('[data-test="report-filters"]')).toContainText('Account: Main account')
  await expect(page.locator('[data-test="report-filters"]')).toContainText('Category: Food')
  await page.locator('[data-test="report-expense-categories"]').getByRole('button', { name: 'View contributions: Food' }).click()
  expect(requests.detail.at(-1)).toMatchObject({ account_id: '7', category_id: '3', transaction_type: 'expense' })
  await page.goto('/app/reports?transaction_type=income&category_id=3')
  await expect(page.locator('[data-test="report-error"]')).toBeVisible()
  await page.goto('/app/reports?category_id=9')
  await expect(page.locator('[data-test="report-filters"]')).toContainText('Category: Old food')
})

test('canonical URL strips unknown values and rapid period changes keep the latest response', async ({ page }) => {
  const requests = await mockReports(page, { delayCurrent: true })
  await page.goto('/app/reports?preset=invalid&month=2026-07&account_id=-7&unknown=x')
  await expect(page).toHaveURL(/\/app\/reports$/)
  requests.delayedFinished = 0
  await page.goto('/app/reports')
  await page.locator('[data-test="report-period"]').getByText('Previous month', { exact: true }).click()
  await expect(page.locator('[data-test="report-applied-period"]')).toContainText('Aug 31, 2026')
  await expect.poll(() => requests.delayedFinished).toBeGreaterThan(0)
  await expect(page.locator('[data-test="report-applied-period"]')).toContainText('Aug 31, 2026')
})

test('light, dark, system, and 200 percent zoom keep report labels and detail reachable', async ({ page }) => {
  await mockReports(page)
  await page.setViewportSize({ width: 640, height: 800 })
  await page.goto('/app/reports')
  for (const colorScheme of ['light', 'dark', null]) {
    await page.emulateMedia({ colorScheme })
    await expect(page.locator('[data-test="report-detailed-breakdown"] summary')).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true)
  }
  // A 640px window at 200% browser zoom has about 320 CSS pixels for layout.
  await page.setViewportSize({ width: 320, height: 800 })
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true)
  await page.locator('[data-test="report-summary"]').getByRole('button', { name: 'View contributions: Financial result' }).click()
  await expect(page.locator('[data-test="report-contribution-drawer"]')).toBeVisible()
})

test('20 warm navigations keep summary and first source page reachable on the 10k/100/50 fixture', async ({ page }) => {
  test.setTimeout(120000)
  await mockReports(page, { scale: true })
  await page.goto('/app/reports')
  await expect(page.locator('[data-test="report-expense-categories"] li')).toHaveCount(6)
  await page.locator('[data-test="report-expense-categories"] [data-test="report-categories-expand"]').click()
  await expect(page.locator('[data-test="report-expense-categories"] li')).toHaveCount(100)
  await expect(page.locator('[data-test="report-accounts"] article')).toHaveCount(50)
  const times = []
  for (let index = 0; index < 20; index++) {
    const previous = index % 2 === 0
    const started = Date.now()
    await page.locator('[data-test="report-period"]').getByText(previous ? 'Previous month' : 'Current month', { exact: true }).click()
    await expect(page.locator('[data-test="report-applied-period"]')).toContainText(previous ? 'Aug 31, 2026' : 'Sep 26, 2026')
    await page.locator('[data-test="report-realized_expenses"]').getByRole('button', { name: 'View contributions: Realized expenses' }).click()
    await expect(page.locator('[data-test="report-contribution-drawer"]')).toContainText('R$10,000.00')
    await page.locator('[data-test="report-detail-close"]').click()
    times.push(Date.now() - started)
  }
  console.log(`Reports 10k/100/50 warm-navigation milliseconds: ${times.join(', ')}`)
  expect(times.filter((duration) => duration <= 5000).length).toBeGreaterThanOrEqual(19)
})
