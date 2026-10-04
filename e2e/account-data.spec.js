import { expect, test } from '@playwright/test'
import { pinLocale } from './support/locale.js'

test('account data can be archived, browsed read-only, and deleted with current password', async ({ page }) => {
  await pinLocale(page, 'en')
  await page.setViewportSize({ width: 320, height: 800 })
  const state = { archives: [], archiveCalls: 0, deleteCalls: 0 }
  const session = {
    user: { id: 7, name: 'Person', email: 'person@example.com' },
    session: {
      idle_expires_at: new Date(Date.now() + 900_000).toISOString(),
      absolute_expires_at: new Date(Date.now() + 28_800_000).toISOString(),
    },
  }
  await page.route('**/sanctum/csrf-cookie', (route) => route.fulfill({ status: 204 }))
  await page.route('**/api/v1/auth/session', (route) => route.fulfill({ json: { data: session } }))
  await page.route('**/api/v1/notifications**', (route) => route.fulfill({ json: { data: { unread_count: 0, requires_action_count: 0 } } }))
  await page.route('**/api/v1/financial-dashboard/**', (route) => route.fulfill({ json: { data: {} } }))
  await page.route('**/api/v1/account-data**', (route) => {
    const url = new URL(route.request().url())
    const method = route.request().method()
    if (url.pathname.endsWith('/account-data/archive') && method === 'POST') {
      state.archiveCalls++
      state.archives = [{ id: 4, created_at: '2026-10-03T12:00:00Z', record_count: 2 }]
      return route.fulfill({ status: 201, json: { data: state.archives[0] } })
    }
    if (url.pathname.endsWith('/account-data') && method === 'DELETE') {
      state.deleteCalls++
      if (route.request().postDataJSON().current_password !== 'correct password') {
        return route.fulfill({ status: 422, json: {
          message: 'The given data was invalid.',
          errors: { current_password: ['The current password is incorrect.'] },
        } })
      }
      state.archives = []
      return route.fulfill({ status: 204 })
    }
    if (url.pathname.endsWith('/account-data/archives')) {
      return route.fulfill({ json: { data: state.archives } })
    }
    if (url.pathname.endsWith('/account-data/archives/4/records')) {
      const type = url.searchParams.get('type')
      const records = type === 'transactions' ? [{ type, source_id: 8, payload: {
        id: 8, description: 'Groceries', amount_centavos: 1234, currency_code: 'BRL',
      } }] : []
      return route.fulfill({ json: { data: records, meta: { current_page: 1, last_page: 1, total: records.length } } })
    }
    return route.fulfill({ status: 404, json: { message: 'Not found.' } })
  })

  await page.goto('/app/account-data')
  await expect(page.getByRole('heading', { name: 'Reset account data' })).toBeVisible()
  await page.getByRole('button', { name: 'Delete all data' }).click()
  const deleteDialog = page.getByRole('dialog', { name: 'Delete all' })
  await expect(deleteDialog.getByText('cannot be restored in Zunera')).toBeVisible()
  await deleteDialog.getByRole('button', { name: 'Delete all data' }).click()
  expect(state.deleteCalls).toBe(0)
  await deleteDialog.getByLabel('Current password').fill('wrong password')
  await deleteDialog.getByRole('button', { name: 'Delete all data' }).click()
  await expect(deleteDialog.getByText('The current password is incorrect.').first()).toBeVisible()
  await deleteDialog.getByRole('button', { name: 'Cancel' }).click()

  await page.getByRole('button', { name: 'Archive all data' }).click()
  const archiveDialog = page.getByRole('dialog', { name: 'Archive all' })
  await expect(archiveDialog.getByLabel('Current password')).toHaveCount(0)
  await archiveDialog.getByRole('button', { name: 'Archive all data' }).click()
  await expect(page).toHaveURL(/\/app\/?$/)
  await page.waitForLoadState('load')
  expect(state.archiveCalls).toBe(1)

  state.archives.push({ id: 5, created_at: '2026-10-04T12:00:00Z', record_count: 0 })
  await page.goto('/app/account-data')
  await expect(page.getByRole('link', { name: 'View archive #4' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'View archive #5' })).toBeVisible()
  await page.getByRole('link', { name: 'View archive #4' }).click()
  await expect(page.getByRole('heading', { name: 'Archive #4' })).toBeVisible()
  await page.locator('.archive-filter .el-select').click()
  await page.getByRole('option', { name: 'Transactions', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Groceries' })).toBeVisible()
  await expect(page.getByText('R$12.34')).toBeVisible()
  await expect(page.getByRole('button', { name: /edit|restore/i })).toHaveCount(0)

  await page.getByRole('link', { name: 'Back to account data' }).click()
  await page.getByRole('button', { name: 'Delete all data' }).click()
  await page.getByRole('dialog', { name: 'Delete all' }).getByLabel('Current password').fill('correct password')
  await page.getByRole('dialog', { name: 'Delete all' }).getByRole('button', { name: 'Delete all data' }).click()
  await expect(page).toHaveURL(/\/app\/?$/)
  await page.waitForLoadState('load')
  expect(state.deleteCalls).toBe(2)
  await page.goto('/app/account-data')
  await expect(page.getByText('No archives yet.')).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true)
})
