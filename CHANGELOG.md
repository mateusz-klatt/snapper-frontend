# Changelog

All notable changes to this project are documented here. Format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project
uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] — 2026-05-04

### Fixed

- **`useCandles` query key now includes `limit`.** The TanStack Query cache
  was keyed by `(instrument, exchange, timeframe, asOf)` only, so two
  consumers asking for the same instrument with different `limit` values
  collided on a single cache entry — the second caller observed the
  first's bar count. Latent today (only `MarketData.tsx` calls with
  `limit=100`); the fix is preventative.
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
