#!/usr/bin/env node

import { readdirSync, statSync, readFileSync } from 'node:fs'
import { gzipSync } from 'node:zlib'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const ASSETS_DIR = join(ROOT, 'dist', 'assets')

const BUDGET_LARGEST_CHUNK_GZIP_BYTES = 80 * 1024
const BUDGET_TOTAL_JS_GZIP_BYTES = 350 * 1024

function bytesToKb(bytes) {
  return Math.round(bytes / 1024)
}

let files
try {
  files = readdirSync(ASSETS_DIR).filter(name => name.endsWith('.js'))
} catch (err) {
  console.error(`Cannot read ${ASSETS_DIR}: ${err.message}`)
  console.error('Run `pnpm build` first.')
  process.exit(2)
}

if (files.length === 0) {
  console.error(`No JS files in ${ASSETS_DIR}`)
  process.exit(2)
}

let totalGzip = 0
let largestGzip = 0
let largestName = ''
const breakdown = []

for (const name of files) {
  const path = join(ASSETS_DIR, name)
  const buf = readFileSync(path)
  const gzipBytes = gzipSync(buf).byteLength

  totalGzip += gzipBytes
  if (gzipBytes > largestGzip) {
    largestGzip = gzipBytes
    largestName = name
  }
  breakdown.push({ name, gzipKb: bytesToKb(gzipBytes), rawKb: bytesToKb(statSync(path).size) })
}

breakdown.sort((a, b) => b.gzipKb - a.gzipKb)

console.log('Bundle size report (gzipped):')
for (const entry of breakdown) {
  console.log(`  ${entry.gzipKb.toString().padStart(4)} kB  ${entry.name}  (raw ${entry.rawKb} kB)`)
}
console.log('')
console.log(`Largest chunk: ${bytesToKb(largestGzip)} kB gzip  (${largestName})`)
console.log(`Total JS:      ${bytesToKb(totalGzip)} kB gzip`)
console.log('')

let failed = false

if (largestGzip > BUDGET_LARGEST_CHUNK_GZIP_BYTES) {
  console.error(
    `FAIL: largest chunk ${largestGzip} B exceeds budget ${BUDGET_LARGEST_CHUNK_GZIP_BYTES} B gzip`
  )
  failed = true
}

if (totalGzip > BUDGET_TOTAL_JS_GZIP_BYTES) {
  console.error(`FAIL: total JS ${totalGzip} B exceeds budget ${BUDGET_TOTAL_JS_GZIP_BYTES} B gzip`)
  failed = true
}

if (failed) {
  process.exit(1)
}

console.log('OK: within budget')
