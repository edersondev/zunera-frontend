import { expect, test } from '@playwright/test'

import { pinLocale } from './support/locale.js'

const ACCOUNT = { id: 7, name: 'Conta corrente', type: 'checking', status: 'active' }
const SAVINGS = { id: 8, name: 'Poupança', type: 'savings', status: 'active' }
const EXPENSE_CATEGORY = {
  id: 3,
  name: 'Mercado',
  classification: 'expense',
  status: 'active',
}
const INCOME_CATEGORY = {
  id: 4,
  name: 'Salário',
  classification: 'income',
  status: 'active',
}

function money(amountCentavos) {
  return { amount_centavos: amountCentavos, currency_code: 'BRL' }
}

test.beforeEach(async ({ page }) => {
  await pinLocale(page, 'pt-BR')
})

test('current month opens with the current balance and realized period result', async ({
  page,
}) => {
  const requests = await mockDashboard(page)

  await page.goto('/app')

  await expect(page.getByRole('heading', { name: 'Painel' })).toBeVisible()
  await expect(page.getByText('1 de set. de 2026 - 17 de set. de 2026')).toBeVisible()
  await expect(page.getByText('Saldo atual')).toBeVisible()
  await expect(page.getByText('R$ 5.000,00').first()).toBeVisible()
  await expect(page.getByText('Resultado positivo')).toBeVisible()
  await expect(
    page.getByText('Transferências não entram nas receitas, despesas ou resultado.'),
  ).toBeVisible()

  expect(requests.summary[0]).toMatchObject({ preset: 'current_month' })

  await page.getByText('Mês anterior').click()

  await expect(page.getByText('1 de ago. de 2026 - 31 de ago. de 2026')).toBeVisible()
  await expect(page.getByText('Resultado negativo')).toBeVisible()
  expect(requests.summary.at(-1)).toMatchObject({ preset: 'previous_month' })
  await expect(page.getByText('R$ 5.000,00').first()).toBeVisible()
})

test('custom range applies inclusive boundaries to period sections only', async ({ page }) => {
  const requests = await mockDashboard(page)

  await page.goto('/app')
  await expect(page.getByRole('heading', { name: 'Painel' })).toBeVisible()

  await page.getByText('Personalizado').click()
  const fromInput = page.getByLabel('Data inicial')
  const toInput = page.getByLabel('Data final')
  await fromInput.click()
  await fromInput.fill('2026-09-01')
  await fromInput.press('Enter')
  await toInput.click()
  await toInput.fill('2026-09-03')
  await toInput.press('Enter')

  const applyButton = page.getByRole('button', { name: 'Aplicar período' })
  await expect(applyButton).toBeEnabled()
  await applyButton.click()

  await expect
    .poll(() => requests.summary.at(-1))
    .toMatchObject({ preset: 'custom', from: '2026-09-01', to: '2026-09-03' })
  expect(requests.accounts).toHaveLength(1)
  expect(requests.recent).toHaveLength(1)
})

test('expense distribution ranks categories and evolution marks partial intervals', async ({
  page,
}) => {
  await mockDashboard(page)

  await page.goto('/app')

  await expect(page.getByRole('heading', { name: 'Despesas por categoria' })).toBeVisible()
  const rows = page.locator('[data-test="dashboard-distribution-row"]')
  await expect(rows).toHaveCount(2)
  await expect(rows.nth(0)).toContainText('Mercado')
  await expect(rows.nth(0)).toContainText('75%')
  await expect(rows.nth(1)).toContainText('Arquivada')
  await expect(page.getByText('Total de despesas: R$ 1.200,00')).toBeVisible()

  await expect(page.getByRole('heading', { name: 'Evolução financeira' })).toBeVisible()
  await expect(page.getByText('Intervalo: Diário')).toBeVisible()
  await expect(page.getByText('Período parcial')).toHaveCount(1)
})

test('accounts, recent activity, and expected activity stay clearly labelled', async ({ page }) => {
  await mockDashboard(page)

  await page.goto('/app')

  await expect(page.getByRole('heading', { name: 'Contas ativas' })).toBeVisible()
  await expect(page.getByText('Total ativo: R$ 5.000,00')).toBeVisible()
  await expect(page.locator('[data-test="dashboard-accounts-allocation"]').first()).toContainText(
    '100%',
  )
  await expect(
    page.getByText(
      'A participação considera apenas contas ativas; contas arquivadas não aparecem.',
    ),
  ).toBeVisible()

  const recentRows = page.locator('[data-test="dashboard-recent-row"]')
  await expect(recentRows).toHaveCount(3)
  await expect(recentRows.nth(0)).toContainText('Despesa')
  await expect(recentRows.nth(0)).toContainText('Mercado')
  await expect(recentRows.nth(1)).toContainText('Conta corrente → Poupança')
  await expect(recentRows.nth(1)).toContainText('Pendente')
  await expect(recentRows.nth(2)).toContainText('Recorrência #5')

  const historyLink = page.getByRole('link', { name: 'Ver histórico financeiro' })
  await expect(historyLink).toBeVisible()

  await expect(
    page.getByRole('heading', { name: 'Esperado para os próximos 30 dias' }),
  ).toBeVisible()
  await expect(page.locator('[data-test="dashboard-upcoming-row"]')).toHaveCount(2)
  await expect(page.locator('[data-test="dashboard-upcoming-source"]').first()).toHaveText(
    'Transação pendente',
  )
  await expect(page.locator('[data-test="dashboard-upcoming-source"]').nth(1)).toHaveText(
    'Recorrência',
  )
  await expect(page.getByText('Valores esperados não entram no resultado realizado.')).toBeVisible()
})

test('a failing section keeps the rest usable and recovers on its own retry', async ({ page }) => {
  await mockDashboard(page, { distributionFailures: 1 })

  await page.goto('/app')

  await expect(page.getByText('Não foi possível carregar as despesas por categoria.')).toBeVisible()
  await expect(page.getByText('Saldo atual')).toBeVisible()
  await expect(page.getByText('Resultado positivo')).toBeVisible()
  await expect(page.locator('[data-test="dashboard-recent-row"]')).toHaveCount(3)

  await page.getByRole('button', { name: 'Tentar novamente' }).first().click()

  await expect(page.locator('[data-test="dashboard-distribution-row"]')).toHaveCount(2)
  await expect(page.getByText('Não foi possível carregar as despesas por categoria.')).toHaveCount(
    0,
  )
})

test('the dashboard stays usable at 320px with keyboard reachable controls', async ({ page }) => {
  await mockDashboard(page)
  await page.setViewportSize({ width: 320, height: 900 })

  await page.goto('/app')

  await expect(page.getByRole('heading', { name: 'Painel' })).toBeVisible()
  const previousMonth = page.getByRole('radio', { name: 'Mês anterior' })
  await previousMonth.focus()
  await expect(previousMonth).toBeFocused()
  await page.keyboard.press('Space')

  await expect(page.getByText('1 de ago. de 2026 - 31 de ago. de 2026')).toBeVisible()
  await expect(page.locator('[data-test="dashboard-summary-balance-value"]')).toBeVisible()
  await expect(page.locator('[data-test="dashboard-upcoming-row"]')).toHaveCount(2)
})

async function mockDashboard(page, { distributionFailures = 0 } = {}) {
  const requests = {
    summary: [],
    accounts: [],
    distribution: [],
    evolution: [],
    recent: [],
    upcoming: [],
  }
  let distributionCalls = 0

  await page.route('**/api/v1/auth/session', (route) =>
    route.fulfill({ json: sessionPayload(), headers: apiHeaders() }),
  )
  await page.route('**/sanctum/csrf-cookie', (route) =>
    route.fulfill({ status: 204, headers: apiHeaders() }),
  )

  await page.route('**/api/v1/financial-dashboard/summary**', (route) => {
    const params = queryOf(route.request().url())
    const previousMonth = params.preset === 'previous_month'
    const custom = params.preset === 'custom'
    requests.summary.push(params)

    return route.fulfill({
      json: {
        data: {
          period: {
            preset: params.preset ?? 'current_month',
            from: custom ? params.from : previousMonth ? '2026-08-01' : '2026-09-01',
            to: custom ? params.to : previousMonth ? '2026-08-31' : '2026-09-17',
          },
          current_total_balance: money(500_000),
          realized_income: money(previousMonth ? 40_000 : 320_000),
          realized_expenses: money(previousMonth ? 90_000 : 120_000),
          financial_result: money(previousMonth ? -50_000 : 200_000),
        },
      },
      headers: apiHeaders(),
    })
  })

  await page.route('**/api/v1/financial-dashboard/accounts', (route) => {
    requests.accounts.push(queryOf(route.request().url()))

    return route.fulfill({
      json: {
        data: {
          current_total_balance: money(500_000),
          accounts: [
            { account: ACCOUNT, current_balance: money(500_000), allocation_percent: 100 },
          ],
        },
      },
      headers: apiHeaders(),
    })
  })

  await page.route('**/api/v1/financial-dashboard/expense-distribution**', (route) => {
    distributionCalls += 1
    requests.distribution.push(queryOf(route.request().url()))

    if (distributionCalls <= distributionFailures) {
      return route.fulfill({
        status: 500,
        json: { message: 'Server error' },
        headers: apiHeaders(),
      })
    }

    return route.fulfill({
      json: {
        data: {
          period: { preset: 'current_month', from: '2026-09-01', to: '2026-09-17' },
          total_expenses: money(120_000),
          categories: [
            { category: EXPENSE_CATEGORY, total: money(90_000), share_percent: 75, rank: 1 },
            {
              category: { ...EXPENSE_CATEGORY, id: 9, name: 'Assinaturas', status: 'archived' },
              total: money(30_000),
              share_percent: 25,
              rank: 2,
            },
          ],
        },
      },
      headers: apiHeaders(),
    })
  })

  await page.route('**/api/v1/financial-dashboard/evolution**', (route) => {
    requests.evolution.push(queryOf(route.request().url()))

    return route.fulfill({
      json: {
        data: {
          period: { preset: 'current_month', from: '2026-09-01', to: '2026-09-17' },
          interval: 'daily',
          intervals: [
            {
              from: '2026-09-01',
              to: '2026-09-01',
              label: '01/09',
              is_partial: false,
              income: money(320_000),
              expenses: money(0),
              result: money(320_000),
            },
            {
              from: '2026-09-02',
              to: '2026-09-17',
              label: '02/09',
              is_partial: true,
              income: money(0),
              expenses: money(120_000),
              result: money(-120_000),
            },
          ],
        },
      },
      headers: apiHeaders(),
    })
  })

  await page.route('**/api/v1/financial-dashboard/recent-activity', (route) => {
    requests.recent.push(queryOf(route.request().url()))

    return route.fulfill({
      json: {
        data: [
          {
            movement_kind: 'expense',
            id: 21,
            status: 'effective',
            movement_date: '2026-09-12',
            amount: money(45_000),
            description: 'Mercado',
            account: ACCOUNT,
            category: EXPENSE_CATEGORY,
            recurrence_source: null,
          },
          {
            movement_kind: 'transfer',
            id: 22,
            status: 'pending',
            movement_date: '2026-09-11',
            amount: money(20_000),
            description: 'Reserva',
            source_account: ACCOUNT,
            destination_account: SAVINGS,
            category: null,
            recurrence_source: null,
          },
          {
            movement_kind: 'income',
            id: 23,
            status: 'effective',
            movement_date: '2026-09-10',
            amount: money(320_000),
            description: 'Salário',
            account: ACCOUNT,
            category: INCOME_CATEGORY,
            recurrence_source: { id: 5, scheduled_date: '2026-09-10' },
          },
        ],
      },
      headers: apiHeaders(),
    })
  })

  await page.route('**/api/v1/financial-dashboard/upcoming-activity', (route) => {
    requests.upcoming.push(queryOf(route.request().url()))

    return route.fulfill({
      json: {
        data: [
          {
            source_kind: 'pending_transaction',
            expected_date: '2026-09-25',
            type: 'expense',
            amount: money(21_500),
            account: ACCOUNT,
            category: EXPENSE_CATEGORY,
            description: 'Condomínio',
            state: 'expected',
          },
          {
            source_kind: 'recurring_occurrence',
            expected_date: '2026-10-05',
            type: 'income',
            amount: money(250_000),
            account: ACCOUNT,
            category: INCOME_CATEGORY,
            description: 'Aluguel',
            state: 'expected',
          },
        ],
        meta: { from: '2026-09-17', to: '2026-10-16' },
      },
      headers: apiHeaders(),
    })
  })

  return requests
}

function queryOf(url) {
  const params = {}
  new URL(url).searchParams.forEach((value, key) => {
    params[key] = value
  })

  return params
}

function apiHeaders() {
  return {
    'Access-Control-Allow-Origin': 'http://localhost:4173',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Headers': 'Content-Type, X-XSRF-TOKEN, X-Requested-With, Accept',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    'Content-Type': 'application/json',
  }
}

function sessionPayload() {
  const now = Date.now()

  return {
    data: {
      user: { id: 1, email: 'person@example.com' },
      session: {
        idle_expires_at: new Date(now + 15 * 60 * 1000).toISOString(),
        absolute_expires_at: new Date(now + 8 * 60 * 60 * 1000).toISOString(),
      },
    },
  }
}
