import { describe, it, expect } from 'vitest'

type Catalog = Record<string, unknown>

const catalogModules = import.meta.glob('../locales/*/*.json', {
  eager: true,
  import: 'default',
}) as Record<string, Catalog>

const CATALOG_PATH_RE = /locales\/([^/]+)\/([^/]+)\.json$/

const indexedCatalogs: Record<string, Record<string, Catalog>> = {}

for (const [path, content] of Object.entries(catalogModules)) {
  const match = CATALOG_PATH_RE.exec(path)

  if (match === null) continue
  const [, lng, ns] = match as unknown as [string, string, string]

  if (indexedCatalogs[lng] === undefined) {
    indexedCatalogs[lng] = {}
  }

  indexedCatalogs[lng][ns] = content
}

const BASE_LANGUAGE = 'en'

const PLURAL_SUFFIXES = ['_zero', '_one', '_two', '_few', '_many', '_other'] as const

const stripPluralSuffix = (key: string): string => {
  for (const suffix of PLURAL_SUFFIXES) {
    if (key.endsWith(suffix)) {
      return key.slice(0, -suffix.length)
    }
  }

  return key
}

const flattenKeys = (obj: Catalog, prefix = ''): string[] => {
  const out: string[] = []

  for (const [key, value] of Object.entries(obj)) {
    const path = prefix === '' ? key : `${prefix}.${key}`

    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      out.push(...flattenKeys(value as Catalog, path))
    } else {
      out.push(path)
    }
  }

  return out
}

const isPluralized = (key: string): boolean => PLURAL_SUFFIXES.some(suffix => key.endsWith(suffix))

const getValueAtPath = (obj: Catalog, path: string): unknown => {
  let cursor: unknown = obj

  for (const part of path.split('.')) {
    if (typeof cursor !== 'object' || cursor === null) {
      return undefined
    }

    cursor = (cursor as Record<string, unknown>)[part]
  }

  return cursor
}

const PLACEHOLDER_RE = /\{\{(\w+)\}\}/g

const placeholderSet = (value: unknown): Set<string> => {
  const out = new Set<string>()

  if (typeof value !== 'string') return out
  let match: RegExpExecArray | null

  while ((match = PLACEHOLDER_RE.exec(value)) !== null) {
    const name = match[1]

    if (typeof name === 'string') {
      out.add(name)
    }
  }

  return out
}

const setsEqual = <T>(a: Set<T>, b: Set<T>): boolean => {
  if (a.size !== b.size) return false

  for (const v of a) {
    if (!b.has(v)) return false
  }

  return true
}

const checkParity = (en: Catalog, target: Catalog, targetLang: string, namespace: string): void => {
  const tag = `${namespace} (${targetLang.toUpperCase()})`
  const enKeys = flattenKeys(en)
  const targetKeys = flattenKeys(target)

  const enBaseKeys = new Set(enKeys.filter(k => !isPluralized(k)))
  const targetBaseKeys = new Set(targetKeys.filter(k => !isPluralized(k)))

  for (const k of enBaseKeys) {
    expect(targetBaseKeys, `${tag}: missing non-plural key '${k}'`).toContain(k)
  }

  for (const k of targetBaseKeys) {
    expect(enBaseKeys, `${tag}: EN is missing non-plural key '${k}' present in target`).toContain(k)
  }

  const enPluralBases = new Set(enKeys.filter(isPluralized).map(stripPluralSuffix))
  const targetPluralBases = new Set(targetKeys.filter(isPluralized).map(stripPluralSuffix))

  for (const b of enPluralBases) {
    expect(targetPluralBases.has(b), `${tag}: missing plural family for '${b}'`).toBe(true)
  }

  for (const b of targetPluralBases) {
    expect(
      enPluralBases.has(b),
      `${tag}: EN is missing plural family for '${b}' present in target`
    ).toBe(true)
  }

  for (const k of enBaseKeys) {
    const enPh = placeholderSet(getValueAtPath(en, k))
    const targetPh = placeholderSet(getValueAtPath(target, k))

    expect(
      setsEqual(enPh, targetPh),
      `${tag}: placeholder mismatch on '${k}' — EN has ${JSON.stringify([
        ...enPh,
      ])}, target has ${JSON.stringify([...targetPh])}`
    ).toBe(true)
  }
}

const baseCatalog = indexedCatalogs[BASE_LANGUAGE]

if (baseCatalog === undefined) {
  throw new Error(`Missing base catalog for language '${BASE_LANGUAGE}'`)
}

const byLocale = (a: string, b: string): number => a.localeCompare(b)
const targetLanguages = Object.keys(indexedCatalogs)
  .filter(lng => lng !== BASE_LANGUAGE)
  .sort(byLocale)
const namespaces = Object.keys(baseCatalog).sort(byLocale)

describe('catalog parity', () => {
  for (const lng of targetLanguages) {
    const targetCatalog = indexedCatalogs[lng]

    if (targetCatalog === undefined) continue

    for (const ns of namespaces) {
      it(`${ns}: ${BASE_LANGUAGE.toUpperCase()} ↔ ${lng.toUpperCase()}`, () => {
        const enNamespace = baseCatalog[ns]
        const targetNamespace = targetCatalog[ns]

        expect(
          enNamespace,
          `Base language '${BASE_LANGUAGE}' is missing namespace '${ns}'`
        ).toBeDefined()
        expect(
          targetNamespace,
          `Target language '${lng}' is missing namespace '${ns}'`
        ).toBeDefined()

        checkParity(enNamespace as Catalog, targetNamespace as Catalog, lng, ns)
      })
    }
  }
})

describe('Polish plural boundary cases', () => {
  it('Intl.PluralRules pl categorises correctly', () => {
    const pr = new Intl.PluralRules('pl')

    expect(pr.select(1)).toBe('one')
    expect(pr.select(2)).toBe('few')
    expect(pr.select(5)).toBe('many')
    expect(pr.select(12)).toBe('many')
    expect(pr.select(22)).toBe('few')
    expect(pr.select(100)).toBe('many')
    expect(pr.select(1.5)).toBe('other')
  })
})
