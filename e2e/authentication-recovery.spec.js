import { test, expect } from '@playwright/test'

test('recovery and reset views expose stable recovery paths', async ({ page }) => {
  await page.goto('/forgot-password')
  await expect(page.getByRole('heading', { name: 'Recover password' })).toBeVisible()
  await expect(page.locator('.el-form--label-top')).toBeVisible()

  await page.goto('/reset-password?email=person@example.com&token=token')
  await expect(page.getByRole('heading', { name: 'Reset password' })).toBeVisible()
  await expect(page.getByLabel('Recovery token')).toBeVisible()
  await expect(page.locator('.el-form--label-top')).toBeVisible()
})
