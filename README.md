# Snapper Frontend

Vite + React + TypeScript trading UI for the [Snapper](https://github.com/mateusz-klatt/snapper) platform.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## What it is

The browser-side dashboard for Snapper — a single-operator portfolio + execution platform that talks to crypto and forex venues over WebSocket and REST. This repo contains only the UI; the backend (FastAPI + SQLAlchemy + ZMQ) lives in the parent repo.

Highlights:

- **Smart-hybrid InstrumentIcon dispatcher** — text fallback first, vendored SVG when available, mixed-mode pair icons (e.g. SHIB-EUR shows text + EU flag).
- **Vendored crypto + flag icons** — 27 crypto + 24 flag SVGs in `public/icons/`. Zero CDN dependency, air-gap ready.
- **WalletPicker with HYBRID scope persistence** — URL params override localStorage override auto-pick first wallet. Reload survives.
- **Hash-based subroute routing** — `useHashSubpath` handles deep routes like `#backtests/<uuid>?wallet=X` without query-collision bugs.
- **WebSocket envelope minter** — per-app session ID, separate control / telemetry counters, ms-precision ISO-8601 provenance stamping.
- **Order entry** — bracket and trailing-stop dialogs with capability-guard error mapping.

## Getting started

Prerequisites: Node 20+, pnpm 9+, a running Snapper backend at `http://localhost:8000` (or pointed at via `VITE_API_BASE_URL`).

```bash
pnpm install
pnpm dev          # vite dev server on http://localhost:5173
```

Other useful targets:

```bash
make typecheck    # tsc --noEmit
make lint         # eslint + prettier check
make test         # vitest run
make cov          # vitest with coverage
make check-all    # lint + format + typecheck + test + dead-code + cov
```

## Generated types

`src/types/*.generated.ts` and `src/lib/schemas/*.generated.*.ts` are produced from the backend's OpenAPI / WebSocket schemas. They are committed so the repo builds out of the box.

To regenerate against a running backend:

```bash
make gen          # curls http://localhost:8000/openapi.json + ws-schemas + writes src/types/
```

The backend exports its schemas via `make ui-gen-types` from the parent monorepo; either flow works.

## Vendored icons

`public/icons/crypto/` and `public/icons/flags/` are vendored SVGs (no runtime CDN). To re-vendor or add new icons:

```bash
pnpm icons:vendor
```

Sources are tracked in `scripts/vendor-icons.sh` and the manifest is regenerated at `src/components/InstrumentIcon/iconManifest.generated.ts`.

## Architecture notes

- **Smart-hybrid dispatch tiers** — Tier 1 vendored single-asset SVG, Tier 2 mixed pair (text base + vendored quote flag, or vice versa), Tier 3 text fallback. Rules spelled out inline in `src/components/InstrumentIcon/types.ts`.
- **`taxRules.ts`** — Polish PIT / DE / FR cost-basis rules cite their source statutes (Ustawa o PIT art. 17 ust. 1f pkt 11, KIS interpretation lineage, EU equivalents). Update with caution; tax-treatment changes need legal review.
- **`useHashSubpath`** — strips `?query` before splitting on `/`, fixing the deep-route + scope-query collision (e.g. `#backtests/<uuid>?wallet=X` correctly returns `["<uuid>"]` not `["<uuid>?wallet=X"]`).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Forks welcome; PRs get reviewed against `master`.

## License

[MIT](LICENSE) — Mateusz Klatt, 2026.
