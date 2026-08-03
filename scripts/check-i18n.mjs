#!/usr/bin/env node
/**
 * Scan TSX source files for hardcoded user-facing strings that should
 * route through ``react-i18next``'s ``t()``.
 *
 * Mirrors the iOS ``check_i18n.sh`` v1 single-pattern lint at
 * ``ios/scripts/check_i18n.sh`` — keeps a narrow, false-positive-free
 * surface that can be wired into ``prepush`` and parent
 * ``make ui-check`` without flaky failures.
 *
 * Patterns flagged (string-literal RHS only — JSX expression containers
 * like ``aria-label={t(...)}`` are ignored by construction):
 *
 *   - ``aria-label='Foo'`` / ``aria-label="Foo"``
 *   - ``title='Foo'`` / ``title="Foo"``
 *   - ``placeholder='Foo'`` / ``placeholder="Foo"``
 *   - ``alt='Foo'`` / ``alt="Foo"``
 *
 * The value must start with an uppercase ASCII letter — short / lowercase
 * literals (``aria-label='x'`` test fixtures, viewBox-y SVG props, etc.)
 * stay silent.
 *
 * Skipped paths:
 *
 *   - ``node_modules``, ``dist``, ``build``, ``coverage``, ``.git``,
 *     ``.vite``, ``.cache``
 *   - ``*.test.tsx`` / ``*.test.ts``
 *   - Generated files matching ``*.generated.*``
 *   - Any ``file:line`` pair listed in
 *     ``scripts/check-i18n-allowlist.txt`` (EXACT match against the
 *     emitted ``path:line``; one entry per line, ``#`` comments
 *     allowed). An entry ``src/foo.tsx:1`` will NOT match
 *     ``src/foo.tsx:10`` — substring-shadowing was rejected because
 *     ``:1`` would silently exempt ``:10``, ``:11``, … .
 *
 * Add a new pattern: extend ``PATTERNS`` below. Allowlist an entry: add
 * the exact ``path:line`` to the allowlist file with a rationale
 * comment on the line above.
 *
 * Scanning runs against the full file text (not per-line), so multi-line
 * JSX attribute splits like ``aria-label=\n  "Foo"`` are caught. The
 * attribute-name regex requires a JSX boundary (start-of-line or
 * preceding whitespace/``{``/``(``) to avoid matching `data-aria-label`
 * or similar longer attribute names.
 *
 * Exit 0 when clean; 1 when at least one un-allowlisted hit remains.
 */

import { promises as fs } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import url from 'node:url'

const HERE = path.dirname(url.fileURLToPath(import.meta.url))
const FRONTEND_ROOT = path.resolve(HERE, '..')
const SRC_ROOT = path.join(FRONTEND_ROOT, 'src')
const ALLOWLIST_PATH = path.join(HERE, 'check-i18n-allowlist.txt')

const SKIP_DIRS = new Set(['node_modules', 'dist', 'build', 'coverage', '.git', '.vite', '.cache'])
const FILE_EXTENSIONS = new Set(['.tsx', '.ts'])
const TEST_RE = /\.test\.(tsx|ts)$/
const GENERATED_RE = /\.generated(?:\.\w+)*\.(ts|tsx|mts|cts)$/

const ATTR_BOUNDARY = String.raw`(?<=^|[\s{(])`

const PATTERNS = [
  {
    name: 'aria-label',
    regex: new RegExp(String.raw`${ATTR_BOUNDARY}aria-label\s*=\s*(['"])([A-Z][^'"]{1,})\1`, 'g'),
  },
  {
    name: 'title',
    regex: new RegExp(String.raw`${ATTR_BOUNDARY}title\s*=\s*(['"])([A-Z][^'"]{3,})\1`, 'g'),
  },
  {
    name: 'placeholder',
    regex: new RegExp(String.raw`${ATTR_BOUNDARY}placeholder\s*=\s*(['"])([A-Z][^'"]{2,})\1`, 'g'),
  },
  {
    name: 'alt',
    regex: new RegExp(String.raw`${ATTR_BOUNDARY}alt\s*=\s*(['"])([A-Z][^'"]{1,})\1`, 'g'),
  },
]

export async function loadAllowlist(allowlistPath = ALLOWLIST_PATH, fsApi = fs) {
  let raw
  try {
    raw = await fsApi.readFile(allowlistPath, 'utf8')
  } catch (err) {
    if (err.code === 'ENOENT') {
      return []
    }
    throw err
  }
  return raw
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0 && !line.startsWith('#'))
}

export async function walk(root, out, fsApi = fs) {
  let entries
  try {
    entries = await fsApi.readdir(root, { withFileTypes: true })
  } catch {
    return
  }
  for (const entry of entries) {
    if (entry.name.startsWith('.')) {
      continue
    }
    const full = path.join(root, entry.name)
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) {
        continue
      }
      await walk(full, out, fsApi)
      continue
    }
    if (!entry.isFile()) {
      continue
    }
    const ext = path.extname(entry.name)
    if (!FILE_EXTENSIONS.has(ext)) {
      continue
    }
    if (TEST_RE.test(entry.name) || GENERATED_RE.test(entry.name)) {
      continue
    }
    out.push(full)
  }
}

export function lineNumberAt(content, offset) {
  let count = 1
  for (let i = 0; i < offset && i < content.length; i++) {
    if (content[i] === '\n') count++
  }
  return count
}

export function scanContent(content, relPath) {
  const hits = []
  for (const { name, regex } of PATTERNS) {
    regex.lastIndex = 0
    let match
    while ((match = regex.exec(content)) !== null) {
      hits.push({
        file: relPath,
        line: lineNumberAt(content, match.index),
        attr: name,
        literal: match[2],
      })
    }
  }
  return hits
}

export function isAllowlisted(hit, allowlist) {
  const probe = `${hit.file}:${hit.line}`
  return allowlist.includes(probe)
}

export async function checkI18n({
  frontendRoot = FRONTEND_ROOT,
  srcRoot = SRC_ROOT,
  allowlistPath = ALLOWLIST_PATH,
  fsApi = fs,
  logError = console.error,
} = {}) {
  const allowlist = await loadAllowlist(allowlistPath, fsApi)
  const files = []
  await walk(srcRoot, files, fsApi)
  files.sort((left, right) => left.localeCompare(right, 'en'))

  const violations = []
  for (const absPath of files) {
    const relPath = path.relative(frontendRoot, absPath)
    let content
    try {
      content = await fsApi.readFile(absPath, 'utf8')
    } catch {
      continue
    }
    const hits = scanContent(content, relPath)
    for (const hit of hits) {
      if (isAllowlisted(hit, allowlist)) {
        continue
      }
      violations.push(hit)
    }
  }

  if (violations.length === 0) {
    return 0
  }

  logError('check-i18n: hardcoded user-facing literals found:')
  for (const v of violations) {
    logError(`  ${v.file}:${v.line}: ${v.attr}=${JSON.stringify(v.literal)}`)
  }
  logError('')
  logError(
    'Route the value through useTranslation(...).t(key), ' +
      'or add a justified entry to scripts/check-i18n-allowlist.txt.'
  )

  return 1
}

export async function runCheckI18n(options = {}) {
  const logError = options.logError ?? console.error

  try {
    return await checkI18n(options)
  } catch (error) {
    logError('check-i18n: unexpected error:', error)

    return 2
  }
}

export function setProcessExitCode(exitCode) {
  process.exitCode = exitCode
}

export async function runCheckI18nIfMain(
  isMain = import.meta.main,
  run = runCheckI18n,
  setExitCode = setProcessExitCode
) {
  if (isMain) setExitCode(await run())
}

await runCheckI18nIfMain()
