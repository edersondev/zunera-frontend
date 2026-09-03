import { expect, test } from '@playwright/test'

test('authenticated user creates and sees an active account', async ({ page }) => {
  let createPayload = null
  await mockApi(page, {
    accounts: [],
    createdName: 'Conta principal',
    onCreate: (payload) => {
      createPayload = payload
    },
  })
  await page.emulateMedia({ colorScheme: 'dark' })

  await page.goto('/app/financial-accounts')
  await expect(page.getByRole('heading', { name: 'Financial accounts' })).toBeVisible()
  await expect(page.getByText('No active accounts yet')).toBeVisible()
  const newAccountButton = page.getByRole('button', { name: 'New account' })
  await expect(newAccountButton).toHaveCSS('background-color', 'rgb(45, 212, 191)')
  await expect(newAccountButton).toHaveCSS('color', 'rgb(4, 47, 46)')
  await newAccountButton.hover()
  await expect(newAccountButton).toHaveCSS('background-color', 'rgb(94, 234, 212)')

  await newAccountButton.click()
  const createDialog = page.getByRole('dialog', { name: 'New account' })
  await createDialog.getByRole('button', { name: 'Cancel' }).click()
  await expect(createDialog).not.toBeVisible()

  await page.getByRole('button', { name: 'New account' }).click()
  await createDialog.getByLabel('Account name').fill('Conta principal')
  await createDialog.getByLabel('Financial institution (optional)').fill('Nubank')
  const openingBalance = createDialog.getByLabel('Opening balance')
  await openingBalance.pressSequentially('2032')
  await expect(openingBalance).toHaveValue('20,32')
  await createDialog.getByRole('button', { name: 'Create account' }).click()

  await expect(page.getByText('Financial account created.')).toBeVisible()
  await expect(page.locator('.feedback')).toHaveCSS('background-color', 'rgb(21, 58, 39)')
  await expect(page.getByRole('button', { name: 'Conta principal' })).toBeVisible()
  await expect(page.getByText('R$ 20,32').first()).toBeVisible()
  expect(createPayload.initial_balance_centavos).toBe(2_032)

  await page.getByRole('button', { name: 'Archive' }).click()
  const archiveDialog = page.getByRole('dialog', { name: 'Archive account' })
  const archiveButton = archiveDialog.getByRole('button', { name: 'Archive account' })
  await expect(archiveButton).toHaveCSS('background-color', 'rgb(251, 191, 36)')
  await expect(archiveButton).toHaveCSS('color', 'rgb(67, 20, 7)')
  await archiveButton.hover()
  await expect(archiveButton).toHaveCSS('background-color', 'rgb(252, 211, 77)')
  await archiveDialog.getByRole('button', { name: 'Cancel' }).click()
})

test('owner opens the edit dialog from the active account list and updates the name', async ({
  page,
}) => {
  const account = financialAccount(7, 'Conta principal', 'active')
  await mockApi(page, { accounts: [account], updatedName: 'Conta nova' })

  await page.goto('/app/financial-accounts')
  await expect(page.getByRole('button', { name: 'Conta principal' })).toBeVisible()
  await expect(page.getByText('Nubank')).toBeVisible()

  await page.getByRole('button', { name: 'Conta principal' }).click()
  const editDialog = page.getByRole('dialog', { name: 'Edit account' })
  await editDialog.getByLabel('Account name').fill('Conta nova')
  await editDialog.getByRole('button', { name: 'Save changes' }).click()

  await expect(page.getByText('Account details saved.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Conta nova' })).toBeVisible()
})

test('owner archives and restores an account with isolated state', async ({ page }) => {
  const active = financialAccount(11, 'Conta corrente', 'active')
  const archived = { ...active, status: 'archived', archived_at: '2026-09-02T15:00:00Z' }
  await mockApi(page, { accounts: [active, archived], archived, activeAccount: active })

  await page.goto('/app/financial-accounts')
  await page.getByRole('button', { name: 'Archive' }).click()

  const dialog = page.getByRole('dialog')
  await expect(dialog.getByText('Conta corrente')).toBeVisible()
  await dialog.getByRole('button', { name: 'Archive account' }).click()
  await expect(page.getByText('Financial account archived.')).toBeVisible()

  await page.goto('/app/financial-accounts/archived')
  await expect(page.getByText('Conta corrente', { exact: true })).toBeVisible()

  await page.getByRole('button', { name: 'Restore' }).click()
  const restoreDialog = page.getByRole('dialog')
  await restoreDialog.getByRole('button', { name: 'Restore account' }).click()
  await expect(page.getByText('Financial account restored.')).toBeVisible()
})

test('account shell remains keyboard reachable at compact width in dark theme', async ({
  page,
}) => {
  const account = financialAccount(22, 'Conta principal', 'active')
  await mockApi(page, { accounts: [account], updatedName: 'Conta nova' })
  await page.setViewportSize({ width: 320, height: 800 })
  await page.emulateMedia({ colorScheme: 'dark' })

  await page.goto('/app/financial-accounts')
  await expect(page.getByRole('heading', { name: 'Financial accounts' })).toBeVisible()

  await page.getByRole('link', { name: 'Skip to main content' }).focus()
  await expect(page.getByRole('link', { name: 'Skip to main content' })).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(page.getByRole('button', { name: 'Open navigation' })).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('navigation', { name: 'Primary navigation' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('button', { name: 'Open navigation' })).toBeFocused()

  await page.evaluate(() => {
    document.documentElement.style.zoom = '2'
  })
  await expect(page.getByRole('heading', { name: 'Financial accounts' })).toBeVisible()
  await page.getByRole('button', { name: 'New account' }).click()
  await expect(
    page.getByRole('dialog', { name: 'New account' }).getByLabel('Account name'),
  ).toBeVisible()
})

function financialAccount(id, name, status, overrides = {}) {
  return {
    id,
    name,
    account_type: 'checking',
    status,
    institution_name: 'Nubank',
    color: 'teal',
    icon: 'wallet',
    initial_balance_centavos: 125_050,
    current_balance_centavos: 125_050,
    currency_code: 'BRL',
    has_financial_movements: false,
    archived_at: status === 'archived' ? '2026-09-01T12:00:00Z' : null,
    created_at: '2026-09-02T12:00:00Z',
    updated_at: '2026-09-02T12:00:00Z',
    ...overrides,
  }
}

async function mockApi(page, options) {
  const summary = {
    data: {
      active_account_count: options.accounts.length,
      active_combined_balance_centavos: options.accounts.reduce(
        (total, account) =>
          total + (account.status === 'active' ? account.current_balance_centavos : 0),
        0,
      ),
      currency_code: 'BRL',
    },
  }

  await page.route('**/api/v1/auth/session', (route) =>
    route.fulfill({ json: sessionPayload(), headers: apiHeaders() }),
  )
  await page.route('**/sanctum/csrf-cookie', (route) =>
    route.fulfill({
      status: 204,
      headers: {
        ...apiHeaders(),
        'Set-Cookie': 'XSRF-TOKEN=mocked-token; Path=/; SameSite=Lax',
      },
    }),
  )

  await page.route('**/api/v1/financial-accounts/summary', (route) =>
    route.fulfill({ json: summary, headers: apiHeaders() }),
  )

  await page.route('**/api/v1/financial-accounts/7', async (route) => {
    const request = route.request()

    if (request.method() === 'OPTIONS') {
      return route.fulfill({ status: 204, headers: apiHeaders() })
    }

    if (request.method() === 'GET') {
      return route.fulfill({ json: { data: options.accounts[0] }, headers: apiHeaders() })
    }

    if (request.method() === 'PATCH') {
      const updated = { ...options.accounts[0], name: options.updatedName }
      return route.fulfill({ json: { data: updated }, headers: apiHeaders() })
    }

    return route.continue()
  })

  await page.route('**/api/v1/financial-accounts/11/archive', (route) =>
    route.fulfill({ json: { data: options.archived }, headers: apiHeaders() }),
  )

  await page.route('**/api/v1/financial-accounts/11/restore', (route) =>
    route.fulfill({ json: { data: options.activeAccount }, headers: apiHeaders() }),
  )

  await page.route(/\/api\/v1\/financial-accounts(?:\?[^/]*)?$/, async (route) => {
    const request = route.request()
    const url = new URL(request.url())

    if (request.method() === 'OPTIONS') {
      return route.fulfill({ status: 204, headers: apiHeaders() })
    }

    if (url.pathname.endsWith('/financial-accounts') && request.method() === 'GET') {
      const status = url.searchParams.get('status') ?? 'active'
      return route.fulfill({
        json: {
          data: options.accounts.filter((account) => account.status === status),
        },
        headers: apiHeaders(),
      })
    }

    if (url.pathname.endsWith('/financial-accounts') && request.method() === 'POST') {
      const payload = request.postDataJSON()
      options.onCreate?.(payload)
      const account = financialAccount(20, payload.name, 'active', {
        institution_name: payload.institution_name,
        initial_balance_centavos: payload.initial_balance_centavos,
        current_balance_centavos: payload.initial_balance_centavos,
      })
      options.accounts.push(account)
      return route.fulfill({ status: 201, json: { data: account }, headers: apiHeaders() })
    }

    return route.continue()
  })
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
