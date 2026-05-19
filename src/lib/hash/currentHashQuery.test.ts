import { afterEach, describe, expect, it } from 'vitest'

import { currentHashQuery } from './currentHashQuery'

const originalHash = globalThis.location.hash

afterEach(() => {
  globalThis.location.hash = originalHash
})

describe('currentHashQuery', () => {
  it('returns empty string when hash has no query suffix', () => {
    globalThis.location.hash = '#notifications'
    expect(currentHashQuery()).toBe('')
  })

  it('returns the suffix verbatim when the hash carries scope params', () => {
    globalThis.location.hash = '#notifications?wallet=w-1&operator=o-1&as_of=2026-05-19T12:00:00Z'
    expect(currentHashQuery()).toBe('?wallet=w-1&operator=o-1&as_of=2026-05-19T12:00:00Z')
  })

  it('returns empty string when there is no hash at all', () => {
    globalThis.location.hash = ''
    expect(currentHashQuery()).toBe('')
  })

  it('returns the suffix even when the prefix segment carries a subpath', () => {
    globalThis.location.hash = '#notifications/alert-pid-1?wallet=w-1'
    expect(currentHashQuery()).toBe('?wallet=w-1')
  })
})
