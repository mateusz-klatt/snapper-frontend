import { describe, it, expect } from 'vitest'
import enCommon from '../locales/en/common.json'
import enAuth from '../locales/en/auth.json'
import plCommon from '../locales/pl/common.json'
import plAuth from '../locales/pl/auth.json'

type Catalog = Record<string, unknown>

const PLURAL_SUFFIXES = ['_one', '_few', '_many', '_other'] as const

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

const checkParity = (en: Catalog, pl: Catalog, namespace: string): void => {
  const enKeys = flattenKeys(en)
  const plKeys = flattenKeys(pl)

  const enBaseKeys = new Set(enKeys.filter(k => !isPluralized(k)))
  const plBaseKeys = new Set(plKeys.filter(k => !isPluralized(k)))

  for (const k of enBaseKeys) {
    expect(plBaseKeys, `${namespace}: PL is missing non-plural key '${k}'`).toContain(k)
  }

  for (const k of plBaseKeys) {
    expect(enBaseKeys, `${namespace}: EN is missing non-plural key '${k}'`).toContain(k)
  }

  const enPluralBases = new Set(enKeys.filter(isPluralized).map(stripPluralSuffix))
  const plPluralBases = new Set(plKeys.filter(isPluralized).map(stripPluralSuffix))

  for (const b of enPluralBases) {
    expect(plPluralBases.has(b), `${namespace}: PL is missing plural family for '${b}'`).toBe(true)
  }

  for (const b of plPluralBases) {
    expect(enPluralBases.has(b), `${namespace}: EN is missing plural family for '${b}'`).toBe(true)
  }

  for (const k of enBaseKeys) {
    const enPh = placeholderSet(getValueAtPath(en, k))
    const plPh = placeholderSet(getValueAtPath(pl, k))

    expect(
      setsEqual(enPh, plPh),
      `${namespace}: placeholder mismatch on '${k}' — EN has ${JSON.stringify([
        ...enPh,
      ])}, PL has ${JSON.stringify([...plPh])}`
    ).toBe(true)
  }
}

describe('catalog parity', () => {
  it('common: EN ↔ PL', () => {
    checkParity(enCommon as Catalog, plCommon as Catalog, 'common')
  })

  it('auth: EN ↔ PL', () => {
    checkParity(enAuth as Catalog, plAuth as Catalog, 'auth')
  })
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
