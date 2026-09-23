import { expect, test } from '@playwright/test'

import { apiHeaders, creditCard, money, sessionPayload } from './support/creditCardFixtures.js'
import { pinLocale } from './support/locale.js'

test.beforeEach(async ({ page }) => {
  await pinLocale(page, 'en')
})

test('owner creates card, sees its detail, and sends only non-sensitive payload', async ({ page }) => {
  let createPayload = null
  await mockCreditCardsApi(page, {
    cards: [],
    onCreate(payload) {
      createPayload = payload
    },
  })

  await page.goto('/app/credit-cards')
  await expect(page.getByRole('heading', { name: 'Credit cards' })).toBeVisible()
  await expect(page.getByText('No credit cards yet')).toBeVisible()

  await page.locator('[data-test="credit-cards-empty-create"]').click()
  const dialog = page.getByRole('dialog', { name: 'New card' })
  await dialog.getByLabel('Card name').fill('Nubank Platinum')
  await dialog.getByLabel('Institution').fill('Nubank')
  await dialog.getByLabel('Last four digits').fill('1234')
  await dialog.getByLabel('Limit').pressSequentially('500000')
  await dialog.getByRole('button', { name: 'Save' }).click()

  await expect(page.getByText('Card created.')).toBeVisible()
  await expect(page.locator('[data-test="credit-cards-overview"]')).toContainText('Total credit limit')
  await expect(page.getByRole('button', { name: /Nubank Platinum/ })).toBeVisible()
  expect(createPayload).toMatchObject({
    name: 'Nubank Platinum',
    institution_name: 'Nubank',
    last_four: '1234',
    credit_limit_centavos: 500_000,
  })
  expect(createPayload).not.toHaveProperty('number')
  expect(createPayload).not.toHaveProperty('cvv')

  await page.getByRole('button', { name: /Nubank Platinum/ }).click()
  await expect(page.locator('[data-test="credit-card-detail-view"]')).toBeVisible()
  await expect(page.locator('[data-test="credit-card-detail-summary"]')).toContainText('5.000,00')
  await expect(page.locator('[data-test="credit-card-current-statement"]')).toContainText('Open')
})

test('owner updates, archives, and finds card in archived history', async ({ page }) => {
  const card = creditCard(41, 'Nubank Platinum')
  await mockCreditCardsApi(page, { cards: [card] })

  await page.goto('/app/credit-cards')
  await expect(page.locator('[data-test="credit-card-41"]')).toBeVisible()

  await page.locator('[data-test="credit-card-edit"]').click()
  const editDialog = page.getByRole('dialog', { name: 'Edit card' })
  await editDialog.getByLabel('Card name').fill('Nubank Black')
  await editDialog.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByText('Card updated.')).toBeVisible()
  await expect(page.getByRole('button', { name: /Nubank Black/ })).toBeVisible()

  await page.locator('[data-test="credit-card-archive"]').click()
  const archiveDialog = page.getByRole('dialog', { name: 'Archive card' })
  await expect(archiveDialog).toContainText('history stays readable')
  await archiveDialog.getByRole('button', { name: 'Archive' }).click()
  await expect(page.getByText('Card archived.')).toBeVisible()
  await expect(page.getByText('No credit cards yet')).toBeVisible()

  await page.getByRole('button', { name: 'Archived' }).click()
  await expect(page.getByRole('heading', { name: 'Archived cards' })).toBeVisible()
  await expect(page.locator('[data-test="credit-card-archived-41"]')).toContainText('Nubank Black')
})

test('settings navigation reaches credit-card management', async ({ page }) => {
  await mockCreditCardsApi(page, { cards: [creditCard(41, 'Nubank Platinum')] })

  await page.goto('/app/financial-accounts')
  await page.getByRole('menuitem', { name: 'Credit cards' }).click()

  await expect(page).toHaveURL(/\/app\/credit-cards$/)
  await expect(page.getByRole('heading', { name: 'Credit cards' })).toBeVisible()
})

test('credit-card management dashboard fits a narrow dark screen', async ({ page }) => {
  const first = creditCard(41, 'Nubank Platinum', 'active', {
    summary: {
      credit_limit: money(500_000),
      used_credit: money(125_000),
      card_credit: money(0),
      available_credit: money(375_000),
      is_over_limit: false,
    },
  })
  const second = creditCard(42, 'C6 Bank', 'active', {
    summary: {
      credit_limit: money(200_000),
      used_credit: money(25_000),
      card_credit: money(1_000),
      available_credit: money(175_000),
      is_over_limit: false,
    },
  })
  await mockCreditCardsApi(page, { cards: [first, second] })

  await page.setViewportSize({ width: 320, height: 900 })
  await page.emulateMedia({ colorScheme: 'dark' })
  await page.goto('/app/credit-cards')

  await expect(page.locator('[data-test="credit-cards-overview"]')).toContainText('2 active cards')
  await expect(page.locator('[data-test="credit-cards-overview-limit"]')).toContainText('7.000,00')
  await expect(page.locator('[data-test="credit-card-42"]')).toContainText('C6 Bank')
  await expect(page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).resolves.toBe(true)
})

test('owner records installment spending and confirms an over-limit purchase with a fresh key', async ({ page }) => {
  const requests = []
  await mockCreditCardsApi(page, {
    cards: [creditCard(41, 'Nubank Platinum')],
    requireOverLimit: true,
    onPurchase(request) {
      requests.push(request)
    },
  })

  await page.goto('/app/credit-cards/41')
  await page.getByRole('button', { name: 'New purchase' }).click()
  const dialog = page.getByRole('dialog', { name: 'New purchase' })
  await chooseOption(page, dialog.locator('[data-test="credit-card-purchase-category"]'), 'Groceries')
  await dialog.getByLabel('Description').fill('Headphones')
  await dialog.getByLabel('Total amount').pressSequentially('10000')
  await dialog.getByLabel('Installments').fill('3')
  await dialog.getByRole('button', { name: 'Save' }).click()

  await expect(dialog.locator('[data-test="credit-card-purchase-result"]')).toContainText('Closes 25/09/2026')
  expect(requests[0].payload).toMatchObject({ installment_count: 3, total_amount_centavos: 10_000 })

  await dialog.getByLabel('Description').fill('Above limit')
  await dialog.getByRole('button', { name: 'Save' }).click()
  await expect(dialog.locator('[data-test="credit-card-purchase-over-limit"]')).toContainText('-')
  await dialog.getByRole('button', { name: 'Confirm over-limit purchase' }).click()

  await expect.poll(() => requests.length).toBe(3)
  expect(requests[1].key).not.toBe(requests[2].key)
  expect(requests[2].payload).toMatchObject({ confirm_over_limit: true })
})

test('owner partially pays, reassigns, removes, and restores a statement payment', async ({ page }) => {
  const card = creditCard(41, 'Nubank Platinum')
  const statement = statementFixture(card)
  const paymentRequests = []
  await mockCreditCardsApi(page, {
    cards: [card],
    statement,
    accounts: [
      { id: 7, name: 'Main account', status: 'active' },
      { id: 8, name: 'Savings', status: 'active' },
    ],
    onPayment(request) {
      paymentRequests.push(request)
    },
  })

  await page.goto('/app/credit-card-statements/72')
  await expect(page.locator('[data-test="credit-card-statement-view"]')).toBeVisible()
  await expect(page.locator('[data-test="credit-card-statement-outstanding"]')).toContainText('100,00')

  await page.locator('[data-test="credit-card-payment-create"]').click()
  let dialog = page.getByRole('dialog', { name: 'Pay statement' })
  await chooseOption(page, dialog.locator('[data-test="credit-card-payment-account"]'), 'Main account')
  await setCurrency(dialog.getByLabel('Payment amount'), '3334')
  await dialog.getByLabel('Payment date').fill('2026-10-05')
  await dialog.getByRole('button', { name: 'Save' }).click()

  await expect(page.getByText('Payment saved.')).toBeVisible()
  await expect(page.locator('[data-test="credit-card-statement-outstanding"]')).toContainText('66,66')
  await expect(page.locator('[data-test="credit-card-payment-11"]')).toContainText('Main account')

  await page.locator('[data-test="credit-card-payment-edit-11"]').click()
  dialog = page.getByRole('dialog', { name: 'Edit payment' })
  await chooseOption(page, dialog.locator('[data-test="credit-card-payment-account"]'), 'Savings')
  await setCurrency(dialog.getByLabel('Payment amount'), '5000')
  await dialog.getByRole('button', { name: 'Save' }).click()

  await expect(page.locator('[data-test="credit-card-statement-outstanding"]')).toContainText('50,00')
  await expect(page.locator('[data-test="credit-card-payment-11"]')).toContainText('Savings')

  await page.locator('[data-test="credit-card-payment-remove-11"]').click()
  await expect(page.getByText('Payment removed.')).toBeVisible()
  await expect(page.locator('[data-test="credit-card-statement-outstanding"]')).toContainText('100,00')
  await expect(page.locator('[data-test="credit-card-payment-removed-11"]')).toContainText('Savings')

  await page.locator('[data-test="credit-card-payment-restore-11"]').click()
  await expect(page.getByText('Payment restored.')).toBeVisible()
  await expect(page.locator('[data-test="credit-card-statement-outstanding"]')).toContainText('50,00')
  await expect(page.locator('[data-test="credit-card-payment-11"]')).toContainText('Savings')
  expect(paymentRequests.map((request) => request.method)).toEqual(['POST', 'PATCH', 'POST', 'POST'])
  expect(paymentRequests[0].payload).toMatchObject({ financial_account_id: 7, amount_centavos: 3_334 })
  expect(paymentRequests[1].payload).toMatchObject({ financial_account_id: 8, amount_centavos: 5_000 })
})

test('statement history shows an automatically applied card credit exactly once', async ({ page }) => {
  const card = creditCard(41, 'Nubank Platinum')
  const statement = statementFixture(card)
  statement.credit_events = [{
    id: 91,
    reason: 'refund',
    amount: money(2_500),
    event_date: '2026-10-02',
    notes: null,
    applications: [{ installment_id: 721, statement_id: 72, amount: money(2_500) }],
  }]
  await mockCreditCardsApi(page, { cards: [card], statement })

  await page.goto('/app/credit-card-statements/72')
  await expect(page.locator('[data-test="credit-card-credit-event-91"]')).toContainText('Refund')
  await expect(page.locator('[data-test="credit-card-credit-application-91-72"]')).toContainText('Applied to this statement:')
  await expect(page.locator('[data-test="credit-card-credit-application-91-72"]')).toContainText('25,00')
  await expect(page.locator('[data-test="credit-card-credit-application-91-72"]')).toHaveCount(1)
})

test('statement dashboard remains readable on a narrow dark screen', async ({ page }) => {
  const card = creditCard(41, 'Nubank Platinum')
  const statement = statementFixture(card)
  statement.installments = [{
    id: 721,
    description: 'Groceries',
    purchase_date: '2026-09-05',
    sequence: 1,
    total_count: 3,
    amount: money(3_334),
    recognition_date: '2026-09-25',
  }]

  await mockCreditCardsApi(page, { cards: [card], statement })
  await page.setViewportSize({ width: 320, height: 900 })
  await page.emulateMedia({ colorScheme: 'dark' })
  await page.goto('/app/credit-card-statements/72')

  await expect(page.getByRole('heading', { name: 'September 2026 Statement' })).toBeVisible()
  await expect(page.locator('[data-test="credit-card-statement-summary"]')).toContainText('100,00')
  await expect(page.locator('[data-test="credit-card-line-721"]')).toContainText('Groceries')
  await expect(page.locator('[data-test="credit-card-statement-payments"]')).toContainText('Payments associated')
  await expect(page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).resolves.toBe(true)
})

test('statement installments expand by keyboard one at a time without narrow-screen overflow', async ({ page }) => {
  const card = creditCard(41, 'Nubank Platinum')
  const statement = statementFixture(card)
  statement.installments = [
    {
      id: 721,
      purchase_id: 301,
      description: 'A very long grocery purchase description from the neighborhood market',
      purchase_date: '2026-09-05',
      sequence: 1,
      total_count: 2,
      amount: money(3_334),
      credit_adjustment: money(1_000),
      recognized_amount: money(2_334),
      purchase_total_amount: money(6_667),
      recognition_status: 'effective',
      is_directly_editable: false,
      category: { id: 18, name: 'Groceries', icon: 'shopping_bag', color: 'teal' },
    },
    {
      id: 722,
      purchase_id: 302,
      description: 'Pharmacy',
      purchase_date: '2026-09-06',
      sequence: 1,
      total_count: 1,
      amount: money(6_666),
      credit_adjustment: money(0),
      recognized_amount: money(6_666),
      recognition_status: 'effective',
      is_directly_editable: false,
    },
  ]
  await mockCreditCardsApi(page, { cards: [card], statement })
  await page.setViewportSize({ width: 320, height: 900 })
  await page.emulateMedia({ colorScheme: 'dark' })
  await page.goto('/app/credit-card-statements/72')

  const first = page.locator('[data-test="credit-card-line-toggle-721"]')
  const second = page.locator('[data-test="credit-card-line-toggle-722"]')
  await expect(first).toHaveAttribute('aria-expanded', 'false')
  await first.focus()
  await page.keyboard.press('Enter')
  await expect(first).toHaveAttribute('aria-expanded', 'true')
  await expect(page.locator('[data-test="credit-card-line-details-721"]')).toContainText('23,34')
  await expect(page.locator('[data-test="credit-card-line-details-721"]')).toContainText('10,00')
  await second.focus()
  await page.keyboard.press('Space')
  await expect(first).toHaveAttribute('aria-expanded', 'false')
  await expect(second).toHaveAttribute('aria-expanded', 'true')
  await expect(page.locator('[data-test="credit-card-line-details-721"]')).toBeHidden()
  await expect(page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).resolves.toBe(true)
})

test('statement purchase actions reuse correction and refund dialogs', async ({ page }) => {
  const card = creditCard(41, 'Nubank Platinum')
  const purchase = purchaseFixture(card, {
    category_id: 18,
    description: 'Groceries',
    purchase_date: '2026-09-05',
    total_amount_centavos: 10_000,
    installment_count: 1,
  }, 301)
  const statement = statementFixture(card)
  statement.status = 'open'
  statement.installments = [{
    id: 721,
    purchase_id: 301,
    description: 'Groceries',
    purchase_date: '2026-09-05',
    sequence: 1,
    total_count: 1,
    amount: money(10_000),
    credit_adjustment: money(0),
    recognized_amount: money(10_000),
    purchase_total_amount: money(10_000),
    recognition_status: 'pending',
    is_directly_editable: true,
    category: { id: 18, name: 'Groceries', icon: 'shopping_bag', color: 'teal' },
  }]
  await mockCreditCardsApi(page, {
    cards: [card],
    purchases: [purchase],
    statement,
    onCorrection({ payload }) {
      statement.installments[0].description = payload.description
    },
    onCreditEvent({ payload }) {
      statement.installments[0].credit_adjustment = money(payload.amount_centavos)
      statement.installments[0].recognized_amount = money(10_000 - payload.amount_centavos)
      statement.credit_adjustments = money(payload.amount_centavos)
      statement.net_amount = money(10_000 - payload.amount_centavos)
      statement.outstanding_amount = money(10_000 - payload.amount_centavos)
    },
  })
  await page.goto('/app/credit-card-statements/72')
  await page.locator('[data-test="credit-card-line-toggle-721"]').click()
  await page.locator('[data-test="credit-card-line-correct-721"]').click()
  const correction = page.getByRole('dialog', { name: 'Correct purchase' })
  await correction.getByLabel('Description').fill('Updated groceries')
  await correction.getByRole('button', { name: 'Save' }).click()
  await expect(page.locator('[data-test="credit-card-line-721"]')).toContainText('Updated groceries')
  await expect(page.locator('[data-test="credit-card-statement-outstanding"]')).toContainText('100,00')

  await page.locator('[data-test="credit-card-line-refund-721"]').click()
  const refund = page.getByRole('dialog', { name: 'Refund, cancellation, or correction' })
  await setCurrency(refund.getByLabel('Amount'), '2500')
  await refund.getByRole('button', { name: 'Save' }).click()
  await expect(page.locator('[data-test="credit-card-line-details-721"]')).toContainText('25,00')
  await expect(page.locator('[data-test="credit-card-statement-outstanding"]')).toContainText('75,00')
})

test('history identifies recognized card spending and recurring rules guide manual card purchases', async ({ page }) => {
  await mockCreditCardsApi(page, { cards: [] })
  await page.route(/\/api\/v1\/financial-accounts(?:\?[^/]*)?$/, (route) =>
    route.fulfill({ json: { data: [{ id: 7, name: 'Main account', status: 'active' }] }, headers: apiHeaders() }),
  )
  await page.route(/\/api\/v1\/financial-history(?:\?[^/]*)?$/, (route) =>
    route.fulfill({
      json: {
        data: [{
          movement_kind: 'credit_card_expense',
          id: 301,
          amount_centavos: 12_345,
          currency_code: 'BRL',
          movement_date: '2026-09-25',
          status: 'effective',
          description: 'Groceries',
          financial_account: null,
          credit_card: { id: 41, name: 'Nubank Platinum', status: 'active' },
          category: { id: 18, name: 'Groceries', classification: 'expense', status: 'active' },
        }],
        meta: {
          total: 1,
          current_page: 1,
          last_page: 1,
          totals: { income_centavos: 0, expense_centavos: 12_345, financial_result_centavos: -12_345 },
        },
      },
      headers: apiHeaders(),
    }),
  )
  await page.route(/\/api\/v1\/recurring-transactions(?:\?[^/]*)?$/, (route) =>
    route.fulfill({ json: { data: [], meta: { total: 0, current_page: 1, last_page: 1 } }, headers: apiHeaders() }),
  )

  await page.goto('/app/transactions')
  await expect(page.locator('[data-test="credit-card-history-label"]')).toContainText('Expense recognized when the statement closes')
  await expect(page.locator('[data-test="credit-card-history-card"]')).toContainText('Nubank Platinum')
  await expect(page.locator('[data-test="transaction-history-amount"]')).toContainText('123,45')

  await page.goto('/app/recurring-transactions')
  await expect(page.locator('[data-test="credit-card-recurring-unsupported"]')).toContainText('Recurring transactions do not use credit cards')
  await expect(page.locator('[data-test="credit-card-recurring-unsupported"]')).toContainText('Record the card purchase manually')
})

test('dashboard separates card obligations from cash and stays usable by keyboard on a narrow dark screen', async ({ page }) => {
  const card = creditCard(41, 'Nubank Platinum', 'active', {
    summary: {
      used_credit: money(12_345),
      available_credit: money(487_655),
    },
  })
  await mockCreditCardsApi(page, { cards: [card] })
  await page.route('**/api/v1/financial-dashboard/credit-cards', (route) =>
    route.fulfill({
      json: {
        data: {
          outstanding_obligation: money(12_345),
          card_credit: money(0),
          available_credit: money(487_655),
          cards: [card],
          upcoming_statements: [{ ...card.current_statement, id: 72, card, outstanding_amount: money(12_345), status: 'closed' }],
        },
      },
      headers: apiHeaders(),
    }),
  )
  await page.setViewportSize({ width: 320, height: 900 })
  await page.emulateMedia({ colorScheme: 'dark' })

  await page.goto('/app')

  const summary = page.locator('[data-test="dashboard-credit-cards"]')
  await expect(summary).toBeVisible()
  await expect(summary.locator('[data-test="dashboard-credit-cards-outstanding"]')).toContainText('123,45')
  await expect(summary.locator('[data-test="dashboard-credit-cards-available"]')).toContainText('4.876,55')
  await expect(summary).toContainText('separate from account balances')
  await expect(summary.locator('[data-test="dashboard-credit-card-statement-72"]')).toContainText('123,45')

  const manage = summary.locator('[data-test="dashboard-credit-cards-link"]')
  await expect(manage).toHaveAccessibleName('Manage cards')
  await manage.focus()
  await expect(manage).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/\/app\/credit-cards$/)
})

test('budget view explains that card spending is recognized at statement closing', async ({ page }) => {
  await mockCreditCardsApi(page, { cards: [] })
  await page.route('**/api/v1/budgets/**', (route) =>
    route.fulfill({
      json: {
        data: {
          period: { year: 2026, month: 9, from: '2026-09-01', to: '2026-09-30' },
          budget: {
            id: 7,
            period: { year: 2026, month: 9, from: '2026-09-01', to: '2026-09-30' },
            summary: {
              total_planned: money(100_000), budgeted_realized: money(12_345), actual_available: money(87_655),
              overall_utilization_percent: 12, overall_status: 'within', unbudgeted_expenses: money(0), total_expenses: money(12_345),
              expected: null, projected_spending: null, projected_available: null, projected_status: null,
            },
            plans: [],
          },
        },
      },
      headers: apiHeaders(),
    }),
  )

  await page.goto('/app/budgets')
  await expect(page.locator('[data-test="budget-card-recognition-note"]')).toContainText('statement closes')
})

test('owner corrects an open purchase and records a traceable refund event', async ({ page }) => {
  const card = creditCard(41, 'Nubank Platinum')
  const purchase = purchaseFixture(card, {
    category_id: 18,
    description: 'Headphones',
    purchase_date: '2026-09-05',
    total_amount_centavos: 10_000,
    installment_count: 1,
  }, 301)
  await mockCreditCardsApi(page, { cards: [card], purchases: [purchase] })

  await page.goto('/app/credit-cards/41')
  await expect(page.locator('[data-test="credit-card-purchase-301"]')).toContainText('Headphones')

  await page.locator('[data-test="credit-card-purchase-actions-301"]').click()
  await page.locator('[data-test="credit-card-purchase-correct-301"]').click()
  let dialog = page.getByRole('dialog', { name: 'Correct purchase' })
  await dialog.getByLabel('Description').fill('Corrected headphones')
  await dialog.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByText('Purchase corrected.')).toBeVisible()
  await expect(page.locator('[data-test="credit-card-purchase-301"]')).toContainText('Corrected headphones')

  await page.locator('[data-test="credit-card-purchase-actions-301"]').click()
  await page.locator('[data-test="credit-card-purchase-credit-event-301"]').click()
  dialog = page.getByRole('dialog', { name: 'Refund, cancellation, or correction' })
  await dialog.getByLabel('Amount').press('Control+A')
  await dialog.getByLabel('Amount').pressSequentially('2500')
  await dialog.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByText('Event recorded.')).toBeVisible()
  await expect(page.locator('[data-test="credit-card-detail-summary"]')).toContainText('25,00')
})

test('detail dashboard keeps statement navigation and purchase actions usable on a narrow dark screen', async ({ page }) => {
  const card = creditCard(41, 'Nubank Platinum')
  card.current_statement = {
    ...card.current_statement,
    id: 72,
    status: 'closed',
    outstanding_amount: money(10_000),
  }
  const purchase = purchaseFixture(card, {
    category_id: 18,
    description: 'Headphones',
    purchase_date: '2026-09-05',
    total_amount_centavos: 10_000,
    installment_count: 1,
  }, 301)
  const statement = statementFixture({ id: 41, name: 'Nubank Platinum', status: 'active' })
  await mockCreditCardsApi(page, { cards: [card], purchases: [purchase], statements: [card.current_statement], statement })

  await page.setViewportSize({ width: 320, height: 900 })
  await page.emulateMedia({ colorScheme: 'dark' })
  await page.goto('/app/credit-cards/41')

  await expect(page.locator('[data-test="credit-card-current-statement"]')).toContainText('Closed')
  await expect(page.locator('[data-test="credit-card-purchase-301"]')).toContainText('Headphones')
  await expect(page.locator('[data-test="credit-card-purchase-actions-301"]')).toHaveAccessibleName('Purchase actions')
  await expect(page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).resolves.toBe(true)

  await page.locator('[data-test="credit-card-current-statement-open"]').click()
  await expect(page).toHaveURL(/\/app\/credit-card-statements\/72$/)
})

test('owner cannot archive a card while it still has an obligation or card credit', async ({ page }) => {
  await mockCreditCardsApi(page, {
    cards: [creditCard(41, 'Nubank Platinum')],
    archiveError: 'Settle outstanding statements and card credit before archiving.',
  })

  await page.goto('/app/credit-cards')
  await page.locator('[data-test="credit-card-archive"]').click()
  const dialog = page.getByRole('dialog', { name: 'Archive card' })
  await dialog.getByRole('button', { name: 'Archive' }).click()

  await expect(dialog.locator('[data-test="credit-card-archive-error"]')).toContainText('Settle outstanding statements')
  await expect(page.locator('[data-test="credit-card-41"]')).toBeVisible()
})

async function mockCreditCardsApi(page, options) {
  await page.route('**/api/v1/auth/session', (route) =>
    route.fulfill({ json: sessionPayload(), headers: apiHeaders() }),
  )
  await page.route('**/sanctum/csrf-cookie', (route) =>
    route.fulfill({
      status: 204,
      headers: { ...apiHeaders(), 'Set-Cookie': 'XSRF-TOKEN=mocked-token; Path=/; SameSite=Lax' },
    }),
  )
  await page.route(/\/api\/v1\/categories(?:\?[^/]*)?$/, (route) =>
    route.fulfill({
      json: { data: [{ id: 18, name: 'Groceries', classification: 'expense', status: 'active' }] },
      headers: apiHeaders(),
    }),
  )
  await page.route('**/api/v1/credit-cards**', async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const { pathname } = url

    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: apiHeaders() })

    if (pathname === '/api/v1/credit-cards' && request.method() === 'GET') {
      const view = url.searchParams.get('view') ?? 'active'
      return route.fulfill({
        json: { data: options.cards.filter((card) => card.status === view) },
        headers: apiHeaders(),
      })
    }

    if (pathname === '/api/v1/credit-cards' && request.method() === 'POST') {
      const payload = request.postDataJSON()
      options.onCreate?.(payload)
      const created = creditCard(20, payload.name, 'active', {
        institution_name: payload.institution_name,
        last_four: payload.last_four,
        closing_day: payload.closing_day,
        due_day: payload.due_day,
        color: payload.color,
        icon: payload.icon,
        summary: {
          credit_limit: money(payload.credit_limit_centavos),
          available_credit: money(payload.credit_limit_centavos),
        },
      })
      options.cards.push(created)
      return route.fulfill({ status: 201, json: { data: created }, headers: apiHeaders() })
    }

    const cardMatch = pathname.match(/^\/api\/v1\/credit-cards\/(\d+)(?:\/(archive|purchases|statements))?$/)
    if (!cardMatch) return route.continue()

    const [, id, action] = cardMatch
    const card = options.cards.find((item) => item.id === Number(id))
    if (!card) return route.fulfill({ status: 404, json: { message: 'Not found' }, headers: apiHeaders() })

    if (action === 'purchases' && request.method() === 'GET') {
      return route.fulfill({ json: { data: options.purchases ?? [], meta: { current_page: 1, last_page: 1, per_page: 50, total: (options.purchases ?? []).length } }, headers: apiHeaders() })
    }
    if (action === 'purchases' && request.method() === 'POST') {
      const payload = request.postDataJSON()
      const key = request.headers()['idempotency-key']
      options.onPurchase?.({ payload, key })

      if (options.requireOverLimit && payload.description === 'Above limit' && !payload.confirm_over_limit) {
        return route.fulfill({
          status: 409,
          json: {
            message: 'Purchase requires explicit over-limit confirmation.',
            code: 'OVER_LIMIT_CONFIRMATION_REQUIRED',
            resulting_available_credit: money(-10_000),
            is_over_limit: true,
          },
          headers: apiHeaders(),
        })
      }

      const purchase = purchaseFixture(card, payload, (options.purchases ?? []).length + 301)
      options.purchases ??= []
      options.purchases.push(purchase)
      return route.fulfill({ status: 201, json: { data: purchase }, headers: apiHeaders() })
    }
    if (action === 'statements' && request.method() === 'GET') {
      const statements = options.statements ?? []
      return route.fulfill({ json: { data: statements, meta: { current_page: 1, last_page: 1, per_page: 50, total: statements.length } }, headers: apiHeaders() })
    }
    if (action === 'archive' && request.method() === 'POST') {
      if (options.archiveError) {
        return route.fulfill({
          status: 409,
          json: { message: options.archiveError, code: 'card_has_outstanding_obligation' },
          headers: apiHeaders(),
        })
      }
      Object.assign(card, { status: 'archived' })
      card.current_statement.is_current = false
      card.current_statement.card.status = 'archived'
      return route.fulfill({ json: { data: card }, headers: apiHeaders() })
    }
    if (!action && request.method() === 'PATCH') {
      Object.assign(card, request.postDataJSON())
      card.current_statement.card.name = card.name
      return route.fulfill({ json: { data: card }, headers: apiHeaders() })
    }
    if (!action && request.method() === 'GET') {
      return route.fulfill({ json: { data: card }, headers: apiHeaders() })
    }

    return route.continue()
  })

  await page.route(/\/api\/v1\/financial-accounts(?:\?[^/]*)?$/, (route) =>
    route.fulfill({ json: { data: options.accounts ?? [] }, headers: apiHeaders() }),
  )
  await page.route(/\/api\/v1\/credit-card-statements\/(\d+)$/, (route) => {
    if (!options.statement) return route.fulfill({ status: 404, json: { message: 'Not found' }, headers: apiHeaders() })

    return route.fulfill({ json: { data: options.statement }, headers: apiHeaders() })
  })
  await page.route(/\/api\/v1\/credit-card-statements\/(\d+)\/payments$/, (route) => {
    if (!options.statement || route.request().method() !== 'POST') return route.continue()

    const payload = route.request().postDataJSON()
    const payment = {
      id: 11,
      amount: money(payload.amount_centavos),
      payment_date: payload.payment_date,
      notes: payload.notes ?? null,
      status: 'effective',
      is_removed: false,
      financial_account: (options.accounts ?? []).find((account) => account.id === payload.financial_account_id),
    }
    options.statement.payments = [payment]
    restatePayment(options.statement)
    options.onPayment?.({ method: 'POST', payload, key: route.request().headers()['idempotency-key'] })

    return route.fulfill({ status: 201, json: { data: { payment, statement: options.statement, card: options.cards[0] } }, headers: apiHeaders() })
  })
  await page.route(/\/api\/v1\/credit-card-payments\/(\d+)(?:\/(remove|restore))?$/, (route) => {
    if (!options.statement) return route.continue()

    const [, paymentId, action] = new URL(route.request().url()).pathname.match(/credit-card-payments\/(\d+)(?:\/(remove|restore))?$/) ?? []
    const payment = options.statement.payments.find((entry) => entry.id === Number(paymentId))
    if (!payment) return route.fulfill({ status: 404, json: { message: 'Not found' }, headers: apiHeaders() })

    const method = route.request().method()
    const payload = method === 'PATCH' || action === 'restore' ? route.request().postDataJSON() : undefined
    if (method === 'PATCH') {
      payment.amount = money(payload.amount_centavos)
      payment.payment_date = payload.payment_date
      payment.notes = payload.notes ?? null
      payment.financial_account = (options.accounts ?? []).find((account) => account.id === payload.financial_account_id)
    } else if (action === 'remove') payment.is_removed = true
    else if (action === 'restore') payment.is_removed = false
    else return route.continue()

    restatePayment(options.statement)
    options.onPayment?.({ method, action, payload, key: route.request().headers()['idempotency-key'] })
    return route.fulfill({ json: { data: { payment, statement: options.statement, card: options.cards[0] } }, headers: apiHeaders() })
  })
  await page.route(/\/api\/v1\/credit-card-purchases\/(\d+)\/credit-events$/, (route) => {
    if (route.request().method() !== 'POST') return route.continue()

    const purchase = (options.purchases ?? []).find((item) => item.id === Number(new URL(route.request().url()).pathname.match(/credit-card-purchases\/(\d+)/)?.[1]))
    if (!purchase) return route.fulfill({ status: 404, json: { message: 'Not found' }, headers: apiHeaders() })
    const payload = route.request().postDataJSON()
    const event = { id: (purchase.credit_events?.length ?? 0) + 1, ...payload, amount: money(payload.amount_centavos), applications: [] }
    purchase.credit_events ??= []
    purchase.credit_events.push(event)
    options.cards[0].summary.card_credit = money(payload.amount_centavos)
    options.onCreditEvent?.({ purchase, payload })
    return route.fulfill({ status: 201, json: { data: { credit_event: event, card: options.cards[0], applications: [] } }, headers: apiHeaders() })
  })
  await page.route(/\/api\/v1\/credit-card-purchases\/(\d+)$/, (route) => {
    const purchase = (options.purchases ?? []).find((item) => item.id === Number(new URL(route.request().url()).pathname.match(/credit-card-purchases\/(\d+)/)?.[1]))
    if (!purchase) return route.fulfill({ status: 404, json: { message: 'Not found' }, headers: apiHeaders() })
    if (route.request().method() === 'GET') return route.fulfill({ json: { data: purchase }, headers: apiHeaders() })
    if (route.request().method() !== 'PATCH') return route.continue()
    const payload = route.request().postDataJSON()
    Object.assign(purchase, {
      category: { id: payload.category_id, name: 'Groceries', classification: 'expense', status: 'active' },
      description: payload.description,
      purchase_date: payload.purchase_date,
      total_amount: money(payload.total_amount_centavos),
      installment_count: payload.installment_count,
    })
    options.onCorrection?.({ purchase, payload })
    return route.fulfill({ json: { data: purchase }, headers: apiHeaders() })
  })
}

function statementFixture(card) {
  return {
    id: 72,
    card,
    period_from: '2026-09-01',
    period_to: '2026-09-30',
    closing_date: '2026-09-30',
    due_date: '2026-10-05',
    original_amount: money(10_000),
    credit_adjustments: money(0),
    net_amount: money(10_000),
    paid_amount: money(0),
    card_credit_applied: money(0),
    outstanding_amount: money(10_000),
    status: 'closed',
    is_current: false,
    installments: [],
    payments: [],
    credit_events: [],
  }
}

function restatePayment(statement) {
  const paid = statement.payments
    .filter((payment) => !payment.is_removed)
    .reduce((total, payment) => total + payment.amount.amount_centavos, 0)
  const net = statement.net_amount.amount_centavos
  const outstanding = Math.max(0, net - paid)
  statement.paid_amount = money(paid)
  statement.outstanding_amount = money(outstanding)
  statement.status = outstanding === 0 ? 'paid' : paid === 0 ? 'closed' : 'partially_paid'
}

function purchaseFixture(card, payload, id) {
  const amounts = Array.from({ length: payload.installment_count }, (_, index) =>
    Math.floor(payload.total_amount_centavos / payload.installment_count) + (index < payload.total_amount_centavos % payload.installment_count ? 1 : 0),
  )

  return {
    id,
    card,
    category: { id: payload.category_id, name: 'Groceries', classification: 'expense', status: 'active' },
    description: payload.description,
    notes: payload.notes ?? null,
    purchase_date: payload.purchase_date,
    total_amount: money(payload.total_amount_centavos),
    installment_count: payload.installment_count,
    installments: amounts.map((amount, index) => ({
      id: id * 10 + index,
      sequence: index + 1,
      total_count: payload.installment_count,
      amount: money(amount),
      credit_adjustment: money(0),
      recognized_amount: money(amount),
      recognition_date: `2026-${String(9 + index).padStart(2, '0')}-25`,
      recognition_status: 'pending',
      statement: {
        id: 72 + index,
        closing_date: `2026-${String(9 + index).padStart(2, '0')}-25`,
        due_date: `2026-${String(10 + index).padStart(2, '0')}-05`,
      },
    })),
    credit_events: [],
    is_directly_editable: true,
  }
}

async function chooseOption(page, select, name) {
  await select.click()
  const controls = await select.locator('[aria-controls]').first().getAttribute('aria-controls')
  await page.locator(`#${controls}`).getByRole('option', { name, exact: true }).click()
}

async function setCurrency(input, digits) {
  await input.press('Control+A')
  await input.pressSequentially(digits)
}
