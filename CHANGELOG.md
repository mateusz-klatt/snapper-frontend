# Changelog

All notable changes to this project are documented here. Format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project
uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.5.6] — 2026-05-07

Roll-up of the post-v1.5.2 chore / tooling / dependency work that
landed without individual version bumps. No runtime API changes; all
changes are developer-experience, build pipeline, dependency
freshness, and code-quality enforcement.

### Added

- **TypeScript / TSX non-doc comment scanner.** `scripts/check-no-comments.mjs`
  is a hand-rolled state-machine scanner that rejects `//` line comments
  and `/* */` block comments while allowing `///` line-doc and
  `/** */` JSDoc forms. Wired through `pnpm check:no-comments` (report)
  and `pnpm check:no-comments:strict` (fail). Mirrors the parent-monorepo
  Python scanner and the iOS Swift scanner.
- **`prepush:strict` chain.** `pnpm prepush` now includes
  `check:no-comments:strict`, locking the no-non-doc-comments rule into
  the local pre-push gate alongside format / lint / typecheck / coverage.

### Changed

- **Bash release scripts migrated to Node (`.mjs`).** `gen-from-backend.sh`
  → `gen-from-backend.mjs` (built-in `fetch` + `child_process.spawnSync`
  with `pnpm.cmd`-on-Windows handling) and `vendor-icons.sh` →
  `vendor-icons.mjs` (`node:fs` / `node:os` / `mkdtempSync` + a
  `process.on('exit')` cleanup hook + explicit `Array.sort + localeCompare`
  for cross-platform manifest determinism). Smoke-tested end-to-end:
  output is byte-identical to the prior bash modulo the script-name
  comment. iOS `xccov-to-sonarqube-generic.sh` is left untouched
  (SonarSource SHA-pinned, `xcrun xccov`-bound, macOS-only anyway).
- **Coverage exclusion narrowed to generated files only.** `vitest.config`
  previously excluded the entire `src/types/` tree; the new pattern only
  excludes `src/types/api.generated.*` so any future hand-written types
  in `src/types/` get coverage scrutiny by default.
- **GitHub Actions versions refreshed** (across all five workflows) to
  current majors, including the SonarSource scan action upgrade carried
  by the same PR.
- **npm dependencies refreshed** (two batches: PR #31 and PR #38). Lockfile
  trimmed by ~70 lines in the first pass; second pass updated 200+ pinned
  versions across direct + transitive deps.

### Fixed

- **Sonar S7735 — negated conditional spreads (24 findings).** Flipped
  29 ternary arms across 8 files from `expr !== X ? {A} : {}` to the
  positive-arm-spread form. Five compound guards
  (`EXPR !== null && EXPR !== undefined ? {A} : {}`) needed a De Morgan
  rewrite to `EXPR == null ? {} : {A}` (`==` covers both null and
  undefined) so semantics held — caught at final-gate review before
  merge.

### Internal cleanup

- **48 legacy non-doc comments → 0.** Pre-scanner rationale comments lifted
  to JSDoc, section-header `// ===…===` markers deleted, empty-catch
  patterns refactored to a `formatJsonObject(value): string | null`
  helper instead of a `void 0` no-op (fixes a coverage drop the initial
  cleanup introduced by leaving `void 0` statements untested).

## [1.5.2] — 2026-05-06

### Refactor

- **Direct per-domain query hook imports.** Migrated the remaining
  callsites off the `src/hooks/queries.ts` compat shim and into the
  corresponding `src/hooks/queries/<domain>.ts` modules, then removed
  the obsolete shim.

## [1.5.1] — 2026-05-06

### Refactor

- **`exactOptionalPropertyTypes` flag flip.** Enabled the TypeScript flag
  after `noUncheckedIndexedAccess`, widened dependent hand-written
  component and transport prop surfaces to accept explicit `undefined`
  where callers already produce it, and fixed request-body callsites by
  coercing or omitting absent optional values without widening request
  schemas.

## [1.5.0] — 2026-05-06

### Refactor

- **`apiClient` + `queries` domain split.** The 1168-line
  `src/lib/apiClient.ts` singleton is now transport-only (~480 lines):
  request/get/post/JSON helpers, scope/CSRF/auth state, error
  handling, provenance stamping. All 67 RPC methods extracted to
  per-domain modules under `src/lib/api/<domain>.ts` (17 files plus
  `error.ts`) as plain async functions: `health`, `system`, `market`,
  `orders`, `positions`, `signals`, `wallets`, `scope-grants`,
  `credentials`, `settings`, `processes`, `strategies`, `users`,
  `backtests`, `feature-flags`, `ai-delegates`, `ai-reviews`. New
  public `apiClient.requestJSON(...)` helper exposes a typed
  request-with-error path for the three endpoints (scope-grants /
  credentials / pending AI reviews) that intentionally bypass the
  scope-injecting `get()` shortcut.
- **`src/hooks/queries.ts` split mirroring the API domains.** The
  1113-line monolith is now a 17-line compat re-export shim; the
  ~80 React Query hooks live in `src/hooks/queries/<domain>.ts`
  alongside a centralised `src/hooks/queries/keys.ts` registry.
  Imports from `'@/hooks/queries'` keep working unchanged (the 37
  callsite migration to direct `'@/hooks/queries/<domain>'`
  imports is queued for a follow-up).
- **`APIError` extracted to `src/lib/api/error.ts`** so domain
  modules consume it directly. `apiClient.ts` re-exports it for
  callers that import from `'@/lib/apiClient'`.

### Fixed

- **AI review decision invalidation now actually drops the row.**
  `useSubmitAiReviewDecision.onSuccess` previously invalidated the
  literal `['pending-ai-reviews']` query key, but the actual
  `usePendingAiReviews` query lives under `['ai-reviews', 'pending',
...]`. The mismatch silently meant the inbox waited a full 5s
  poll cycle before the resolved row disappeared. Centralised
  `keys.ts` exposes a `pendingAiReviewsAll` prefix that matches.

### Added

- **Privacy policy page** at `/privacy-policy.html`. Standalone
  static HTML in `public/` (no JS dependency, no SPA route),
  styled to match the brand with light + dark mode via
  `prefers-color-scheme`. Serves the policy content for the iOS
  app's App Store submission, which requires a publicly reachable
  HTML privacy policy URL — the maintainer points App Store
  Connect at whichever domain hosts the deployed frontend. The
  page itself has no hardcoded host references in its body, so
  it works under any deploy target. The markdown source-of-truth
  lives at `docs/privacy-policy.md` in the
  `mateusz-klatt/snapper-ios` repo.

## [1.3.1] — 2026-05-05

### Changed

- **MarketData instrument picker switched from custom W3C ARIA APG
  combobox/listbox to native `<input list>` + `<datalist>`.** Closes
  the last-standing SonarCloud finding (S6819 on `role="listbox"`)
  that we'd been carrying as accepted tooling-noise since v1.0.0.
  Browser handles filtering, dropdown rendering, keyboard navigation,
  and "no matches" state — saves ~70 lines of state + handlers
  (`instrumentDropdownOpen`, `instrumentActiveIndex`,
  `instrumentListboxId`, `handleInstrumentInputKeyDown`, click-outside
  effect) in `MarketData.tsx`. Bundle: 272 kB gzip (was 273).

  Lost UX (intentional, baseline a11y > custom polish):
  - Per-option InstrumentIcon next to each symbol in the dropdown —
    redundant; the icon is already shown in the page header next to
    the selected instrument.
  - Per-option `<MarketDataOnlyBadge>` flagging non-tradable
    instruments — moved to header (was already there for the SELECTED
    instrument; still missing for the in-flight pre-commit preview).
  - Highlighted "active" row styling — browser-controlled.

  Gained:
  - Native `role="combobox"` semantics for free (the input element).
  - Browser-native filtering (substring match).
  - Browser-native keyboard navigation matching OS conventions.
  - Mobile picker on iOS / Android (system-styled).
  - Sonar S6819 silenced.

  E2E coverage retained: `cancel order` flow exercises the same input.
  The 12 unit tests for the old listbox keyboard navigation are
  removed (browser handles it; can't unit-test in JSDOM anyway).

## [1.3.0] — 2026-05-04

### Added

- **Playwright E2E suite** (12 tests, ~7s wall clock) with scripted fake
  backend.
  - REST mocks via `page.route()` + a default-OK layer keyed against
    the strict Zod response schemas (`api.generated.zod.ts`); any
    unmocked `/api/*` returns a loud `404 unmocked: <method> <url>` so
    forgotten endpoints surface as test failures.
  - WS mocks via `page.routeWebSocket()` accept the connection and stay
    silent until a test scripts a frame (`pushFrame()` helper).
  - Pre-authenticated `authedContext` fixture injects `csrf_token`
    cookie + zustand-persist user record so non-login tests skip the
    login form (saves ~2s per test).
  - Five flows green: auth bootstrap with valid cookies, logout,
    cancel order, market data tab render, navigate-all-tabs without
    console errors. Login form test exercises the un-authed flow
    end-to-end.
  - axe a11y smoke on six landing routes (Overview, Market Data, Orders,
    Positions, Backtests, Settings) — fails on `critical` WCAG 2.1 AA
    violations. `serious` is intentionally excluded in v1.3 (existing
    color-contrast + scrollable-region debt; tackled in v1.4).
- **`pnpm e2e` / `pnpm e2e:ui` / `pnpm e2e:debug` / `pnpm e2e:report`**
  scripts.
- **`e2e.yml` CI workflow** runs on every PR + push to master against
  `vite preview` of the production build, caches Playwright browsers
  via `actions/cache@v4`, uploads HTML report + trace bundle on
  failure.

### Fixed (a11y, found by the new smoke)

- **`OperatorPicker` / `WalletPicker` Radix Select trigger** — added
  `aria-label` ("Active operator" / "Active wallet") so screen readers
  announce the role of the otherwise icon-only combobox.
- **`Settings` category filter** — added `aria-label`
  ("Filter settings by category") on the bare `<ThemeSelect>`.
- **`Backtests` status filter `<select>`** — added `aria-label`
  ("Filter backtests by status").

### Deferred

- **`places a market order via NewOrderModal happy path`** test is
  authored but `test.skip`-ped — the form has Radix Select dropdowns
  with auto-populated fields (exchange, instrument, mode) that need
  deterministic selectOption interaction. Tackled in v1.4 alongside
  the apiClient/queries domain split.

## [1.2.0] — 2026-05-04

### Changed

- **`noUncheckedIndexedAccess` enabled.** Every array/Record index access
  now returns `T | undefined`; the compiler surfaced 210 unchecked
  accesses (28 in production code, 182 in tests) which were latent
  potential `undefined.foo` crashes. Each one was either guarded with a
  real undefined check (where the path is reachable, e.g. dropdown
  candidate selection, focus-trap edge cases, dynamic route segments)
  or narrowed via an `as` cast at the precondition boundary (where a
  Set membership check or earlier length guard already proves
  presence — these are genuinely dead branches that the compiler
  couldn't prove). Sister flag `exactOptionalPropertyTypes` is parked
  for v1.3.0 alongside the apiClient/queries domain split.

### Fixed

- **`getHeartbeat` type-mismatched fallback** — the "unknown" placeholder
  shape `{ status: 'unknown', healthy: false, timestamp: 0 }` didn't
  match the `HeartbeatData` union (`'healthy' | 'warning' | 'error'`),
  but `noUncheckedIndexedAccess=false` masked the gap. Fixed by adding
  `'unknown'` to the status union, so the placeholder is now type-safe
  and the UI keeps showing the existing "no heartbeat yet" badge.
- **Sonar S7764 (×2)** in `apiClient.setCsrfToken` — `window.*` reads
  switched to `globalThis.window.*` so the SSR/test-stub path is still
  exercised the same way but the access is portable.

## [1.1.0] — 2026-05-04

### Fixed

- **`useCandles` query key now includes `limit`.** The TanStack Query cache
  was keyed by `(instrument, exchange, timeframe, asOf)` only, so two
  consumers asking for the same instrument with different `limit` values
  collided on a single cache entry — the second caller observed the
  first's bar count. Latent today (only `MarketData.tsx` calls with
  `limit=100`); the fix is preventative.
- **`WSDispatcher.mergeCandleIntoCache` follows the new query-key shape.**
  After the `useCandles` key change above, the dispatcher's hard-coded
  5-element write key would have orphaned WS frames — live charts would
  stop updating after the initial REST fetch landed under the new
  6-element key. The merger now scans all `['candles', instrument,
exchange, timeframe, …]` caches via `getQueriesData` and writes to each
  live entry (last key element `=== null`), mirroring the existing
  `mergeOrderIntoCache` pattern. Time-travel caches (non-null `asOf`)
  are skipped so historical views aren't corrupted by live frames.
- **Wallet-scoped credential and scope-grant invalidations.**
  `useCreateCredential`, `useRotateCredential`, and `useCreateScopeGrant`
  invalidated the broad `['credentials']` / `['scope-grants']` prefix,
  which forced refetches of every wallet's cached list. They now scope
  to the mutated `walletPublicId` from mutation variables; other wallets'
  data stays warm.
- **Auth bootstrap survives browser restart with a session-cleared CSRF
  cookie.** `AppWithAuth` gated the cold-start `/api/auth/refresh` probe
  on `apiClient.hasAuthCookies()`, which only sees the (session-scoped)
  `csrf_token` cookie — never the HttpOnly `refresh_token`. After a
  restart that cleared session cookies, valid users were forced to
  re-login. The bootstrap now also accepts a persisted user
  (`useAuthStore.getState().user !== null`) as a "may be logged in"
  signal.

### Added

- **Runtime Zod validation for three more endpoints** — `getCandles`,
  `createOrder`, `cancelOrder` now `validateResponse(...)` against
  generated schemas (`CandleDataSchema`, `ExecutionPlanResponseSchema`).
  Response types narrowed from `Record<string, unknown>` to
  `ExecutionPlanResponse` for the order mutations. Closes the last gap
  in the apiClient validation coverage matrix.
- **CSRF cookie carries `Secure` over HTTPS.** `setCsrfToken` now appends
  `; Secure` when `window.location.protocol === 'https:'`, preventing
  the cookie from leaking over a downgraded plaintext connection.
  Plain-HTTP localhost dev still works (no `Secure` is appended).
- **Bundle budget CI gate.** `pnpm bundle:check` (run after `pnpm build`)
  fails the build if any single chunk exceeds 80 kB gzip or the total
  exceeds 350 kB gzip. Current state: 59 kB largest, 273 kB total.
- **Weekly `pnpm audit` workflow.** `audit.yml` runs every Monday at 05:17
  UTC and on any PR that touches `package.json` / `pnpm-lock.yaml`,
  failing on `high` or `critical` advisories. Manual dispatch supported.

### Deferred

- `noUncheckedIndexedAccess` (210 type errors at flag-flip time, 28 of
  them in production code) deferred to **1.2.0**, where it will land
  alongside the apiClient/queries domain split that should reduce the
  surface area of array-index callers.

## [1.0.0] — 2026-05-04

First stable release. Subsequent breaking changes will follow Semantic
Versioning — i.e. a `2.0.0` for breaking, `1.x.0` for new features, `1.0.x`
for fixes. See README "Release contract" for the support semantics.

### Fixed

- **`NewOrderModal` no longer double-wraps the order payload.** Manual
  order entry was building a full `create_order_command` envelope locally,
  then `apiClient.post()` wrapped it again via `stampProvenance`, so the
  backend received the order body nested at `payload.payload.*`. Now sends
  raw fields (matches the bracket / trailing-stop / strategy-launch
  callers); the single envelope built by `stampProvenance` is the only
  one. Could have masked failed manual-order submissions in production.

### Changed

- **MarketData combobox markup is now W3C ARIA APG-compliant** — listbox
  is a `<div role="listbox" tabindex="-1">` (was `<ul>`), each option is a
  `<div role="option">` with click + hover handlers directly on the
  option (no nested interactive `<button>`), `aria-selected` reflects the
  committed instrument (was the keyboard-active row, which announced
  every keypress as "selected" to screen readers). Empty-state changed to
  `role="status"` (was `role="option" aria-disabled="true"`, missing
  `aria-selected`). Closes 5 SonarCloud findings (S6819, S6842 ×3,
  S6807).

## [0.4.0] — 2026-05-04

### Added

- **ARIA combobox semantics on the MarketData instrument picker** —
  `role="combobox"`, `aria-expanded`, `aria-controls`, `aria-autocomplete="list"`,
  `aria-activedescendant`; listbox/option roles on the dropdown; ArrowUp/
  ArrowDown navigation, Enter to select, Escape to close.
- **Loading affordances** — `LoadingSpinner` now exposes `role="status"` +
  `aria-live="polite"` + `aria-label="Loading"`; `Button` sets
  `aria-busy={loading}`.
- **`engines` + `engine-strict`** — `package.json` declares `node >=22` and
  `pnpm >=10`; `.npmrc` flips `engine-strict=true` so contributors get a
  loud failure on mismatched runtimes.

### Changed

- **`Modal` backdrop is now presentational** — was an interactive `<button
aria-label="Close modal">` (assistive tech announced "Close modal
  button"), now a `<div aria-hidden="true">` with `data-testid="modal-backdrop"`.
  Click-to-close still works; the real `<button aria-label="Close">` inside
  the modal is the AT-discoverable close affordance.
- **`sequenceTracker` JSON parse hardening** — `getTracker()` now wraps
  `JSON.parse(sessionStorage.getItem(...))` in a try/catch + shape guard
  (`typeof sessionId === 'string'`, `counters` has only number values).
  Corrupted sessionStorage entries no longer crash app startup; we fall
  back to a fresh tracker.
- **`LightweightChart` switched to `ResizeObserver`** — was polling
  `window.resize`, which only fires on viewport changes and missed app-
  internal layout shifts (sidebar toggle, panel resize). Falls back to the
  legacy `window` listener when `ResizeObserver` is unavailable.
- **`no-console` ESLint rule enforced as `error`** with `allow: ['warn',
'error', 'debug']`. Casual `console.log` / `console.info` now break
  CI; existing structural `console.warn` + `console.debug` paths in the
  WebSocket client and store stay.

### Removed

- **`auth_user_id` localStorage write** — was set on login + token refresh
  but never read anywhere. Pure dead write that left stale usernames in
  localStorage on shared browsers.

## [0.3.0] — 2026-05-04

### Fixed

- `getCookie` no longer truncates cookie values that contain `=` (base64-padded
  CSRF/auth tokens were silently shortened, producing invalid headers).
- `handleCSRFError` guards `errorData.detail.includes(...)` with a `typeof === 'string'`
  check — FastAPI 422 paths sometimes return `detail` as an object, which would
  crash the error path with `TypeError`.

### Added

- Runtime validation via Zod for backtest + trailing-stop endpoints
  (`getTrailingStopByCycle`, `getBacktests`, `getBacktest`, `createBacktest`,
  `cancelBacktest`, `rerunBacktest`, `getBacktestTrades`, `getBacktestSignals`,
  `createBacktestComparison`, `getBacktestComparison`, `getBacktestComparisons`).
  Malformed payloads now fail loudly instead of corrupting UI state.
- `aria-current="page"` on the active sidebar tab; `aria-label` on the sidebar
  `<aside>` and main `<nav>` landmarks.
- `CHANGELOG.md` (this file) — retroactive entries for 0.1.0 and 0.2.0.
- `.github/dependabot.yml` — weekly npm + GitHub Actions update PRs.
- Monorepo-flow scripts in `package.json`: `gen:api-types:from-monorepo`,
  `gen:ws-types:from-monorepo` (read schemas from `../build/`, used by the
  upstream Snapper monorepo's Makefile codegen).

### Changed

- **Bundle splitting**: routes now load lazily via `React.lazy` + `Suspense`,
  and `manualChunks` separates `react`, `react-query` + `zustand`,
  `lightweight-charts`, `zod`, and `@radix-ui` into vendor bundles. The Vite
  warning about chunks > 500 kB is gone; main entry chunk dropped from
  ~963 kB to ~178 kB (≈40 kB gzip).
- Production builds emit `'hidden'` source maps by default — opt back in with
  `SOURCEMAP=true pnpm build` for full inline maps. Drops 3.3 MB+ of map
  references from public release artefacts.
- CI workflow: `permissions: contents: read` (least-privilege token), pnpm
  store cache via `actions/setup-node`, and the redundant `test:run` step
  removed (`test:coverage` already runs the full suite).
- `vite.config.ts` dev server binds `localhost` only by default;
  `make dev-lan` opt-in for LAN exposure.

## [0.2.0] — 2026-05-04

### Added

- `LICENSE` (MIT), `README.md`, `CONTRIBUTING.md`, `SECURITY.md`,
  `CODEOWNERS`, `.gitignore`.
- `Makefile` with `dev`, `dev-lan`, `build`, `lint`, `format`, `typecheck`,
  `test`, `cov`, `dead-code`, `gen`, `icons-vendor`, `check-all`, `fix-all`.
- `scripts/gen-from-backend.sh` — fetches OpenAPI + WebSocket schemas from a
  running Snapper backend at `http://localhost:8000` and regenerates
  TypeScript types.
- `.github/workflows/{ci,gitleaks,sonarcloud}.yml` — Corepack-based CI on
  Node 22, gitleaks secret scan, gated SonarCloud workflow.
- `.github/ISSUE_TEMPLATE/{bug_report,feature_request,config}.{md,yml}` and
  `pull_request_template.md`.
- `sonar-project.properties` (project key `mateusz-klatt_snapper-frontend`).

### Changed

- ESLint enforces `--max-warnings=0` on `lint`.
- `RemoteSvg.tsx` no longer exports non-component utilities — `isVendored`
  - CDN constants moved to `iconLookup.ts`, fixing the
    `react-refresh/only-export-components` warning.
- `package.json` name renamed `snapper-ui` → `snapper-frontend`; added
  `license`, `repository`, `homepage`, `bugs` fields.
- README documents port 3000 (Vite default) and the same-origin proxy flow
  to a backend at `http://localhost:8000` — no `VITE_API_BASE_URL` env var.

### Fixed

- Windows compatibility: `gen:ws-types` no longer uses POSIX shell parameter
  expansion (`${VAR:-default}`) which `cmd.exe` does not expand.

## [0.1.0] — 2026-05-04

Initial public release: Vite + React + TypeScript trading UI extracted from
the Snapper monorepo. Includes the smart-hybrid InstrumentIcon dispatcher,
vendored crypto + flag SVGs, WalletPicker + HYBRID scope persistence,
hash-based subroute routing, WebSocket envelope minter, and bracket /
trailing-stop order entry.
