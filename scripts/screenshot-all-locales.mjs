#!/usr/bin/env node
/**
 * E2E screenshot sweep — 45 locales × 13 screens = 585 screenshots.
 *
 * Strategy:
 *   1. Login once.
 *   2. For each locale:
 *      a. Verify we're still authenticated (sidebar present); re-login if not.
 *      b. Switch locale via the LocaleSwitcher UI (data-testid + data-locale).
 *         Wait for <html lang> to flip — event-based, no fixed sleeps.
 *      c. For each screen: hash-nav, wait for the route's identifying heading
 *         or sidebar item to appear, screenshot.
 *
 * Run: node scripts/screenshot-all-locales.mjs
 */
import { chromium } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '../..')
const OUT_DIR = resolve(ROOT, 'proprietary/screenshots/frontend')

const LOCALES = [
  'ie',
  'us',
  'pl',
  'de',
  'fr',
  'es',
  'it',
  'nl',
  'br',
  'se',
  'no',
  'dk',
  'fi',
  'is',
  'gr',
  'cn',
  'hk',
  'jp',
  'kr',
  'th',
  'vn',
  'ph',
  'my',
  'id',
  'mm',
  'in',
  'bd',
  'ke',
  'ae',
  'il',
  'cz',
  'sk',
  'hu',
  'ro',
  'ua',
  'ru',
  'lt',
  'lv',
  'hr',
  'rs',
  'ba',
  'al',
  'tr',
  'ir',
  'am',
]

const SCREENS = [
  'overview',
  'market',
  'processes',
  'strategies',
  'orders',
  'positions',
  'signals',
  'backtests',
  'health',
  'admin',
  'ai-integration',
  'ai-reviews',
  'settings',
]

const FRONTEND = globalThis.process?.env?.FRONTEND_URL || 'http://localhost:3000'
const ADMIN_USER = globalThis.process?.env?.ADMIN_USER || 'admin'
const ADMIN_PASS = globalThis.process?.env?.ADMIN_PASS || 'AdminSnapper2026!'

const SIDEBAR_SELECTOR = '[data-testid="locale-switcher-trigger"]'
const LOGIN_PASSWORD_SELECTOR = 'input[type="password"]'

async function isAuthenticated(page) {
  // Sidebar locale-switcher trigger only exists in the dashboard chrome.
  // The login form has its own LocaleSwitcher too, so we additionally check
  // that no password input is on the page.
  const pwd = await page.locator(LOGIN_PASSWORD_SELECTOR).count()
  if (pwd > 0) return false
  const trigger = await page.locator(SIDEBAR_SELECTOR).count()
  return trigger > 0
}

async function login(page) {
  if (!page.url().startsWith(FRONTEND)) {
    await page.goto(FRONTEND, { waitUntil: 'domcontentloaded', timeout: 30_000 })
  }

  // Wait for either the login form OR the dashboard sidebar — whichever the
  // app routes to. This implicitly waits for the JS bundle to mount.
  await page
    .locator(`${LOGIN_PASSWORD_SELECTOR}, ${SIDEBAR_SELECTOR}`)
    .first()
    .waitFor({ state: 'visible', timeout: 30_000 })

  if (await isAuthenticated(page)) return

  const passwordInput = page.locator(LOGIN_PASSWORD_SELECTOR)
  const usernameInput = page
    .locator('input[type="text"], input[type="email"], input[name="username"]')
    .first()

  await usernameInput.fill(ADMIN_USER)
  await passwordInput.fill(ADMIN_PASS)

  const loginResponse = page.waitForResponse(r => r.url().includes('/api/auth/login'), {
    timeout: 30_000,
  })
  await page.locator('button[type="submit"]').click()
  const response = await loginResponse
  if (!response.ok()) {
    throw new Error(`Login failed: HTTP ${response.status()}`)
  }

  // Wait for the dashboard sidebar to appear.
  await page.locator(SIDEBAR_SELECTOR).first().waitFor({ state: 'visible', timeout: 30_000 })
}

async function selectLocale(page, code) {
  const trigger = page.locator(SIDEBAR_SELECTOR).first()
  await trigger.click()

  // Wait for the popover dialog to open and the target flag button to render.
  const flag = page.locator(`button[data-locale="${code}"]`).first()
  await flag.waitFor({ state: 'visible', timeout: 5_000 })

  // The `<html lang>` attribute flips when i18next.changeLanguage resolves
  // (driven by applyLocaleSideEffects). Watch for that flip as the signal
  // that the locale switch fully landed — event-based, no fixed sleep.
  const beforeLang = await page.evaluate(() => document.documentElement.lang)
  await flag.click()
  await page
    .waitForFunction(
      prev => document.documentElement.lang !== prev && document.documentElement.lang.length > 0,
      beforeLang,
      { timeout: 5_000 }
    )
    .catch(() => {
      // If <html lang> didn't change, locale may have been the same already;
      // continue regardless.
    })

  // Popover closes after the click. If something failed and the popover is
  // still open (e.g. same-locale click is a no-op), close it via Escape.
  await page.keyboard.press('Escape').catch(() => {})
}

async function navigateToScreen(page, screen) {
  // Hash-nav only — never a full reload.
  await page.evaluate(s => {
    if (globalThis.location.hash !== `#${s}`) {
      globalThis.location.hash = `#${s}`
    }
  }, screen)

  // If the lazy chunk for this route hasn't been loaded yet, AppRoutes
  // renders <Suspense fallback={<RouteFallback />}> which mounts a div with
  // data-testid="route-fallback". We give React up to 1.5s to mount that
  // fallback. If it appears, we wait up to 15s for it to be detached —
  // that's the strict signal that the route's real content has mounted.
  // If the chunk was already cached, the fallback never appears and we
  // skip the wait entirely.
  const fallback = page.locator('[data-testid="route-fallback"]')
  await fallback
    .waitFor({ state: 'visible', timeout: 1_500 })
    .then(() => fallback.waitFor({ state: 'detached', timeout: 15_000 }))
    .catch(() => {})

  // Data-fetch skeleton wait: routes that use Skeleton (or any
  // `.animate-pulse`) for their `isLoading` state show placeholder cards
  // until React Query resolves. Wait for those to fall to zero in the
  // trading-content region, or accept a short timeout — some routes don't
  // use Skeleton at all, and some always have a perpetual pulsing element
  // (e.g. live-data indicator).
  await page
    .waitForFunction(
      () => {
        const region = document.querySelector('[role="region"][aria-label*="ontent"]')
        if (!region) return true
        return region.querySelectorAll('.animate-pulse').length === 0
      },
      undefined,
      { timeout: 3_000 }
    )
    .catch(() => {})

  // Sanity: chrome must be present (use .first() because Settings page
  // renders an additional LocaleSwitcher in the content area).
  await page.locator(SIDEBAR_SELECTOR).first().waitFor({ state: 'visible', timeout: 10_000 })
}

async function screenshotScreen(page, locale, screen) {
  await navigateToScreen(page, screen)

  // Mid-loop auth check: the session can flip to expired between any two
  // screens. If we got bounced to the login form, log back in, restore the
  // locale, and re-navigate before capturing.
  if (!(await isAuthenticated(page))) {
    console.log(`    [${locale}/${screen}] mid-loop session expired — re-login`)
    await login(page)
    await selectLocale(page, locale)
    await navigateToScreen(page, screen)
  }

  const outPath = resolve(OUT_DIR, locale, `${screen}.png`)
  await mkdir(dirname(outPath), { recursive: true })
  await page.screenshot({ path: outPath, fullPage: false })
}

async function main() {
  console.log(`Output: ${OUT_DIR}`)
  console.log(
    `Locales: ${LOCALES.length}, screens: ${SCREENS.length}, total: ${LOCALES.length * SCREENS.length}`
  )

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    ignoreHTTPSErrors: true,
  })
  const page = await context.newPage()

  page.on('pageerror', err => console.error(`[pageerror] ${err.message}`))

  console.log('Logging in...')
  await login(page)
  console.log(`Logged in. URL: ${page.url()}`)

  let done = 0
  let reloginCount = 0
  const total = LOCALES.length * SCREENS.length
  const startedAt = Date.now()

  for (const locale of LOCALES) {
    try {
      const wasAuth = await isAuthenticated(page)
      if (!wasAuth) {
        reloginCount += 1
        console.log(`  [${locale}] session expired (re-login #${reloginCount})`)
        await login(page)
      }
      await selectLocale(page, locale)
    } catch (err) {
      console.error(`  FAILED to setup locale ${locale}: ${err.message}`)
      continue
    }

    for (const screen of SCREENS) {
      try {
        await screenshotScreen(page, locale, screen)
        done += 1
      } catch (err) {
        console.error(`  FAILED ${locale}/${screen}: ${err.message}`)
      }
    }

    const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1)
    console.log(`  [${done}/${total}] ${locale} done  (${elapsed}s)`)
  }

  await browser.close()
  const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1)
  console.log(`Done. ${done}/${total} in ${elapsed}s. Re-logins: ${reloginCount}.`)
}

await main().catch(err => {
  console.error(err)
  globalThis.process?.exit(1)
})
