import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { authedContext } from '../fixtures/auth'
import { mockApi } from '../fixtures/api-handlers'
import { mockWebSocket } from '../fixtures/ws-handlers'

/**
 * Axe smoke — no ``critical`` or ``serious`` WCAG 2.1 AA violations on
 * the authenticated landing routes. Catches regressions like missing
 * ``aria-label`` on icon-only buttons, insufficient text-vs-background
 * contrast, and inaccessible scroll containers.
 *
 * v1.5 tightened the gate from ``critical``-only to ``serious +
 * critical`` after:
 * - the ``--color-muted-500`` token bump cleared baseline contrast
 *   (5.83:1 light, 5.65:1 dark — both above WCAG 2.1 AA 4.5:1);
 * - ``text-dark-400`` empty-state placeholders moved to
 *   ``text-muted-500`` (was rendering at 1.28:1 ≈ white-on-white in
 *   light mode);
 * - the App-shell scroll container is a labelled ``<section>`` inside
 *   ``<main>`` with focusable skip content, satisfying
 *   ``scrollable-region-focusable`` without an eslint bypass.
 *
 * ``moderate`` / ``minor`` remain non-blocking — they cover stylistic
 * niceties (duplicate landmark labels, etc.) that are expensive to
 * fully eliminate without UX regressions.
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
  test(`a11y: ${tab} has no critical/serious WCAG 2.1 AA violations`, async ({ browser }) => {
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

    const blocking = results.violations.filter(v =>
      ['serious', 'critical'].includes(v.impact ?? 'minor')
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
