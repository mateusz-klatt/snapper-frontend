#!/usr/bin/env node

import { readdirSync, statSync, readFileSync } from 'node:fs'
import { gzipSync } from 'node:zlib'
import { join } from 'node:path'

const ROOT = new URL('..', import.meta.url).pathname
const ASSETS_DIR = join(ROOT, 'dist', 'assets')

const BUDGET_LARGEST_CHUNK_GZIP_KB = 80
const BUDGET_TOTAL_JS_GZIP_KB = 350

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

if (bytesToKb(largestGzip) > BUDGET_LARGEST_CHUNK_GZIP_KB) {
  console.error(
    `FAIL: largest chunk ${bytesToKb(largestGzip)} kB exceeds budget ${BUDGET_LARGEST_CHUNK_GZIP_KB} kB gzip`
  )
  failed = true
}

if (bytesToKb(totalGzip) > BUDGET_TOTAL_JS_GZIP_KB) {
  console.error(
    `FAIL: total JS ${bytesToKb(totalGzip)} kB exceeds budget ${BUDGET_TOTAL_JS_GZIP_KB} kB gzip`
  )
  failed = true
}

if (failed) {
  process.exit(1)
}

console.log('OK: within budget')
