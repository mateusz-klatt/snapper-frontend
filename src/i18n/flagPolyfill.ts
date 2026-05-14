import { polyfillCountryFlagEmojis } from 'country-flag-emoji-polyfill'

export const FLAG_FONT_FAMILY = 'Twemoji Country Flags'
export const FLAG_FONT_URL = '/TwemojiCountryFlags.woff2'

export const initFlagPolyfill = (): boolean =>
  polyfillCountryFlagEmojis(FLAG_FONT_FAMILY, FLAG_FONT_URL)
