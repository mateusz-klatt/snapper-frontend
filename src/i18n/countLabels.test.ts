import { describe, expect, it } from 'vitest'
import i18n from './config'

const CATALOG_EXPECTATIONS = [
  {
    language: 'en',
    instruments: 'Instruments: ',
    credentials: 'Credentials: ',
    sampler: 'Sampler interval: 5s · table count: ',
    active: 'Active: ',
  },
  {
    language: 'pl',
    instruments: 'Instrumenty: ',
    credentials: 'Poświadczenia API/logowania: ',
    sampler: 'Interwał próbkowania: 5s · Liczba tabel: ',
    active: 'Aktywne: ',
  },
  {
    language: 'de',
    instruments: 'Instrumente: ',
    credentials: 'Anmeldedaten: ',
    sampler: 'Abtastintervall: 5 s · Anzahl der Tabellen: ',
    active: 'Aktiv: ',
  },
  {
    language: 'fr',
    instruments: 'Instruments : ',
    credentials: 'Identifiants d’accès : ',
    sampler: 'Intervalle d’échantillonnage : 5 s · nombre de tables : ',
    active: 'Actives : ',
  },
] as const

describe.each(CATALOG_EXPECTATIONS)('real count labels in $language', expectations => {
  it.each([0, 1, 2, 5])('renders count %i with approved count-neutral grammar', count => {
    const options = { lng: expectations.language, count }

    expect(i18n.t('portfolio.instrumentsCount', { ...options, ns: 'overview' })).toBe(
      `${expectations.instruments}${count}`
    )
    expect(i18n.t('credentials.list.countLabel', { ...options, ns: 'admin' })).toBe(
      `${expectations.credentials}${count}`
    )
    expect(i18n.t('dbStats.samplerSummary', { ...options, ns: 'health', seconds: 5 })).toBe(
      `${expectations.sampler}${count}`
    )
    expect(i18n.t('systemMetrics.asyncioActive', { ...options, ns: 'health' })).toBe(
      `${expectations.active}${count}`
    )
    expect(i18n.t('template.paramCount', { ...options, ns: 'processes' })).toBe(String(count))
  })
})
