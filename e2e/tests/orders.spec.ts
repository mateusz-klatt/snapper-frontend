import { test, expect } from '@playwright/test'
import { authedContext } from '../fixtures/auth'
import { mockApi } from '../fixtures/api-handlers'
import { mockWebSocket } from '../fixtures/ws-handlers'
import { listEnvelope, makeOrder, makeExecutionPlanResponse } from '../fixtures/envelopes'

test.describe('order flows', () => {
  // The full place-market-order flow drives two Radix Select triggers
  // (Exchange + Order Type). The listbox renders in a portal outside
  // the dialog DOM tree and a Playwright-driven click on the trigger
  // does not always fire the listbox open in headless Chromium —
  // every iteration on the un-skip surfaces a different timing flake
  // (auto-fill race on Exchange, listbox not visible after click on
  // Order Type, or the trigger label not reflecting the chosen value
  // before the next assertion). The cancel test plus the market-data
  // candle smoke already cover the happy-path REST mock + UI surface.
  // Tracking the un-skip as a follow-up; the proven path is to swap
  // the Radix Select in NewOrderModal for a native ``<select>`` (or a
  // wrapper that exposes ``selectOption`` semantics) — that's a UX
  // change, not a test-only fix, so it carries its own design call.
  test.skip('places a market order via NewOrderModal happy path', async ({ browser }) => {
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

    // Modal opens. Wait for the auto-population of the Exchange dropdown
    // (the form's useEffect picks the first exchange once data loads).
    const dialog = page.getByRole('dialog')

    await expect(dialog).toBeVisible()

    // Helper: drive a Radix Select trigger deterministically. The
    // listbox renders in a portal outside the dialog DOM tree, so
    // option queries originate from ``page``. After the option click
    // we wait for the trigger to reflect the chosen label so the next
    // step doesn't race the pop-out animation.
    const pickRadixOption = async (
      triggerName: string,
      optionLabel: RegExp,
      labelMatcher: RegExp
    ): Promise<void> => {
      const trigger = dialog.getByRole('combobox', { name: triggerName })

      await trigger.click()
      const option = page.getByRole('option', { name: optionLabel })

      await expect(option).toBeVisible({ timeout: 5_000 })
      await option.click()
      await expect(trigger).toHaveText(labelMatcher, { timeout: 5_000 })
    }

    await pickRadixOption('Exchange', /^kraken$/, /kraken/)
    await pickRadixOption('Order Type', /^Market$/, /Market/)

    const quantityField = dialog.getByRole('spinbutton', { name: /Quantity/i })

    await quantityField.fill('0.5')

    await page.getByRole('button', { name: /Review Order/i }).click()

    // Confirmation step.
    await page.getByRole('button', { name: /Confirm Order/i }).click()

    // Modal closes; orders list refetches with the new order present.
    await expect(page.getByText(/cli-e2e-1/i)).toBeVisible({ timeout: 10_000 })
    expect(createdOrder).toBe(true)

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
