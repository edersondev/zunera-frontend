import { expect, test } from '@playwright/test'

test('authenticated user browses defaults and creates a personal category', async ({ page }) => {
  const categories = [category(1, 'Food', 'system'), category(2, 'Salary', 'system', 'income')]
  await mockApi(page, categories)
  await page.emulateMedia({ colorScheme: 'dark' })
  await page.goto('/app/categories')
  await expect(page.getByRole('heading', { name: 'Categories', exact: true })).toBeVisible()
  await expect(page.getByText('System default').first()).toBeVisible()
  await expect(page.getByText('Food', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'New category' }).click()
  const dialog = page.getByRole('dialog', { name: 'New category' })
  await dialog.getByLabel('Category name').fill('Pet care')
  await dialog.getByRole('button', { name: 'Create category' }).click()
  await expect(page.getByText('Category created.')).toBeVisible()
  await expect(page.getByText('Pet care', { exact: true })).toBeVisible()
})

test('category lifecycle remains keyboard reachable at compact width', async ({ page }) => {
  const categories = [category(21, 'Pet care', 'personal')]
  await mockApi(page, categories)
  await page.setViewportSize({ width: 320, height: 800 })
  await page.goto('/app/categories')
  await page.getByRole('link', { name: 'Skip to main content' }).focus()
  await expect(page.getByRole('link', { name: 'Skip to main content' })).toBeFocused()
  await page.getByRole('button', { name: 'Archive' }).click()
  const dialog = page.getByRole('dialog', { name: 'Archive category' })
  await expect(dialog.getByText('past history stays intact')).toBeVisible()
  await dialog.getByRole('button', { name: 'Archive category' }).click()
  await expect(page.getByText('Category archived.')).toBeVisible()
  await page.goto('/app/categories/archived')
  await expect(page.getByText('Pet care', { exact: true })).toBeVisible()
  await page.evaluate(() => {
    document.documentElement.style.zoom = '2'
  })
  await expect(page.getByRole('button', { name: 'Restore' })).toBeVisible()
})

function category(id, name, origin, classification = 'expense', overrides = {}) {
  return {
    id,
    name,
    origin,
    classification,
    color: 'teal',
    icon: 'circle',
    status: 'active',
    has_financial_transactions: false,
    archived_at: null,
    created_at: '2026-09-04T12:00:00Z',
    updated_at: '2026-09-04T12:00:00Z',
    ...overrides,
  }
}

async function mockApi(page, categories) {
  await page.route('**/api/v1/auth/session', (route) =>
    route.fulfill({ json: sessionPayload(), headers: headers() }),
  )
  await page.route('**/sanctum/csrf-cookie', (route) =>
    route.fulfill({
      status: 204,
      headers: { ...headers(), 'Set-Cookie': 'XSRF-TOKEN=token; Path=/' },
    }),
  )
  await page.route('**/api/v1/categories/21/archive', (route) => {
    const item = categories.find((value) => value.id === 21)
    item.status = 'archived'
    item.archived_at = '2026-09-04T13:00:00Z'
    return route.fulfill({ json: { data: item }, headers: headers() })
  })
  await page.route('**/api/v1/categories/**/restore', (route) => {
    const id = Number(route.request().url().split('/').at(-2))
    const item = categories.find((value) => value.id === id)
    item.status = 'active'
    item.archived_at = null
    return route.fulfill({ json: { data: item }, headers: headers() })
  })
  await page.route(/\/api\/v1\/categories(?:\?[^/]*)?$/, async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    if (request.method() === 'GET') {
      const status = url.searchParams.get('status') ?? 'active'
      return route.fulfill({
        json: { data: categories.filter((item) => item.status === status) },
        headers: headers(),
      })
    }
    if (request.method() === 'POST') {
      const payload = request.postDataJSON()
      const item = category(99, payload.name, 'personal', payload.classification, {
        color: payload.color,
        icon: payload.icon,
      })
      categories.push(item)
      return route.fulfill({ status: 201, json: { data: item }, headers: headers() })
    }
    return route.continue()
  })
}

function headers() {
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
