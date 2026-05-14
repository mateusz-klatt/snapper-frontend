import { describe, it, expect, vi } from 'vitest'

vi.mock('country-flag-emoji-polyfill', () => ({
  polyfillCountryFlagEmojis: vi.fn(() => true),
}))

describe('initFlagPolyfill', () => {
  it('passes our font name and self-hosted URL to the polyfill', async () => {
    const { polyfillCountryFlagEmojis } = await import('country-flag-emoji-polyfill')
    const { initFlagPolyfill, FLAG_FONT_FAMILY, FLAG_FONT_URL } = await import('./flagPolyfill')

    const injected = initFlagPolyfill()

    expect(injected).toBe(true)
    expect(FLAG_FONT_FAMILY).toBe('Twemoji Country Flags')
    expect(FLAG_FONT_URL).toBe('/TwemojiCountryFlags.woff2')
    expect(polyfillCountryFlagEmojis).toHaveBeenCalledWith(FLAG_FONT_FAMILY, FLAG_FONT_URL)
  })
})
