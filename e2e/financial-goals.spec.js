import { expect, test } from '@playwright/test'
import { pinLocale } from './support/locale.js'

test('owner creates an unlinked goal and completes explicit money and lifecycle journey', async ({ page }) => {
  await pinLocale(page, 'en')
  const state = await mockGoals(page)
  await page.goto('/app/goals')
  await expect(page.getByRole('heading', { name: 'Financial goals' })).toBeVisible()
  await expect(page.locator('[data-test="navigation-item-goals"]')).toHaveAttribute('aria-current', 'page')
  await page.getByRole('button', { name: 'New goal' }).click()
  const form = page.getByRole('dialog', { name: 'New goal' })
  await form.getByLabel('Name').fill('Trip')
  await form.getByLabel('Target amount').pressSequentially('3000')
  await form.getByRole('button', { name: 'Create goal' }).click()
  await expect(page.getByRole('heading', { name: 'Trip' })).toBeVisible()
  await expect(page.getByText('Unverified by an account').first()).toBeVisible()
  await page.getByRole('button', { name: 'Designate money' }).click()
  const amount = page.getByRole('dialog', { name: 'Designate money' })
  await amount.getByLabel('Amount').pressSequentially('5000')
  state.failNextAllocation = true
  await amount.getByRole('button', { name: 'Designate money' }).click()
  await expect(amount.getByText('Temporary outage')).toBeVisible()
  await amount.getByRole('button', { name: 'Designate money' }).click()
  await expect(page.getByText('above target')).toBeVisible()
  await page.getByRole('button', { name: 'Release money' }).click()
  const withdrawal = page.getByRole('dialog', { name: 'Release money' })
  await withdrawal.getByLabel('Amount').pressSequentially('2000')
  await withdrawal.getByRole('button', { name: 'Release money' }).click()
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuetext', /100%/)
  await page.getByRole('button', { name: 'Complete' }).click()
  await expect(page.getByRole('button', { name: 'Reopen' })).toBeVisible()
  await page.getByRole('button', { name: 'Reopen' }).click()
  await page.getByRole('button', { name: 'Release money' }).click()
  await withdrawal.getByLabel('Amount').pressSequentially('3000')
  await withdrawal.getByRole('button', { name: 'Release money' }).click()
  await page.getByRole('button', { name: 'Archive' }).click()
  await expect(page.getByRole('button', { name: 'Restore' })).toBeVisible()
  await page.getByRole('button', { name: 'Restore' }).click()
  await expect(page.getByRole('button', { name: 'Designate money' })).toBeVisible()
  expect(state.accountBalance).toBe(1_000_000)
  expect(state.allocationKeys).toHaveLength(2)
  expect(state.allocationKeys[0]).toBe(state.allocationKeys[1])
  expect(state.events.map((event) => event.type)).toEqual(['created', 'allocated', 'withdrawn', 'completed', 'reopened', 'withdrawn', 'archived', 'restored'])
})

test('linked shortfall and hostile text stay understandable at mobile width', async ({ page }) => {
  await pinLocale(page, 'en')
  const state = await mockGoals(page, { initial: { name: '<img src=x onerror=alert(1)>', description: '<script>alert(1)</script>', target: 8000, allocated: 8000, accountId: 7 }, accountBalance: 4000 })
  await page.setViewportSize({ width: 320, height: 800 })
  await page.emulateMedia({ colorScheme: 'dark' })
  await page.goto('/app/goals/1')
  await expect(page.getByRole('heading', { name: '<img src=x onerror=alert(1)>' })).toBeVisible()
  await expect(page.locator('img[src="x"]')).toHaveCount(0)
  await expect(page.locator('main script')).toHaveCount(0)
  await expect(page.getByText('Linked account is short by')).toBeVisible()
  await expect(page.getByText('Actual balance')).toBeVisible()
  await expect(page.getByText('Designated to goals')).toBeVisible()
  await expect(page.getByText('Unallocated')).toBeVisible()
  await page.getByRole('button', { name: 'Complete' }).click()
  await expect(page.getByText('Resolve the linked account shortfall')).toBeVisible()
  await expect(page.getByRole('heading', { name: '<img src=x onerror=alert(1)>' })).toBeVisible()
  await page.getByRole('button', { name: 'Edit goal' }).click()
  const edit = page.getByRole('dialog', { name: 'Edit goal' })
  await expect(edit.getByText('Resolve the linked account shortfall')).toHaveCount(0)
  await edit.locator('.el-select').click()
  await page.getByRole('option', { name: 'Reserve' }).click()
  await edit.getByRole('button', { name: 'Save changes' }).click()
  await expect(page.getByText('Covered by linked account')).toBeVisible()
  expect(state.accountId).toBe(8)
  expect(state.accountBalance).toBe(4000)
})

test('completed and archived sections remain available with Portuguese copy', async ({ page }) => {
  await pinLocale(page, 'pt-BR')
  await mockGoals(page, { initial: { name: 'Viagem', target: 300000, allocated: 100000 } })
  await page.goto('/app/goals')
  await expect(page.getByRole('heading', { name: 'Metas financeiras' })).toBeVisible()
  await expect(page.getByText('Separado nas metas ativas')).toBeVisible()
  await page.getByRole('button', { name: 'Concluídas' }).click()
  await expect(page).toHaveURL(/\/app\/goals\/completed$/)
  await page.getByRole('button', { name: 'Arquivadas' }).click()
  await expect(page).toHaveURL(/\/app\/goals\/archived$/)
  await page.getByRole('button', { name: 'Ativas' }).click()
  await expect(page.getByText('Viagem')).toBeVisible()
})

test('goal detail keeps labels and actions readable across narrow, zoomed, and theme states', async ({ page }) => {
  await pinLocale(page, 'en')
  await mockGoals(page, { initial: { name: 'Readable goal', target: 10000, allocated: 2000, accountId: 7 } })
  await page.setViewportSize({ width: 320, height: 800 })
  await page.goto('/app/goals/1')
  await expect(page.getByRole('progressbar', { name: 'Goal progress' })).toHaveAttribute('aria-valuetext', /20%/)
  await expect(page.getByText('Actual balance')).toBeVisible()
  await expect(page.getByText('Designated to goals')).toBeVisible()
  await expect(page.getByText('Unallocated')).toBeVisible()
  const action = page.getByRole('button', { name: 'Designate money' })
  await action.focus()
  await expect(action).toBeFocused()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true)
  await page.setViewportSize({ width: 640, height: 800 })
  for (const colorScheme of ['light', 'dark']) {
    await page.emulateMedia({ colorScheme })
    await expect(page.getByRole('heading', { name: 'Readable goal' })).toBeVisible()
    await expect(page.getByText('Covered by linked account')).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true)
  }
  await page.emulateMedia({ colorScheme: null })
  await expect(page.getByText('Covered by linked account')).toBeVisible()
  await page.setViewportSize({ width: 320, height: 800 })
  await page.goto('/app/goals')
  await expect(page.getByRole('region', { name: 'Goals overview' })).toBeVisible()
  await expect(page.locator('[data-test="navigation-item-goals"]')).toHaveAttribute('aria-current', 'page')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true)
})

test('future guidance changes to overdue wording without creating recurring activity', async ({ page }) => {
  await pinLocale(page, 'en')
  const state = await mockGoals(page, { initial: { name: 'Dated', target: 1200000, allocated: 0, targetDate: '2027-08-31', dateState: 'future', suggested: 100000, periods: 12 } })
  await page.goto('/app/goals/1')
  await expect(page.getByText('Suggestion:')).toBeVisible()
  await expect(page.getByText('No automatic transfer')).toBeVisible()
  state.dateState = 'overdue'
  state.suggested = null
  await page.reload()
  await expect(page.getByText('Overdue')).toBeVisible()
  await expect(page.getByText('Suggestion:')).toHaveCount(0)
  expect(state.events.filter((event) => event.type === 'allocated')).toHaveLength(0)
})

function sessionPayload() {
  const now = Date.now()
  return { data: { user: { id: 1, email: 'person@example.com' }, session: { idle_expires_at: new Date(now + 900000).toISOString(), absolute_expires_at: new Date(now + 28800000).toISOString() } } }
}
function headers() { return { 'Access-Control-Allow-Origin': 'http://localhost:4173', 'Access-Control-Allow-Credentials': 'true', 'Access-Control-Allow-Headers': 'Content-Type, X-XSRF-TOKEN, X-Requested-With, Accept, Idempotency-Key', 'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS', 'Content-Type': 'application/json' } }
function activity(type, amount, accountId) { return { id: Math.random(), goal_id: 1, type, amount_centavos: amount, occurred_at: '2026-09-25T12:00:00Z', business_date: '2026-09-25', account_at_time: accountId ? { id: accountId, name: 'Savings' } : null, details: {} } }

async function mockGoals(page, { initial = null, accountBalance = 1_000_000 } = {}) {
  const state = { accountBalance, target: initial?.target ?? 3000, allocated: initial?.allocated ?? 0, accountId: initial?.accountId ?? null, targetDate: initial?.targetDate ?? null, dateState: initial?.dateState ?? null, suggested: initial?.suggested ?? null, periods: initial?.periods ?? null, status: 'active', name: initial?.name ?? null, description: initial?.description ?? null, events: initial ? [activity('created', null, initial.accountId), ...(initial.allocated ? [activity('initial_allocation', initial.allocated, initial.accountId)] : [])] : [], replay: new Map(), allocationKeys: [], failNextAllocation: false }
  function goal() {
    const remaining = Math.max(state.target - state.allocated, 0)
    const balance = state.accountId === 8 ? 100000 : state.accountBalance
    const unallocated = balance - state.allocated
    return { id: 1, name: state.name, status: state.status, target_centavos: state.target, allocated_centavos: state.allocated, remaining_centavos: remaining, excess_centavos: Math.max(state.allocated - state.target, 0), progress_percentage: state.allocated / state.target * 100, currency_code: 'BRL', target_date: state.targetDate, target_date_state: state.dateState, remaining_calendar_days: state.targetDate ? 100 : null, contribution_periods_remaining: state.periods, suggested_monthly_centavos: state.suggested, financial_account: state.accountId ? { id: state.accountId, name: state.accountId === 8 ? 'Reserve' : 'Savings', status: 'active', current_balance_centavos: balance, designated_centavos: state.allocated, unallocated_centavos: unallocated, shortfall_centavos: Math.max(-unallocated, 0) } : null, account_backing: !state.accountId ? 'unverified' : unallocated < 0 ? 'shortfall' : 'available', description: state.description, completed_at: null, archived_at: null, created_at: '2026-09-25T12:00:00Z', updated_at: '2026-09-25T12:00:00Z' }
  }
  function summary() { return { active_count: state.name && state.status === 'active' ? 1 : 0, completed_count: state.status === 'completed' ? 1 : 0, archived_count: state.status === 'archived' ? 1 : 0, active_target_centavos: state.status === 'active' ? state.target : 0, active_allocated_centavos: state.status === 'active' ? state.allocated : 0, active_remaining_centavos: state.status === 'active' ? Math.max(state.target - state.allocated, 0) : 0, active_excess_centavos: state.status === 'active' ? Math.max(state.allocated - state.target, 0) : 0, active_unverified_centavos: state.status === 'active' && !state.accountId ? state.allocated : 0, attention_counts: { overdue_underfunded_active_goals: 0, shortfall_linked_goals: state.accountId && state.allocated > state.accountBalance ? 1 : 0, inactive_or_unavailable_linked_goals: 0 }, linked_accounts: goal().financial_account ? [goal().financial_account] : [] } }
  await page.route('**/api/v1/auth/session', (route) => route.fulfill({ json: sessionPayload(), headers: headers() }))
  await page.route('**/sanctum/csrf-cookie', (route) => route.fulfill({ status: 204, headers: { ...headers(), 'Set-Cookie': 'XSRF-TOKEN=mocked-token; Path=/; SameSite=Lax' } }))
  await page.route('**/api/v1/financial-accounts**', (route) => route.fulfill({ json: { data: [{ id: 7, name: 'Savings', status: 'active', current_balance_centavos: state.accountBalance }, { id: 8, name: 'Reserve', status: 'active', current_balance_centavos: 100000 }] }, headers: headers() }))
  await page.route('**/api/v1/financial-goals**', async (route) => {
    const request = route.request()
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: headers() })
    const path = new URL(request.url()).pathname
    const payload = request.postData() ? request.postDataJSON() : {}
    if (path.endsWith('/summary')) return route.fulfill({ json: { data: summary() }, headers: headers() })
    if (path.endsWith('/activities')) return route.fulfill({ json: { data: [...state.events].reverse(), meta: { current_page: 1, last_page: 1 }, links: {} }, headers: headers() })
    if (request.method() === 'GET' && path.endsWith('/financial-goals')) {
      const status = new URL(request.url()).searchParams.get('status') ?? 'active'
      return route.fulfill({ json: { data: state.name && state.status === status ? [goal()] : [], meta: { current_page: 1, last_page: 1 }, links: {} }, headers: headers() })
    }
    if (request.method() === 'GET') return route.fulfill({ json: { data: goal() }, headers: headers() })
    const key = request.headers()['idempotency-key']
    if (path.endsWith('/allocations')) {
      state.allocationKeys.push(key)
      if (state.failNextAllocation) {
        state.failNextAllocation = false
        return route.fulfill({ status: 503, json: { message: 'Temporary outage' }, headers: headers() })
      }
    }
    if (state.replay.has(key)) return route.fulfill({ json: { data: state.replay.get(key) }, headers: headers() })
    if (request.method() === 'POST' && path.endsWith('/financial-goals')) { state.name = payload.name; state.target = payload.target_centavos; state.description = payload.description; state.accountId = payload.financial_account_id; state.allocated = payload.initial_allocated_centavos ?? 0; state.events.push(activity('created', null, state.accountId)); if (state.allocated) state.events.push(activity('initial_allocation', state.allocated, state.accountId)) }
    else if (path.endsWith('/allocations')) { state.allocated += payload.amount_centavos; state.events.push(activity('allocated', payload.amount_centavos, state.accountId)) }
    else if (path.endsWith('/withdrawals')) { state.allocated -= payload.amount_centavos; state.events.push(activity('withdrawn', payload.amount_centavos, state.accountId)) }
    else if (path.endsWith('/complete')) { if (state.accountId && state.allocated > (state.accountId === 8 ? 100000 : state.accountBalance)) return route.fulfill({ status: 409, json: { message: 'Resolve the linked account shortfall', code: 'goal_account_shortfall' }, headers: headers() }); state.status = 'completed'; state.events.push(activity('completed', null, state.accountId)) }
    else if (path.endsWith('/reopen')) { state.status = 'active'; state.events.push(activity('reopened', null, state.accountId)) }
    else if (path.endsWith('/archive')) { state.status = 'archived'; state.events.push(activity('archived', null, state.accountId)) }
    else if (path.endsWith('/restore')) { state.status = 'active'; state.events.push(activity('restored', null, state.accountId)) }
    else if (request.method() === 'PATCH') { state.name = payload.name; state.target = payload.target_centavos; state.accountId = payload.financial_account_id; state.description = payload.description; state.events.push(activity('account_changed', null, state.accountId)) }
    const result = goal()
    state.replay.set(key, result)
    return route.fulfill({ status: path.endsWith('/financial-goals') ? 201 : 200, json: { data: result }, headers: headers() })
  })
  return state
}
