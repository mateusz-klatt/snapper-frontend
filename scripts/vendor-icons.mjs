#!/usr/bin/env node
/**
 * Re-sync `public/icons/` from upstream OSS crypto + flag repos. Run after
 * adding new entries to `src/components/InstrumentIcon/registry/crypto.ts`
 * or `src/components/InstrumentIcon/registry/fiat.ts`.
 *
 * Required tools: git on PATH.
 * Output: SVGs copied into public/icons/{crypto,flags}/ (relative to repo
 * root). Idempotent: re-runs overwrite existing files with current upstream.
 *
 * Cross-platform replacement for the previous bash version. Uses Node's
 * built-in fs / child_process APIs and explicit alphabetical sorting so
 * the manifest output is deterministic across Linux/macOS/Windows.
 */

import { spawnSync } from 'node:child_process'
import {
  existsSync,
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(SCRIPT_DIR, '..')
const PUBLIC_ICONS = resolve(REPO_ROOT, 'public', 'icons')
const TMP_DIR = mkdtempSync(join(tmpdir(), 'snapper-icons-'))

const CRYPTO_REPO = 'https://github.com/spothq/cryptocurrency-icons.git'
const FLAGS_REPO = 'https://github.com/HatScripts/circle-flags.git'

function cleanup() {
  rmSync(TMP_DIR, { recursive: true, force: true })
}

process.on('exit', cleanup)
process.on('SIGINT', () => process.exit(130))
process.on('SIGTERM', () => process.exit(143))

function gitClone(url, dest) {
  const result = spawnSync('git', ['clone', '--depth', '1', '--quiet', url, dest], {
    stdio: 'inherit',
    shell: false,
  })

  if (result.error) {
    console.error(`Failed to invoke git: ${result.error.message}`)
    process.exit(1)
  }

  if (result.status !== 0) {
    console.error(`git clone failed for ${url}`)
    process.exit(result.status ?? 1)
  }
}

/**
 * Extract the symbol arguments from `cryptoIcon(...)` or `flag(...)` calls in a
 * registry source file. Mirrors the bash awk pattern `/<name>\(/{print $2}`
 * with single-quote field separator.
 */
function extractRegistryTokens(filePath, fnName) {
  const source = readFileSync(filePath, 'utf8')
  const pattern = new RegExp(`${fnName}\\('([^']+)'`, 'g')
  const tokens = new Set()
  let match

  while ((match = pattern.exec(source)) !== null) {
    tokens.add(match[1])
  }

  return [...tokens].sort((a, b) => a.localeCompare(b, 'en'))
}

console.log(`Cloning upstream repos to ${TMP_DIR} ...`)
gitClone(CRYPTO_REPO, join(TMP_DIR, 'crypto-src'))
gitClone(FLAGS_REPO, join(TMP_DIR, 'flags-src'))

console.log('Extracting required tokens from registry/crypto.ts ...')
const cryptos = extractRegistryTokens(
  resolve(REPO_ROOT, 'src', 'components', 'InstrumentIcon', 'registry', 'crypto.ts'),
  'cryptoIcon'
)

console.log('Extracting required country codes from registry/fiat.ts ...')
const flags = extractRegistryTokens(
  resolve(REPO_ROOT, 'src', 'components', 'InstrumentIcon', 'registry', 'fiat.ts'),
  'flag'
)

mkdirSync(resolve(PUBLIC_ICONS, 'crypto'), { recursive: true })
mkdirSync(resolve(PUBLIC_ICONS, 'flags'), { recursive: true })

let cryptoCopied = 0
const cryptoMissing = []

for (const sym of cryptos) {
  const src = resolve(TMP_DIR, 'crypto-src', 'svg', 'color', `${sym}.svg`)

  if (existsSync(src)) {
    copyFileSync(src, resolve(PUBLIC_ICONS, 'crypto', `${sym}.svg`))
    cryptoCopied += 1
  } else {
    cryptoMissing.push(sym)
  }
}

let flagCopied = 0
const flagMissing = []

for (const cc of flags) {
  const src = resolve(TMP_DIR, 'flags-src', 'flags', `${cc}.svg`)

  if (existsSync(src)) {
    copyFileSync(src, resolve(PUBLIC_ICONS, 'flags', `${cc}.svg`))
    flagCopied += 1
  } else {
    flagMissing.push(cc)
  }
}

console.log('')
console.log('Vendor sync complete:')
console.log(`  crypto: ${cryptoCopied} SVGs copied`)

if (cryptoMissing.length > 0) {
  console.log(
    `  crypto MISSING from upstream (will use textual fallback): ${cryptoMissing.join(' ')}`
  )
}

console.log(`  flags : ${flagCopied} SVGs copied`)

if (flagMissing.length > 0) {
  console.log(`  flags MISSING from upstream: ${flagMissing.join(' ')}`)
}

/**
 * Generate the vendored-asset manifest. RemoteSvg.tsx consumes it to skip the
 * <img> path entirely for symbols not present locally — keeps the textual
 * fallback deterministic instead of relying on browser onError (which Vite's
 * SPA-fallback handler defeats by returning index.html with HTTP 200 for
 * missing static assets in dev mode).
 */
function listVendoredSet(dir) {
  return readdirSync(dir)
    .filter(name => name.endsWith('.svg'))
    .map(name => name.slice(0, -4))
    .sort((a, b) => a.localeCompare(b, 'en'))
}

const cryptoSet = listVendoredSet(resolve(PUBLIC_ICONS, 'crypto'))
const flagSet = listVendoredSet(resolve(PUBLIC_ICONS, 'flags'))

const manifestPath = resolve(
  REPO_ROOT,
  'src',
  'components',
  'InstrumentIcon',
  'iconManifest.generated.ts'
)
const manifestLines = [
  '// AUTO-GENERATED by scripts/vendor-icons.mjs — do not edit by hand.',
  "// Re-run 'pnpm icons:vendor' to regenerate after adding registry entries.",
  '',
  'export const VENDORED_CRYPTO_ICONS: ReadonlySet<string> = new Set([',
  ...cryptoSet.map(sym => `  '${sym}',`),
  '])',
  '',
  'export const VENDORED_FLAG_ICONS: ReadonlySet<string> = new Set([',
  ...flagSet.map(cc => `  '${cc}',`),
  '])',
  '',
]

writeFileSync(manifestPath, manifestLines.join('\n'), 'utf8')

console.log(`Generated manifest: ${manifestPath}`)
