# Contributing to Snapper Frontend

Thanks for your interest. This is a single-maintainer project but PRs and issues are welcome.

## Quick workflow

1. Fork the repo
2. Create a topic branch off `master`
3. Make your change. Keep it focused — one concern per PR
4. Run `make check-all` locally — it must be green
5. Open a PR against `master`. Describe what changed and why

## Local setup

```bash
pnpm install
pnpm dev          # vite at http://localhost:5173
```

Most UI changes can be developed against a mocked backend. For features that exercise live WebSocket frames or REST endpoints, point at a real backend with `VITE_API_BASE_URL=http://localhost:8000 pnpm dev`.

## Code style

- TypeScript strict mode — no `any` in new code
- Prefer existing patterns (look at neighbouring components)
- ESLint + Prettier are authoritative — run `make lint` and `pnpm format` before pushing
- Tests live next to the code (`Component.test.tsx`)

## Testing

- `make test` — vitest run
- `make cov` — coverage report
- New features should land with tests covering the happy path and at least one edge case

## What lands fast

- Bug fixes with a regression test
- Accessibility improvements
- Type tightening (turning `unknown` → concrete types at boundaries)
- Performance fixes with a measurement

## What needs discussion first (open an issue)

- New top-level features
- Major refactors
- Dependency additions (especially runtime deps)
- Breaking changes to types exposed to consumers

## License

By contributing you agree your work is released under the [MIT license](LICENSE).
