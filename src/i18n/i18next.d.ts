import 'i18next'
import type enCommon from '../locales/en/common.json'
import type enAuth from '../locales/en/auth.json'

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common'
    resources: {
      common: typeof enCommon
      auth: typeof enAuth
    }
    keySeparator: '.'
    pluralSeparator: '_'
    nsSeparator: ':'
  }
}
