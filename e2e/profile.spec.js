import { expect, test } from '@playwright/test'
import { pinLocale } from './support/locale.js'

async function mockProfileApi(page, { rejectPassword = false } = {}) {
  const state = { user: { id: 7, name: 'Original Name', email: 'person@example.com' }, profilePayload: null, passwordPayload: null, signedIn: true, logoutCount: 0 }
  const session = { idle_expires_at: new Date(Date.now() + 900_000).toISOString(), absolute_expires_at: new Date(Date.now() + 28_800_000).toISOString() }
  await page.route('**/sanctum/csrf-cookie', (route) => route.fulfill({ status: 204 }))
  await page.route('**/api/v1/auth/session', (route) => {
    if (route.request().method() === 'DELETE') {
      state.signedIn = false
      state.logoutCount += 1
      return route.fulfill({ status: 204 })
    }
    return state.signedIn
      ? route.fulfill({ json: { data: { user: state.user, session } } })
      : route.fulfill({ status: 401, json: { message: 'Unauthenticated.' } })
  })
  await page.route('**/api/v1/auth/profile', (route) => {
    state.profilePayload = route.request().postDataJSON()
    state.user = { ...state.user, name: state.profilePayload.name.trim() }
    return route.fulfill({ json: { data: state.user } })
  })
  await page.route('**/api/v1/auth/password', (route) => {
    state.passwordPayload = route.request().postDataJSON()
    if (rejectPassword) {
      return route.fulfill({
        status: 422,
        json: { message: 'The current password is incorrect.', errors: { current_password: ['The current password is incorrect.'] } },
      })
    }
    return route.fulfill({ status: 204 })
  })
  await page.route('**/api/v1/notifications**', (route) => route.fulfill({ json: route.request().url().endsWith('/summary')
    ? { data: { unread_count: 0, requires_action_count: 0 } }
    : { data: [], next_cursor: null } }))
  await page.route('**/api/v1/notification-preferences**', (route) => route.fulfill({ json: { data: {} } }))
  return state
}

test('account menu opens separate name and password dialogs without allowing email edits', async ({ page }) => {
  await pinLocale(page, 'en')
  await page.setViewportSize({ width: 320, height: 800 })
  const state = await mockProfileApi(page)
  await page.goto('/app/notifications')

  const account = page.getByRole('button', { name: 'Account menu for Original Name' })
  await account.click()
  await page.getByRole('menuitem', { name: 'Edit profile' }).click()
  const dialog = page.getByRole('dialog', { name: 'Edit profile' })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole('textbox', { name: 'Email' })).toBeDisabled()
  await expect(dialog.getByRole('textbox', { name: 'Email' })).toHaveValue('person@example.com')
  await expect(dialog.getByLabel('Current password')).toHaveCount(0)
  await expect(dialog.getByRole('button', { name: 'Cancel' }).locator('svg')).toHaveCount(1)
  await expect(dialog.getByRole('button', { name: 'Save', exact: true }).locator('svg')).toHaveCount(1)

  await dialog.getByRole('textbox', { name: 'Full name' }).fill('Updated Name')
  await dialog.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(dialog.getByText('Name updated.')).toBeVisible()
  await expect(page.locator('.account-menu')).toHaveAttribute('aria-label', 'Account menu for Updated Name')
  expect(state.profilePayload).toEqual({ name: 'Updated Name' })

  await dialog.getByRole('button', { name: 'Cancel' }).click()
  await expect(page.locator('.account-menu')).toBeFocused()
  await page.locator('.account-menu').click()
  await page.getByRole('menuitem', { name: 'Change password' }).click()
  const passwordDialog = page.getByRole('dialog', { name: 'Change password' })
  await expect(passwordDialog).toBeVisible()
  await expect(passwordDialog.getByRole('textbox', { name: 'Full name' })).toHaveCount(0)
  await expect(passwordDialog.getByRole('textbox', { name: 'Email' })).toHaveCount(0)
  await expect(passwordDialog.getByRole('button', { name: 'Cancel' }).locator('svg')).toHaveCount(1)
  await expect(passwordDialog.getByRole('button', { name: 'Save', exact: true }).locator('svg')).toHaveCount(1)
  await passwordDialog.getByLabel('Current password').fill('old correct battery staple')
  await passwordDialog.getByLabel('New password', { exact: true }).fill('new correct battery staple')
  await passwordDialog.getByLabel('Confirm new password').fill('new correct battery staple')
  await passwordDialog.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(passwordDialog.getByText('Password changed. Other devices were signed out.')).toBeVisible()
  expect(state.passwordPayload).toEqual({
    current_password: 'old correct battery staple',
    password: 'new correct battery staple',
    password_confirmation: 'new correct battery staple',
  })
  await passwordDialog.getByRole('button', { name: 'Cancel' }).click()
  await expect(page).toHaveURL(/\/login$/)
  expect(state.logoutCount).toBe(1)
  expect(state.signedIn).toBe(false)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true)
})

for (const { closeMethod, close } of [
  { closeMethod: 'close button', close: async (_page, dialog) => dialog.locator('.el-dialog__headerbtn').click() },
  { closeMethod: 'Escape', close: async (page) => page.keyboard.press('Escape') },
]) {
  test(`successful password change signs out when dialog closes with ${closeMethod}`, async ({ page }) => {
    await pinLocale(page, 'en')
    const state = await mockProfileApi(page)
    await page.goto('/app/notifications')
    await page.locator('.account-menu').click()
    await page.getByRole('menuitem', { name: 'Change password' }).click()
    const dialog = page.getByRole('dialog', { name: 'Change password' })
    await dialog.getByLabel('Current password').fill('old correct battery staple')
    await dialog.getByLabel('New password', { exact: true }).fill('new correct battery staple')
    await dialog.getByLabel('Confirm new password').fill('new correct battery staple')
    await dialog.getByRole('button', { name: 'Save', exact: true }).click()
    await expect(dialog.getByText('Password changed. Other devices were signed out.')).toBeVisible()

    await close(page, dialog)

    await expect(page).toHaveURL(/\/login$/)
    expect(state.logoutCount).toBe(1)
  })
}

test('profile action and fields use Portuguese labels', async ({ page }) => {
  await pinLocale(page, 'pt-BR')
  const state = await mockProfileApi(page)
  await page.goto('/app/notifications')
  await page.locator('.account-menu').click()
  await page.getByRole('menuitem', { name: 'Editar perfil' }).click()
  const dialog = page.getByRole('dialog', { name: 'Editar perfil' })
  await expect(dialog.getByRole('textbox', { name: 'E-mail' })).toBeDisabled()
  await expect(dialog.getByRole('button', { name: 'Salvar', exact: true })).toBeVisible()
  await expect(dialog.getByRole('button', { name: 'Cancelar' })).toBeVisible()
  await dialog.getByRole('button', { name: 'Cancelar' }).click()
  await page.locator('.account-menu').click()
  await page.getByRole('menuitem', { name: 'Alterar senha' }).click()
  const passwordDialog = page.getByRole('dialog', { name: 'Alterar senha' })
  await expect(passwordDialog.getByRole('button', { name: 'Salvar', exact: true })).toBeVisible()
  await expect(passwordDialog.getByRole('button', { name: 'Cancelar' })).toBeVisible()
  await passwordDialog.getByRole('button', { name: 'Cancelar' }).click()
  await expect(page).toHaveURL(/\/app\/notifications$/)
  expect(state.logoutCount).toBe(0)
})

test('incorrect current password shows the server error and clears password fields', async ({ page }) => {
  await pinLocale(page, 'en')
  const state = await mockProfileApi(page, { rejectPassword: true })
  await page.goto('/app/notifications')
  await page.locator('.account-menu').click()
  await page.getByRole('menuitem', { name: 'Change password' }).click()
  const dialog = page.getByRole('dialog', { name: 'Change password' })
  await dialog.getByLabel('Current password').fill('incorrect password')
  await dialog.getByLabel('New password', { exact: true }).fill('new correct battery staple')
  await dialog.getByLabel('Confirm new password').fill('new correct battery staple')
  await dialog.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(dialog.getByText('The current password is incorrect.').first()).toBeVisible()
  await expect(dialog.getByLabel('Current password')).toBeEmpty()
  await expect(dialog.getByLabel('New password', { exact: true })).toBeEmpty()
  await expect(dialog.getByLabel('Confirm new password')).toBeEmpty()
  await dialog.getByRole('button', { name: 'Cancel' }).click()
  await expect(page).toHaveURL(/\/app\/notifications$/)
  expect(state.logoutCount).toBe(0)
})
