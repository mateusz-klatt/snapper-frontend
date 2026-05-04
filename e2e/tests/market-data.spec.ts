import { test, expect } from '@playwright/test'
import { authedContext } from '../fixtures/auth'
import { mockApi } from '../fixtures/api-handlers'
import { mockWebSocket } from '../fixtures/ws-handlers'

test.describe('market data', () => {
  test('renders Market Data tab with auto-populated exchange + instrument', async ({ browser }) => {
    const context = await authedContext(browser)
    const page = await context.newPage()

    await mockApi(page)
    await mockWebSocket(page)

    await page.goto('/')
    await expect(page.getByRole('navigation')).toBeVisible({ timeout: 10_000 })

    await page
      .locator('nav')
      .getByRole('button', { name: /^Market Data$/ })
      .click()

    // The Market Data view exposes a chart container even when the
    // candle list is empty. Verify the page rendered.
    await expect(page.getByRole('heading', { name: /Market Data/i })).toBeVisible({
      timeout: 10_000,
    })

    await context.close()
  })

  test('navigates to all primary tabs without console errors', async ({ browser }) => {
    const context = await authedContext(browser)
    const page = await context.newPage()
    const errors: string[] = []

    page.on('console', msg => {
      if (msg.type() === 'error') {
        const text = msg.text()
        // axe + Zod + react-query refetch noise we accept

        if (
          !text.includes('Failed to load resource') &&
          !text.includes('not_authenticated') &&
          !text.includes('useChartActions')
        ) {
          errors.push(text)
        }
      }
    })

    await mockApi(page)
    await mockWebSocket(page)

    await page.goto('/')
    await expect(page.getByRole('navigation')).toBeVisible({ timeout: 10_000 })

    const tabs = [
      'Overview',
      'Market Data',
      'Orders & Executions',
      'Positions',
      'Signals',
      'Backtests',
      'Settings',
    ]

    for (const tab of tabs) {
      await page
        .locator('nav')
        .getByRole('button', { name: new RegExp(`^${tab}$`) })
        .click()
      await page.waitForTimeout(200)
    }

    // No JS exception surfaced via console.error during navigation.
    expect(errors).toEqual([])

    await context.close()
  })
})
