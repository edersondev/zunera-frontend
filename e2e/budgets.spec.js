import { expect, test } from '@playwright/test'

import { pinLocale } from './support/locale.js'

function money(amountCentavos) {
  return { amount_centavos: amountCentavos, currency_code: 'BRL' }
}

function plan(overrides = {}) {
  return {
    id: 11,
    category: {
      id: 3,
      name: 'Mercado',
      classification: 'expense',
      origin: 'personal',
      status: 'active',
      color: 'teal',
      icon: 'utensils',
    },
    planned: money(100_000),
    realized: money(72_000),
    available: money(28_000),
    utilization_percent: 72,
    status: 'within',
    excess: money(0),
    expected: null,
    projected_spending: null,
    projected_available: null,
    projected_status: null,
    is_read_only: false,
    ...overrides,
  }
}

function monthPayload(budget) {
  return {
    data: {
      period: { year: 2026, month: 9, from: '2026-09-01', to: '2026-09-30' },
      budget,
    },
  }
}

function budgetFixture(plans, summaryOverrides = {}) {
  return {
    id: 7,
    period: { year: 2026, month: 9, from: '2026-09-01', to: '2026-09-30' },
    summary: {
      total_planned: money(100_000),
      budgeted_realized: money(72_000),
      actual_available: money(28_000),
      overall_utilization_percent: 72,
      overall_status: 'within',
      unbudgeted_expenses: money(12_500),
      total_expenses: money(84_500),
      expected: null,
      projected_spending: null,
      projected_available: null,
      projected_status: null,
      ...summaryOverrides,
    },
    plans,
  }
}

async function mockBudgets(page, { month = monthPayload(budgetFixture([plan()])) } = {}) {
  const requests = { month: [], plans: [], copy: [] }

  await page.route('**/api/v1/auth/session', (route) =>
    route.fulfill({ json: sessionPayload(), headers: apiHeaders() }),
  )
  await page.route('**/sanctum/csrf-cookie', (route) =>
    route.fulfill({ status: 204, headers: apiHeaders() }),
  )

  await page.route('**/api/v1/budgets/**', async (route) => {
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: apiHeaders() })
      return
    }

    const url = new URL(route.request().url())
    requests.month.push(url.pathname)

    if (url.pathname.endsWith('/copy')) {
      requests.copy.push(route.request().postDataJSON())
      await route.fulfill({
        status: 409,
        headers: apiHeaders(),
        json: { message: 'O mês de destino já possui um orçamento.', code: 'budget_copy_destination_occupied' },
      })
      return
    }

    if (url.pathname.endsWith('/plans')) {
      requests.plans.push(route.request().postDataJSON())
      await route.fulfill({ status: 201, headers: apiHeaders(), json: monthPayload(budgetFixture([plan()])) })
      return
    }

    await route.fulfill({ status: 200, headers: apiHeaders(), json: month })
  })

  await page.route('**/api/v1/budgets', async (route) => {
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: apiHeaders() })
      return
    }

    if (route.request().method() === 'post') {
      await route.fulfill({ status: 201, headers: apiHeaders(), json: monthPayload(budgetFixture([])) })
      return
    }

    await route.continue()
  })

  await page.route('**/api/v1/categories?**', async (route) => {
    await route.fulfill({
      status: 200,
      headers: apiHeaders(),
      json: {
        data: [
          { id: 3, name: 'Mercado', classification: 'expense', status: 'active' },
          { id: 4, name: 'Transporte', classification: 'expense', status: 'active' },
        ],
      },
    })
  })

  return requests
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

test.beforeEach(async ({ page }) => {
  await pinLocale(page, 'pt-BR')
})

test('a signed-in owner reviews planned, realized, and unbudgeted values for the month', async ({
  page,
}) => {
  await mockBudgets(page)

  await page.goto('/app/budgets')

  await expect(page.getByRole('heading', { name: 'Orçamentos' })).toBeVisible()
  await expect(page.getByText('R$ 720,00').first()).toBeVisible()
  await expect(page.getByText('R$ 125,00')).toBeVisible()
  await expect(page.getByText('Dentro do orçamento').first()).toBeVisible()
  await expect(page.getByRole('progressbar', { name: 'Progresso do orçamento' })).toBeVisible()
})

test('plan amounts are edited without sending any financial movement request', async ({
  page,
}) => {
  const requests = await mockBudgets(page)
  const financialRequests = []
  page.on('request', (request) => {
    if (/\/api\/v1\/(transactions|transfers)/.test(request.url())) {
      financialRequests.push(request.url())
    }
  })

  await page.goto('/app/budgets')
  await page.getByRole('button', { name: 'Adicionar categoria' }).click()
  await page.getByRole('combobox').first().click()
  // Mercado is already planned, so only an unplanned expense category is offered.
  await page.getByRole('option', { name: 'Transporte' }).click()
  await page.locator('input[name="planned_amount_centavos"]').pressSequentially('100000')
  await page.locator('[data-test="budget-plan-submit"]').click()

  await expect.poll(() => requests.plans.length).toBe(1)
  await expect(page.getByRole('dialog')).toBeHidden()
  expect(financialRequests).toEqual([])
})

test('copy rejects an occupied destination with clear feedback and no partial plan', async ({
  page,
}) => {
  const requests = await mockBudgets(page)

  await page.goto('/app/budgets')
  await page.getByRole('button', { name: 'Copiar para outro mês' }).click()
  await page.locator('[data-test="budget-copy-confirm"]').click()

  await expect(page.getByRole('alert')).toContainText('já possui um orçamento')
  expect(requests.copy).toHaveLength(1)
})

test('an archived plan stays readable and offers no edit or removal controls', async ({
  page,
}) => {
  await mockBudgets(page, {
    month: monthPayload(
      budgetFixture(
        [
          plan({
            is_read_only: true,
            category: {
              id: 3,
              name: 'Mercado',
              classification: 'expense',
              origin: 'personal',
              status: 'archived',
              color: 'teal',
              icon: 'utensils',
            },
          }),
        ],
        { overall_status: 'within' },
      ),
    ),
  })

  await page.goto('/app/budgets')

  await expect(page.getByText('Arquivada', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Editar' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Remover' })).toHaveCount(0)
})

test('a past month omits expected and projected values while keeping realized ones', async ({
  page,
}) => {
  await mockBudgets(page, {
    month: monthPayload(
      budgetFixture([plan()], {
        expected: null,
        projected_spending: null,
        projected_available: null,
        projected_status: null,
      }),
    ),
  })

  await page.goto('/app/budgets')

  await expect(page.getByText('Projetado:')).toHaveCount(0)
  await expect(page.getByText('R$ 720,00').first()).toBeVisible()
})

test('values, status, and month controls stay usable at 320px with keyboard only', async ({
  page,
}) => {
  await mockBudgets(page)
  await page.setViewportSize({ width: 320, height: 720 })

  await page.goto('/app/budgets')

  await expect(page.getByRole('heading', { name: 'Orçamentos' })).toBeVisible()
  // Progress keeps a textual equivalent instead of relying on colour.
  await expect(page.getByRole('progressbar', { name: 'Progresso do orçamento' })).toHaveAttribute(
    'aria-valuenow',
    '72',
  )
  await expect(page.getByText('Dentro do orçamento').first()).toBeVisible()
  await expect(page.getByText('R$ 125,00')).toBeVisible()

  // Month navigation works from the keyboard and announces the new month.
  await page.getByRole('button', { name: 'Próximo mês' }).focus()
  await page.keyboard.press('Enter')
  await expect(page.getByText('outubro de 2026')).toBeVisible()

  // Dialogs open and close from the keyboard and return focus to the trigger.
  const addButton = page.getByRole('button', { name: 'Adicionar categoria' }).first()
  await addButton.focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toBeHidden()
  await expect(addButton).toBeFocused()
})
