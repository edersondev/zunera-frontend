import { expect, test } from '@playwright/test'

import { pinLocale } from './support/locale.js'

test.beforeEach(async ({ page }) => {
  await pinLocale(page, 'en')
})

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
  await dialog.getByRole('button', { name: 'Color (optional): Teal' }).click()
  await dialog.getByRole('listbox', { name: 'Color (optional)' }).getByRole('option', { name: 'Green' }).click()
  await expect(dialog.getByRole('button', { name: 'Color (optional): Green' })).toBeVisible()
  await dialog.getByRole('button', { name: 'Icon (optional): Other' }).click()
  await dialog.getByRole('textbox', { name: 'Search icons' }).fill('trAvel')
  await dialog
    .getByRole('listbox', { name: 'Icon (optional)' })
    .getByRole('option', { name: 'Travel' })
    .click()
  await dialog.getByRole('button', { name: 'Create category' }).click()
  await expect(page.getByText('Category created.')).toBeVisible()
  await expect(page.getByText('Pet care', { exact: true })).toBeVisible()
  await expect(page.getByRole('img', { name: /Travel/ })).toBeVisible()
  await page.getByRole('button', { name: 'Edit category' }).click()
  await expect(
    page
      .getByRole('dialog', { name: 'Edit category' })
      .getByRole('button', { name: 'Icon (optional): Travel' }),
  ).toBeVisible()
})

test('icon picker stays in a compact dialog and supports keyboard selection', async ({ page }) => {
  await mockApi(page, [])
  await page.setViewportSize({ width: 320, height: 600 })
  await page.emulateMedia({ colorScheme: 'dark' })
  await page.goto('/app/categories')
  await page.getByRole('button', { name: 'New category' }).click()
  const dialog = page.getByRole('dialog', { name: 'New category' })
  const colorTrigger = dialog.getByRole('button', { name: 'Color (optional): Teal' })
  await colorTrigger.focus()
  await colorTrigger.press('Enter')
  const colorGrid = dialog.getByRole('listbox', { name: 'Color (optional)' })
  await expect(colorGrid).toHaveCSS('--color-picker-columns', '3')
  await expect(colorGrid.getByRole('option', { name: 'Teal' })).toBeFocused()
  const colorBounds = await colorGrid.boundingBox()
  expect(colorBounds.x).toBeGreaterThanOrEqual(0)
  expect(colorBounds.x + colorBounds.width).toBeLessThanOrEqual(320)
  await colorGrid.getByRole('option', { name: 'Teal' }).press('ArrowRight')
  await colorGrid.getByRole('option', { name: 'Blue' }).press('Space')
  await expect(dialog.getByRole('button', { name: 'Color (optional): Blue' })).toBeFocused()
  await dialog.getByRole('button', { name: 'Color (optional): Blue' }).press('Enter')
  const slate = colorGrid.getByRole('option', { name: 'Slate' })
  await slate.hover()
  await expect(slate.locator('.color-picker-option__tooltip')).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
  await slate.press('Escape')
  const trigger = dialog.getByRole('button', { name: 'Icon (optional): Other' })
  await trigger.focus()
  await trigger.press('Enter')
  const grid = dialog.getByRole('listbox', { name: 'Icon (optional)' })
  await expect(grid).toBeVisible()
  await expect(grid.getByRole('option', { name: 'Other' })).toBeInViewport({ ratio: 1 })
  await expect(grid).toHaveCSS('--icon-picker-columns', '3')
  const bounds = await grid.boundingBox()
  expect(bounds.x).toBeGreaterThanOrEqual(0)
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(320)

  const search = dialog.getByRole('textbox', { name: 'Search icons' })
  await expect(search).toBeFocused()
  await search.fill('travel')
  await search.press('ArrowDown')
  const travel = grid.getByRole('option', { name: 'Travel' })
  await expect(travel).toBeFocused()
  await travel.press('Escape')
  await expect(trigger).toBeFocused()
  await expect(grid).toBeHidden()

  await trigger.press('Enter')
  await dialog.getByRole('textbox', { name: 'Search icons' }).fill('travel')
  await grid.getByRole('option', { name: 'Travel' }).press('Enter')
  const selected = dialog.getByRole('button', { name: 'Icon (optional): Travel' })
  await expect(selected).toBeFocused()

  await page.setViewportSize({ width: 640, height: 700 })
  await page.evaluate(() => {
    document.documentElement.style.zoom = '2'
  })
  await selected.press('Enter')
  const zoomedBounds = await grid.boundingBox()
  expect(zoomedBounds.x).toBeGreaterThanOrEqual(0)
  expect(zoomedBounds.x + zoomedBounds.width).toBeLessThanOrEqual(640)
  await grid.getByRole('option', { name: 'Travel' }).press('Escape')
  await dialog.getByRole('button', { name: 'Color (optional): Blue' }).press('Enter')
  const zoomedColorBounds = await colorGrid.boundingBox()
  expect(zoomedColorBounds.x).toBeGreaterThanOrEqual(0)
  expect(zoomedColorBounds.x + zoomedColorBounds.width).toBeLessThanOrEqual(640)
  await page.setViewportSize({ width: 320, height: 600 })
  await expect(colorGrid).toHaveCSS('--color-picker-columns', '2')
  const extremeBounds = await colorGrid.boundingBox()
  expect(extremeBounds.x).toBeGreaterThanOrEqual(0)
  expect(extremeBounds.x + extremeBounds.width).toBeLessThanOrEqual(320)
})

test('category lifecycle remains keyboard reachable at compact width', async ({ page }) => {
  const categories = [category(21, 'Pet care', 'personal')]
  await mockApi(page, categories)
  await page.setViewportSize({ width: 320, height: 800 })
  await page.goto('/app/categories')
  await page.getByRole('link', { name: 'Skip to main content' }).focus()
  await expect(page.getByRole('link', { name: 'Skip to main content' })).toBeFocused()
  await page.getByRole('button', { name: 'Archive', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Archive category' })
  await expect(dialog.getByText('past history stays intact')).toBeVisible()
  await dialog.getByRole('button', { name: 'Archive', exact: true }).click()
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
