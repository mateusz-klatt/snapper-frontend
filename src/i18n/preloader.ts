import i18n from './config'

let hasPreloaded = false

const isPreloadable = (lng: unknown): lng is string =>
  typeof lng === 'string' && lng.length > 0 && lng !== 'cimode'

export const preloadAllLocales = (): void => {
  if (hasPreloaded) return
  hasPreloaded = true

  const configured = i18n.options.supportedLngs
  const langs = Array.isArray(configured) ? configured.filter(isPreloadable) : []

  if (langs.length === 0) return

  void i18n.loadLanguages(langs)
}

export const __resetPreloadCacheForTests = (): void => {
  hasPreloaded = false
}
