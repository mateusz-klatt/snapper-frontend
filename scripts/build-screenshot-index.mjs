#!/usr/bin/env node
/**
 * Build HTML index for the screenshot sweep.
 *
 * Generates (under proprietary/screenshots/frontend/):
 *   index.html                — locale grid (links to per-locale page)
 *   <code>/index.html         — 13 screens for one locale
 *   by-screen/<screen>.html   — all 45 locales of one screen (compare)
 */
import { writeFile } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = resolve(__dirname, '../../proprietary/screenshots/frontend')

const LOCALES = [
  ['ie', '🇮🇪', 'Ireland (ga)'],
  ['us', '🇺🇸', 'United States (en)'],
  ['pl', '🇵🇱', 'Polska (pl)'],
  ['de', '🇩🇪', 'Deutschland (de)'],
  ['fr', '🇫🇷', 'France (fr)'],
  ['es', '🇪🇸', 'España (es)'],
  ['it', '🇮🇹', 'Italia (it)'],
  ['nl', '🇳🇱', 'Nederland (nl)'],
  ['br', '🇧🇷', 'Brasil (pt)'],
  ['se', '🇸🇪', 'Sverige (sv)'],
  ['no', '🇳🇴', 'Norge (no)'],
  ['dk', '🇩🇰', 'Danmark (da)'],
  ['fi', '🇫🇮', 'Suomi (fi)'],
  ['is', '🇮🇸', 'Ísland (is)'],
  ['gr', '🇬🇷', 'Ελλάδα (el)'],
  ['cn', '🇨🇳', '中国 (zh)'],
  ['hk', '🇭🇰', '香港 (zh-Hant)'],
  ['jp', '🇯🇵', '日本 (ja)'],
  ['kr', '🇰🇷', '한국 (ko)'],
  ['th', '🇹🇭', 'ไทย (th)'],
  ['vn', '🇻🇳', 'Việt Nam (vi)'],
  ['ph', '🇵🇭', 'Pilipinas (fil)'],
  ['my', '🇲🇾', 'Malaysia (ms)'],
  ['id', '🇮🇩', 'Indonesia (id)'],
  ['mm', '🇲🇲', 'Myanmar (my-MM)'],
  ['in', '🇮🇳', 'भारत (hi)'],
  ['bd', '🇧🇩', 'বাংলাদেশ (bn)'],
  ['ke', '🇰🇪', 'Kenya (sw)'],
  ['ae', '🇦🇪', 'الإمارات (ar)'],
  ['il', '🇮🇱', 'ישראל (he)'],
  ['cz', '🇨🇿', 'Česko (cs)'],
  ['sk', '🇸🇰', 'Slovensko (sk)'],
  ['hu', '🇭🇺', 'Magyarország (hu)'],
  ['ro', '🇷🇴', 'România (ro)'],
  ['ua', '🇺🇦', 'Україна (uk)'],
  ['ru', '🇷🇺', 'Россия (ru)'],
  ['lt', '🇱🇹', 'Lietuva (lt)'],
  ['lv', '🇱🇻', 'Latvija (lv)'],
  ['hr', '🇭🇷', 'Hrvatska (hr)'],
  ['rs', '🇷🇸', 'Srbija (sr)'],
  ['ba', '🇧🇦', 'Bosna i Herc (bs)'],
  ['al', '🇦🇱', 'Shqipëria (sq)'],
  ['tr', '🇹🇷', 'Türkiye (tr)'],
  ['ir', '🇮🇷', 'ایران (fa)'],
  ['am', '🇦🇲', 'Հայաստան (hy)'],
]

const SCREENS = [
  'overview',
  'market',
  'processes',
  'strategies',
  'orders',
  'positions',
  'signals',
  'backtests',
  'health',
  'admin',
  'ai-integration',
  'ai-reviews',
  'settings',
]

const CSS = `
  body { margin: 0; font-family: system-ui, -apple-system, sans-serif; background: #0b0e14; color: #e4e7eb; }
  .topnav { padding: 12px 24px; background: #161b22; border-bottom: 1px solid #30363d; position: sticky; top: 0; z-index: 10; }
  .topnav a { color: #58a6ff; text-decoration: none; margin-right: 16px; }
  .topnav a:hover { text-decoration: underline; }
  h1 { font-size: 18px; margin: 0; display: inline-block; }
  .grid { display: grid; gap: 10px; padding: 24px; }
  .locale-grid { grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); }
  .screen-grid { grid-template-columns: repeat(auto-fill, minmax(380px, 1fr)); }
  .card { background: #161b22; border: 1px solid #30363d; border-radius: 8px; overflow: hidden; }
  .card a { color: inherit; text-decoration: none; display: block; }
  .card img { display: block; width: 100%; height: auto; background: #0b0e14; }
  .card-label { padding: 10px 12px; font-size: 13px; display: flex; align-items: center; gap: 8px; border-top: 1px solid #30363d; }
  .flag { font-size: 20px; }
  .code { color: #8b949e; font-size: 11px; margin-left: auto; }
  .breadcrumb { padding: 12px 24px; background: #0b0e14; color: #8b949e; font-size: 13px; }
  .full { padding: 24px; }
  .full img { width: 100%; max-width: 1440px; border: 1px solid #30363d; display: block; margin: 0 auto; }
`

const head = title => `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8" />
<title>${title}</title>
<style>${CSS}</style>
</head><body>`

/**
 * Relative-path nav. `base` is the relative prefix from the current page
 * to the root of the screenshot tree (proprietary/screenshots/frontend/).
 * Root pages pass `./`, one-level subpages pass `../`. Using relative
 * paths is critical because the index is intended to be opened directly
 * via `file://` — absolute `/proprietary/...` paths resolve to the
 * filesystem root and 404 in that mode.
 */
const nav = (base) => `
<div class="topnav">
  <h1>Snapper i18n screenshot sweep</h1>
  <a href="${base}index.html">All locales (45)</a>
  ${SCREENS.map(s => `<a href="${base}by-screen/${s}.html">${s}</a>`).join(' ')}
</div>`

async function buildHome() {
  const cards = LOCALES.map(
    ([code, flag, label]) => `
    <div class="card">
      <a href="${code}/index.html">
        <img src="${code}/overview.png" loading="lazy" alt="${label} overview" />
        <div class="card-label">
          <span class="flag">${flag}</span>
          <span>${label}</span>
          <span class="code">${code}</span>
        </div>
      </a>
    </div>`
  ).join('\n')
  const html = `${head('All locales — Snapper i18n sweep')}
${nav('./')}
<div class="grid locale-grid">${cards}</div>
</body></html>`
  await writeFile(resolve(OUT, 'index.html'), html)
}

async function buildLocalePage(code, flag, label) {
  const cards = SCREENS.map(
    s => `
    <div class="card">
      <a href="${s}.png">
        <img src="${s}.png" loading="lazy" alt="${s}" />
        <div class="card-label"><span>${s}</span></div>
      </a>
    </div>`
  ).join('\n')
  const html = `${head(`${label} — Snapper sweep`)}
${nav('../')}
<div class="breadcrumb">
  <a href="../index.html" style="color:#58a6ff">← all locales</a> &middot;
  <span class="flag">${flag}</span> ${label}
</div>
<div class="grid screen-grid">${cards}</div>
</body></html>`
  await writeFile(resolve(OUT, code, 'index.html'), html)
}

async function buildScreenPage(screen) {
  const cards = LOCALES.map(
    ([code, flag, label]) => `
    <div class="card">
      <a href="../${code}/${screen}.png">
        <img src="../${code}/${screen}.png" loading="lazy" alt="${code} ${screen}" />
        <div class="card-label">
          <span class="flag">${flag}</span>
          <span>${label}</span>
          <span class="code">${code}</span>
        </div>
      </a>
    </div>`
  ).join('\n')
  const html = `${head(`${screen} — all 45 locales`)}
${nav('../')}
<div class="breadcrumb">
  <a href="../index.html" style="color:#58a6ff">← all locales</a> &middot;
  <strong>${screen}</strong> (45 locales side-by-side)
</div>
<div class="grid screen-grid">${cards}</div>
</body></html>`
  const { mkdir } = await import('node:fs/promises')
  await mkdir(resolve(OUT, 'by-screen'), { recursive: true })
  await writeFile(resolve(OUT, 'by-screen', `${screen}.html`), html)
}

async function main() {
  await buildHome()
  for (const [code, flag, label] of LOCALES) {
    await buildLocalePage(code, flag, label)
  }
  for (const s of SCREENS) {
    await buildScreenPage(s)
  }
  console.log(
    `Built index.html + ${LOCALES.length} locale pages + ${SCREENS.length} screen-compare pages`
  )
  console.log(`Open: file://${OUT}/index.html`)
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
