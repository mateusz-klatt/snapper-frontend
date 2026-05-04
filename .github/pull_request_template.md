## Summary

<!-- 1-3 sentences. What changed and why. -->

## Type of change

- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Refactor / docs / build / CI (no runtime behaviour change)

## Checklist

- [ ] `make check-all` is green locally (lint, format, typecheck, test, dead-code, cov, build)
- [ ] New code has tests covering happy path + at least one edge case
- [ ] No `any` introduced in new TypeScript code
- [ ] No internal monorepo paths or identifiers leaked (file paths, internal hostnames, internal email domains)
- [ ] Touched user-visible behaviour → updated `README.md` / `CONTRIBUTING.md` if relevant
- [ ] Generated files (`*.generated.*`) not hand-edited — regenerated via `make gen` if affected

## Notes for reviewer

<!-- Optional context: why this approach, alternatives considered, areas of uncertainty. -->
