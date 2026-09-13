import { expect, test } from '@playwright/test'

const headers = {
  'Access-Control-Allow-Origin': 'http://localhost:4173',
  'Access-Control-Allow-Credentials': 'true',
  'Content-Type': 'application/json',
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
    financial_account: { id: account.id, name: account.name, status: account.status, color: 'teal', icon: 'circle' },
    category: { id: category.id, name: category.name, status: category.status, classification: category.classification, origin: 'personal', color: 'teal', icon: 'circle' },
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
          session: { idle_expires_at: '2030-01-01T00:00:00Z', absolute_expires_at: '2030-01-01T00:00:00Z' },
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
          active_account_count: state.accounts.filter((account) => account.status === 'active').length,
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
    const id = Number(route.request().url().match(/transactions\/(\d+)/)[1])
    const item = state.transactions.find((entry) => entry.id === id)
    if (!item) return route.fulfill({ status: 404, json: { message: 'Not found.' }, headers })
    if (route.request().method() === 'PATCH') return updateTransaction(route, state, item)

    return route.fulfill({ json: { data: item }, headers })
  })
  await page.route(/\/api\/v1\/transactions\/\d+\/(remove|restore)$/, (route) => {
    const [, id, action] = route.request().url().match(/transactions\/(\d+)\/(remove|restore)/)
    const item = state.transactions.find((entry) => entry.id === Number(id))
    if (!item) return route.fulfill({ status: 404, json: { message: 'Not found.' }, headers })

    const account = state.accounts.find((entry) => entry.id === item.financial_account.id)
    account.current_balance_centavos -= effect(item)
    item.removed_at = action === 'remove' ? '2026-09-11T15:00:00Z' : null
    item.status = action === 'restore' ? 'effective' : item.status
    account.current_balance_centavos += effect(item)

    return route.fulfill({ json: { data: item, meta: {} }, headers })
  })
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
      ? { notice: { code: 'effective_future_date', message: 'Esta transação futura permanece efetiva.' } }
      : {}
  account.current_balance_centavos += effect(item)

  return route.fulfill({ json: { data: item, meta }, headers })
}

function fulfillList(route, state) {
  const query = new URL(route.request().url()).searchParams
  const view = query.get('view') ?? 'active'
  const term = (query.get('q') ?? '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
  const matches = state.transactions
    .filter((item) => (view === 'removed' ? item.removed_at !== null : item.removed_at === null))
    .filter((item) => !query.get('type') || item.type === query.get('type'))
    .filter((item) => !query.get('status') || item.status === query.get('status'))
    .filter((item) => !query.get('financial_account_id') || String(item.financial_account.id) === query.get('financial_account_id'))
    .filter((item) => !query.get('category_id') || String(item.category.id) === query.get('category_id'))
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

async function fillTransactionForm(dialog, page, { type, description, amount, account, category, notes }) {
  if (type) {
    await dialog.locator('[data-test="transaction-type"]').click()
    await page.getByRole('option', { name: type, exact: true }).click()
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

test('signed-in user records income and expense and sees the balance impact', async ({ page }) => {
  const account = { id: 1, name: 'Conta principal', status: 'active', current_balance_centavos: 10_000 }
  const income = { id: 2, name: 'Salário', status: 'active', classification: 'income' }
  const expense = { id: 3, name: 'Alimentação', status: 'active', classification: 'expense' }
  await mockApi(page, { accounts: [account], categories: [income, expense], transactions: [] })

  await page.goto('/app/transactions')
  await expect(page.getByRole('heading', { name: '0 transações' })).toBeVisible()
  await expect(page.getByText('Nenhuma transação encontrada.')).toBeVisible()

  await page.getByRole('button', { name: 'Nova transação' }).click()
  const dialog = page.getByRole('dialog', { name: 'Nova transação' })
  await fillTransactionForm(dialog, page, {
    type: 'Receita',
    description: 'Salário setembro',
    amount: 25_000,
    account: 'Conta principal',
    category: 'Salário',
  })
  await dialog.getByRole('button', { name: 'Salvar' }).click()

  await expect(page.getByText('Salário setembro')).toBeVisible()
  await expect(page.locator('.income')).toContainText('Receita')
  await expect(page.locator('[data-test="balance-impact"]')).toContainText('R$ 350,00')

  await page.getByRole('button', { name: 'Nova transação' }).click()
  await fillTransactionForm(dialog, page, {
    description: 'Almoço',
    amount: 3_500,
    account: 'Conta principal',
    category: 'Alimentação',
  })
  await dialog.getByRole('button', { name: 'Salvar' }).click()

  await expect(page.getByText('Almoço')).toBeVisible()
  await expect(page.locator('.expense')).toContainText('Despesa')
  await expect(page.locator('[data-test="balance-impact"]')).toContainText('R$ 315,00')
})

test('history is newest first with details, empty state, and no foreign transactions', async ({ page }) => {
  const account = { id: 1, name: 'Conta principal', status: 'active', current_balance_centavos: 10_000 }
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
  const foreign = transaction({ id: 13, description: 'Transação de outro usuário', account, category })
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
  await expect(drawer).toContainText('pending')
  await expect(drawer.getByRole('button', { name: 'Editar' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(drawer).toBeHidden()

  await page.getByLabel('Buscar').fill('inexistente')
  await page.getByRole('button', { name: 'Filtrar' }).click()
  await expect(page.getByText('Nenhuma transação encontrada.')).toBeVisible()
  await expect(page.getByText('0 transações')).toBeVisible()
})

test('owner edits, removes, and restores a transaction with archived associations', async ({ page }) => {
  const account = { id: 1, name: 'Conta encerrada', status: 'archived', current_balance_centavos: 800 }
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
  await expect(page.getByText('Conta encerrada (arquivada)')).toBeVisible()
  await expect(page.getByText('Contas antigas (arquivada)')).toBeVisible()

  await page.locator('.el-table__row').first().click()
  await page.getByRole('dialog', { name: 'Conta de luz' }).getByRole('button', { name: 'Editar' }).click()
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
  await page.getByRole('button', { name: 'OK' }).click()

  await expect(page.locator('.el-table__row')).toHaveCount(0)
  await expect(page.getByText('0 transações')).toBeVisible()

  await page.getByRole('button', { name: 'Transações removidas' }).click()
  await expect(page.getByRole('heading', { name: 'Transações removidas' })).toBeVisible()
  await expect(page.locator('.el-table__row').first()).toContainText('Conta de luz corrigida')
  await page.getByRole('button', { name: 'Restaurar' }).click()
  await expect(page.getByText('Transação restaurada.')).toBeVisible()

  await page.goto('/app/transactions')
  await expect(page.locator('.el-table__row').first()).toContainText('Conta de luz corrigida')
})

test('owner combines filters and search and clears the criteria', async ({ page }) => {
  const account = { id: 1, name: 'Conta principal', status: 'active', current_balance_centavos: 10_000 }
  const income = { id: 2, name: 'Salário', status: 'active', classification: 'income' }
  const expense = { id: 3, name: 'Alimentação', status: 'active', classification: 'expense' }
  await mockApi(page, {
    accounts: [account],
    categories: [income, expense],
    transactions: [
      transaction({ id: 31, description: 'Salário setembro', type: 'income', account, category: income }),
      transaction({ id: 32, description: 'Salário do sócio', type: 'expense', account, category: expense }),
      transaction({ id: 33, description: 'Almoço', amount: 3_500, account, category: expense }),
      transaction({ id: 34, description: 'Mercado', status: 'pending', amount: 9_000, date: '2026-09-09', account, category: expense }),
    ],
  })

  await page.goto('/app/transactions')
  await expect(page.locator('.el-table__row')).toHaveCount(4)

  await page.getByLabel('Buscar').fill('salario')
  await page.locator('[data-test="filter-type"]').click()
  await page.getByRole('option', { name: 'Receita', exact: true }).click()
  await page.locator('[data-test="filter-status"]').click()
  await page.getByRole('option', { name: 'Efetiva', exact: true }).click()
  await page.getByRole('button', { name: 'Filtrar' }).click()

  await expect(page.locator('.el-table__row')).toHaveCount(1)
  await expect(page.locator('.el-table__row').first()).toContainText('Salário setembro')
  await expect(page).toHaveURL(/q=salario/)
  await expect(page).toHaveURL(/type=income/)
  await expect(page.locator('[data-test="active-criteria"]')).toContainText('Busca: salario')
  await expect(page.locator('[data-test="active-criteria"]')).toContainText('Tipo: income')

  await page.getByRole('button', { name: 'Limpar' }).click()
  await expect(page.locator('.el-table__row')).toHaveCount(4)
  await expect(page.locator('[data-test="active-criteria"]')).toHaveCount(0)
})

test('filters activate from the keyboard and the dialog closes with Escape in dark theme', async ({ page }) => {
  const account = { id: 1, name: 'Conta principal', status: 'active', current_balance_centavos: 10_000 }
  const category = { id: 2, name: 'Alimentação', status: 'active', classification: 'expense' }
  await mockApi(page, {
    accounts: [account],
    categories: [category],
    transactions: [transaction({ id: 41, description: 'Almoço', account, category })],
  })
  await page.emulateMedia({ colorScheme: 'dark' })

  await page.goto('/app/transactions')
  const filterButton = page.getByRole('button', { name: 'Filtrar' })
  await filterButton.focus()
  await page.keyboard.press('Enter')
  await expect(page.locator('.el-table__row')).toHaveCount(1)

  const trigger = page.getByRole('button', { name: 'Nova transação' })
  await trigger.click()
  const dialog = page.getByRole('dialog', { name: 'Nova transação' })
  await expect(dialog).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
})
