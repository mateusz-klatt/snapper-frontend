import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { authedContext } from '../fixtures/auth'
import { mockApi } from '../fixtures/api-handlers'
import { mockWebSocket } from '../fixtures/ws-handlers'

/**
 * Axe smoke — no `critical` WCAG 2.1 AA violations on the authenticated
 * landing routes. Catches regressions like missing `aria-label` on
 * icon-only buttons, broken form semantics.
 *
 * `serious` is intentionally NOT blocking in v1.3 — the surface has
 * pre-existing color-contrast and scrollable-region findings that will
 * be tackled as a dedicated pass in v1.4. Tightening to `serious`+
 * before fixing those would lock the baseline at "broken".
 *
 * `moderate` / `minor` are noise; tighten in a follow-up after the
 * `serious` pass.
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
