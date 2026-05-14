import enCommon from '../locales/en/common.json'
import enAuth from '../locales/en/auth.json'
import plCommon from '../locales/pl/common.json'
import plAuth from '../locales/pl/auth.json'

export const BOOT_RESOURCES = {
  en: { common: enCommon, auth: enAuth },
  pl: { common: plCommon, auth: plAuth },
} as const

export const BOOT_NAMESPACES = ['common', 'auth'] as const
