import { expect, test } from '@playwright/test'
import { pinLocale } from './support/locale.js'

const email = 'person@example.com'
const token = 'a'.repeat(64)

function apiHeaders() {
  return {
    'Access-Control-Allow-Origin': 'http://localhost:4173',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Headers': 'Content-Type, X-XSRF-TOKEN, X-Requested-With, Accept, Accept-Language',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json',
  }
}

async function mockAuth(page) {
  await page.route('**/api/v1/auth/session', (route) =>
    route.fulfill({ status: 401, json: { message: 'Unauthenticated.' }, headers: apiHeaders() }),
  )
  await page.route('**/sanctum/csrf-cookie', (route) =>
    route.fulfill({ status: 204, headers: apiHeaders() }),
  )
  await page.route('**/api/v1/auth/register', (route) =>
    route.fulfill({ status: 201, json: { message: 'Check email.', activation_required: true }, headers: apiHeaders() }),
  )
  await page.route('**/api/v1/auth/activation/confirm', (route) =>
    route.fulfill({ json: { message: 'Active.' }, headers: apiHeaders() }),
  )
  await page.route('**/api/v1/auth/activation/resend', (route) =>
    route.fulfill({ status: 202, json: { message: 'If inactive, mail sent.' }, headers: apiHeaders() }),
  )
  await page.route('**/api/v1/auth/login', (route) =>
    route.fulfill({ status: 403, json: { message: 'Inactive.', code: 'account_inactive' }, headers: apiHeaders() }),
  )
}

test.beforeEach(async ({ page }) => {
  await pinLocale(page, 'en')
  await mockAuth(page)
})

test('registration stays signed out until activation link succeeds', async ({ page }) => {
  await page.goto('/register')
  await page.getByLabel('Full name').fill('Ana da Silva')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password', { exact: true }).fill('correct horse battery staple')
  await page.getByLabel('Confirm password').fill('correct horse battery staple')
  await page.getByRole('button', { name: 'Create account' }).click()

  await expect(page.getByText('Check your email to activate your account')).toBeVisible()
  await expect(page).toHaveURL(/\/register$/)

  await page.goto(`/activate-account?email=${encodeURIComponent(email)}&token=${token}`)
  await expect(page.getByText('Your account is active. You can now sign in.')).toBeVisible()
  await expect(page).not.toHaveURL(/token=/)
  await page.getByRole('link', { name: 'Return to sign in' }).click()
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible()
})

test('inactive sign-in offers a neutral resend flow', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password', { exact: true }).fill('correct horse battery staple')
  await page.getByRole('button', { name: 'Sign in' }).click()

  await expect(page.getByText('Your account is inactive. Activate it using the link sent to your email.')).toBeVisible()
  await page.getByRole('link', { name: 'Resend activation link' }).first().click()
  await page.getByRole('button', { name: 'Resend activation link' }).click()
  await expect(page.getByText('If an inactive account exists for that email, a new link will be sent.')).toBeVisible()
})
