import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { after, test } from 'node:test'

import {
  buildScreenshotIndex,
  runScreenshotIndex,
  runScreenshotIndexIfMain,
  screenshotOutputDirectory,
  setProcessExitCode as setScreenshotExitCode,
} from './build-screenshot-index.mjs'
import {
  checkI18n,
  isAllowlisted,
  lineNumberAt,
  loadAllowlist,
  runCheckI18n,
  runCheckI18nIfMain,
  toPosixPath,
  scanContent,
  setProcessExitCode as setI18nExitCode,
  walk,
} from './check-i18n.mjs'
import {
  checkNoComments,
  findNonDocComments,
  iterTypeScriptFiles,
  parseArguments,
  printResults,
  runCheckNoComments,
  runCheckNoCommentsIfMain,
  scanFiles,
  setProcessExitCode as setCommentExitCode,
  shouldSkipPath,
  TSScanContext,
} from './check-no-comments.mjs'
import {
  extractRegistryTokens,
  gitCandidatePaths,
  gitClone,
  gitExecutable,
  installSignalCleanup,
  listVendoredSet,
  runVendorIcons,
  runVendorIconsIfMain,
  setProcessExitCode as setVendorExitCode,
  vendorIcons,
} from './vendor-icons.mjs'

const temporaryDirectories = []

async function makeTemporaryDirectory(prefix) {
  const directory = await mkdtemp(join(tmpdir(), prefix))

  temporaryDirectories.push(directory)

  return directory
}

async function put(filePath, content) {
  await mkdir(dirname(filePath), { recursive: true })
  await writeFile(filePath, content, 'utf8')
}

function exerciseProcessExitCode(setExitCode) {
  const originalExitCode = process.exitCode

  setExitCode(0)
  assert.equal(process.exitCode, 0)

  process.exitCode = originalExitCode
}

after(async () => {
  await Promise.all(
    temporaryDirectories.map(directory => rm(directory, { recursive: true, force: true }))
  )
})

test('screenshot index renders every locale and screen and reports failures', async () => {
  const writes = new Map()
  const madeDirectories = []
  const logs = []
  const out = '/virtual/screenshots'

  await buildScreenshotIndex({
    out,
    write: async (filePath, content) => writes.set(filePath, content),
    makeDirectory: async filePath => madeDirectories.push(filePath),
    log: message => logs.push(message),
  })

  assert.equal(writes.size, 59)
  assert.equal(madeDirectories.length, 13)
  assert.match(writes.get(resolve(out, 'index.html')), /Ireland \(ga\)/)
  assert.match(writes.get(resolve(out, 'pl', 'index.html')), /Polska \(pl\) — Snapper sweep/)
  assert.match(writes.get(resolve(out, 'by-screen', 'overview.html')), /all 45 locales/)
  assert.deepEqual(logs, [
    'Built index.html + 45 locale pages + 13 screen-compare pages',
    'Open: file:///virtual/screenshots/index.html',
  ])

  const scriptDirectory = resolve('repo', 'frontend', 'scripts')
  const mobileOutputDirectory = resolve(
    scriptDirectory,
    '../../proprietary/screenshots/frontend-mobile'
  )
  const desktopOutputDirectory = resolve(scriptDirectory, '../../proprietary/screenshots/frontend')

  assert.equal(screenshotOutputDirectory('mobile', scriptDirectory), mobileOutputDirectory)
  assert.equal(screenshotOutputDirectory('desktop', scriptDirectory), desktopOutputDirectory)

  const originalViewport = process.env.VIEWPORT

  const defaultViewportWrites = []
  const desktopDefaultWrites = []
  let success

  try {
    process.env.VIEWPORT = 'mobile'
    success = await runScreenshotIndex({
      scriptDirectory,
      write: async filePath => defaultViewportWrites.push(filePath),
      makeDirectory: async () => {},
      log: () => {},
    })

    delete process.env.VIEWPORT
    assert.equal(
      await runScreenshotIndex({
        scriptDirectory,
        write: async filePath => desktopDefaultWrites.push(filePath),
        makeDirectory: async () => {},
        log: () => {},
      }),
      0
    )
  } finally {
    if (originalViewport === undefined) delete process.env.VIEWPORT
    else process.env.VIEWPORT = originalViewport
  }

  assert.equal(success, 0)
  assert.equal(defaultViewportWrites[0], resolve(mobileOutputDirectory, 'index.html'))
  assert.equal(desktopDefaultWrites[0], resolve(desktopOutputDirectory, 'index.html'))

  const errors = []
  const failure = await runScreenshotIndex({
    viewport: 'desktop',
    scriptDirectory,
    write: async () => {
      throw new Error('write failed')
    },
    log: () => {},
    logError: error => errors.push(error),
  })

  assert.equal(failure, 1)
  assert.equal(errors[0].message, 'write failed')

  const exitCodes = []

  await runScreenshotIndexIfMain(
    true,
    async () => 7,
    code => exitCodes.push(code)
  )
  assert.deepEqual(exitCodes, [7])
  exerciseProcessExitCode(setScreenshotExitCode)
})

/**
 * Wrap an fs module so one directory reports an extra entry that is neither a
 * file nor a directory.
 *
 * Both scanners classify entries purely by dirent type — `isDirectory()` then
 * `isFile()`, skipping anything that answers false to both. Reaching that skip
 * used to mean creating a real symlink, which fails with EPERM on Windows
 * unless the shell is elevated or Developer Mode is on, so the suite passed on
 * Linux and CI and broke on the maintainer's own machine.
 *
 * The branch is a property of the dirent, not of the filesystem, so it is
 * injected instead. That also widens the case: a synthetic entry stands in for
 * every non-file type, including the FIFOs, sockets and devices a symlink test
 * would never have covered.
 *
 * @param {object} realFs fs/promises module to delegate to.
 * @param {string} directory Absolute directory whose listing gains the entry.
 * @param {string} name Entry name to inject.
 * @returns {object} fs-like API for the scanners' `fsApi` parameter.
 */
function withNonFileEntry(realFs, directory, name) {
  return {
    ...realFs,
    async readdir(dir, options) {
      const entries = await realFs.readdir(dir, options)

      if (String(dir) === directory) {
        entries.push({ name, isDirectory: () => false, isFile: () => false })
      }

      return entries
    },
  }
}

test('i18n paths are forward-slashed on every platform', () => {
  assert.equal(toPosixPath('src\\features\\App.tsx', '\\'), 'src/features/App.tsx')
  assert.equal(toPosixPath('src/features/App.tsx'), 'src/features/App.tsx')
})

test('i18n scanner walks source trees, honors exact allowlisting, and reports literals', async () => {
  const frontendRoot = await makeTemporaryDirectory('snapper-i18n-')
  const srcRoot = join(frontendRoot, 'src')
  const allowlistPath = join(frontendRoot, 'allowlist.txt')

  await put(
    join(srcRoot, 'App.tsx'),
    `<button aria-label="Visible">x</button>\n<input title='Window title' />\n<input placeholder="Search now" />\n<img alt='Picture' />\n<span title="low">x</span>\n`
  )
  await put(join(srcRoot, 'Allowed.tsx'), '<button aria-label="Allowed">x</button>\n')
  await put(join(srcRoot, 'Unreadable.tsx'), '<button aria-label="Skipped">x</button>\n')
  await put(join(srcRoot, 'Thing.test.tsx'), '<button aria-label="Test">x</button>\n')
  await put(join(srcRoot, 'Thing.generated.client.ts'), 'const ignored = true\n')
  await put(join(srcRoot, '.hidden.tsx'), '<button aria-label="Hidden">x</button>\n')
  await put(join(srcRoot, 'nested', 'Clean.ts'), 'export const clean = true\n')
  await put(
    join(srcRoot, 'node_modules', 'Ignored.tsx'),
    '<button aria-label="Ignored">x</button>\n'
  )
  await put(join(srcRoot, 'notes.txt'), 'not TypeScript\n')
  await put(allowlistPath, '# Exact source location\n\nsrc/Allowed.tsx:1\nsrc/App.tsx:100\n')

  const fsApi = {
    ...withNonFileEntry(await import('node:fs/promises'), srcRoot, 'notes-link'),
    async readFile(filePath, encoding) {
      if (String(filePath).endsWith('Unreadable.tsx')) throw new Error('unreadable')

      return readFile(filePath, encoding)
    },
  }
  const errors = []
  const exitCode = await checkI18n({
    frontendRoot,
    srcRoot,
    allowlistPath,
    fsApi,
    logError: (...parts) => errors.push(parts.join(' ')),
  })

  assert.equal(exitCode, 1)
  assert.equal(errors.filter(line => line.includes('src/App.tsx')).length, 4)
  assert.ok(errors.some(line => line.includes('aria-label="Visible"')))
  assert.ok(errors.some(line => line.includes('useTranslation')))

  const allowlist = await loadAllowlist(allowlistPath)

  assert.deepEqual(allowlist, ['src/Allowed.tsx:1', 'src/App.tsx:100'])
  assert.deepEqual(await loadAllowlist(join(frontendRoot, 'missing.txt')), [])
  await assert.rejects(
    loadAllowlist(allowlistPath, {
      readFile: async () => {
        const error = new Error('denied')

        error.code = 'EACCES'
        throw error
      },
    }),
    /denied/
  )

  const missingWalk = []

  await walk(join(frontendRoot, 'absent'), missingWalk)
  assert.deepEqual(missingWalk, [])
  assert.equal(lineNumberAt('a\nb\nc', 999), 3)
  assert.equal(lineNumberAt('a\nb', 0), 1)

  const directHits = scanContent(
    `aria-label="Alpha"\n title='Long title'\n placeholder="Find me"\n alt='Image'`,
    'src/Direct.tsx'
  )

  assert.deepEqual(
    directHits.map(hit => hit.attr),
    ['aria-label', 'title', 'placeholder', 'alt']
  )
  assert.equal(isAllowlisted(directHits[0], ['src/Direct.tsx:1']), true)
  assert.equal(isAllowlisted(directHits[1], ['src/Direct.tsx:1']), false)

  const cleanRoot = join(frontendRoot, 'clean-src')

  await put(join(cleanRoot, 'Clean.tsx'), '<button aria-label={t("clean")}>x</button>\n')
  assert.equal(
    await checkI18n({
      frontendRoot,
      srcRoot: cleanRoot,
      allowlistPath: join(frontendRoot, 'missing-allowlist.txt'),
      logError: () => {},
    }),
    0
  )

  const unexpected = []
  const unexpectedCode = await runCheckI18n({
    allowlistPath,
    fsApi: {
      readFile: async () => {
        throw Object.assign(new Error('broken allowlist'), { code: 'EIO' })
      },
    },
    logError: (...parts) => unexpected.push(parts),
  })

  assert.equal(unexpectedCode, 2)
  assert.equal(unexpected[0][0], 'check-i18n: unexpected error:')

  assert.equal(
    await runCheckI18n({
      frontendRoot,
      srcRoot: cleanRoot,
      allowlistPath: join(frontendRoot, 'missing-allowlist.txt'),
    }),
    0
  )
  const mainExitCodes = []

  await runCheckI18nIfMain(
    true,
    async () => 8,
    code => mainExitCodes.push(code)
  )
  assert.deepEqual(mainExitCodes, [8])
  exerciseProcessExitCode(setI18nExitCode)
})

test('comment scanner covers lexical states, path filtering, and CLI modes', async () => {
  const root = await makeTemporaryDirectory('snapper-comments-')
  const srcRoot = join(root, 'src')

  await put(
    join(srcRoot, 'Good.ts'),
    `/** Documentation */\n/// <reference path="types.d.ts" />\nconst first = "// text"\nconst second = '/* text */'\nconst third = \`escaped \\\` and \${value}\`\n`
  )
  await put(
    join(srcRoot, 'Bad.tsx'),
    `const value = 1 // short\n/* ordinary block */\n/**/\n${'/'.repeat(2)} ${'x'.repeat(100)}\n`
  )
  await put(join(srcRoot, 'Ending.ts'), '// final comment')
  await put(join(srcRoot, 'Unterminated.mts'), '/* never closed')
  await put(join(srcRoot, 'Generated.generated.extra.ts'), '// ignored\n')
  await put(join(srcRoot, 'node_modules', 'Ignored.ts'), '// ignored\n')
  await put(join(srcRoot, 'nested', 'Nested.ts'), 'export const nested = true\n')
  await put(join(srcRoot, 'notes.js'), '// ignored extension\n')

  const commentsFs = withNonFileEntry(await import('node:fs/promises'), srcRoot, 'notes-link')

  assert.equal(shouldSkipPath(join(root, 'node_modules', 'x.ts')), true)
  assert.equal(shouldSkipPath(join(root, 'Thing.generated.client.ts')), true)
  assert.equal(shouldSkipPath(join(root, 'src', 'Thing.ts')), false)
  assert.deepEqual(await iterTypeScriptFiles(root, ['missing']), [])

  const files = await iterTypeScriptFiles(root, ['src'], commentsFs)

  assert.deepEqual(
    files.map(filePath => filePath.slice(srcRoot.length + 1)),
    ['Bad.tsx', 'Ending.ts', 'Good.ts', join('nested', 'Nested.ts'), 'Unterminated.mts']
  )

  const context = new TSScanContext('token')

  assert.equal(context.startsWith('tok'), true)
  context.advance()
  context.advance(2)
  assert.equal(context.cursor, 3)

  const findings = findNonDocComments(
    `/** docs */\n/**/\n/* bad */\n/// valid\n// invalid\n"escaped \\" //"\n'escaped \\' /*'\n\`template \\\` // \${value}\`\n/* unterminated`
  )

  assert.deepEqual(
    findings.map(([, text]) => text),
    ['/**/', '/* ... */ block comment', '// invalid', '/* ... unterminated block comment']
  )
  assert.deepEqual(findNonDocComments('/// final directive'), [])

  const results = await scanFiles(root, ['src'])

  assert.equal(results.length, 3)
  assert.ok(results.some(result => result.filepath.endsWith('Bad.tsx')))

  const emptyLogs = []

  assert.equal(
    printResults([], root, message => emptyLogs.push(message)),
    0
  )
  assert.deepEqual(emptyLogs, ['  No TypeScript comments found'])

  const resultLogs = []
  const printed = printResults(
    [
      {
        filepath: join(srcRoot, 'Manual.ts'),
        findings: [
          [1, '// short'],
          [2, `// ${'x'.repeat(100)}`],
        ],
      },
    ],
    root,
    message => resultLogs.push(message)
  )

  assert.equal(printed, 2)
  assert.ok(resultLogs.some(line => line.endsWith('...')))
  assert.deepEqual(parseArguments(['--strict', '--root', 'src', '--root=extra', '--unknown']), {
    strictMode: true,
    overrides: ['src', 'extra'],
  })
  assert.deepEqual(parseArguments(['--root']), { strictMode: false, overrides: [] })

  const reportLogs = []

  assert.equal(
    await checkNoComments({ argv: [], root, log: message => reportLogs.push(message) }),
    0
  )
  assert.ok(reportLogs.some(line => line.includes('Report only')))
  assert.ok(reportLogs.some(line => line.includes('Found non-doc comments')))

  const strictLogs = []

  assert.equal(
    await checkNoComments({
      argv: ['--strict', '--root=src'],
      root,
      log: message => strictLogs.push(message),
    }),
    1
  )
  assert.ok(strictLogs.some(line => line.includes('STRICT MODE')))

  const cleanRoot = join(root, 'clean')

  await put(join(cleanRoot, 'Clean.ts'), '/** Documentation */\nexport const clean = true\n')
  const cleanLogs = []

  assert.equal(
    await checkNoComments({
      argv: ['--root', 'clean'],
      root,
      log: message => cleanLogs.push(message),
    }),
    0
  )
  assert.ok(cleanLogs.some(line => line.includes('Clean docstring-first codebase')))

  const runErrors = []
  const failedRun = await runCheckNoComments({
    root,
    fsApi: {
      readdir,
      readFile: async () => {
        throw new Error('read failure')
      },
    },
    log: () => {},
    logError: (...parts) => runErrors.push(parts),
  })

  assert.equal(failedRun, 2)
  assert.equal(runErrors[0][0], 'Scanner failed:')

  assert.equal(await runCheckNoComments({ root, argv: ['--root', 'clean'], log: () => {} }), 0)
  const mainExitCodes = []

  await runCheckNoCommentsIfMain(
    true,
    async () => 9,
    code => mainExitCodes.push(code)
  )
  assert.deepEqual(mainExitCodes, [9])
  exerciseProcessExitCode(setCommentExitCode)
})

class FakeRuntime extends EventEmitter {
  constructor() {
    super()
    this.exitCodes = []
  }

  exit(code) {
    this.exitCodes.push(code)
  }
}

function createVendorFixture(repoRoot, tempDirectory, includeAll) {
  const cryptoSource = join(tempDirectory, 'crypto-src', 'svg', 'color')
  const flagsSource = join(tempDirectory, 'flags-src', 'flags')

  mkdirSync(cryptoSource, { recursive: true })
  mkdirSync(flagsSource, { recursive: true })
  writeFileSync(join(cryptoSource, 'btc.svg'), '<svg>btc</svg>')
  writeFileSync(join(flagsSource, 'us.svg'), '<svg>us</svg>')

  if (includeAll) {
    writeFileSync(join(cryptoSource, 'eth.svg'), '<svg>eth</svg>')
    writeFileSync(join(flagsSource, 'pl.svg'), '<svg>pl</svg>')
  }

  mkdirSync(resolve(repoRoot, 'src', 'components', 'InstrumentIcon', 'registry'), {
    recursive: true,
  })
  writeFileSync(
    resolve(repoRoot, 'src', 'components', 'InstrumentIcon', 'registry', 'crypto.ts'),
    "cryptoIcon('eth')\ncryptoIcon('btc')\ncryptoIcon('btc')\n"
  )
  writeFileSync(
    resolve(repoRoot, 'src', 'components', 'InstrumentIcon', 'registry', 'fiat.ts'),
    "flag('us')\nflag('pl')\n"
  )
}

test('icon vendor helper handles platform selection and git failures', async () => {
  const windowsHome = 'C:\\Users\\snapper'
  const windowsCandidates = gitCandidatePaths('win32', windowsHome)
  const posixCandidates = gitCandidatePaths('linux', '/home/snapper')

  assert.ok(windowsCandidates.includes('C:\\Program Files\\Git\\cmd\\git.exe'))
  assert.ok(windowsCandidates.includes('C:\\Users\\snapper\\scoop\\shims\\git.exe'))
  assert.ok(posixCandidates.includes('/run/current-system/sw/bin/git'))
  assert.ok(posixCandidates.includes('/home/snapper/.nix-profile/bin/git'))

  assert.equal(
    gitExecutable({
      platform: 'linux',
      candidates: ['git', '/missing/git', '/candidate/not-git', '/candidate/git'],
      exists: candidate => candidate !== '/missing/git',
      canonicalize: candidate => candidate,
    }),
    '/candidate/git'
  )
  assert.equal(
    gitExecutable({
      platform: 'win32',
      candidates: ['C:\\candidate\\git.exe'],
      exists: () => true,
      canonicalize: candidate => candidate,
    }),
    'C:\\candidate\\git.exe'
  )
  assert.throws(
    () =>
      gitExecutable({
        platform: 'linux',
        candidates: ['/candidate/git'],
        exists: () => true,
        canonicalize: () => 'git',
      }),
    /Cannot locate Git/
  )

  const errors = []
  const options = { executable: '/git', logError: message => errors.push(message) }

  assert.equal(
    gitClone('repo', 'dest', {
      ...options,
      spawn: () => ({ error: new Error('missing'), status: null }),
    }),
    1
  )
  assert.equal(gitClone('repo', 'dest', { ...options, spawn: () => ({ status: 7 }) }), 7)
  assert.equal(gitClone('repo', 'dest', { ...options, spawn: () => ({ status: null }) }), 1)
  assert.equal(gitClone('repo', 'dest', { ...options, spawn: () => ({ status: 0 }) }), 0)
  assert.ok(errors.some(message => message.includes('Failed to invoke git')))
  assert.ok(errors.some(message => message.includes('git clone failed for repo')))

  const directory = await makeTemporaryDirectory('snapper-registry-')
  const registry = join(directory, 'registry.ts')

  await put(registry, "cryptoIcon('z')\ncryptoIcon('a')\ncryptoIcon('z')\n")
  assert.deepEqual(extractRegistryTokens(registry, 'cryptoIcon'), ['a', 'z'])
  assert.deepEqual(extractRegistryTokens(registry, 'flag'), [])

  await put(join(directory, 'b.svg'), 'b')
  await put(join(directory, 'a.svg'), 'a')
  await put(join(directory, 'ignore.txt'), 'x')
  assert.deepEqual(listVendoredSet(directory), ['a', 'b'])
})

test('icon vendor sync copies available assets, records fallbacks, and cleans temp state', async () => {
  const repoRoot = await makeTemporaryDirectory('snapper-vendor-repo-')
  const tempRoot = await makeTemporaryDirectory('snapper-vendor-temp-')
  const runtime = new FakeRuntime()
  const logs = []
  let fixtureCreated = false

  const exitCode = vendorIcons({
    repoRoot,
    tempRoot,
    runtime,
    log: message => logs.push(message),
    clone: (_url, destination) => {
      if (!fixtureCreated) {
        createVendorFixture(repoRoot, dirname(destination), false)
        fixtureCreated = true
      }

      return 0
    },
  })

  assert.equal(exitCode, 0)
  assert.ok(logs.some(message => message.includes('crypto MISSING') && message.includes('eth')))
  assert.ok(logs.some(message => message.includes('flags MISSING') && message.includes('pl')))
  assert.equal(
    await readFile(join(repoRoot, 'public', 'icons', 'crypto', 'btc.svg'), 'utf8'),
    '<svg>btc</svg>'
  )
  assert.equal(
    await readFile(join(repoRoot, 'public', 'icons', 'flags', 'us.svg'), 'utf8'),
    '<svg>us</svg>'
  )

  const manifest = await readFile(
    join(repoRoot, 'src', 'components', 'InstrumentIcon', 'iconManifest.generated.ts'),
    'utf8'
  )

  assert.match(manifest, /VENDORED_CRYPTO_ICONS/)
  assert.match(manifest, / {2}'btc',/)
  assert.doesNotMatch(manifest, / {2}'eth',/)
  assert.deepEqual(await readdir(tempRoot), [])
  assert.equal(runtime.listenerCount('SIGINT'), 0)
  assert.equal(runtime.listenerCount('SIGTERM'), 0)

  const completeRepo = await makeTemporaryDirectory('snapper-vendor-complete-repo-')
  const completeTemp = await makeTemporaryDirectory('snapper-vendor-complete-temp-')
  let completeFixtureCreated = false
  const completeLogs = []

  assert.equal(
    vendorIcons({
      repoRoot: completeRepo,
      tempRoot: completeTemp,
      runtime: new FakeRuntime(),
      log: message => completeLogs.push(message),
      clone: (_url, destination) => {
        if (!completeFixtureCreated) {
          createVendorFixture(completeRepo, dirname(destination), true)
          completeFixtureCreated = true
        }

        return 0
      },
    }),
    0
  )
  assert.equal(
    completeLogs.some(message => message.includes('MISSING')),
    false
  )

  const wrapperTemp = await makeTemporaryDirectory('snapper-vendor-wrapper-temp-')
  let wrapperFixtureCreated = false

  assert.equal(
    runVendorIcons({
      repoRoot: completeRepo,
      tempRoot: wrapperTemp,
      runtime: new FakeRuntime(),
      log: () => {},
      clone: (_url, destination) => {
        if (!wrapperFixtureCreated) {
          createVendorFixture(completeRepo, dirname(destination), true)
          wrapperFixtureCreated = true
        }

        return 0
      },
    }),
    0
  )

  const firstFailureTemp = await makeTemporaryDirectory('snapper-vendor-failure-one-')

  assert.equal(
    vendorIcons({
      repoRoot: completeRepo,
      tempRoot: firstFailureTemp,
      runtime: new FakeRuntime(),
      log: () => {},
      clone: () => 11,
    }),
    11
  )
  assert.deepEqual(await readdir(firstFailureTemp), [])

  const secondFailureTemp = await makeTemporaryDirectory('snapper-vendor-failure-two-')
  let cloneCalls = 0

  assert.equal(
    vendorIcons({
      repoRoot: completeRepo,
      tempRoot: secondFailureTemp,
      runtime: new FakeRuntime(),
      log: () => {},
      clone: () => {
        cloneCalls += 1

        return cloneCalls === 1 ? 0 : 12
      },
    }),
    12
  )
  assert.deepEqual(await readdir(secondFailureTemp), [])
})

test('icon vendor signal cleanup and top-level error reporting preserve exit semantics', async () => {
  const interruptDirectory = await makeTemporaryDirectory('snapper-signal-int-')
  const interruptRuntime = new FakeRuntime()
  const disposeInterrupt = installSignalCleanup(interruptDirectory, interruptRuntime)

  interruptRuntime.emit('SIGINT')
  assert.equal(existsSync(interruptDirectory), false)
  assert.deepEqual(interruptRuntime.exitCodes, [130])
  disposeInterrupt()

  const terminateDirectory = await makeTemporaryDirectory('snapper-signal-term-')
  const terminateRuntime = new FakeRuntime()
  const disposeTerminate = installSignalCleanup(terminateDirectory, terminateRuntime)

  terminateRuntime.emit('SIGTERM')
  assert.equal(existsSync(terminateDirectory), false)
  assert.deepEqual(terminateRuntime.exitCodes, [143])
  disposeTerminate()

  const repoRoot = await makeTemporaryDirectory('snapper-vendor-broken-repo-')
  const tempRoot = await makeTemporaryDirectory('snapper-vendor-broken-temp-')
  const errors = []

  assert.equal(
    runVendorIcons({
      repoRoot,
      tempRoot,
      runtime: new FakeRuntime(),
      log: () => {},
      logError: (...parts) => errors.push(parts),
      clone: () => 0,
    }),
    1
  )
  assert.equal(errors[0][0], 'Icon vendor sync failed:')

  const mainExitCodes = []

  runVendorIconsIfMain(
    true,
    () => 10,
    code => mainExitCodes.push(code)
  )
  assert.deepEqual(mainExitCodes, [10])
  exerciseProcessExitCode(setVendorExitCode)
})
