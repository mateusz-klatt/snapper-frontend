import { test, expect } from '@playwright/test'
import { authedContext } from '../fixtures/auth'
import { mockApi } from '../fixtures/api-handlers'
import { mockWebSocket } from '../fixtures/ws-handlers'

test.describe('alerts tab', () => {
  test('lists alerts and opens the detail modal on row click', async ({ browser }) => {
    const context = await authedContext(browser)
    const page = await context.newPage()

    const alertRow = {
      type: 'alert_event_info' as const,
      sequence_id: 0,
      public_id: 'pid-e2e-1',
      timestamp: '2026-01-01T12:00:00Z',
      session_id: 'e2e-sid',
      user_public_id: 'user-e2e',
      operator_public_id: null,
      wallet_public_id: null,
      alert_type: 'order_fill_full',
      priority: 'medium',
      is_safety_critical: false,
      title: 'Order filled',
      body: 'BUY 1 BTC-USD @ $50000 filled on Kraken',
      payload: null,
      title_loc_key: 'alerts.title.order_fill_full',
      title_loc_args: [],
      body_loc_key: 'alerts.body.order_fill_full',
      body_loc_args: ['BUY', '1', 'BTC-USD', '50000', 'Kraken'],
      dedup_key: null,
      thread_key: null,
      source_topic: null,
    }

    await mockApi(page, {
      '**/api/alerts/*': async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            type: 'alert_event_response',
            sequence_id: 0,
            public_id: 'env-detail',
            timestamp: '2026-01-01T00:00:00Z',
            session_id: 'e2e-sid',
            payload: alertRow,
          }),
        })
      },
      '**/api/alerts/history*': async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            type: 'alert_history_response',
            sequence_id: 0,
            public_id: 'env',
            timestamp: '2026-01-01T00:00:00Z',
            session_id: 'e2e-sid',
            payload: [alertRow],
            count: 1,
            next_cursor: null,
          }),
        })
      },
    })
    await mockWebSocket(page)

    await page.goto('/')
    await expect(page.getByRole('navigation')).toBeVisible({ timeout: 10_000 })
    await page
      .locator('nav')
      .getByRole('button', { name: /^Alerts$/ })
      .click()
    await expect(page.getByRole('heading', { name: /^Alerts$/ })).toBeVisible({
      timeout: 10_000,
    })

    const row = page.getByRole('button', { name: /Order filled\. BUY 1 BTC-USD/ })

    await expect(row).toBeVisible({ timeout: 10_000 })
    await row.click()

    const dialog = page.getByRole('dialog')

    await expect(dialog).toBeVisible({ timeout: 5_000 })
    await expect(dialog).toContainText(/BUY 1 BTC-USD/)
    await expect(page).toHaveURL(/#notifications\/pid-e2e-1/)
  })
})
