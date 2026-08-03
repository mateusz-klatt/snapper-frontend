#!/usr/bin/env node
/**
 * Re-sync `public/icons/` from upstream OSS crypto + flag repos. Run after
 * adding new entries to `src/components/InstrumentIcon/registry/crypto.ts`
 * or `src/components/InstrumentIcon/registry/fiat.ts`.
 *
 * Required tools: Git in one of the controlled absolute installation paths
 * supported by `gitCandidatePaths()`.
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
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import { dirname, join, posix, resolve, win32 } from 'node:path'
import { fileURLToPath } from 'node:url'

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(SCRIPT_DIR, '..')

const CRYPTO_REPO = 'https://github.com/spothq/cryptocurrency-icons.git'
const FLAGS_REPO = 'https://github.com/HatScripts/circle-flags.git'

export function gitCandidatePaths(platform = process.platform, homeDirectory = homedir()) {
  if (platform === 'win32') {
    return [
      String.raw`C:\Program Files\Git\cmd\git.exe`,
      String.raw`C:\Program Files (x86)\Git\cmd\git.exe`,
      String.raw`C:\ProgramData\chocolatey\bin\git.exe`,
      win32.join(homeDirectory, 'AppData', 'Local', 'Programs', 'Git', 'cmd', 'git.exe'),
      win32.join(homeDirectory, 'scoop', 'shims', 'git.exe'),
    ]
  }

  return [
    '/usr/bin/git',
    '/usr/local/bin/git',
    '/opt/homebrew/bin/git',
    '/opt/local/bin/git',
    '/run/current-system/sw/bin/git',
    '/nix/var/nix/profiles/default/bin/git',
    posix.join(homeDirectory, '.nix-profile', 'bin', 'git'),
  ]
}

export function gitExecutable({
  platform = process.platform,
  homeDirectory = homedir(),
  candidates = gitCandidatePaths(platform, homeDirectory),
  exists = existsSync,
  canonicalize = realpathSync,
} = {}) {
  const pathApi = platform === 'win32' ? win32 : posix

  for (const candidate of candidates) {
    if (!pathApi.isAbsolute(candidate) || !exists(candidate)) continue

    const canonicalPath = canonicalize(candidate)
    const executableName = pathApi.basename(canonicalPath)

    if (pathApi.isAbsolute(canonicalPath) && /^git(?:\.exe)?$/i.test(executableName)) {
      return canonicalPath
    }
  }

  throw new Error(
    `Cannot locate Git in a supported absolute installation path: ${candidates.join(', ')}`
  )
}

export function gitClone(
  url,
  dest,
  { executable = gitExecutable(), spawn = spawnSync, logError = console.error } = {}
) {
  const result = spawn(executable, ['clone', '--depth', '1', '--quiet', url, dest], {
    stdio: 'inherit',
    shell: false,
  })

  if (result.error) {
    logError(`Failed to invoke git: ${result.error.message}`)

    return 1
  }

  if (result.status !== 0) {
    logError(`git clone failed for ${url}`)

    return result.status ?? 1
  }

  return 0
}

/**
 * Extract the symbol arguments from `cryptoIcon(...)` or `flag(...)` calls in a
 * registry source file. Mirrors the bash awk pattern `/<name>\(/{print $2}`
 * with single-quote field separator.
 */
export function extractRegistryTokens(filePath, fnName) {
  const source = readFileSync(filePath, 'utf8')
  const pattern = new RegExp(String.raw`${fnName}\('([^']+)'`, 'g')
  const tokens = new Set()
  let match

  while ((match = pattern.exec(source)) !== null) {
    tokens.add(match[1])
  }

  return [...tokens].sort((a, b) => a.localeCompare(b, 'en'))
}

/**
 * Generate the vendored-asset manifest. RemoteSvg.tsx consumes it to skip the
 * <img> path entirely for symbols not present locally — keeps the textual
 * fallback deterministic instead of relying on browser onError (which Vite's
 * SPA-fallback handler defeats by returning index.html with HTTP 200 for
 * missing static assets in dev mode).
 */
export function listVendoredSet(dir) {
  return readdirSync(dir)
    .filter(name => name.endsWith('.svg'))
    .map(name => name.slice(0, -4))
    .sort((a, b) => a.localeCompare(b, 'en'))
}

export function installSignalCleanup(tempDirectory, runtime = process, remove = rmSync) {
  const cleanup = () => remove(tempDirectory, { recursive: true, force: true })
  const interrupt = () => {
    cleanup()
    runtime.exit(130)
  }
  const terminate = () => {
    cleanup()
    runtime.exit(143)
  }

  runtime.on('SIGINT', interrupt)
  runtime.on('SIGTERM', terminate)

  return () => {
    runtime.off('SIGINT', interrupt)
    runtime.off('SIGTERM', terminate)
    cleanup()
  }
}

export function vendorIcons({
  repoRoot = REPO_ROOT,
  tempRoot = tmpdir(),
  clone = gitClone,
  runtime = process,
  log = console.log,
} = {}) {
  const publicIcons = resolve(repoRoot, 'public', 'icons')
  const tempDirectory = mkdtempSync(join(tempRoot, 'snapper-icons-'))
  const cleanup = installSignalCleanup(tempDirectory, runtime)

  try {
    log(`Cloning upstream repos to ${tempDirectory} ...`)
    let exitCode = clone(CRYPTO_REPO, join(tempDirectory, 'crypto-src'))

    if (exitCode !== 0) return exitCode

    exitCode = clone(FLAGS_REPO, join(tempDirectory, 'flags-src'))

    if (exitCode !== 0) return exitCode

    log('Extracting required tokens from registry/crypto.ts ...')
    const cryptos = extractRegistryTokens(
      resolve(repoRoot, 'src', 'components', 'InstrumentIcon', 'registry', 'crypto.ts'),
      'cryptoIcon'
    )

    log('Extracting required country codes from registry/fiat.ts ...')
    const flags = extractRegistryTokens(
      resolve(repoRoot, 'src', 'components', 'InstrumentIcon', 'registry', 'fiat.ts'),
      'flag'
    )

    mkdirSync(resolve(publicIcons, 'crypto'), { recursive: true })
    mkdirSync(resolve(publicIcons, 'flags'), { recursive: true })

    let cryptoCopied = 0
    const cryptoMissing = []

    for (const sym of cryptos) {
      const src = resolve(tempDirectory, 'crypto-src', 'svg', 'color', `${sym}.svg`)

      if (existsSync(src)) {
        copyFileSync(src, resolve(publicIcons, 'crypto', `${sym}.svg`))
        cryptoCopied += 1
      } else {
        cryptoMissing.push(sym)
      }
    }

    let flagCopied = 0
    const flagMissing = []

    for (const cc of flags) {
      const src = resolve(tempDirectory, 'flags-src', 'flags', `${cc}.svg`)

      if (existsSync(src)) {
        copyFileSync(src, resolve(publicIcons, 'flags', `${cc}.svg`))
        flagCopied += 1
      } else {
        flagMissing.push(cc)
      }
    }

    log('')
    log('Vendor sync complete:')
    log(`  crypto: ${cryptoCopied} SVGs copied`)

    if (cryptoMissing.length > 0) {
      log(`  crypto MISSING from upstream (will use textual fallback): ${cryptoMissing.join(' ')}`)
    }

    log(`  flags : ${flagCopied} SVGs copied`)

    if (flagMissing.length > 0) {
      log(`  flags MISSING from upstream: ${flagMissing.join(' ')}`)
    }

    const cryptoSet = listVendoredSet(resolve(publicIcons, 'crypto'))
    const flagSet = listVendoredSet(resolve(publicIcons, 'flags'))
    const manifestPath = resolve(
      repoRoot,
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
    log(`Generated manifest: ${manifestPath}`)

    return 0
  } finally {
    cleanup()
  }
}

export function runVendorIcons(options = {}) {
  const logError = options.logError ?? console.error

  try {
    return vendorIcons(options)
  } catch (error) {
    logError('Icon vendor sync failed:', error)

    return 1
  }
}

export function setProcessExitCode(exitCode) {
  process.exitCode = exitCode
}

export function runVendorIconsIfMain(
  isMain = import.meta.main,
  run = runVendorIcons,
  setExitCode = setProcessExitCode
) {
  if (isMain) setExitCode(run())
}

runVendorIconsIfMain()
