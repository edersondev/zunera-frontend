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

async function openTransactionFilters(page) {
  const dialog = page.getByRole('dialog', { name: 'Filtrar transações' })

  if (!(await dialog.isVisible().catch(() => false))) {
    await page.getByRole('button', { name: 'Filtros', exact: true }).click()
  }

  await expect(dialog).toBeVisible()

  return dialog
}

function transaction({
  id,
  description,
  type = 'expense',
  status = 'effective',
  amount = 100,
  date = '2026-09-11',
  notes = null,
  account,
  category,
  removedAt = null,
}) {
  return {
    id,
    type,
    status,
    description,
    notes,
    amount_centavos: amount,
    currency_code: 'BRL',
    transaction_date: date,
    removed_at: removedAt,
    financial_account: {
      id: account.id,
      name: account.name,
      status: account.status,
      color: 'teal',
      icon: 'circle',
    },
    category: {
      id: category.id,
      name: category.name,
      status: category.status,
      classification: category.classification,
      origin: 'personal',
      color: 'teal',
      icon: 'circle',
    },
    created_at: '2026-09-11T12:00:00Z',
    updated_at: '2026-09-11T12:00:00Z',
  }
}

function effect(item) {
  if (item.removed_at !== null || item.status !== 'effective') return 0

  return item.type === 'income' ? item.amount_centavos : -item.amount_centavos
}

async function mockApi(page, { accounts, categories, transactions, foreign = [] }) {
  const state = { accounts, categories, transactions, foreign, nextId: 900 }

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
          active_account_count: state.accounts.filter((account) => account.status === 'active')
            .length,
          active_combined_balance_centavos: state.accounts.reduce(
            (total, account) => total + account.current_balance_centavos,
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

  await page.route(/\/api\/v1\/transactions(?:\?[^/]*)?$/, (route) => {
    if (route.request().method() === 'POST') return createTransaction(route, state)

    return fulfillList(route, state)
  })
  await page.route(/\/api\/v1\/transactions\/\d+$/, (route) => {
    const id = Number(
      route
        .request()
        .url()
        .match(/transactions\/(\d+)/)[1],
    )
    const item = state.transactions.find((entry) => entry.id === id)
    if (!item) return route.fulfill({ status: 404, json: { message: 'Not found.' }, headers })
    if (route.request().method() === 'PATCH') return updateTransaction(route, state, item)

    return route.fulfill({ json: { data: item }, headers })
  })
  await page.route(/\/api\/v1\/transactions\/\d+\/(remove|restore)$/, (route) => {
    const [, id, action] = route
      .request()
      .url()
      .match(/transactions\/(\d+)\/(remove|restore)/)
    const item = state.transactions.find((entry) => entry.id === Number(id))
    if (!item) return route.fulfill({ status: 404, json: { message: 'Not found.' }, headers })

    const account = state.accounts.find((entry) => entry.id === item.financial_account.id)
    account.current_balance_centavos -= effect(item)
    item.removed_at = action === 'remove' ? '2026-09-11T15:00:00Z' : null
    item.status = action === 'restore' ? 'effective' : item.status
    account.current_balance_centavos += effect(item)

    return route.fulfill({ json: { data: item, meta: {} }, headers })
  })
  await page.route(/\/api\/v1\/financial-history(?:\?[^/]*)?$/, (route) =>
    fulfillHistory(route, state),
  )
}

function createTransaction(route, state) {
  const body = route.request().postDataJSON()
  const account = state.accounts.find((entry) => entry.id === body.financial_account_id)
  const category = state.categories.find((entry) => entry.id === body.category_id)
  const item = transaction({
    id: state.nextId++,
    description: body.description,
    type: body.type,
    status: body.status ?? 'effective',
    amount: body.amount_centavos,
    date: body.transaction_date,
    notes: body.notes ?? null,
    account,
    category,
  })
  state.transactions.push(item)
  account.current_balance_centavos += effect(item)

  return route.fulfill({ status: 201, json: { data: item, meta: {} }, headers })
}

function updateTransaction(route, state, item) {
  const body = route.request().postDataJSON()
  const account = state.accounts.find((entry) => entry.id === item.financial_account.id)
  account.current_balance_centavos -= effect(item)
  Object.assign(item, {
    description: body.description ?? item.description,
    notes: body.notes === undefined ? item.notes : body.notes,
    type: body.type ?? item.type,
    status: body.status ?? item.status,
    amount_centavos: body.amount_centavos ?? item.amount_centavos,
    transaction_date: body.transaction_date ?? item.transaction_date,
  })
  const meta =
    item.status === 'effective' && item.transaction_date > new Date().toISOString().slice(0, 10)
      ? {
          notice: {
            code: 'effective_future_date',
            message: 'Esta transação futura permanece efetiva.',
          },
        }
      : {}
  account.current_balance_centavos += effect(item)

  return route.fulfill({ json: { data: item, meta }, headers })
}

function fulfillList(route, state) {
  const query = new URL(route.request().url()).searchParams
  const view = query.get('view') ?? 'active'
  const term = (query.get('q') ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
  const matches = state.transactions
    .filter((item) => (view === 'removed' ? item.removed_at !== null : item.removed_at === null))
    .filter((item) => !query.get('type') || item.type === query.get('type'))
    .filter((item) => !query.get('status') || item.status === query.get('status'))
    .filter(
      (item) =>
        !query.get('financial_account_id') ||
        String(item.financial_account.id) === query.get('financial_account_id'),
    )
    .filter(
      (item) => !query.get('category_id') || String(item.category.id) === query.get('category_id'),
    )
    .filter((item) => !query.get('from') || item.transaction_date >= query.get('from'))
    .filter((item) => !query.get('to') || item.transaction_date <= query.get('to'))
    .filter(
      (item) =>
        !term ||
        `${item.description} ${item.notes ?? ''}`
          .normalize('NFD')
          .replace(/\p{Diacritic}/gu, '')
          .toLowerCase()
          .includes(term),
    )
    .sort((first, second) =>
      first.transaction_date === second.transaction_date
        ? second.id - first.id
        : second.transaction_date.localeCompare(first.transaction_date),
    )
  const pageNumber = Number(query.get('page') ?? 1)
  const perPage = Number(query.get('per_page') ?? 50)
  const items = matches.slice((pageNumber - 1) * perPage, pageNumber * perPage)

  return route.fulfill({
    json: {
      data: items,
      meta: {
        total: matches.length,
        current_page: pageNumber,
        last_page: Math.max(1, Math.ceil(matches.length / perPage)),
        per_page: perPage,
      },
      links: {},
    },
    headers,
  })
}

/**
 * The history screen now reads the canonical mixed projection. These journeys
 * have no transfers, so every entry is its income/expense movement, and totals
 * come straight from effective transactions.
 */
function fulfillHistory(route, state) {
  const query = new URL(route.request().url()).searchParams
  const term = (query.get('q') ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
  const view = query.get('view') ?? 'active'
  const kind = query.get('movement_kind') ?? query.get('type') ?? 'all'
  const matches = state.transactions
    .filter((item) => (view === 'removed' ? item.removed_at !== null : item.removed_at === null))
    .filter((item) => kind === 'all' || kind === item.type)
    .filter((item) => !query.get('status') || item.status === query.get('status'))
    .filter(
      (item) =>
        !query.get('financial_account_id') ||
        String(item.financial_account.id) === query.get('financial_account_id'),
    )
    .filter(
      (item) => !query.get('category_id') || String(item.category.id) === query.get('category_id'),
    )
    .filter((item) => !query.get('from') || item.transaction_date >= query.get('from'))
    .filter((item) => !query.get('to') || item.transaction_date <= query.get('to'))
    .filter(
      (item) =>
        !term ||
        `${item.description} ${item.notes ?? ''}`
          .normalize('NFD')
          .replace(/\p{Diacritic}/gu, '')
          .toLowerCase()
          .includes(term),
    )
    .sort((first, second) =>
      first.transaction_date === second.transaction_date
        ? second.id - first.id
        : second.transaction_date.localeCompare(first.transaction_date),
    )
  const pageNumber = Number(query.get('page') ?? 1)
  const perPage = Number(query.get('per_page') ?? 50)
  const items = matches.slice((pageNumber - 1) * perPage, pageNumber * perPage).map((item) => ({
    movement_kind: item.type,
    id: item.id,
    amount_centavos: item.amount_centavos,
    currency_code: item.currency_code,
    movement_date: item.transaction_date,
    status: item.status,
    description: item.description,
    notes: item.notes,
    financial_account: item.financial_account,
    category: item.category,
  }))
  const effective = state.transactions.filter(
    (item) => item.removed_at === null && item.status === 'effective',
  )
  const income = effective
    .filter((item) => item.type === 'income')
    .reduce((total, item) => total + item.amount_centavos, 0)
  const expense = effective
    .filter((item) => item.type === 'expense')
    .reduce((total, item) => total + item.amount_centavos, 0)

  return route.fulfill({
    json: {
      data: items,
      meta: {
        total: matches.length,
        current_page: pageNumber,
        last_page: Math.max(1, Math.ceil(matches.length / perPage)),
        per_page: perPage,
        totals: {
          income_centavos: income,
          expense_centavos: expense,
          financial_result_centavos: income - expense,
          currency_code: 'BRL',
        },
      },
      links: {},
    },
    headers,
  })
}

async function fillTransactionForm(
  dialog,
  page,
  { type, description, amount, account, category, notes },
) {
  if (type) {
    await dialog.getByText(type, { exact: true }).click()
  }
  if (description) await dialog.getByLabel('Descrição').fill(description)
  if (amount) await dialog.getByLabel('Valor (centavos)').fill(String(amount))
  if (account) {
    await dialog.locator('[data-test="transaction-account"]').click()
    await page.getByRole('option', { name: account, exact: true }).click()
  }
  if (category) {
    await dialog.locator('[data-test="transaction-category"]').click()
    await page.getByRole('option', { name: category, exact: true }).click()
  }
  if (notes) await dialog.getByLabel('Observação').fill(notes)
}

async function chooseTransactionHeaderAction(page, name) {
  await page.locator('[data-test="transactions-header-menu"]').click()
  await page
    .locator('.el-dropdown-menu:visible')
    .getByRole('menuitem', { name, exact: true })
    .click()
}

test('signed-in user records income and expense and sees the balance impact', async ({ page }) => {
  const account = {
    id: 1,
    name: 'Conta principal',
    status: 'active',
    current_balance_centavos: 10_000,
  }
  const income = { id: 2, name: 'Salário', status: 'active', classification: 'income' }
  const expense = { id: 3, name: 'Alimentação', status: 'active', classification: 'expense' }
  await mockApi(page, { accounts: [account], categories: [income, expense], transactions: [] })

  await page.goto('/app/transactions')
  await expect(page.getByRole('heading', { name: '0 transações' })).toBeVisible()
  await expect(page.getByText('Nenhuma transação cadastrada ainda.')).toBeVisible()

  await chooseTransactionHeaderAction(page, 'Nova transação')
  const dialog = page.getByRole('dialog', { name: 'Nova transação' })
  await fillTransactionForm(dialog, page, {
    type: 'Receita',
    description: 'Salário setembro',
    amount: 25_000,
    account: 'Conta principal',
    category: 'Salário',
  })
  await dialog.getByRole('button', { name: 'Salvar' }).click()

  const table = page.locator('[data-test="transaction-table"]')
  await expect(table.getByText('Salário setembro')).toBeVisible()
  await expect(table.locator('.income-amount')).toHaveText('+ R$ 250,00')
  await expect(page.locator('[data-test="balance-impact"]')).toContainText('R$ 350,00')

  await chooseTransactionHeaderAction(page, 'Nova transação')
  await fillTransactionForm(dialog, page, {
    description: 'Almoço',
    amount: 3_500,
    account: 'Conta principal',
    category: 'Alimentação',
  })
  await dialog.getByRole('button', { name: 'Salvar' }).click()

  await expect(table.getByText('Almoço')).toBeVisible()
  await expect(table.locator('.expense-amount')).toHaveText('− R$ 35,00')
  await expect(page.locator('[data-test="balance-impact"]')).toContainText('R$ 315,00')
})

test('history is newest first with details, empty state, and no foreign transactions', async ({
  page,
}) => {
  const account = {
    id: 1,
    name: 'Conta principal',
    status: 'active',
    current_balance_centavos: 10_000,
  }
  const category = { id: 2, name: 'Alimentação', status: 'active', classification: 'expense' }
  const older = transaction({ id: 11, description: 'Ontem', date: '2026-09-10', account, category })
  const newer = transaction({
    id: 12,
    description: 'Hoje',
    date: '2026-09-11',
    notes: 'Nota do dia',
    status: 'pending',
    account,
    category,
  })
  const foreign = transaction({
    id: 13,
    description: 'Transação de outro usuário',
    account,
    category,
  })
  await mockApi(page, {
    accounts: [account],
    categories: [category],
    transactions: [older, newer],
    foreign: [foreign],
  })

  await page.goto('/app/transactions')
  const rows = page.locator('.el-table__row')
  await expect(rows).toHaveCount(2)
  await expect(rows.nth(0)).toContainText('Hoje')
  await expect(rows.nth(1)).toContainText('Ontem')
  await expect(page.getByText('Transação de outro usuário')).toHaveCount(0)

  await rows.nth(0).click()
  const drawer = page.locator('.el-drawer:visible')
  await expect(drawer).toBeVisible()
  await expect(drawer).toContainText('Nota do dia')
  await expect(drawer).toContainText('Pendente')
  await expect(drawer.getByRole('button', { name: 'Editar' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(drawer).toBeHidden()

  const filterDialog = await openTransactionFilters(page)
  await filterDialog.getByLabel('Buscar').fill('inexistente')
  await filterDialog.locator('[data-test="apply-filters"]').click()
  await expect(page.getByText('Nenhuma transação corresponde aos filtros atuais.')).toBeVisible()
  await expect(page.getByText('0 transações')).toBeVisible()
})

test('owner edits, removes, and restores a transaction with archived associations', async ({
  page,
}) => {
  const account = {
    id: 1,
    name: 'Conta encerrada',
    status: 'archived',
    current_balance_centavos: 800,
  }
  const category = { id: 2, name: 'Contas antigas', status: 'archived', classification: 'expense' }
  const item = transaction({
    id: 21,
    description: 'Conta de luz',
    amount: 200,
    account,
    category,
  })
  await mockApi(page, { accounts: [account], categories: [category], transactions: [item] })

  await page.goto('/app/transactions')
  const table = page.locator('[data-test="transaction-table"]')
  await expect(table.getByText('Conta encerrada (arquivada)')).toBeVisible()
  await expect(table.getByText('Contas antigas (arquivada)')).toBeVisible()

  await page.locator('.el-table__row').first().click()
  await page
    .getByRole('dialog', { name: 'Conta de luz' })
    .getByRole('button', { name: 'Editar' })
    .click()
  const dialog = page.getByRole('dialog', { name: 'Editar transação' })
  await expect(dialog.locator('[data-test="transaction-account"]')).toContainText(
    'Conta encerrada (arquivada)',
  )
  await dialog.getByLabel('Descrição').fill('Conta de luz corrigida')
  await dialog.getByLabel('Valor (centavos)').fill('250')
  await dialog.getByRole('button', { name: 'Salvar' }).click()

  await expect(page.locator('.el-table__row')).toHaveCount(1)
  await expect(page.locator('.el-table__row').first()).toContainText('Conta de luz corrigida')
  await page.locator('.el-table__row').first().click()
  await page.locator('.el-drawer:visible').getByRole('button', { name: 'Remover' }).click()
  await page.locator('[data-test="confirm-remove"]').click()

  await expect(page.locator('.el-table__row')).toHaveCount(0)
  await expect(page.getByText('0 transações')).toBeVisible()

  await chooseTransactionHeaderAction(page, 'Transações removidas')
  await expect(page.getByRole('heading', { name: 'Transações removidas' })).toBeVisible()
  await expect(page.locator('.el-table__row').first()).toContainText('Conta de luz corrigida')
  await page.getByRole('button', { name: 'Restaurar' }).click()
  await expect(page.getByText('Transação restaurada.')).toBeVisible()

  await page.goto('/app/transactions')
  await expect(page.locator('.el-table__row').first()).toContainText('Conta de luz corrigida')
})

test('owner combines filters and search and clears the criteria', async ({ page }) => {
  const account = {
    id: 1,
    name: 'Conta principal',
    status: 'active',
    current_balance_centavos: 10_000,
  }
  const income = { id: 2, name: 'Salário', status: 'active', classification: 'income' }
  const expense = { id: 3, name: 'Alimentação', status: 'active', classification: 'expense' }
  await mockApi(page, {
    accounts: [account],
    categories: [income, expense],
    transactions: [
      transaction({
        id: 31,
        description: 'Salário setembro',
        type: 'income',
        account,
        category: income,
      }),
      transaction({
        id: 32,
        description: 'Salário do sócio',
        type: 'expense',
        account,
        category: expense,
      }),
      transaction({ id: 33, description: 'Almoço', amount: 3_500, account, category: expense }),
      transaction({
        id: 34,
        description: 'Mercado',
        status: 'pending',
        amount: 9_000,
        date: '2026-09-09',
        account,
        category: expense,
      }),
    ],
  })

  await page.goto('/app/transactions')
  await expect(page.locator('.el-table__row')).toHaveCount(4)

  const filterDialog = await openTransactionFilters(page)
  await filterDialog.getByLabel('Buscar').fill('salario')
  await filterDialog.locator('[data-test="filter-type"]').click()
  await page.getByRole('option', { name: 'Receita', exact: true }).click()
  await filterDialog.locator('[data-test="filter-status"]').click()
  await page.getByRole('option', { name: 'Efetiva', exact: true }).click()
  await filterDialog.locator('[data-test="apply-filters"]').click()

  await expect(page.locator('.el-table__row')).toHaveCount(1)
  await expect(page.locator('.el-table__row').first()).toContainText('Salário setembro')
  await expect(page).toHaveURL(/q=salario/)
  await expect(page).toHaveURL(/type=income/)
  await expect(page.locator('[data-test="active-criteria"]')).toContainText('Busca: salario')
  await expect(page.locator('[data-test="active-criteria"]')).toContainText('Tipo: Receita')

  await page.locator('[data-test="clear-active-filters"]').click()
  await expect(page.locator('.el-table__row')).toHaveCount(4)
  await expect(page.locator('[data-test="active-criteria"]')).toHaveCount(0)
})

test('filters activate from the keyboard and the dialog closes with Escape in dark theme', async ({
  page,
}) => {
  const account = {
    id: 1,
    name: 'Conta principal',
    status: 'active',
    current_balance_centavos: 10_000,
  }
  const category = { id: 2, name: 'Alimentação', status: 'active', classification: 'expense' }
  await mockApi(page, {
    accounts: [account],
    categories: [category],
    transactions: [transaction({ id: 41, description: 'Almoço', account, category })],
  })
  await page.emulateMedia({ colorScheme: 'dark' })

  await page.goto('/app/transactions')
  const filterDialog = await openTransactionFilters(page)
  const filterButton = filterDialog.locator('[data-test="apply-filters"]')
  await filterButton.focus()
  await page.keyboard.press('Enter')
  await expect(page.locator('.el-table__row')).toHaveCount(1)

  const trigger = page.locator('[data-test="transactions-header-menu"]')
  await trigger.focus()
  await page.keyboard.press('Enter')
  const newTransaction = page
    .locator('.el-dropdown-menu:visible')
    .getByRole('menuitem', { name: 'Nova transação', exact: true })
  await expect(newTransaction).toBeVisible()
  await newTransaction.focus()
  await page.keyboard.press('Enter')
  const dialog = page.getByRole('dialog', { name: 'Nova transação' })
  await expect(dialog).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
})

test('mobile uses the compact history list without horizontal page overflow', async ({ page }) => {
  const account = {
    id: 1,
    name: 'Conta principal',
    status: 'active',
    current_balance_centavos: 10_000,
  }
  const category = { id: 2, name: 'Alimentação', status: 'active', classification: 'expense' }
  await mockApi(page, {
    accounts: [account],
    categories: [category],
    transactions: [
      transaction({
        id: 51,
        description: 'Compra no mercado',
        amount: 8_950,
        account,
        category,
      }),
    ],
  })
  await page.setViewportSize({ width: 320, height: 900 })

  await page.goto('/app/transactions')

  const mobileList = page.locator('[data-test="transaction-mobile-list"]')
  await expect(mobileList).toBeVisible()
  await expect(page.locator('[data-test="transaction-table"]')).toBeHidden()
  await expect(mobileList.getByText('Compra no mercado')).toBeVisible()
  await expect(mobileList.getByText('− R$ 89,50')).toBeVisible()
  await expect(mobileList.getByText('Efetiva')).toBeVisible()
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      ),
    )
    .toBe(true)

  const filterDialog = await openTransactionFilters(page)
  await expect(filterDialog.getByLabel('Buscar')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(filterDialog).toBeHidden()
})
