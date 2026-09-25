import { expect, test } from '@playwright/test'

import { pinLocale } from './support/locale.js'

const headers = {
  'Access-Control-Allow-Origin': 'http://localhost:4173',
  'Access-Control-Allow-Credentials': 'true',
  'Content-Type': 'application/json',
}
const account = { id: 1, name: 'Conta corrente', status: 'active', account_type: 'checking' }
const card = { id: 41, name: 'C6 Bank', institution_name: 'C6 Bank', last_four: '3450', status: 'active' }
const category = { id: 10, name: 'Assinaturas', classification: 'expense', status: 'active' }
const rules = Array.from({ length: 1000 }, (_, index) => {
  const isCard = index % 2 === 0
  return {
    id: index + 1, type: 'expense', destination_type: isCard ? 'credit_card' : 'financial_account',
    amount_centavos: 15_000 + (index % 12) * 100, currency_code: 'BRL',
    description: `Despesa recorrente ${index + 1}`, notes: null, frequency: index % 3 ? 'monthly' : 'weekly',
    start_date: '2026-09-01', end_date: null, state: 'active', paused_reason: null,
    financial_account: isCard ? null : account, credit_card: isCard ? card : null,
    generation_mode: isCard ? (index % 4 ? 'automatic' : 'confirmation') : null,
    category, next_expected_occurrence: '2026-10-01', generated_occurrence_count: index % 8,
    created_at: '2026-09-01T12:00:00Z', updated_at: '2026-09-01T12:00:00Z',
  }
})
const occurrences = rules.map((rule) => ({
  id: rule.id, scheduled_date: '2026-09-01', state: rule.destination_type === 'credit_card' ? 'expected' : 'recorded',
  generation_mode: rule.generation_mode, scheduled_amount_centavos: rule.amount_centavos,
  description: rule.description, notes: null, original_card: rule.credit_card,
  original_category: category, card: rule.credit_card, category,
  actual_amount_centavos: null, actual_purchase_date: null, purchase_id: null,
  recorded_at: null, dismissed_at: null,
}))

async function mockOwnedRules(page) {
  await page.route('**/api/v1/auth/session', (route) => route.fulfill({ json: { data: {
    user: { id: 1, email: 'owner@example.com' },
    session: { idle_expires_at: '2030-01-01T00:00:00Z', absolute_expires_at: '2030-01-01T00:00:00Z' },
  } }, headers }))
  await page.route('**/sanctum/csrf-cookie', (route) => route.fulfill({ status: 204, headers }))
  await page.route(/\/api\/v1\/financial-accounts(?:\?[^/]*)?$/, (route) =>
    route.fulfill({ json: { data: [account] }, headers }))
  await page.route(/\/api\/v1\/credit-cards(?:\?[^/]*)?$/, (route) =>
    route.fulfill({ json: { data: [card] }, headers }))
  await page.route(/\/api\/v1\/categories(?:\?[^/]*)?$/, (route) =>
    route.fulfill({ json: { data: [category] }, headers }))
  await page.route(/\/api\/v1\/recurring-transactions(?:\?[^/]*)?$/, async (route) => {
    const query = new URL(route.request().url()).searchParams
    const pageNumber = Number(query.get('page') ?? 1)
    const perPage = Number(query.get('per_page') ?? 50)
    await new Promise((resolve) => setTimeout(resolve, 25))
    await route.fulfill({ json: {
      data: rules.slice((pageNumber - 1) * perPage, pageNumber * perPage),
      meta: { total: rules.length, current_page: pageNumber, last_page: Math.ceil(rules.length / perPage), per_page: perPage },
      links: { next: pageNumber * perPage < rules.length ? `?page=${pageNumber + 1}` : null },
    }, headers })
  })
  await page.route(/\/api\/v1\/recurring-transactions\/(\d+)$/, (route) => {
    const id = Number(route.request().url().match(/recurring-transactions\/(\d+)/)[1])
    return route.fulfill({ json: { data: rules[id - 1] }, headers })
  })
  await page.route(/\/api\/v1\/recurring-transactions\/(\d+)\/occurrences(?:\?[^/]*)?$/, (route) => {
    const id = Number(route.request().url().match(/recurring-transactions\/(\d+)/)[1])
    return route.fulfill({ json: { data: [occurrences[id - 1]], meta: { total: 1, current_page: 1, last_page: 1, per_page: 50 }, links: { next: null } }, headers })
  })
}

function percentile95(values) {
  return [...values].sort((left, right) => left - right)[Math.ceil(values.length * 0.95) - 1]
}

for (const viewport of [{ name: 'desktop', width: 1280, height: 800 }, { name: 'narrow-mobile', width: 320, height: 640 }]) {
  test(`1000 owned rules: list and detail usable within 2s at ${viewport.name} viewport`, async ({ page, browserName }, testInfo) => {
    test.setTimeout(180_000)
    await pinLocale(page, 'pt-BR')
    await page.setViewportSize({ width: viewport.width, height: viewport.height })
    await mockOwnedRules(page)

    const warmupRuns = 2
    const measuredRuns = 20
    const listSamples = []
    const detailSamples = []
    for (let iteration = 0; iteration < warmupRuns + measuredRuns; iteration += 1) {
      const listStart = performance.now()
      await page.goto('/app/recurring-transactions')
      await expect(page.locator('[data-test="recurrence-item"]').first()).toContainText('Despesa recorrente 1')
      await expect(page.locator('[data-test="recurrence-new"]')).toBeEnabled()
      await expect(page.locator('[data-test="recurrence-load-more"]')).toBeEnabled()
      const listElapsed = performance.now() - listStart

      const detailStart = performance.now()
      await page.locator('[data-test="recurrence-toggle"]').first().click()
      await expect(page.locator('[data-test="recurrence-expanded"]')).toContainText('Detalhes da recorrência')
      await page.locator('[data-test="recurrence-expanded"] button').first().click()
      await expect(page.locator('[data-test="recurrence-detail-drawer"]')).toContainText('Despesa recorrente 1')
      await expect(page.locator('[data-test="recurrence-occurrence-open"]')).toBeEnabled()
      const detailElapsed = performance.now() - detailStart

      listSamples.push(Math.round(listElapsed))
      detailSamples.push(Math.round(detailElapsed))
    }

    const listTimes = listSamples.slice(warmupRuns)
    const detailTimes = detailSamples.slice(warmupRuns)
    const results = {
      browser: browserName, viewport, ownedRules: rules.length, pageSize: 50,
      device: 'local Playwright desktop browser, default CPU',
      network: 'local preview server; API routes mocked with 25ms latency for list, no throttling',
      warmupRuns, measuredRuns,
      listMs: listTimes, detailMs: detailTimes,
      listP95Ms: percentile95(listTimes), detailP95Ms: percentile95(detailTimes),
    }
    await testInfo.attach(`${viewport.name}-timings.json`, { body: JSON.stringify(results, null, 2), contentType: 'application/json' })
    console.log(JSON.stringify(results))
    expect(results.listP95Ms).toBeLessThanOrEqual(2000)
    expect(results.detailP95Ms).toBeLessThanOrEqual(2000)
  })
}
