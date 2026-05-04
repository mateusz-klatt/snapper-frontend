PNPM := pnpm

.PHONY: help install dev dev-lan build preview lint lint-fix format format-fix typecheck test test-watch cov dead-code dead-code-fix gen icons-vendor check-all fix-all clean

help:
	@echo "Snapper Frontend — Makefile targets"
	@echo ""
	@echo "  install        Install dependencies (pnpm install)"
	@echo "  dev            Start vite dev server on http://localhost:3000"
	@echo "  dev-lan        Start vite dev server on 0.0.0.0:3000 (LAN access)"
	@echo "  build          Production build"
	@echo "  preview        Serve production build locally"
	@echo ""
	@echo "  lint           ESLint check (max-warnings=0 enforced)"
	@echo "  lint-fix       ESLint --fix"
	@echo "  format         Prettier check"
	@echo "  format-fix     Prettier write"
	@echo "  typecheck      tsc --noEmit"
	@echo ""
	@echo "  test           vitest run"
	@echo "  test-watch     vitest watch mode"
	@echo "  cov            vitest with coverage"
	@echo ""
	@echo "  dead-code      knip (dead-code analysis)"
	@echo "  dead-code-fix  knip --fix"
	@echo ""
	@echo "  gen            Regenerate api/ws types from a running backend at :8000"
	@echo "  icons-vendor   Re-vendor crypto + flag SVGs into public/icons/"
	@echo ""
	@echo "  check-all      lint + format + typecheck + test + dead-code + cov + build"
	@echo "  fix-all        lint-fix + format-fix"
	@echo ""
	@echo "  clean          Remove node_modules + build artefacts"

install:
	$(PNPM) install

dev:
	$(PNPM) dev

dev-lan:
	$(PNPM) dev --host 0.0.0.0

build:
	$(PNPM) build

preview:
	$(PNPM) preview

lint:
	$(PNPM) lint

lint-fix:
	$(PNPM) lint:fix

format:
	$(PNPM) format:check

format-fix:
	$(PNPM) format

typecheck:
	$(PNPM) typecheck

test:
	$(PNPM) test:run

test-watch:
	$(PNPM) test

cov:
	$(PNPM) test:coverage

dead-code:
	$(PNPM) dead-code

dead-code-fix:
	$(PNPM) dead-code:fix

gen:
	./scripts/gen-from-backend.sh

icons-vendor:
	$(PNPM) icons:vendor

check-all: lint format typecheck test dead-code cov build
	@echo "All checks passed."

fix-all: lint-fix format-fix
	@echo "Auto-fixes applied."

clean:
	rm -rf node_modules dist coverage .pnpm-store
