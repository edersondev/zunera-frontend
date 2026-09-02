import { test, expect } from '@playwright/test'

test('signed-out views keep privacy links available at compact width', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 })
  await page.goto('/login')

  await expect(page.getByText('Privacy notice')).toBeVisible()
  await expect(page.getByText('Privacy rights')).toBeVisible()
})
