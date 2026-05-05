import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { authedContext } from '../fixtures/auth'
import { mockApi } from '../fixtures/api-handlers'
import { mockWebSocket } from '../fixtures/ws-handlers'

/**
 * Axe smoke — no ``critical`` WCAG 2.1 AA violations on the
 * authenticated landing routes. Catches regressions like missing
 * ``aria-label`` on icon-only buttons, broken form semantics.
 *
 * ``serious`` (notably ``scrollable-region-focusable`` on the main
 * scroll container and a few residual ``color-contrast`` lints on
 * Market Data tiles) is intentionally NOT blocking yet — fixing
 * ``scrollable-region-focusable`` cleanly without a ``tabIndex``
 * eslint bypass requires a structural refactor of the App shell that
 * a v1.4 contrast-only pass should not gate on.
 *
 * v1.4 reduced the residual surface to ~2 routes by lifting
 * ``--color-muted-500`` and replacing ``text-dark-400`` empty-state
 * placeholders with ``text-muted-500``; the remaining ``serious``
 * violations are tracked for v1.5.
 */
const ROUTES_TO_AUDIT: Array<{ tab: string; expectHeading: RegExp }> = [
  { tab: 'Overview', expectHeading: /Overview/i },
  { tab: 'Market Data', expectHeading: /Market Data/i },
  { tab: 'Orders & Executions', expectHeading: /Orders & Executions/i },
  { tab: 'Positions', expectHeading: /Positions/i },
  { tab: 'Backtests', expectHeading: /Backtests/i },
  { tab: 'Settings', expectHeading: /Settings/i },
]

for (const { tab, expectHeading } of ROUTES_TO_AUDIT) {
  test(`a11y: ${tab} has no critical WCAG 2.1 AA violations`, async ({ browser }) => {
    const context = await authedContext(browser)
    const page = await context.newPage()

    await mockApi(page)
    await mockWebSocket(page)

    await page.goto('/')
    await expect(page.getByRole('navigation')).toBeVisible({ timeout: 10_000 })

    if (tab !== 'Overview') {
      await page
        .locator('nav')
        .getByRole('button', { name: new RegExp(`^${tab}$`) })
        .click()
    }

    await expect(page.getByRole('heading', { name: expectHeading })).toBeVisible({
      timeout: 10_000,
    })

    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()

    const blocking = results.violations.filter(v => v.impact === 'critical')

    if (blocking.length > 0) {
      console.warn(
        `Blocking a11y violations on ${tab}:`,
        blocking.map(v => ({ id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.length }))
      )
    }

    expect(blocking).toEqual([])

    await context.close()
  })
}
