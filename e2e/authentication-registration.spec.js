import { test, expect } from '@playwright/test'

import { pinLocale } from './support/locale.js'

test.beforeEach(async ({ page }) => {
  await pinLocale(page, 'en')
})

test('registration view shows top-label form and privacy links', async ({ page }) => {
  await page.goto('/register')

  await expect(page.getByRole('heading', { name: 'Create your account' })).toBeVisible()
  await expect(page.getByLabel('Email')).toBeVisible()
  await expect(page.getByLabel('Password', { exact: true })).toBeVisible()
  await expect(page.getByText('Privacy notice')).toBeVisible()
  await expect(page.locator('.el-form--label-top')).toBeVisible()
})
