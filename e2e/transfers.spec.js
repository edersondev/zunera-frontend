import { expect, test } from '@playwright/test'

const headers = {
  'Access-Control-Allow-Origin': 'http://localhost:4173',
  'Access-Control-Allow-Credentials': 'true',
  'Content-Type': 'application/json',
}

function account({ id, name, status = 'active', balance = 0 }) {
  return {
    id,
    name,
    status,
    account_type: 'checking',
    institution_name: null,
    color: 'teal',
    icon: 'bank',
    initial_balance_centavos: balance,
    current_balance_centavos: balance,
    currency_code: 'BRL',
    archived_at: null,
    has_financial_movements: true,
  }
}

function accountSummary(value) {
  return { id: value.id, name: value.name, status: value.status, color: value.color, icon: value.icon }
}

function transfer({
  id,
  source,
  destination,
  amount,
  status = 'effective',
  date = '2026-09-13',
  description = null,
  notes = null,
  removedAt = null,
}) {
  return {
    id,
    source_financial_account: accountSummary(source),
    destination_financial_account: accountSummary(destination),
    amount_centavos: amount,
    currency_code: 'BRL',
    transfer_date: date,
    status,
    description,
    notes,
    removed_at: removedAt,
    created_at: '2026-09-13T12:00:00Z',
    updated_at: '2026-09-13T12:00:00Z',
  }
}

function transaction({ id, description, type, amount, date, account: owner, category }) {
  return {
    movement_kind: type,
    id,
    amount_centavos: amount,
    currency_code: 'BRL',
    movement_date: date,
    status: 'effective',
    description,
    notes: null,
    financial_account: accountSummary(owner),
    category: { id: category.id, name: category.name, classification: type },
  }
}

function normalize(value) {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
}

/** Derive every account balance from its opening balance plus counting transfers. */
function recomputeBalances(state) {
  for (const owner of state.accounts) {
    owner.current_balance_centavos = owner.initial_balance_centavos
  }
  for (const item of state.transfers) {
    if (item.removed_at !== null || item.status !== 'effective') continue
    const source = state.accounts.find((entry) => entry.id === item.source_financial_account.id)
    const destination = state.accounts.find(
      (entry) => entry.id === item.destination_financial_account.id,
    )
    if (source) source.current_balance_centavos -= item.amount_centavos
    if (destination) destination.current_balance_centavos += item.amount_centavos
  }
}

function metaFor(items, query) {
  const page = Number(query.get('page') ?? 1)
  const perPage = Number(query.get('per_page') ?? 50)

  return {
    total: items.length,
    current_page: page,
    last_page: Math.max(1, Math.ceil(items.length / perPage)),
    per_page: perPage,
  }
}

function matchingTransfers(state, query) {
  const view = query.get('view') ?? 'active'
  const term = normalize(query.get('q') ?? '')

  return state.transfers
    .filter((item) => (view === 'removed' ? item.removed_at !== null : item.removed_at === null))
    .filter((item) => !query.get('status') || item.status === query.get('status'))
    .filter(
      (item) =>
        !query.get('source_financial_account_id') ||
        String(item.source_financial_account.id) === query.get('source_financial_account_id'),
    )
    .filter(
      (item) =>
        !query.get('destination_financial_account_id') ||
        String(item.destination_financial_account.id) === query.get('destination_financial_account_id'),
    )
    .filter((item) => !query.get('from') || item.transfer_date >= query.get('from'))
    .filter((item) => !query.get('to') || item.transfer_date <= query.get('to'))
    .filter(
      (item) =>
        !term || normalize(`${item.description ?? ''} ${item.notes ?? ''}`).includes(term),
    )
    .sort((first, second) =>
      first.transfer_date === second.transfer_date
        ? second.id - first.id
        : second.transfer_date.localeCompare(first.transfer_date),
    )
}

function pageOf(items, query) {
  const page = Number(query.get('page') ?? 1)
  const perPage = Number(query.get('per_page') ?? 50)

  return items.slice((page - 1) * perPage, page * perPage)
}

async function mockApi(page, { accounts, transfers = [], transactions = [], categories = [] }) {
  const state = { accounts, transfers, transactions, categories, nextId: 900 }
  recomputeBalances(state)

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
  await page.route(/\/api\/v1\/transfers(?:\?[^/]*)?$/, (route) => {
    if (route.request().method() === 'POST') return createTransfer(route, state)

    return listTransfers(route, state)
  })
  await page.route(/\/api\/v1\/transfers\/\d+$/, (route) => {
    const id = Number(route.request().url().match(/transfers\/(\d+)/)[1])
    const item = state.transfers.find((entry) => entry.id === id)
    if (!item) return route.fulfill({ status: 404, json: { message: 'Não encontrada.' }, headers })
    if (route.request().method() === 'PATCH') return updateTransfer(route, state, item)

    return route.fulfill({ json: { data: item }, headers })
  })
  await page.route(/\/api\/v1\/transfers\/\d+\/(remove|restore)$/, (route) => {
    const [, id, action] = route.request().url().match(/transfers\/(\d+)\/(remove|restore)/)
    const item = state.transfers.find((entry) => entry.id === Number(id))
    if (!item) return route.fulfill({ status: 404, json: { message: 'Não encontrada.' }, headers })

    if (action === 'remove') {
      if (item.removed_at !== null) {
        return route.fulfill({
          status: 409,
          json: { message: 'Transfer is already removed.', code: 'transfer_already_removed' },
          headers,
        })
      }
      item.removed_at = '2026-09-13T15:00:00Z'
    } else {
      if (item.removed_at === null) {
        return route.fulfill({
          status: 409,
          json: { message: 'Transfer is already active.', code: 'transfer_already_active' },
          headers,
        })
      }
      const body = route.request().postDataJSON() ?? {}
      item.status = body.status ?? item.status
      item.removed_at = null
    }

    recomputeBalances(state)

    return route.fulfill({ json: { data: item, meta: {} }, headers })
  })
  await page.route(/\/api\/v1\/financial-history(?:\?[^/]*)?$/, (route) =>
    route.fulfill({ json: mixedHistory(route, state), headers }),
  )
}

function listTransfers(route, state) {
  const query = new URL(route.request().url()).searchParams
  const matches = matchingTransfers(state, query)

  return route.fulfill({
    json: { data: pageOf(matches, query), meta: metaFor(matches, query), links: {} },
    headers,
  })
}

function createTransfer(route, state) {
  const body = route.request().postDataJSON()
  const source = state.accounts.find((item) => item.id === body.source_financial_account_id)
  const destination = state.accounts.find(
    (item) => item.id === body.destination_financial_account_id,
  )

  if (!source || !destination) {
    return route.fulfill({ status: 404, json: { message: 'Conta inacessível.' }, headers })
  }
  if (source.status !== 'active' || destination.status !== 'active') {
    return route.fulfill({
      status: 422,
      json: {
        message: 'The given data was invalid.',
        errors: { source_financial_account_id: ['Archived accounts cannot be selected.'] },
      },
      headers,
    })
  }
  if (source.id === destination.id) {
    return route.fulfill({
      status: 422,
      json: {
        message: 'Source and destination accounts must differ.',
        code: 'transfer_sides_must_differ',
        errors: { destination_financial_account_id: ['Source and destination accounts must differ.'] },
      },
      headers,
    })
  }

  const future = body.transfer_date > new Date().toISOString().slice(0, 10)
  const status = body.status ?? (future ? 'pending' : 'effective')
  if (future && status === 'effective') {
    return route.fulfill({
      status: 422,
      json: {
        message: 'Future-dated transfers must remain pending until the transfer date is today or in the past.',
        code: 'effective_future_date',
        errors: { status: ['Future-dated transfers must remain pending.'] },
      },
      headers,
    })
  }

  const item = transfer({
    id: state.nextId++,
    source,
    destination,
    amount: body.amount_centavos,
    status,
    date: body.transfer_date,
    description: body.description ?? null,
    notes: body.notes ?? null,
  })
  if (status === 'effective' && source.current_balance_centavos < item.amount_centavos) {
    return route.fulfill({
      status: 409,
      json: {
        message: 'The source account does not have enough balance for this effective transfer.',
        code: 'insufficient_source_balance',
      },
      headers,
    })
  }
  state.transfers.push(item)
  recomputeBalances(state)

  return route.fulfill({ status: 201, json: { data: item, meta: {} }, headers })
}

function updateTransfer(route, state, item) {
  const body = route.request().postDataJSON()
  const source =
    state.accounts.find((entry) => entry.id === body.source_financial_account_id) ??
    state.accounts.find((entry) => entry.id === item.source_financial_account.id)
  const destination =
    state.accounts.find((entry) => entry.id === body.destination_financial_account_id) ??
    state.accounts.find((entry) => entry.id === item.destination_financial_account.id)
  const date = body.transfer_date ?? item.transfer_date
  const requestedStatus = body.status ?? item.status

  if (
    requestedStatus === 'effective' &&
    item.status === 'pending' &&
    date > new Date().toISOString().slice(0, 10)
  ) {
    return route.fulfill({
      status: 422,
      json: {
        message: 'Future-dated transfers must remain pending until the transfer date is today or in the past.',
        code: 'effective_future_date',
        errors: { status: ['Future-dated transfers must remain pending.'] },
      },
      headers,
    })
  }

  const updated = transfer({
    id: item.id,
    source,
    destination,
    amount: body.amount_centavos ?? item.amount_centavos,
    status: requestedStatus,
    date,
    description: body.description === undefined ? item.description : body.description,
    notes: body.notes === undefined ? item.notes : body.notes,
    removedAt: item.removed_at,
  })
  Object.assign(item, updated)
  recomputeBalances(state)

  const meta =
    item.status === 'effective' && item.transfer_date > new Date().toISOString().slice(0, 10)
      ? {
          notice: {
            code: 'effective_future_date',
            message: 'Esta transferência futura permanece efetiva e movimenta os dois saldos.',
          },
        }
      : {}

  return route.fulfill({ json: { data: item, meta }, headers })
}

function mixedHistory(route, state) {
  const query = new URL(route.request().url()).searchParams
  const kind = query.get('movement_kind') ?? 'all'
  const term = normalize(query.get('q') ?? '')
  const entries = [
    ...state.transactions
      .filter((item) => kind === 'all' || kind === item.movement_kind)
      .map((item) => ({ ...item })),
    ...state.transfers
      .filter((item) => item.removed_at === null)
      .filter((item) => kind === 'all' || kind === 'transfer')
      .map((item) => ({
        movement_kind: 'transfer',
        id: item.id,
        amount_centavos: item.amount_centavos,
        currency_code: item.currency_code,
        movement_date: item.transfer_date,
        status: item.status,
        description: item.description,
        notes: item.notes,
        source_financial_account: item.source_financial_account,
        destination_financial_account: item.destination_financial_account,
        category: null,
      })),
  ]
    .filter((item) => !query.get('status') || item.status === query.get('status'))
    .filter(
      (item) =>
        !query.get('financial_account_id') ||
        String(item.financial_account?.id) === query.get('financial_account_id') ||
        String(item.source_financial_account?.id) === query.get('financial_account_id') ||
        String(item.destination_financial_account?.id) === query.get('financial_account_id'),
    )
    .filter(
      (item) =>
        !term || normalize(`${item.description ?? ''} ${item.notes ?? ''}`).includes(term),
    )
    .sort((first, second) =>
      first.movement_date === second.movement_date
        ? second.id - first.id
        : second.movement_date.localeCompare(first.movement_date),
    )
  const effective = state.transactions.filter((item) => item.status === 'effective')
  const income = effective
    .filter((item) => item.movement_kind === 'income')
    .reduce((total, item) => total + item.amount_centavos, 0)
  const expense = effective
    .filter((item) => item.movement_kind === 'expense')
    .reduce((total, item) => total + item.amount_centavos, 0)

  return {
    data: pageOf(entries, query),
    meta: {
      ...metaFor(entries, query),
      totals: {
        income_centavos: income,
        expense_centavos: expense,
        financial_result_centavos: income - expense,
        currency_code: 'BRL',
      },
    },
    links: {},
  }
}

async function signIn(page) {
  await page.goto('/app/transfers')
  await expect(page.locator('[data-test="transfer-count"]')).toBeVisible()
}

async function openFilters(page, collapseTestId = 'transfer-filter-collapse') {
  const header = page.locator(`[data-test="${collapseTestId}"] .el-collapse-item__header`)
  if (!(await page.getByLabel('Buscar').isVisible().catch(() => false))) {
    await header.click()
  }
}

async function fillTransferForm(dialog, page, { source, destination, amount, date, status }) {
  if (source) {
    await chooseOption(page, dialog.locator('[data-test="transfer-source"]'), source)
  }
  if (destination) {
    await chooseOption(page, dialog.locator('[data-test="transfer-destination"]'), destination)
  }
  if (amount) await dialog.getByLabel('Valor').fill(String(amount))
  if (date) {
    const field = dialog.getByLabel('Data')
    await field.fill(date)
    await field.press('Enter')
  }
  if (status) await dialog.getByRole('radio', { name: status }).click()
}

/** Element Plus keeps every previously opened dropdown mounted, so scope to the open one. */
async function chooseOption(page, select, name) {
  await select.click()
  const controls = await select.locator('[aria-controls]').first().getAttribute('aria-controls')
  const listbox = page.locator(`#${controls}`)
  await expect(listbox).toBeVisible()
  await listbox.getByRole('option', { name, exact: true }).click()
}

async function chooseRowAction(page, name) {
  await page.locator('.el-dropdown-menu:visible').getByRole('menuitem', { name }).click()
}

async function chooseTransactionsHeaderAction(page, trigger, action) {
  await page.getByRole('button', { name: trigger }).click()
  await page.locator('.el-dropdown-menu:visible').getByRole('menuitem', { name: action, exact: true }).click()
}

test('owner records an effective transfer and both balances move once', async ({ page }) => {
  const current = account({ id: 1, name: 'Conta corrente', balance: 500_000 })
  const savings = account({ id: 2, name: 'Poupança', balance: 200_000 })
  await mockApi(page, { accounts: [current, savings] })
  await signIn(page)

  await expect(page.getByText('Nenhuma transferência encontrada.')).toBeVisible()
  await page.getByRole('button', { name: 'Nova transferência' }).click()
  const dialog = page.getByRole('dialog', { name: 'Nova transferência' })
  await fillTransferForm(dialog, page, {
    source: 'Conta corrente',
    destination: 'Poupança',
    amount: 100_000,
  })
  await dialog.getByRole('button', { name: 'Salvar' }).click()

  const row = page.locator('.el-table__row').first()
  await expect(row).toContainText('Transferência')
  await expect(row).toContainText('Conta corrente → Poupança')
  await expect(row).toContainText('R$ 1.000,00')
  await expect(row).toContainText('Efetiva')
  await expect(page.locator('[data-test="balance-impact"]')).toHaveCount(2)
  await expect(page.locator('[data-test="balance-impact"]').first()).toContainText('R$ 4.000,00')

  await row.click()
  const drawer = page.locator('.el-drawer:visible')
  await expect(drawer).toContainText('Conta corrente')
  await expect(drawer).toContainText('Poupança')
  await expect(drawer).toContainText('R$ 1.000,00')
  await page.keyboard.press('Escape')
  await expect(drawer).toBeHidden()
})

test('future transfer stays pending without reserving funds and refuses to become effective early', async ({ page }) => {
  const current = account({ id: 1, name: 'Conta corrente', balance: 500_000 })
  const savings = account({ id: 2, name: 'Poupança', balance: 200_000 })
  await mockApi(page, { accounts: [current, savings] })
  await signIn(page)

  await page.getByRole('button', { name: 'Nova transferência' }).click()
  const dialog = page.getByRole('dialog', { name: 'Nova transferência' })
  const future = new Date(Date.now() + 5 * 86_400_000).toISOString().slice(0, 10)
  await fillTransferForm(dialog, page, {
    source: 'Conta corrente',
    destination: 'Poupança',
    amount: 50_000,
    date: future,
  })
  await expect(dialog.locator('[data-test="transfer-pending-notice"]')).toContainText(
    'não reservam saldo',
  )
  await dialog.getByRole('button', { name: 'Salvar' }).click()

  const row = page.locator('.el-table__row').first()
  await expect(row).toContainText('Pendente')
  await expect(page.locator('[data-test="balance-impact"]')).toHaveCount(0)

  await row.locator('[data-test="transfer-row-actions"]').click()
  await chooseRowAction(page, 'Efetiva')

  await expect(page.locator('[data-test="transfer-error"]')).toContainText(
    'must remain pending',
  )
  await expect(page.locator('.el-table__row').first()).toContainText('Pendente')
})

test('owner filters and searches owned transfers and clears the criteria', async ({ page }) => {
  const current = account({ id: 1, name: 'Conta corrente', balance: 900_000 })
  const savings = account({ id: 2, name: 'Poupança', balance: 100_000 })
  const third = account({ id: 3, name: 'Reserva', balance: 50_000 })
  await mockApi(page, {
    accounts: [current, savings, third],
    transfers: [
      transfer({
        id: 11,
        source: current,
        destination: savings,
        amount: 100_000,
        date: '2026-09-12',
        description: 'Transferência para reserva',
      }),
      transfer({
        id: 12,
        source: current,
        destination: third,
        amount: 20_000,
        status: 'pending',
        date: '2026-09-11',
        description: 'Aporte mensal',
      }),
    ],
  })
  await signIn(page)

  await expect(page.locator('.el-table__row')).toHaveCount(2)

  await openFilters(page)
  await page.getByLabel('Buscar').fill('transferencia')
  await page.getByRole('button', { name: 'Filtrar' }).click()
  await expect(page.locator('.el-table__row')).toHaveCount(1)
  await expect(page.locator('.el-table__row').first()).toContainText('Transferência para reserva')
  await expect(page).toHaveURL(/q=transferencia/)
  await expect(page.locator('[data-test="active-criteria"]')).toContainText('Busca: transferencia')

  await page.getByLabel('Buscar').fill('inexistente')
  await page.getByRole('button', { name: 'Filtrar' }).click()
  await expect(page.getByText('Nenhuma transferência corresponde aos filtros.')).toBeVisible()

  await page.getByRole('button', { name: 'Limpar' }).click()
  await expect(page.locator('.el-table__row')).toHaveCount(2)
  await expect(page.locator('[data-test="active-criteria"]')).toHaveCount(0)
})

test('owner corrects, removes, and restores a transfer with an archived association', async ({ page }) => {
  const archived = account({ id: 4, name: 'Conta encerrada', status: 'archived', balance: 0 })
  const current = account({ id: 1, name: 'Conta corrente', balance: 500_000 })
  const savings = account({ id: 2, name: 'Poupança', balance: 0 })
  await mockApi(page, {
    accounts: [current, savings, archived],
    transfers: [
      transfer({
        id: 21,
        source: current,
        destination: savings,
        amount: 100_000,
        description: 'Reserva do mês',
      }),
      transfer({
        id: 22,
        source: current,
        destination: archived,
        amount: 500,
        status: 'pending',
        description: 'Histórico arquivado',
      }),
    ],
  })
  await signIn(page)

  await expect(page.getByText('Conta encerrada (arquivada)').first()).toBeVisible()

  const row = page.locator('.el-table__row').filter({ hasText: 'Reserva do mês' })
  await row.locator('[data-test="transfer-row-actions"]').click()
  await chooseRowAction(page, 'Editar')
  const dialog = page.getByRole('dialog', { name: 'Editar transferência' })
  await dialog.getByLabel('Valor').fill('40000')
  await dialog.getByRole('button', { name: 'Salvar' }).click()

  await expect(row).toContainText('R$ 400,00')
  await expect(page.locator('[data-test="balance-impact"]').first()).toContainText('R$ 4.600,00')

  await row.locator('[data-test="transfer-row-actions"]').click()
  await chooseRowAction(page, 'Remover')
  await page.getByRole('dialog', { name: 'Remover transferência' }).getByRole('button', { name: 'Remover' }).click()
  await expect(row).toHaveCount(0)

  await page.getByRole('button', { name: 'Transferências removidas' }).click()
  await expect(page.getByRole('heading', { name: 'Transferências removidas' })).toBeVisible()
  await expect(page.locator('.el-table__row').first()).toContainText('Reserva do mês')

  await page.setViewportSize({ width: 320, height: 720 })
  const removedTransferCard = page.locator('[data-test="removed-transfer-card"]')
  await expect(removedTransferCard).toContainText('Reserva do mês')
  await expect(removedTransferCard.locator('[data-test="restore-transfer"]')).toBeVisible()
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth))
    .toBe(0)

  await removedTransferCard.locator('[data-test="restore-transfer"]').click()
  await page.getByRole('dialog', { name: 'Restaurar transferência' }).getByRole('button', { name: 'Restaurar' }).click()
  await expect(page.locator('.el-table__row')).toHaveCount(0)

  await page.locator('[data-test="back-to-transactions"]').click()
  await expect(page.getByRole('heading', { name: 'Transações', exact: true })).toBeVisible()
  await expect(page.locator('.el-table__row')).toHaveCount(2)
})

test('mixed history labels a transfer beside income and expense without changing totals', async ({ page }) => {
  const current = account({ id: 1, name: 'Conta corrente', balance: 900_000 })
  const savings = account({ id: 2, name: 'Poupança', balance: 0 })
  const incomeCategory = { id: 3, name: 'Salário', classification: 'income' }
  const expenseCategory = { id: 4, name: 'Alimentação', classification: 'expense' }
  await mockApi(page, {
    accounts: [current, savings],
    categories: [incomeCategory, expenseCategory],
    transactions: [
      transaction({
        id: 31,
        description: 'Salário setembro',
        type: 'income',
        amount: 500_000,
        date: '2026-09-10',
        account: current,
        category: incomeCategory,
      }),
      transaction({
        id: 32,
        description: 'Mercado',
        type: 'expense',
        amount: 200_000,
        date: '2026-09-11',
        account: current,
        category: expenseCategory,
      }),
    ],
    transfers: [
      transfer({
        id: 41,
        source: current,
        destination: savings,
        amount: 250_000,
        date: '2026-09-12',
        description: 'Reserva',
      }),
    ],
  })
  await page.emulateMedia({ colorScheme: 'dark' })
  await page.goto('/app/transactions')

  const rows = page.locator('.el-table__row')
  await expect(rows).toHaveCount(3)
  const transferRow = rows.filter({ hasText: 'Transferência' })
  await expect(transferRow).toContainText('Conta corrente → Poupança')
  await expect(transferRow).toContainText('R$ 2.500,00')
  await expect(transferRow.locator('[data-test="transfer-history-no-category"]')).toHaveText('—')
  await expect(page.locator('[data-test="history-total-income"]')).toHaveText('R$ 5.000,00')
  await expect(page.locator('[data-test="history-total-expense"]')).toHaveText('R$ 2.000,00')
  await expect(page.locator('[data-test="history-total-result"]')).toHaveText('R$ 3.000,00')
  await expect(page.locator('[data-test="history-total-excludes"]')).toContainText(
    'Transferências não entram',
  )

  await transferRow.click()
  const drawer = page.locator('.el-drawer:visible')
  await expect(drawer).toContainText('Conta corrente')
  await expect(drawer).toContainText('Poupança')
  await expect(drawer).not.toContainText('+')
  await expect(drawer.getByRole('button', { name: 'Editar' })).toHaveCount(0)
  await page.keyboard.press('Escape')

  await openFilters(page, 'transaction-filter-collapse')
  const filterButton = page.getByRole('button', { name: 'Filtrar' })
  await filterButton.focus()
  await page.keyboard.press('Enter')
  await expect(page.locator('.el-table__row')).toHaveCount(3)
})

test('transactions header opens transfer creation and removed-transfer shortcuts', async ({ page }) => {
  const current = account({ id: 1, name: 'Conta corrente', balance: 500_000 })
  const savings = account({ id: 2, name: 'Poupança', balance: 100_000 })
  await mockApi(page, { accounts: [current, savings] })
  await page.goto('/app/transactions')

  await chooseTransactionsHeaderAction(page, 'Transferências', 'Nova transferência')
  const dialog = page.getByRole('dialog', { name: 'Nova transferência' })
  await expect(dialog).toBeVisible()
  await expect(page).toHaveURL(/\/app\/transactions$/)
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()

  await page.goto('/app/transactions')
  await chooseTransactionsHeaderAction(page, 'Transferências', 'Transferências removidas')
  await expect(page.getByRole('heading', { name: 'Transferências removidas' })).toBeVisible()
})

test('transactions history manages transfer rows without leaving the page', async ({ page }) => {
  const current = account({ id: 1, name: 'Conta corrente', balance: 500_000 })
  const savings = account({ id: 2, name: 'Poupança', balance: 100_000 })
  await mockApi(page, {
    accounts: [current, savings],
    transfers: [
      transfer({
        id: 61,
        source: current,
        destination: savings,
        amount: 25_000,
        description: 'Reserva',
      }),
    ],
  })
  await page.goto('/app/transactions')

  const row = page.locator('.el-table__row').first()
  await row.locator('[data-test="transfer-row-actions"]').click()
  await chooseRowAction(page, 'Editar')
  const dialog = page.getByRole('dialog', { name: 'Editar transferência' })
  await dialog.getByLabel('Descrição').fill('Reserva revisada')
  await dialog.getByRole('button', { name: 'Salvar' }).click()
  await expect(dialog).toBeHidden()
  await expect(page).toHaveURL(/\/app\/transactions$/)

  await row.locator('[data-test="transfer-row-actions"]').click()
  await chooseRowAction(page, 'Pendente')
  await expect(row).toContainText('Pendente')

  await row.locator('[data-test="transfer-row-actions"]').click()
  await chooseRowAction(page, 'Remover')
  await page.getByRole('dialog', { name: 'Remover transferência' }).getByRole('button', { name: 'Remover' }).click()
  await expect(row).toHaveCount(0)
})

test('transfer workspace stays usable at 320px, 200% zoom, dark theme, and keyboard-only', async ({
  page,
}) => {
  const current = account({ id: 1, name: 'Conta corrente', balance: 500_000 })
  const savings = account({ id: 2, name: 'Poupança', balance: 100_000 })
  await mockApi(page, {
    accounts: [current, savings],
    transfers: [
      transfer({
        id: 51,
        source: current,
        destination: savings,
        amount: 25_000,
        description: 'Reserva',
      }),
    ],
  })
  await page.setViewportSize({ width: 320, height: 720 })
  await page.emulateMedia({ colorScheme: 'dark' })
  await signIn(page)

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  expect(overflow).toBeLessThanOrEqual(1)

  const row = page.locator('.el-table__row').first()
  await expect(row).toContainText('Transferência')
  await expect(row).toContainText('Conta corrente → Poupança')
  await expect(page.locator('.el-tag')).toContainText('Efetiva')

  const trigger = page.getByRole('button', { name: 'Nova transferência' })
  await trigger.focus()
  await page.keyboard.press('Enter')
  const dialog = page.getByRole('dialog', { name: 'Nova transferência' })
  await expect(dialog).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(trigger).toBeFocused()

  await openFilters(page)
  const filterButton = page.getByRole('button', { name: 'Filtrar' })
  await filterButton.focus()
  await page.keyboard.press('Enter')
  await expect(page.locator('.el-table__row')).toHaveCount(1)

  await page.addStyleTag({ content: 'html { font-size: 200%; }' })
  await expect(trigger).toBeVisible()
  await expect(page.locator('.el-table__row').first()).toContainText('Transferência')
})
