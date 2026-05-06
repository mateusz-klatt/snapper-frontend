#!/usr/bin/env node
/**
 * Regenerate TypeScript types from a running Snapper backend.
 *
 * Usage:
 *   node scripts/gen-from-backend.mjs
 *   BACKEND_URL=http://localhost:8000 node scripts/gen-from-backend.mjs
 *   WS_SCHEMAS_PATH=/path/to/ws-schemas.json node scripts/gen-from-backend.mjs
 *
 * Replaces the previous bash version. Cross-platform: uses Node's built-in
 * fetch + fs APIs; invokes pnpm via the platform-correct binary
 * (`pnpm.cmd` on Windows, `pnpm` elsewhere) so the same script runs under
 * WSL, macOS, Linux, and native Windows shells.
 */

import { spawnSync } from 'node:child_process'
import { mkdirSync, copyFileSync, existsSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(SCRIPT_DIR, '..')
const BUILD_DIR = resolve(REPO_ROOT, 'build')

const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:8000'
const WS_SCHEMAS_PATH = process.env.WS_SCHEMAS_PATH ?? ''

const PNPM_BIN = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm'

function runPnpm(target) {
  const result = spawnSync(PNPM_BIN, [target], {
    cwd: REPO_ROOT,
    stdio: 'inherit',
    shell: false,
  })

  if (result.error) {
    console.error(`Failed to invoke ${PNPM_BIN}: ${result.error.message}`)
    process.exit(1)
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}

async function main() {
  mkdirSync(BUILD_DIR, { recursive: true })

  console.log(`==> Fetching OpenAPI spec from ${BACKEND_URL}/openapi.json`)
  const specUrl = `${BACKEND_URL}/openapi.json`
  const response = await fetch(specUrl)

  if (!response.ok) {
    console.error(`Failed to fetch ${specUrl}: HTTP ${response.status} ${response.statusText}`)
    process.exit(1)
  }

  const specBody = await response.text()

  writeFileSync(resolve(BUILD_DIR, 'openapi.json'), specBody, 'utf8')

  console.log('==> Generating src/types/api.generated.ts')
  runPnpm('gen:api-types')

  if (WS_SCHEMAS_PATH) {
    console.log(`==> Copying WebSocket schemas from ${WS_SCHEMAS_PATH}`)
    copyFileSync(WS_SCHEMAS_PATH, resolve(BUILD_DIR, 'ws-schemas.json'))
  }

  if (existsSync(resolve(BUILD_DIR, 'ws-schemas.json'))) {
    console.log('==> Generating src/types/ws.generated.ts')
    runPnpm('gen:ws-types')
  } else {
    console.log(`==> Skipping ws-types: ${BUILD_DIR}/ws-schemas.json not found`)
    console.log("    Set WS_SCHEMAS_PATH or run the backend's ws-schema export first.")
  }

  console.log('==> Done.')
}

await main()
