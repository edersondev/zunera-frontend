import { expect, test } from '@playwright/test'

import { pinLocale } from './support/locale.js'
import { creditCard as reportCard } from './support/creditCardFixtures.js'

test.beforeEach(async ({ page }) => {
  await pinLocale(page, 'pt-BR')
})

const headers = {
  'Access-Control-Allow-Origin': 'http://localhost:4173',
  'Access-Control-Allow-Credentials': 'true',
  'Content-Type': 'application/json',
}

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

function card({ id, name = 'C6 Bank', institution = 'C6 Bank', lastFour = '3450', status = 'active' }) {
  return {
    id,
    name,
    institution_name: institution,
    last_four: lastFour,
    color: 'violet',
    icon: 'credit-card',
    credit_limit_centavos: 1_000_000,
    closing_day: 10,
    due_day: 17,
    status,
    archived_at: status === 'archived' ? '2026-09-01T00:00:00Z' : null,
  }
}

function cardOccurrence({
  id,
  scheduledDate,
  state = 'expected',
  generationMode = 'confirmation',
  amount = 15_000,
  destination = cards[0],
  subject,
  actualAmount = null,
  actualDate = null,
  purchaseId = null,
}) {
  return {
    id,
    scheduled_date: scheduledDate,
    state,
    generation_mode: generationMode,
    scheduled_amount_centavos: amount,
    description: 'Academia',
    notes: null,
    original_card: { id: destination.id, name: destination.name, institution_name: destination.institution_name, last_four: destination.last_four, status: destination.status },
    original_category: { id: subject.id, name: subject.name },
    card: { id: destination.id, name: destination.name, institution_name: destination.institution_name, last_four: destination.last_four, status: destination.status },
    category: { id: subject.id, name: subject.name },
    actual_amount_centavos: actualAmount,
    actual_purchase_date: actualDate,
    purchase_id: purchaseId,
    failure_code: null,
    recorded_at: null,
    dismissed_at: null,
  }
}

function rule({
  id,
  account: owner,
  category: subject,
  creditCard: cardDestination = null,
  generationMode = null,
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
    destination_type: cardDestination ? 'credit_card' : 'financial_account',
    amount_centavos: amount,
    currency_code: 'BRL',
    description,
    notes: null,
    frequency,
    start_date: start,
    end_date: null,
    state,
    paused_reason: pausedReason,
    financial_account: cardDestination ? null : { id: owner.id, name: owner.name, status: owner.status },
    credit_card: cardDestination,
    generation_mode: generationMode,
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

async function mockApi(page, { accounts, categories, rules = [], transactions = [], cards = [] }) {
  const state = { accounts, categories, rules, transactions, cards, nextId: 900 }

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
  await page.route(/\/api\/v1\/credit-cards(?:\?[^/]*)?$/, (route) =>
    route.fulfill({ json: { data: state.cards }, headers }),
  )
  await page.route(/\/api\/v1\/transactions(?:\?[^/]*)?$/, (route) =>
    route.fulfill({ json: { data: state.transactions, meta: metaFor(state.transactions) }, headers }),
  )
  await page.route(/\/api\/v1\/financial-history(?:\?[^/]*)?$/, (route) =>
    route.fulfill({ json: { data: state.transactions.map((item) => ({ ...item, movement_date: item.movement_date ?? item.transaction_date })), meta: metaFor(state.transactions) }, headers }),
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
      const cardDestination = body.destination_type === 'credit_card'
        ? state.cards.find((item) => item.id === body.credit_card_id)
        : null
      const created = {
        ...rule({
          id: state.nextId++,
          account: owner,
          category: subject,
          creditCard: cardDestination,
          generationMode: body.generation_mode,
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
  await page.route(/\/api\/v1\/recurring-transactions\/(\d+)\/occurrences\/(\d+)\/(confirm|dismiss|retry)$/, (route) => {
    const match = route.request().url().match(/recurring-transactions\/(\d+)\/occurrences\/(\d+)\/(confirm|dismiss|retry)/)
    const ruleId = Number(match[1])
    const occurrenceId = Number(match[2])
    const action = match[3]
    const rule = state.rules.find((entry) => entry.id === ruleId)
    const item = rule?.occurrenceItems?.find((entry) => entry.id === occurrenceId)
    if (!item) return route.fulfill({ status: 404, json: { message: 'Não encontrada.' }, headers })

    if (action === 'confirm') {
      const body = route.request().postDataJSON() ?? {}
      item.state = 'recorded'
      item.actual_amount_centavos = body.actual_amount_centavos ?? item.actual_amount_centavos ?? item.scheduled_amount_centavos
      item.actual_purchase_date = body.actual_purchase_date ?? item.actual_purchase_date ?? item.scheduled_date
      item.purchase_id = 700 + occurrenceId
      item.recorded_at = '2026-09-24T12:00:00Z'
    }
    if (action === 'dismiss') {
      item.state = 'dismissed'
      item.dismissed_at = '2026-09-24T12:00:00Z'
    }
    if (action === 'retry') {
      item.state = 'recorded'
      item.purchase_id = 700 + occurrenceId
      item.recorded_at = '2026-09-24T12:00:00Z'
    }

    return route.fulfill({ json: { data: item }, headers })
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
const cards = [card({ id: 41, name: 'C6 Bank', institution: 'C6 Bank', lastFour: '3450' })]

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

test('owner creates a card recurrence and sees its card identity and mode', async ({ page }) => {
  await mockApi(page, { accounts, categories, cards, rules: [] })
  await signIn(page)

  await page.locator('[data-test="recurrence-new"]').click()
  await expect(page.locator('[data-test="recurrence-form"]')).toBeVisible()

  await page.locator('[data-test="recurrence-destination-field"]').getByText('Cartão de crédito').click()
  await chooseOption(page, page.locator('[data-test="recurrence-card"]'), 'C6 Bank •••• 3450')
  await chooseOption(page, page.locator('[data-test="recurrence-category"]'), 'Assinaturas')
  await page.locator('[data-test="recurrence-amount"]').fill('150,00')
  await page.locator('[data-test="recurrence-description"]').fill('Academia')
  await page.locator('[data-test="recurrence-save"]').click()

  await expect(page.getByText('Recorrência criada.')).toBeVisible()
  const row = page.locator('.el-table__row').first()
  await expect(row).toContainText('Academia')
  await expect(row).toContainText('C6 Bank •••• 3450')
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

  await page.goto('/app/transactions?from=2026-10-01&to=2026-10-31')
  await expect(page.locator('[data-test="transaction-recurrence-label"]').first()).toHaveAttribute(
    'aria-label',
    /#61/,
  )
  await page.locator('[data-test="transaction-recurrence-label"]').first().hover()
  await expect(page.getByRole('tooltip')).toContainText('#61')
  await page.locator('.history-item').first().locator('.history-toggle').click()
  await page.locator('.history-item').first().getByRole('button', { name: 'Ver detalhes' }).click()
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
  await expect(page.locator('.history-item')).toContainText('Pendente')
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

  await page.goto('/app/transactions?from=2026-10-01&to=2026-10-31')
  await page.locator('.history-item').first().locator('.history-toggle').click()
  await page.locator('.history-item').first().getByRole('button', { name: 'Ver detalhes' }).click()
  await page.locator('[data-test="edit-transaction"]').click()
  await page.locator('[data-test="transaction-amount"]').fill('275,00')
  await page.locator('[data-test="save-transaction"]').click()
  await expect(page.locator('.history-item')).toContainText('275,00')

  await page.goto('/app/recurring-transactions')
  await expect(page.locator('.el-table__row')).toContainText('250,00')
  await expect(page.locator('[data-test="recurrence-next"]')).toContainText('05/10/2026')
})

test('owner approves or dismisses an awaiting over-limit card occurrence once', async ({ page }) => {
  const occurrence = cardOccurrence({
    id: 91,
    scheduledDate: '2026-09-24',
    state: 'awaiting_over_limit',
    generationMode: 'automatic',
    subject: categories[0],
    destination: cards[0],
  })
  await mockApi(page, {
    accounts,
    categories,
    cards,
    rules: [
      {
        ...rule({
          id: 81,
          account: accounts[0],
          category: categories[0],
          creditCard: cards[0],
          generationMode: 'automatic',
          description: 'Academia',
          next: '2026-09-24',
        }),
        occurrenceItems: [occurrence],
      },
    ],
  })
  await signIn(page)

  await page.locator('.el-table__row').first().click()
  await expect(page.locator('[data-test="recurrence-occurrence-status"]')).toContainText('Aguardando aprovação')
  await page.locator('[data-test="recurrence-occurrence-open"]').first().click()
  await expect(page.locator('[data-test="occurrence-state"]')).toContainText('Aguardando aprovação')
  await expect(page.locator('[data-test="occurrence-confirm"]')).toBeDisabled()
  await page.locator('[data-test="occurrence-over-limit-approval"]').click()
  await page.locator('[data-test="occurrence-confirm"]').click()
  await expect(page.locator('[data-test="recurrence-occurrence-status"]')).toContainText('Registrada')
})

test('owner confirms or dismisses an expected confirmation-mode occurrence', async ({ page }) => {
  const occurrence = cardOccurrence({
    id: 92,
    scheduledDate: '2026-09-24',
    state: 'expected',
    generationMode: 'confirmation',
    subject: categories[0],
    destination: cards[0],
  })
  await mockApi(page, {
    accounts,
    categories,
    cards,
    rules: [
      {
        ...rule({
          id: 82,
          account: accounts[0],
          category: categories[0],
          creditCard: cards[0],
          generationMode: 'confirmation',
          description: 'Mercado',
          next: '2026-09-24',
        }),
        occurrenceItems: [occurrence],
      },
    ],
  })
  await signIn(page)

  await page.locator('.el-table__row').first().click()
  await expect(page.locator('[data-test="recurrence-occurrence-status"]')).toContainText('Prevista')
  await page.locator('[data-test="recurrence-occurrence-open"]').first().click()
  await expect(page.locator('[data-test="occurrence-state"]')).toContainText('Prevista')
  await page.locator('[data-test="occurrence-dismiss"]').click()
  await expect(page.locator('[data-test="recurrence-occurrence-status"]')).toContainText('Dispensada')
})

test('a card rule keeps its destination immutable while editing future details', async ({ page }) => {
  await mockApi(page, {
    accounts,
    categories,
    cards,
    rules: [
      rule({
        id: 83,
        account: accounts[0],
        category: categories[0],
        creditCard: cards[0],
        generationMode: 'confirmation',
        description: 'Academia',
        amount: 15_000,
      }),
    ],
  })
  await signIn(page)

  await chooseRecurrenceAction(page, 'recurrence-action-edit')
  const destination = page.locator('[data-test="recurrence-destination-field"]')
  await expect(destination).toBeVisible()
  await expect(destination.locator('input[type="radio"]').first()).toBeDisabled()

  await page.locator('[data-test="recurrence-description"]').fill('Academia renovada')
  await page.locator('[data-test="recurrence-save"]').click()
  await expect(page.getByText('Recorrência atualizada.')).toBeVisible()
  await expect(page.locator('.el-table__row')).toContainText('Academia renovada')
})

test('card expectation becomes one purchase, one closed expense, and no second expense on payment', async ({ page }) => {
  let phase = 'expected'
  const money = (amount) => ({ amount_centavos: amount, currency_code: 'BRL' })
  const realized = () => ['closed', 'paid'].includes(phase) ? 15_000 : 0
  const expected = () => phase === 'open' ? 15_000 : 0
  const hasPurchase = () => phase !== 'expected'
  const statementStatus = () => phase === 'paid' ? 'paid' : phase === 'closed' ? 'closed' : 'open'
  const categoryData = { id: 10, name: 'Assinaturas', classification: 'expense', origin: 'personal', status: 'active', color: 'teal', icon: 'receipt' }
  const cardData = () => {
    const base = reportCard(41, 'C6 Bank')
    return {
      ...base, institution_name: 'C6 Bank', last_four: '3450',
      summary: {
        credit_limit: money(500_000), used_credit: money(hasPurchase() && phase !== 'paid' ? 15_000 : 0),
        card_credit: money(0), available_credit: money(hasPurchase() && phase !== 'paid' ? 485_000 : 500_000), is_over_limit: false,
      },
      current_statement: {
        ...base.current_statement, id: 71, status: statementStatus(), closing_date: '2026-09-10',
        due_date: '2026-09-17', original_amount: money(hasPurchase() ? 15_000 : 0),
        net_amount: money(hasPurchase() ? 15_000 : 0),
        paid_amount: money(phase === 'paid' ? 15_000 : 0),
        outstanding_amount: money(hasPurchase() && phase !== 'paid' ? 15_000 : 0),
      },
    }
  }
  const purchase = () => ({
    id: 701, card: cardData(), category: categoryData, description: 'Academia', notes: null,
    purchase_date: '2026-09-01', total_amount: money(15_000), installment_count: 1,
    installments: [{ id: 702, sequence: 1, total_count: 1, amount: money(15_000),
      credit_adjustment: money(0), recognized_amount: money(15_000), recognition_date: '2026-09-10',
      recognition_status: phase === 'open' ? 'pending' : 'effective',
      statement: { id: 71, closing_date: '2026-09-10', due_date: '2026-09-17' } }],
    credit_events: [], is_directly_editable: phase === 'open',
    recurrence_source: { recurring_transaction_id: 81, scheduled_date: '2026-09-01' },
  })

  await mockApi(page, { accounts, categories, cards, rules: [rule({
    id: 81, account: accounts[0], category: categories[0], creditCard: cards[0],
    generationMode: 'automatic', description: 'Academia', next: '2026-10-01',
  })] })
  await page.route('**/api/v1/financial-dashboard/summary**', (route) => route.fulfill({ json: { data: {
    period: { preset: 'current_month', from: '2026-09-01', to: '2026-09-25' },
    current_total_balance: money(phase === 'paid' ? 85_000 : 100_000),
    realized_income: money(0), realized_expenses: money(realized()), financial_result: money(-realized()),
  } }, headers }))
  await page.route('**/api/v1/financial-dashboard/accounts', (route) => route.fulfill({ json: { data: {
    current_total_balance: money(phase === 'paid' ? 85_000 : 100_000),
    accounts: [{ account: accounts[0], current_balance: money(phase === 'paid' ? 85_000 : 100_000), allocation_percent: 100 }],
  } }, headers }))
  await page.route('**/api/v1/financial-dashboard/expense-distribution**', (route) => route.fulfill({ json: { data: {
    period: { preset: 'current_month', from: '2026-09-01', to: '2026-09-25' },
    total_expenses: money(realized()), categories: realized() ? [{ category: categoryData, total: money(realized()), share_percent: 100, rank: 1 }] : [],
  } }, headers }))
  await page.route('**/api/v1/financial-dashboard/evolution**', (route) => route.fulfill({ json: { data: {
    period: { preset: 'current_month', from: '2026-09-01', to: '2026-09-25' }, interval: 'daily',
    intervals: [{ from: '2026-09-10', to: '2026-09-10', label: '10/09', is_partial: false,
      income: money(0), expenses: money(realized()), result: money(-realized()) }],
  } }, headers }))
  await page.route('**/api/v1/financial-dashboard/recent-activity', (route) => route.fulfill({ json: { data: hasPurchase() ? [{
    movement_kind: 'credit_card_expense', id: 701, status: 'effective', movement_date: '2026-09-01',
    amount: money(15_000), description: 'Academia', account: null, credit_card: cardData(), category: categoryData,
    recurrence_source: { id: 81, scheduled_date: '2026-09-01' },
  }] : [] }, headers }))
  await page.route('**/api/v1/financial-dashboard/upcoming-activity', (route) => route.fulfill({ json: { data: phase === 'expected' ? [{
    source_kind: 'card_expectation', expected_date: '2026-09-25', type: 'expense', amount: money(15_000),
    account: null, credit_card: cardData(), category: categoryData, description: 'Academia', destination_type: 'credit_card',
  }] : [], meta: { from: '2026-09-25', to: '2026-10-24' } }, headers }))
  await page.route('**/api/v1/financial-dashboard/credit-cards', (route) => route.fulfill({ json: { data: {
    outstanding_obligation: money(hasPurchase() && phase !== 'paid' ? 15_000 : 0), card_credit: money(0),
    available_credit: cardData().summary.available_credit, cards: [cardData()],
    upcoming_statements: phase === 'paid' || !hasPurchase() ? [] : [cardData().current_statement],
  } }, headers }))
  await page.route('**/api/v1/budgets/**', (route) => route.fulfill({ json: { data: {
    period: { year: 2026, month: 9, from: '2026-09-01', to: '2026-09-30' },
    budget: {
      id: 7, period: { year: 2026, month: 9, from: '2026-09-01', to: '2026-09-30' },
      summary: { total_planned: money(100_000), budgeted_realized: money(realized()),
        actual_available: money(100_000 - realized()), overall_utilization_percent: 15,
        overall_status: 'within', unbudgeted_expenses: money(0), total_expenses: money(realized()),
        expected: money(expected()), projected_spending: money(realized() + expected()),
        projected_available: money(100_000 - realized() - expected()), projected_status: 'within' },
      plans: [{ id: 11, category: categoryData, planned: money(100_000), realized: money(realized()),
        available: money(100_000 - realized()), utilization_percent: 15, status: 'within', excess: money(0),
        expected: money(expected()), projected_spending: money(realized() + expected()),
        projected_available: money(100_000 - realized() - expected()), projected_status: 'within', is_read_only: false }],
    },
  } }, headers }))
  await page.route('**/api/v1/credit-cards/41', (route) => route.fulfill({ json: { data: cardData() }, headers }))
  await page.route('**/api/v1/credit-cards/41/purchases**', (route) => route.fulfill({ json: {
    data: hasPurchase() ? [purchase()] : [], meta: { current_page: 1, last_page: 1, total: hasPurchase() ? 1 : 0 },
  }, headers }))
  await page.route('**/api/v1/credit-cards/41/statements**', (route) => route.fulfill({ json: {
    data: hasPurchase() ? [cardData().current_statement] : [], meta: { current_page: 1, last_page: 1, total: hasPurchase() ? 1 : 0 },
  }, headers }))
  await signIn(page)

  await page.goto('/app')
  await expect(page.locator('[data-test="dashboard-upcoming-source"]')).toHaveText('Recorrência no cartão')
  await expect(page.locator('[data-test="dashboard-recent-row"]')).toHaveCount(0)
  await expect(page.locator('[data-test="dashboard-summary-expenses-value"]')).toContainText('0,00')

  phase = 'open'
  await page.goto('/app')
  await expect(page.locator('[data-test="dashboard-upcoming-row"]')).toHaveCount(0)
  await expect(page.locator('[data-test="dashboard-recent-row"]')).toHaveCount(1)
  await expect(page.locator('[data-test="dashboard-summary-expenses-value"]')).toContainText('0,00')
  await page.goto('/app/budgets')
  await expect(page.locator('[data-test="budget-summary-realized"]')).toContainText('0,00')
  await expect(page.locator('[data-test="budget-summary-projection"]')).toContainText('150,00')
  await page.goto('/app/credit-cards/41')
  await expect(page.locator('[data-test="credit-card-purchase-701"]')).toContainText('Academia')
  await expect(page.locator('[data-test="credit-card-purchase-701"]')).toContainText('Previsto')

  phase = 'closed'
  await page.goto('/app')
  await expect(page.locator('[data-test="dashboard-summary-expenses-value"]')).toContainText('150,00')
  await expect(page.locator('[data-test="dashboard-recent-row"]')).toHaveCount(1)
  await page.goto('/app/budgets')
  await expect(page.locator('[data-test="budget-summary-realized"]')).toContainText('150,00')
  await expect(page.locator('[data-test="budget-summary-projection"]')).toContainText('150,00')
  await page.goto('/app/credit-cards/41')
  await expect(page.locator('[data-test="credit-card-purchase-701"]')).toContainText('Reconhecido')

  phase = 'paid'
  await page.goto('/app')
  await expect(page.locator('[data-test="dashboard-summary-expenses-value"]')).toContainText('150,00')
  await expect(page.locator('[data-test="dashboard-summary-balance-value"]')).toContainText('850,00')
  await expect(page.locator('[data-test="dashboard-recent-row"]')).toHaveCount(1)
  await page.goto('/app/budgets')
  await expect(page.locator('[data-test="budget-summary-realized"]')).toContainText('150,00')
  await page.goto('/app/credit-cards/41')
  await expect(page.locator('[data-test="credit-card-purchase-701"]')).toHaveCount(1)
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

test('card occurrence review and upcoming card stay readable with zoom, themes, and keyboard', async ({ page }) => {
  const occurrence = cardOccurrence({
    id: 93, scheduledDate: '2026-09-24', subject: categories[0], destination: cards[0],
  })
  await mockApi(page, { accounts, categories, cards, rules: [{
    ...rule({ id: 84, account: accounts[0], category: categories[0], creditCard: cards[0],
      generationMode: 'confirmation', description: 'Academia', next: '2026-10-24' }),
    occurrenceItems: [occurrence],
  }] })
  await page.route('**/api/v1/financial-dashboard/upcoming-activity', (route) => route.fulfill({
    json: { data: [{ source_kind: 'card_expectation', expected_date: '2026-09-24',
      type: 'expense', amount: { amount_centavos: 15_000, currency_code: 'BRL' },
      account: null, credit_card: cards[0], category: categories[0], description: 'Academia' }],
    meta: { from: '2026-09-24', to: '2026-10-23' } }, headers,
  }))

  await page.setViewportSize({ width: 320, height: 640 })
  await page.emulateMedia({ colorScheme: 'dark' })
  await signIn(page)
  const darkSurface = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--color-surface').trim())
  await page.locator('.el-table__row').first().click()
  const openOccurrence = page.locator('[data-test="recurrence-occurrence-open"]').first()
  await openOccurrence.click()
  const dialog = page.getByRole('dialog', { name: 'Revisar ocorrência' })
  await expect(dialog).toBeVisible()
  await expect.poll(() => dialog.evaluate((element) => element.getBoundingClientRect().width)).toBeLessThanOrEqual(320)
  await expect(dialog.getByLabel('Data real da compra')).toBeVisible()
  await expect(dialog.getByRole('button', { name: 'Confirmar', exact: true })).toBeEnabled()
  await dialog.getByRole('button', { name: 'Cancelar' }).focus()
  await expect(dialog.getByRole('button', { name: 'Cancelar' })).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(openOccurrence).toBeFocused()

  await page.emulateMedia({ colorScheme: 'light' })
  const lightSurface = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--color-surface').trim())
  expect(lightSurface).not.toBe(darkSurface)
  await page.goto('/app')
  const upcoming = page.locator('section[aria-labelledby="dashboard-upcoming-title"]')
  await expect(upcoming).toBeVisible()
  await expect(upcoming.locator('[data-test="dashboard-upcoming-row"]')).toContainText('Academia')
  await expect(upcoming.locator('[data-test="dashboard-upcoming-source"]')).toHaveText('Recorrência no cartão')
  await expect(upcoming.locator('[data-test="dashboard-upcoming-row"]')).toContainText('C6 Bank')
  await page.emulateMedia({ colorScheme: 'no-preference' })
  await expect(upcoming).toBeVisible()

  await page.setViewportSize({ width: 1280, height: 800 })
  await page.evaluate(() => { document.documentElement.style.zoom = '2' })
  await expect(upcoming.locator('[data-test="dashboard-upcoming-row"]')).toBeVisible()
  await page.evaluate(() => { document.documentElement.style.zoom = '1' })
})
