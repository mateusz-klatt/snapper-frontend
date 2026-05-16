import i18n from 'i18next'
import resourcesToBackend from 'i18next-resources-to-backend'
import { initReactI18next } from 'react-i18next'
import { BOOT_NAMESPACES, BOOT_RESOURCES } from './bootResources'
import { DEFAULT_LOCALE, isLocale } from './types'
import { getCatalogLanguage } from './countryLanguages'
import type { AppLocale, CatalogLanguage } from './types'

const STORAGE_KEY = 'snapper-locale'

const parseStoredLocale = (): AppLocale | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)

    return raw !== null && isLocale(raw) ? raw : null
  } catch {
    return null
  }
}

const parseNavigatorLocale = (): AppLocale | null => {
  const languages = Array.isArray(navigator.languages) ? navigator.languages : []

  for (const tag of languages) {
    const parts = tag.toLowerCase().split('-')
    const region = parts.length > 1 ? parts[1] : null

    if (region !== null && isLocale(region)) {
      return region
    }
  }

  return null
}

export const detectInitialLocale = (): AppLocale =>
  parseStoredLocale() ?? parseNavigatorLocale() ?? DEFAULT_LOCALE

export const loadCatalog = async (
  language: string,
  namespace: string
): Promise<Record<string, unknown>> =>
  (await import(`../locales/${language}/${namespace}.json`)).default as Record<string, unknown>

const lazyLoader = resourcesToBackend(loadCatalog)

const initialLocale = detectInitialLocale()
const initialLanguage: CatalogLanguage = getCatalogLanguage(initialLocale)

void i18n
  .use(lazyLoader)
  .use(initReactI18next)
  .init({
    resources: BOOT_RESOURCES,
    lng: initialLanguage,
    fallbackLng: 'en',
    fallbackNS: 'common',
    defaultNS: 'common',
    ns: [
      ...BOOT_NAMESPACES,
      'overview',
      'orders',
      'positions',
      'strategies',
      'signals',
      'backtests',
      'market',
      'processes',
      'health',
      'aiIntegration',
      'aiReviews',
      'admin',
      'settings',
    ],
    supportedLngs: [
      'en',
      'pl',
      'de',
      'fr',
      'es',
      'it',
      'nl',
      'pt',
      'sv',
      'da',
      'no',
      'fi',
      'zh',
      'ja',
      'ko',
      'vi',
      'id',
      'ru',
      'uk',
      'cs',
      'sk',
      'ro',
      'hr',
      'sr',
      'bs',
      'hu',
      'sq',
      'lt',
      'lv',
      'el',
      'is',
      'hy',
    ],
    partialBundledLanguages: true,
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  })

export { STORAGE_KEY as LOCALE_STORAGE_KEY }
export default i18n
