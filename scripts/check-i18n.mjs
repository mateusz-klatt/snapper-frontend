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
 *     ``scripts/check-i18n-allowlist.txt`` (substring match against the
 *     emitted ``path:line`` prefix; one entry per line, ``#`` comments
 *     allowed).
 *
 * Add a new pattern: extend ``PATTERNS`` below. Allowlist an entry: add
 * a ``path:line`` substring to the allowlist file with a rationale
 * comment on the line above.
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

const PATTERNS = [
  {
    name: 'aria-label',
    regex: /\baria-label\s*=\s*(['"])([A-Z][^'"]{1,})\1/g,
  },
  {
    name: 'title',
    regex: /\btitle\s*=\s*(['"])([A-Z][^'"]{3,})\1/g,
  },
  {
    name: 'placeholder',
    regex: /\bplaceholder\s*=\s*(['"])([A-Z][^'"]{2,})\1/g,
  },
  {
    name: 'alt',
    regex: /\balt\s*=\s*(['"])([A-Z][^'"]{1,})\1/g,
  },
]

async function loadAllowlist() {
  let raw
  try {
    raw = await fs.readFile(ALLOWLIST_PATH, 'utf8')
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

async function walk(root, out) {
  let entries
  try {
    entries = await fs.readdir(root, { withFileTypes: true })
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
      await walk(full, out)
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

function scanContent(content, relPath) {
  const hits = []
  const lines = content.split('\n')
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    for (const { name, regex } of PATTERNS) {
      regex.lastIndex = 0
      let match
      while ((match = regex.exec(line)) !== null) {
        hits.push({
          file: relPath,
          line: i + 1,
          attr: name,
          literal: match[2],
        })
      }
    }
  }
  return hits
}

function isAllowlisted(hit, allowlist) {
  const probe = `${hit.file}:${hit.line}`
  return allowlist.some(entry => probe.includes(entry))
}

async function main() {
  const allowlist = await loadAllowlist()
  const files = []
  await walk(SRC_ROOT, files)
  files.sort()

  const violations = []
  for (const absPath of files) {
    const relPath = path.relative(FRONTEND_ROOT, absPath)
    let content
    try {
      content = await fs.readFile(absPath, 'utf8')
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
    process.exit(0)
  }

  console.error('check-i18n: hardcoded user-facing literals found:')
  for (const v of violations) {
    console.error(`  ${v.file}:${v.line}: ${v.attr}=${JSON.stringify(v.literal)}`)
  }
  console.error('')
  console.error(
    'Route the value through useTranslation(...).t(key), ' +
      'or add a justified entry to scripts/check-i18n-allowlist.txt.'
  )
  process.exit(1)
}

main().catch(err => {
  console.error('check-i18n: unexpected error:', err)
  process.exit(2)
})
