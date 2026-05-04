# Changelog

All notable changes to this project are documented here. Format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project
uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
