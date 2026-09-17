import { expect, test } from '@playwright/test'

import { pinLocale } from './support/locale.js'

test.beforeEach(async ({ page }) => {
  await pinLocale(page, 'pt-BR')
})

const headers = {
  'Access-Control-Allow-Origin': 'http://localhost:4173',
  'Access-Control-Allow-Credentials': 'true',
  'Content-Type': 'application/json',
}

const today = '2026-09-14'

function account({ id, name, status = 'active' }) {
  return {
    id,
    name,
    status,
    account_type: 'checking',
    institution_name: null,
    color: 'teal',
    icon: 'bank',
    initial_balance_centavos: 500_000,
    current_balance_centavos: 500_000,
    currency_code: 'BRL',
    archived_at: status === 'archived' ? '2026-09-01T00:00:00Z' : null,
    has_financial_movements: false,
  }
}

function category({ id, name, classification = 'expense', status = 'active' }) {
  return {
    id,
    name,
    normalized_name: name.toLowerCase(),
    classification,
    origin: 'personal',
    color: 'rose',
    icon: 'receipt',
    status,
    archived_at: status === 'archived' ? '2026-09-01T00:00:00Z' : null,
    has_financial_transactions: false,
  }
}

function rule({
  id,
  account: owner,
  category: subject,
  description,
  amount = 25_000,
  frequency = 'monthly',
  state = 'active',
  pausedReason = null,
  next = '2026-10-05',
  start = '2026-09-05',
  occurrences = 0,
}) {
  return {
    id,
    type: subject.classification,
    amount_centavos: amount,
    currency_code: 'BRL',
    description,
    notes: null,
    frequency,
    start_date: start,
    end_date: null,
    state,
    paused_reason: pausedReason,
    financial_account: { id: owner.id, name: owner.name, status: owner.status },
    category: {
      id: subject.id,
      name: subject.name,
      classification: subject.classification,
      status: subject.status,
    },
    next_expected_occurrence: state === 'active' ? next : null,
    generated_occurrence_count: occurrences,
    created_at: '2026-09-05T12:00:00Z',
    updated_at: '2026-09-05T12:00:00Z',
  }
}

function metaFor(items) {
  return { total: items.length, current_page: 1, last_page: 1, per_page: 50 }
}

function filtered(state, query) {
  return state.rules
    .filter((item) => !query.get('type') || item.type === query.get('type'))
    .filter(
      (item) =>
        !query.get('financial_account_id') ||
        String(item.financial_account.id) === query.get('financial_account_id'),
    )
    .filter(
      (item) => !query.get('category_id') || String(item.category.id) === query.get('category_id'),
    )
    .filter((item) => !query.get('frequency') || item.frequency === query.get('frequency'))
    .filter((item) => !query.get('state') || item.state === query.get('state'))
}

async function mockApi(page, { accounts, categories, rules = [], transactions = [] }) {
  const state = { accounts, categories, rules, transactions, nextId: 900 }

  await page.route('**/api/v1/auth/session', (route) =>
    route.fulfill({
      json: {
        data: {
          user: { id: 1, email: 'person@example.com' },
          session: {
            idle_expires_at: '2030-01-01T00:00:00Z',
            absolute_expires_at: '2030-01-01T00:00:00Z',
          },
        },
      },
      headers,
    }),
  )
  await page.route('**/sanctum/csrf-cookie', (route) => route.fulfill({ status: 204, headers }))
  await page.route('**/api/v1/financial-accounts/summary', (route) =>
    route.fulfill({
      json: {
        data: {
          active_account_count: state.accounts.filter((item) => item.status === 'active').length,
          active_combined_balance_centavos: state.accounts.reduce(
            (total, item) => total + item.current_balance_centavos,
            0,
          ),
          currency_code: 'BRL',
        },
      },
      headers,
    }),
  )
  await page.route(/\/api\/v1\/financial-accounts(?:\?[^/]*)?$/, (route) =>
    route.fulfill({ json: { data: state.accounts }, headers }),
  )
  await page.route(/\/api\/v1\/categories(?:\?[^/]*)?$/, (route) =>
    route.fulfill({ json: { data: state.categories }, headers }),
  )
  await page.route(/\/api\/v1\/transactions(?:\?[^/]*)?$/, (route) =>
    route.fulfill({ json: { data: state.transactions, meta: metaFor(state.transactions) }, headers }),
  )
  await page.route(/\/api\/v1\/financial-history(?:\?[^/]*)?$/, (route) =>
    route.fulfill({ json: { data: state.transactions, meta: metaFor(state.transactions) }, headers }),
  )
  await page.route(/\/api\/v1\/transactions\/(\d+)$/, (route) => {
    const id = Number(route.request().url().match(/transactions\/(\d+)/)[1])
    const item = state.transactions.find((entry) => entry.id === id)
    if (!item) return route.fulfill({ status: 404, json: { message: 'Não encontrada.' }, headers })

    if (route.request().method() === 'PATCH') {
      const body = route.request().postDataJSON()
      Object.assign(item, {
        description: body.description ?? item.description,
        amount_centavos: body.amount_centavos ?? item.amount_centavos,
        notes: body.notes ?? item.notes,
        status: body.status ?? item.status,
      })

      return route.fulfill({ json: { data: item, meta: {} }, headers })
    }

    return route.fulfill({ json: { data: item }, headers })
  })
  await page.route(/\/api\/v1\/recurring-transactions(?:\?[^/]*)?$/, (route) => {
    if (route.request().method() === 'POST') {
      const body = route.request().postDataJSON()
      const owner = state.accounts.find((item) => item.id === body.financial_account_id)
      const subject = state.categories.find((item) => item.id === body.category_id)
      const created = {
        ...rule({
          id: state.nextId++,
          account: owner,
          category: subject,
          description: body.description,
          amount: body.amount_centavos,
          frequency: body.frequency,
          start: body.start_date,
        }),
        end_date: body.end_date ?? null,
        notes: body.notes ?? null,
      }
      state.rules = [created, ...state.rules]

      return route.fulfill({ status: 201, json: { data: created }, headers })
    }

    const url = new URL(route.request().url())
    const items = filtered(state, url.searchParams)

    return route.fulfill({
      json: { data: items, meta: metaFor(items), links: { next: null } },
      headers,
    })
  })
  await page.route(/\/api\/v1\/recurring-transactions\/(\d+)$/, (route) => {
    const id = Number(route.request().url().match(/recurring-transactions\/(\d+)/)[1])
    const item = state.rules.find((entry) => entry.id === id)
    if (!item) return route.fulfill({ status: 404, json: { message: 'Não encontrada.' }, headers })
    if (route.request().method() === 'PATCH') {
      Object.assign(item, route.request().postDataJSON())
      item.next_expected_occurrence = item.state === 'active' ? item.next_expected_occurrence : null

      return route.fulfill({ json: { data: item }, headers })
    }

    return route.fulfill({ json: { data: item }, headers })
  })
  await page.route(/\/api\/v1\/recurring-transactions\/(\d+)\/occurrences(?:\?[^/]*)?$/, (route) => {
    const id = Number(route.request().url().match(/recurring-transactions\/(\d+)/)[1])
    const items = state.rules.find((entry) => entry.id === id)?.occurrenceItems ?? []

    return route.fulfill({ json: { data: items, meta: metaFor(items), links: { next: null } }, headers })
  })
  await page.route(/\/api\/v1\/recurring-transactions\/(\d+)\/(pause|resume|end)$/, (route) => {
    const [, id, action] = route.request().url().match(/recurring-transactions\/(\d+)\/(pause|resume|end)/)
    const item = state.rules.find((entry) => entry.id === Number(id))
    if (!item) return route.fulfill({ status: 404, json: { message: 'Não encontrada.' }, headers })

    if (action === 'pause') {
      item.state = 'paused'
      item.paused_reason = 'user'
      item.next_expected_occurrence = null
    }
    if (action === 'resume') {
      item.state = 'active'
      item.paused_reason = null
      item.next_expected_occurrence = '2026-10-05'
    }
    if (action === 'end') {
      item.state = 'ended'
      item.paused_reason = null
      item.next_expected_occurrence = null
    }

    return route.fulfill({ json: { data: item }, headers })
  })

  return state
}

async function signIn(page) {
  await page.goto('/app/recurring-transactions')
  await expect(page.locator('[data-test="recurring-transactions-view"]')).toBeVisible()
}

/** Row actions live behind the row-actions dropdown, so open it before choosing. */
async function chooseRecurrenceAction(page, action) {
  await page.locator('[data-test="recurrence-row-actions"]').first().click()
  await page.locator(`.el-dropdown-menu:visible [data-test="${action}"]`).click()
}

/** Element Plus keeps every previously opened dropdown mounted, so scope to the open listbox. */
async function chooseOption(page, select, name) {
  await select.click()
  const controls = await select.locator('[aria-controls]').first().getAttribute('aria-controls')
  const listbox = page.locator(`#${controls}`)
  await expect(listbox).toBeVisible()
  await listbox.getByRole('option', { name, exact: true }).click()
}

const accounts = [account({ id: 1, name: 'Conta corrente' }), account({ id: 2, name: 'Poupança' })]
const categories = [
  category({ id: 10, name: 'Assinaturas' }),
  category({ id: 11, name: 'Salário', classification: 'income' }),
]

test('owner creates a monthly recurrence and sees its next expected date', async ({ page }) => {
  await mockApi(page, { accounts, categories, rules: [] })
  await signIn(page)

  await expect(page.getByText('Nenhuma recorrência encontrada.')).toBeVisible()
  await page.locator('[data-test="recurrence-new"]').click()
  await expect(page.locator('[data-test="recurrence-form"]')).toBeVisible()

  await chooseOption(page, page.locator('[data-test="recurrence-account"]'), 'Conta corrente')
  await chooseOption(page, page.locator('[data-test="recurrence-category"]'), 'Assinaturas')
  await page.locator('[data-test="recurrence-amount"]').fill('250,00')
  await page.locator('[data-test="recurrence-description"]').fill('Assinatura de música')
  await page.locator('[data-test="recurrence-save"]').click()

  await expect(page.getByText('Recorrência criada.')).toBeVisible()
  const row = page.locator('.el-table__row').first()
  await expect(row).toContainText('Assinatura de música')
  await expect(row).toContainText('Mensal')
  await expect(row).toContainText('Ativa')
  await expect(row).toContainText('05/10/2026')
  await expect(row).toContainText('250,00')
})

test('create form keeps invalid recurrence local and explains required active associations', async ({ page }) => {
  await mockApi(page, { accounts, categories, rules: [] })
  await signIn(page)

  await page.locator('[data-test="recurrence-new"]').click()
  await page.locator('[data-test="recurrence-save"]').click()

  await expect(page.locator('[data-test="recurrence-form"]')).toBeVisible()
  await expect(page.getByText('Selecione uma conta ativa.')).toBeVisible()
  await expect(page.getByText('Selecione uma categoria compatível.')).toBeVisible()
  await expect(page.locator('.el-table__row')).toHaveCount(0)
})

test('owner filters recurrences and clears the criteria back to the full list', async ({ page }) => {
  await mockApi(page, {
    accounts,
    categories,
    rules: [
      rule({ id: 31, account: accounts[0], category: categories[0], description: 'Assinatura' }),
      rule({
        id: 32,
        account: accounts[1],
        category: categories[1],
        description: 'Salário',
        frequency: 'yearly',
      }),
    ],
  })
  await signIn(page)

  await expect(page.locator('.el-table__row')).toHaveCount(2)

  await page.locator('[data-test="recurrence-filter-collapse"] .el-collapse-item__header').click()
  await chooseOption(page, page.locator('[data-test="recurrence-filter-frequency"]'), 'Anual')
  await page.locator('[data-test="recurrence-filter-apply"]').click()

  await expect(page.locator('.el-table__row')).toHaveCount(1)
  await expect(page.locator('.el-table__row').first()).toContainText('Salário')
  await expect(page.locator('[data-test="recurrence-active-criteria"]')).toContainText('Frequência: yearly')

  await page.locator('[data-test="recurrence-filter-clear"]').click()
  await expect(page.locator('.el-table__row')).toHaveCount(2)
})

test('combined filters expose criteria, no-match feedback, and next-date discovery', async ({ page }) => {
  await mockApi(page, {
    accounts,
    categories,
    rules: [
      rule({ id: 33, account: accounts[0], category: categories[0], description: 'Streaming', next: '2026-09-30' }),
      rule({ id: 34, account: accounts[1], category: categories[1], description: 'Bônus', frequency: 'yearly' }),
    ],
  })
  await signIn(page)

  await page.locator('[data-test="recurrence-filter-collapse"] .el-collapse-item__header').click()
  await chooseOption(page, page.locator('[data-test="recurrence-filter-account"]'), 'Conta corrente')
  await chooseOption(page, page.locator('[data-test="recurrence-filter-category"]'), 'Assinaturas')
  await page.locator('[data-test="recurrence-filter-apply"]').click()
  await expect(page.locator('.el-table__row')).toHaveCount(1)
  await expect(page.locator('[data-test="recurrence-next"]')).toContainText('30/09/2026')
  await expect(page.locator('[data-test="recurrence-active-criteria"]')).toContainText('Conta: 1')
  await expect(page.locator('[data-test="recurrence-active-criteria"]')).toContainText('Categoria: 10')

  await chooseOption(page, page.locator('[data-test="recurrence-filter-state"]'), 'Encerrada')
  await page.locator('[data-test="recurrence-filter-apply"]').click()
  await expect(page.getByText('Nenhuma recorrência encontrada.')).toBeVisible()
})

test('owner pauses, resumes, and ends a recurrence from the list', async ({ page }) => {
  await mockApi(page, {
    accounts,
    categories,
    rules: [rule({ id: 41, account: accounts[0], category: categories[0], description: 'Academia' })],
  })
  await signIn(page)

  await chooseRecurrenceAction(page, 'recurrence-action-pause')
  await expect(page.locator('[data-test="recurrence-lifecycle-description"]')).toContainText(
    'Datas futuras deixam de gerar ocorrências',
  )
  await page.locator('[data-test="recurrence-lifecycle-confirm"]').click()
  await expect(page.getByText('Recorrência pausada.')).toBeVisible()
  await expect(page.locator('[data-test="recurrence-state"]')).toContainText('Pausada por você')
  await expect(page.locator('[data-test="recurrence-next"]')).toContainText('Sem próxima ocorrência')

  await chooseRecurrenceAction(page, 'recurrence-action-resume')
  await expect(page.locator('[data-test="recurrence-lifecycle-description"]')).toContainText(
    'continuam ignoradas',
  )
  await page.locator('[data-test="recurrence-lifecycle-confirm"]').click()
  await expect(page.getByText('Recorrência retomada.')).toBeVisible()
  await expect(page.locator('[data-test="recurrence-state"]')).toContainText('Ativa')

  await chooseRecurrenceAction(page, 'recurrence-action-end')
  await page.locator('[data-test="recurrence-lifecycle-confirm"]').click()
  await expect(page.getByText('Recorrência encerrada.')).toBeVisible()
  await expect(page.locator('[data-test="recurrence-state"]')).toContainText('Encerrada')
  await expect(page.locator('[data-test="recurrence-action-end"]')).toHaveCount(0)
})

test('owner edits future rule details without changing generated occurrence snapshots', async ({ page }) => {
  await mockApi(page, {
    accounts,
    categories,
    rules: [
      rule({
        id: 45,
        account: accounts[0],
        category: categories[0],
        description: 'Academia',
        occurrences: 1,
      }),
    ],
  })
  await signIn(page)

  await chooseRecurrenceAction(page, 'recurrence-action-edit')
  await page.locator('[data-test="recurrence-description"]').fill('Academia renovada')
  await page.locator('[data-test="recurrence-save"]').click()

  await expect(page.getByText('Recorrência atualizada.')).toBeVisible()
  await expect(page.locator('.el-table__row')).toContainText('Academia renovada')
})

test('archived association pauses the rule and explains the repair before resuming', async ({ page }) => {
  await mockApi(page, {
    accounts: [account({ id: 1, name: 'Conta encerrada', status: 'archived' })],
    categories,
    rules: [
      rule({
        id: 51,
        account: account({ id: 1, name: 'Conta encerrada', status: 'archived' }),
        category: categories[0],
        description: 'Streaming',
        state: 'paused',
        pausedReason: 'association_archived',
      }),
    ],
  })
  await signIn(page)

  await expect(page.locator('[data-test="recurrence-state"]')).toContainText(
    'Pausada por conta ou categoria arquivada',
  )
  await expect(page.locator('[data-test="recurrence-repair-hint"]')).toBeVisible()
  await expect(page.locator('[data-test="recurrence-action-pause"]')).toHaveCount(0)

  await chooseRecurrenceAction(page, 'recurrence-action-resume')
  await expect(page.locator('[data-test="recurrence-lifecycle-repair"]')).toBeVisible()
  await page.locator('[data-test="recurrence-lifecycle-cancel"]').click()
  await expect(page.locator('[data-test="recurrence-lifecycle-description"]')).toBeHidden()
})

test('generated occurrence shows its rule in history and links back to it', async ({ page }) => {
  await mockApi(page, {
    accounts,
    categories,
    rules: [rule({ id: 61, account: accounts[0], category: categories[0], description: 'Assinatura' })],
    transactions: [
      {
        movement_kind: 'expense',
        id: 71,
        amount_centavos: 25_000,
        currency_code: 'BRL',
        movement_date: '2026-10-05',
        transaction_date: '2026-10-05',
        status: 'pending',
        description: 'Assinatura',
        notes: null,
        financial_account: { id: 1, name: 'Conta corrente', status: 'active' },
        category: { id: 10, name: 'Assinaturas', classification: 'expense', status: 'active' },
        recurrence_source: { id: 61, scheduled_date: '2026-10-05' },
      },
    ],
  })
  await signIn(page)

  await page.goto('/app/transactions')
  await expect(page.locator('[data-test="transaction-recurrence-label"]').first()).toHaveAttribute(
    'aria-label',
    /#61/,
  )
  await page.locator('.el-table__row').first().click()
  await expect(page.locator('[data-test="transaction-recurrence-source"]')).toContainText('#61')
  await expect(page.locator('[data-test="transaction-recurrence-scope"]')).toContainText(
    'Você está editando apenas esta ocorrência.',
  )
  await page.locator('[data-test="view-recurrence-rule"]').click()
  await expect(page).toHaveURL(/recurring-transactions/)
  await expect(page.locator('[data-test="recurrence-detail-drawer"]')).toBeVisible()
  await expect(page.locator('[data-test="recurrence-detail-state"]')).toContainText('Ativa')
})

test('catch-up occurrences stay pending, identify their source, and open as ordinary transactions', async ({ page }) => {
  const pendingOccurrence = {
    id: 72,
    scheduled_date: '2026-09-05',
    status: 'pending',
    removed_at: null,
  }
  await mockApi(page, {
    accounts,
    categories,
    rules: [
      {
        ...rule({ id: 62, account: accounts[0], category: categories[0], description: 'Assinatura', occurrences: 2 }),
        occurrenceItems: [pendingOccurrence, { ...pendingOccurrence, id: 73, scheduled_date: '2026-10-05' }],
      },
    ],
    transactions: [
      {
        movement_kind: 'expense',
        ...pendingOccurrence,
        amount_centavos: 25_000,
        currency_code: 'BRL',
        transaction_date: '2026-09-05',
        description: 'Assinatura',
        notes: null,
        financial_account: { id: 1, name: 'Conta corrente', status: 'active' },
        category: { id: 10, name: 'Assinaturas', classification: 'expense', status: 'active' },
        recurrence_source: { id: 62, scheduled_date: '2026-09-05' },
      },
    ],
  })
  await signIn(page)

  await page.locator('.el-table__row').first().click()
  await expect(page.locator('[data-test="recurrence-detail-count"]')).toContainText('2')
  await expect(page.locator('[data-test="recurrence-occurrence-status"]')).toHaveCount(2)
  await expect(page.locator('[data-test="recurrence-occurrence-status"]').first()).toContainText('Pendente')
  await page.locator('[data-test="recurrence-occurrence-open"]').first().click()
  await expect(page).toHaveURL(/transactions/)
  await expect(page.locator('[data-test="transaction-recurrence-label"]')).toHaveAttribute(
    'aria-label',
    /#62/,
  )
  await expect(page.locator('[data-test="transaction-recurrence-source"]')).toContainText('#62')
  await expect(page.locator('.el-table__row')).toContainText('Pendente')
})

test('editing one generated occurrence does not rewrite its recurrence rule', async ({ page }) => {
  const source = { id: 63, scheduled_date: '2026-10-05' }
  await mockApi(page, {
    accounts,
    categories,
    rules: [rule({ id: 63, account: accounts[0], category: categories[0], description: 'Internet', amount: 25_000 })],
    transactions: [
      {
        movement_kind: 'expense',
        id: 74,
        amount_centavos: 25_000,
        currency_code: 'BRL',
        transaction_date: '2026-10-05',
        status: 'pending',
        description: 'Internet',
        notes: null,
        financial_account: { id: 1, name: 'Conta corrente', status: 'active' },
        category: { id: 10, name: 'Assinaturas', classification: 'expense', status: 'active' },
        recurrence_source: source,
      },
    ],
  })
  await signIn(page)

  await page.goto('/app/transactions')
  await page.locator('.el-table__row').first().click()
  await page.locator('[data-test="edit-transaction"]').click()
  await page.locator('[data-test="transaction-amount"]').fill('275,00')
  await page.locator('[data-test="save-transaction"]').click()
  await expect(page.locator('.el-table__row')).toContainText('275,00')

  await page.goto('/app/recurring-transactions')
  await expect(page.locator('.el-table__row')).toContainText('250,00')
  await expect(page.locator('[data-test="recurrence-next"]')).toContainText('05/10/2026')
})

test('recurrence workspace stays usable at 320px, 200% zoom, themes, and keyboard-only', async ({
  page,
}) => {
  await mockApi(page, {
    accounts,
    categories,
    rules: [rule({ id: 81, account: accounts[0], category: categories[0], description: 'Academia' })],
  })
  await signIn(page)

  await page.emulateMedia({ colorScheme: 'dark' })
  await page.setViewportSize({ width: 320, height: 640 })
  await expect(page.locator('[data-test="recurrence-list"]')).toBeVisible()
  await expect(page.locator('[data-test="recurrence-state"]').first()).toBeVisible()

  await page.emulateMedia({ colorScheme: 'light' })
  await expect(page.locator('[data-test="recurrence-state"]').first()).toContainText('Ativa')
  await page.emulateMedia({ colorScheme: 'no-preference' })
  await expect(page.locator('[data-test="recurrence-list"]')).toBeVisible()

  await page.setViewportSize({ width: 1280, height: 800 })
  await page.evaluate(() => {
    document.documentElement.style.zoom = '2'
  })
  await expect(page.locator('[data-test="recurrence-new"]')).toBeVisible()
  await page.evaluate(() => {
    document.documentElement.style.zoom = '1'
  })

  await page.locator('[data-test="recurrence-new"]').focus()
  await page.keyboard.press('Enter')
  await expect(page.locator('[data-test="recurrence-form"]')).toBeVisible()
  await page.locator('[data-test="recurrence-description"]').focus()
  await page.keyboard.press('Escape')
  await expect(page.locator('[data-test="recurrence-form"]')).toBeHidden()
  await expect(page.locator('[data-test="recurrence-new"]')).toBeFocused()
})
