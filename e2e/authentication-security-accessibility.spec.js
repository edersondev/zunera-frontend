import { test, expect } from '@playwright/test'

import { pinLocale } from './support/locale.js'

test.beforeEach(async ({ page }) => {
  await pinLocale(page, 'en')
})

test('signed-out views keep privacy links available at compact width', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 })
  await page.goto('/login')

  await expect(page.getByText('Privacy notice')).toBeVisible()
  await expect(page.getByText('Privacy rights')).toBeVisible()
})
