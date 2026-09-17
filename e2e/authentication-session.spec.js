import { test, expect } from '@playwright/test'

import { pinLocale } from './support/locale.js'

test.beforeEach(async ({ page }) => {
  await pinLocale(page, 'en')
})

test('sign-in view retains auth choices', async ({ page }) => {
  await page.goto('/login')

  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible()
  await expect(page.getByLabel('Email')).toBeVisible()
  await expect(page.getByLabel('Password')).toBeVisible()
  await expect(page.getByText('Forgot password?')).toBeVisible()
  await expect(page.locator('.el-form--label-top')).toBeVisible()
})
