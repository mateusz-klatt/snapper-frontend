#!/usr/bin/env node
/**
 * Scan TypeScript / TSX source files for non-doc comment tokens.
 *
 * Mirrors `scripts/check_no_comments.py` from the parent monorepo
 * (Python) and `ios/scripts/check_no_comments.py` (Swift). The
 * project treats JSDoc / triple-slash directives as the canonical
 * place for rationale and guidance.
 *
 * Allowed (doc-style):
 *   - `///` triple-slash directives (TypeScript reference paths).
 *   - `/** ... *\/` JSDoc blocks.
 *
 * Forbidden (non-doc):
 *   - `//` single-line comments.
 *   - `/* ... *\/` plain block comments.
 *
 * The scanner walks each file character by character through a small
 * state machine: code, single-quoted string, double-quoted string,
 * template literal (with `${}` interpolation back to code), block
 * comment (with doc-vs-non-doc tag). It does not aim to parse
 * TypeScript fully — but the rule is enforced closely enough to keep
 * the project's docstring-first style without false positives in
 * practice.
 *
 * CLI flags:
 *   --strict       Return exit code 1 when any non-doc comment is
 *                  found. Default: report-only (exit 0).
 *   --root <path>  Add a relative root to scan; pass multiple times
 *                  to scan multiple directories. Default: `src`.
 */

import { promises as fs } from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const DEFAULT_RELATIVE_ROOTS = ['src']
const SKIP_DIRS = new Set(['node_modules', 'dist', 'build', 'coverage', '.git', '.vite', '.cache'])
const FILE_EXTENSIONS = new Set(['.ts', '.tsx', '.mts', '.cts'])
const GENERATED_RE = /\.generated(?:\.\w+)*\.(ts|tsx|mts|cts)$/

function shouldSkipPath(filepath) {
  const parts = filepath.split(path.sep)
  if (parts.some(part => SKIP_DIRS.has(part))) {
    return true
  }
  return GENERATED_RE.test(path.basename(filepath))
}

async function iterTypeScriptFiles(root, relativeRoots) {
  const out = []

  async function walk(dir) {
    let entries
    try {
      entries = await fs.readdir(dir, { withFileTypes: true })
    } catch {
      return
    }
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)
      if (shouldSkipPath(fullPath)) {
        continue
      }
      if (entry.isDirectory()) {
        await walk(fullPath)
        continue
      }
      if (!entry.isFile()) {
        continue
      }
      const ext = path.extname(entry.name)
      if (FILE_EXTENSIONS.has(ext)) {
        out.push(fullPath)
      }
    }
  }

  for (const relativeRoot of relativeRoots) {
    const searchRoot = path.join(root, relativeRoot)
    await walk(searchRoot)
  }
  return out.sort()
}

class TSScanContext {
  constructor(text) {
    this.text = text
    this.length = text.length
    this.findings = []
    this.state = 'code'
    this.blockDoc = false
    this.blockOpenLine = 0
    this.lineNo = 1
    this.cursor = 0
    this.templateDepth = 0
  }

  startsWith(token) {
    return this.text.startsWith(token, this.cursor)
  }

  advance(count = 1) {
    this.cursor += count
  }
}

function advanceCode(ctx) {
  const ch = ctx.text[ctx.cursor]
  if (ctx.startsWith('/**/')) {
    ctx.findings.push([ctx.lineNo, '/**/'])
    ctx.advance(4)
    return
  }
  if (ctx.startsWith('/**')) {
    ctx.state = 'block'
    ctx.blockDoc = true
    ctx.blockOpenLine = ctx.lineNo
    ctx.advance(3)
    return
  }
  if (ctx.startsWith('/*')) {
    ctx.state = 'block'
    ctx.blockDoc = false
    ctx.blockOpenLine = ctx.lineNo
    ctx.advance(2)
    return
  }
  if (ctx.startsWith('///')) {
    skipToEol(ctx)
    return
  }
  if (ctx.startsWith('//')) {
    consumeLineComment(ctx)
    return
  }
  if (ch === '"') {
    ctx.state = 'dstring'
    ctx.advance(1)
    return
  }
  if (ch === "'") {
    ctx.state = 'sstring'
    ctx.advance(1)
    return
  }
  if (ch === '`') {
    ctx.state = 'template'
    ctx.advance(1)
    return
  }
  if (ctx.templateDepth > 0 && ch === '}') {
    ctx.state = 'template'
    ctx.templateDepth -= 1
    ctx.advance(1)
    return
  }
  ctx.advance(1)
}

function skipToEol(ctx) {
  const end = ctx.text.indexOf('\n', ctx.cursor)
  ctx.cursor = end === -1 ? ctx.length : end
}

function consumeLineComment(ctx) {
  const end = ctx.text.indexOf('\n', ctx.cursor)
  const stop = end === -1 ? ctx.length : end
  const snippet = ctx.text.slice(ctx.cursor, stop)
  ctx.findings.push([ctx.lineNo, snippet])
  ctx.cursor = stop
}

function advanceString(ctx, quote) {
  const ch = ctx.text[ctx.cursor]
  if (ch === '\\' && ctx.cursor + 1 < ctx.length) {
    ctx.advance(2)
    return
  }
  if (ch === quote) {
    ctx.state = 'code'
  }
  ctx.advance(1)
}

function advanceTemplate(ctx) {
  const ch = ctx.text[ctx.cursor]
  if (ch === '\\' && ctx.cursor + 1 < ctx.length) {
    ctx.advance(2)
    return
  }
  if (ctx.startsWith('${')) {
    ctx.state = 'code'
    ctx.templateDepth += 1
    ctx.advance(2)
    return
  }
  if (ch === '`') {
    ctx.state = 'code'
  }
  ctx.advance(1)
}

function advanceBlock(ctx) {
  if (ctx.startsWith('*/')) {
    if (!ctx.blockDoc) {
      ctx.findings.push([ctx.blockOpenLine, '/* ... */ block comment'])
    }
    ctx.state = 'code'
    ctx.blockDoc = false
    ctx.advance(2)
    return
  }
  ctx.advance(1)
}

function findNonDocComments(text) {
  const ctx = new TSScanContext(text)
  while (ctx.cursor < ctx.length) {
    if (ctx.text[ctx.cursor] === '\n') {
      ctx.lineNo += 1
      ctx.advance(1)
      continue
    }
    switch (ctx.state) {
      case 'code':
        advanceCode(ctx)
        break
      case 'sstring':
        advanceString(ctx, "'")
        break
      case 'dstring':
        advanceString(ctx, '"')
        break
      case 'template':
        advanceTemplate(ctx)
        break
      case 'block':
        advanceBlock(ctx)
        break
      default:
        ctx.advance(1)
    }
  }
  if (ctx.state === 'block' && !ctx.blockDoc) {
    ctx.findings.push([ctx.blockOpenLine, '/* ... unterminated block comment'])
  }
  return ctx.findings
}

async function scanFiles(root, relativeRoots) {
  const files = await iterTypeScriptFiles(root, relativeRoots)
  const results = []
  for (const filepath of files) {
    const text = await fs.readFile(filepath, 'utf8')
    const findings = findNonDocComments(text)
    if (findings.length > 0) {
      results.push({ filepath, findings })
    }
  }
  return results
}

function printResults(results, root) {
  if (results.length === 0) {
    console.log('  No TypeScript comments found')
    return 0
  }
  let total = 0
  for (const { filepath, findings } of results) {
    const rel = path.relative(root, filepath)
    console.log(`\n  ${rel}`)
    for (const [lineNo, text] of findings) {
      const display = text.length > 80 ? `${text.slice(0, 80)}...` : text
      console.log(`     L${lineNo}: ${display}`)
      total += 1
    }
  }
  return total
}

function parseArguments(argv) {
  let strictMode = false
  const overrides = []
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--strict') {
      strictMode = true
      continue
    }
    if (arg === '--root') {
      const next = argv[i + 1]
      if (typeof next === 'string') {
        overrides.push(next)
        i += 1
      }
      continue
    }
    if (arg.startsWith('--root=')) {
      overrides.push(arg.slice('--root='.length))
    }
  }
  return { strictMode, overrides }
}

async function main() {
  const { strictMode, overrides } = parseArguments(process.argv.slice(2))
  const scriptDir = path.dirname(new URL(import.meta.url).pathname)
  const root = path.resolve(scriptDir, '..')
  const relativeRoots = overrides.length > 0 ? overrides : DEFAULT_RELATIVE_ROOTS
  const heading = '='.repeat(70)
  console.log(heading)
  console.log('TypeScript Comment Scanner')
  console.log(heading)
  console.log(`\nScanning: ${root}`)
  const modeLabel = strictMode ? 'STRICT (will fail on findings)' : 'Report only'
  console.log(`Mode: ${modeLabel}`)
  console.log(`Relative roots: ${relativeRoots.join(', ')}`)
  const results = await scanFiles(root, relativeRoots)
  console.log(`\n${'-'.repeat(70)}`)
  console.log('TYPESCRIPT FILES (.ts / .tsx)')
  console.log('-'.repeat(70))
  const total = printResults(results, root)
  console.log(`\n${heading}`)
  console.log('SUMMARY')
  console.log(heading)
  console.log(`\n  TypeScript non-doc comments: ${total}`)
  if (total > 0) {
    console.log(
      '\nFound non-doc comments. Move rationale and guidance into JSDoc blocks (`/** ... */`) or remove them.'
    )
    if (strictMode) {
      console.log('\nSTRICT MODE: Failing due to comments found.')
      return 1
    }
    return 0
  }
  console.log('\nNo TypeScript non-doc comments found. Clean docstring-first codebase!')
  return 0
}

main()
  .then(exitCode => process.exit(exitCode))
  .catch(error => {
    console.error('Scanner failed:', error)
    process.exit(2)
  })
