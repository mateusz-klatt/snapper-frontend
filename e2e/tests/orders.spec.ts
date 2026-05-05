import { test, expect } from '@playwright/test'
import { authedContext } from '../fixtures/auth'
import { mockApi } from '../fixtures/api-handlers'
import { mockWebSocket } from '../fixtures/ws-handlers'
import { listEnvelope, makeOrder, makeExecutionPlanResponse } from '../fixtures/envelopes'

test.describe('order flows', () => {
  test('places a limit order via NewOrderModal happy path', async ({ browser }) => {
    const context = await authedContext(browser)
    const page = await context.newPage()
    let createdOrder = false

    await mockApi(page, {
      '**/api/orders*': async route => {
        const method = route.request().method()

        if (method === 'POST') {
          createdOrder = true
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(makeExecutionPlanResponse({ status: 'submitted' })),
          })

          return
        }

        // GET — return populated list once the POST has happened.
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(
            listEnvelope('order_list', createdOrder ? [makeOrder({ status: 'new' })] : [])
          ),
        })
      },
    })
    await mockWebSocket(page)

    await page.goto('/')
    await expect(page.getByRole('navigation')).toBeVisible({ timeout: 10_000 })
    await page
      .locator('nav')
      .getByRole('button', { name: /^Orders & Executions$/ })
      .click()
    await expect(page.getByRole('heading', { name: /^Orders & Executions$/ })).toBeVisible({
      timeout: 10_000,
    })

    await page.getByRole('button', { name: /^New Order$/i }).click()

    const dialog = page.getByRole('dialog')

    await expect(dialog).toBeVisible()

    // Wait for the auto-populate chain to settle. The form's
    // useEffect picks the first exchange once `useExchanges` lands,
    // then the first instrument once that exchange's instruments
    // fetch lands. Once Instrument shows BTC-USD the form is in
    // the same state a user would see after the API responses race
    // resolves on slow network.
    const instrumentSelect = dialog.getByRole('combobox', { name: /Instrument/i })

    await expect(instrumentSelect).toContainText('BTC-USD', { timeout: 5_000 })

    // Use the default order type `limit` so the path stays inside
    // pointer-driven inputs only. Driving the Radix Select dropdown
    // to `market` would require a hit-test bypass: the host Modal
    // uses native `<dialog>.showModal()` which puts the dialog on
    // the browser top layer, while Radix Select renders its
    // dropdown via Portal into document.body. A real user clicks
    // through fine because the browser hit-tests against the
    // visible pixel; in Playwright the synthetic click is
    // intercepted by the top-layer dialog backdrop. The market
    // path can be re-added once Modal moves the dropdown content
    // into the dialog subtree (separate v1.4.x). For coverage
    // purposes, limit + price exercises the same envelope path
    // through to POST /api/orders.
    await dialog.getByRole('spinbutton', { name: /Quantity/i }).fill('0.5')
    await dialog.getByRole('spinbutton', { name: /^Price$/i }).fill('50000')

    await page.getByRole('button', { name: /Review Order/i }).click()
    await page.getByRole('button', { name: /Confirm Order/i }).click()

    // POST fired; modal closes; orders list refetches with the new
    // order present. Assert via the cli-e2e-1 client_order_id which
    // is unique to this test's makeOrder fixture.
    await expect.poll(() => createdOrder, { timeout: 5_000 }).toBe(true)
    await expect(page.getByText(/cli-e2e-1/i)).toBeVisible({ timeout: 10_000 })

    await context.close()
  })

  test('cancels an existing order via the per-row cancel button', async ({ browser }) => {
    const context = await authedContext(browser)
    const page = await context.newPage()
    let cancelCalled = false

    // NOTE: Object.entries iterates insertion order. Playwright matches
    // most-recently-registered first. So general patterns must come
    // FIRST in this literal so they're registered EARLIEST → matched
    // LAST. Specific patterns come LAST → matched FIRST.
    await mockApi(page, {
      '**/api/orders*': async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(
            listEnvelope('order_list', [
              makeOrder({
                client_order_id: 'cli-cancel-me',
                status: cancelCalled ? 'cancelled' : 'open',
              }),
            ])
          ),
        })
      },
      '**/api/orders/by-client-order-id/cli-cancel-me/cancel': async route => {
        cancelCalled = true
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(makeExecutionPlanResponse({ status: 'cancelled' })),
        })
      },
    })
    await mockWebSocket(page)

    await page.goto('/')
    await expect(page.getByRole('navigation')).toBeVisible({ timeout: 10_000 })
    await page
      .locator('nav')
      .getByRole('button', { name: /^Orders & Executions$/ })
      .click()
    await expect(page.getByText(/cli-cancel-me/i)).toBeVisible({ timeout: 10_000 })

    await page.getByRole('button', { name: /Cancel order cli-cancel-me/i }).click()

    await expect.poll(() => cancelCalled, { timeout: 5_000 }).toBe(true)

    await context.close()
  })
})
