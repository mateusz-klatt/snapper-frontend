import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { authedContext } from '../fixtures/auth'
import { mockApi } from '../fixtures/api-handlers'
import { mockWebSocket } from '../fixtures/ws-handlers'

/**
 * Axe smoke — no ``serious|critical`` WCAG 2.1 AA violations on the
 * authenticated landing routes. Catches regressions like missing
 * ``aria-label`` on icon-only buttons, broken form semantics, and
 * color-contrast / scrollable-region issues.
 *
 * v1.4 tightened the gate from ``critical``-only after the cleanup
 * pass: ``--color-muted-500`` lifted, ``text-dark-400`` empty-state
 * placeholders replaced (#8), Market Data empty-state copy moved
 * from ``text-muted-400`` to ``text-muted-500``, and the App shell
 * ``<main>`` region given an accessible name + skip-link descendant
 * so axe ``scrollable-region-focusable`` passes without a
 * ``tabIndex`` eslint/Sonar bypass.
 *
 * ``moderate`` / ``minor`` are noise; tighten in a follow-up if the
 * surface stabilises.
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
  test(`a11y: ${tab} has no serious or critical WCAG 2.1 AA violations`, async ({ browser }) => {
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

    const blocking = results.violations.filter(
      v => v.impact === 'critical' || v.impact === 'serious'
    )

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
