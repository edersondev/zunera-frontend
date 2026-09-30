import { expect, test } from '@playwright/test'
import { pinLocale } from './support/locale.js'

const headers = {
  'Access-Control-Allow-Origin': 'http://localhost:4173',
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Allow-Headers': 'Content-Type, X-XSRF-TOKEN, X-Requested-With, Accept, Accept-Language',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
  'Timing-Allow-Origin': '*',
  'Content-Type': 'application/json',
}

function percentile95(samples) {
  return [...samples].sort((a, b) => a - b)[Math.ceil(samples.length * 0.95) - 1]
}

const benchmarkViews = Array.from({ length: 20 }, (_, index) => ['all', 'unread'][index % 2])

async function showFirstPage(page, view) {
  await page.goto('/app/notifications')
  if (view === 'unread') await page.getByLabel('Show notifications').getByText('Unread', { exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Event 10000', exact: true })).toBeVisible()
}

function notificationRoute(retained) {
  return (route) => {
    const url = new URL(route.request().url())
    if (url.pathname.endsWith('/summary')) return route.fulfill({ json: { data: { unread_count: 5000, requires_action_count: 0 } }, headers })
    const view = url.searchParams.get('view') ?? 'all'
    const candidates = view === 'unread' ? retained.filter((entry) => !entry.read_at) : retained
    return route.fulfill({ json: { data: candidates.slice(0, 25), next_cursor: 'next' }, headers })
  }
}

test('10,000 retained events keep the first 25 browser-visible within three seconds', async ({ page }) => {
  test.setTimeout(120_000)
  await pinLocale(page, 'en')
  const retained = Array.from({ length: 10_000 }, (_, index) => ({
    id: 10_000 - index, type: 'goal_reached', category: 'financial_goals', severity: 'success',
    title: `Event ${10_000 - index}`, summary: 'Target reached', origin: 'financial_goals',
    event_at: '2026-09-29T12:00:00Z', created_at: '2026-09-29T12:00:00Z',
    read_at: index % 2 ? '2026-09-29T13:00:00Z' : null, resolved_at: '2026-09-29T12:00:00Z',
    requires_action: false, source_available: true, destination: { kind: 'goal', params: { goal_id: 1 } },
  }))
  const fulfill = (route, json) => route.fulfill({ json, headers })
  await page.route('**/api/v1/auth/session', (route) => fulfill(route, { data: {
    user: { id: 7, name: 'Person', email: 'person@example.com' },
    session: { idle_expires_at: new Date(Date.now() + 900000).toISOString(), absolute_expires_at: new Date(Date.now() + 28800000).toISOString() },
  } }))
  await page.route('**/api/v1/notification-preferences**', (route) => fulfill(route, { data: {
    credit_cards: true, recurring_transactions: true, budgets: true, financial_goals: true,
  } }))
  await page.route('**/api/v1/notifications**', notificationRoute(retained))

  const responseTimes = []
  const visibleTimes = []
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const view = benchmarkViews[attempt]
    await showFirstPage(page, view)
    const timing = await page.evaluate((currentView) => {
      const entry = performance.getEntriesByType('resource')
        .filter((resource) => resource.name.includes('/api/v1/notifications?') && resource.name.includes(`view=${currentView}`))
        .at(-1)
      return { response: entry?.duration ?? null, visible: performance.now() }
    }, view)
    expect(timing.response).not.toBeNull()
    responseTimes.push(timing.response)
    visibleTimes.push(timing.visible)
  }
  const result = {
    retained: retained.length,
    attempts: 20,
    response_p95_ms: Number(percentile95(responseTimes).toFixed(1)),
    visible_p95_ms: Number(percentile95(visibleTimes).toFixed(1)),
    response_samples_ms: responseTimes.map((value) => Number(value.toFixed(1))),
    visible_samples_ms: visibleTimes.map((value) => Number(value.toFixed(1))),
  }
  console.log(`NOTIFICATION_BROWSER_SCALE ${JSON.stringify(result)}`)
  expect(visibleTimes.filter((value) => value < 3000)).toHaveLength(20)
})
