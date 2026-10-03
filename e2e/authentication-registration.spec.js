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

test('registration privacy links open public pages with content', async ({ page }) => {
  await page.goto('/register')

  await page.getByRole('link', { name: 'Privacy notice' }).click()
  await expect(page).toHaveURL(/\/privacy$/)
  await expect(page.getByRole('heading', { name: 'Data we process' })).toBeVisible()

  await page.getByRole('link', { name: 'Privacy rights' }).last().click()
  await expect(page).toHaveURL(/\/privacy-rights$/)
  await expect(page.getByRole('heading', { name: 'What you can request' })).toBeVisible()
})
