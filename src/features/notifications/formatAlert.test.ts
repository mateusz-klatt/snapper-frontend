import { describe, expect, it } from 'vitest'
import type { TFunction } from 'i18next'
import type { AlertEventInfo } from '../../types/api'
import { resolveAlertBody, resolveAlertTitle } from './formatAlert'
import i18n from '../../i18n/config'

const _alert = (override: Partial<AlertEventInfo> = {}): AlertEventInfo =>
  ({
    type: 'alert_event_info',
    sequence_id: 0,
    public_id: 'pid-1',
    timestamp: '2024-01-01T00:00:00Z',
    session_id: 'sid',
    user_public_id: 'u-1',
    operator_public_id: null,
    wallet_public_id: null,
    alert_type: 'order_fill_full',
    priority: 'medium',
    is_safety_critical: false,
    title: 'Order filled',
    body: 'BUY 100 BTCUSD',
    payload: null,
    title_loc_key: null,
    title_loc_args: [],
    body_loc_key: null,
    body_loc_args: [],
    dedup_key: null,
    thread_key: null,
    source_topic: null,
    ...override,
  }) as AlertEventInfo

const _makeT = (
  fixtures: Record<string, string | ((opts: Record<string, string>) => string)> = {}
): TFunction<'alerts'> => {
  const fn = (key: unknown, options?: Record<string, unknown>) => {
    const k = String(key)
    const handler = fixtures[k]
    const defaultValue =
      options !== undefined && typeof options.defaultValue === 'string' ? options.defaultValue : k

    if (handler === undefined) return defaultValue

    if (typeof handler === 'function') {
      const opts: Record<string, string> = {}

      if (options !== undefined) {
        for (const [optKey, optValue] of Object.entries(options)) {
          if (typeof optValue === 'string') opts[optKey] = optValue
        }
      }

      return handler(opts)
    }

    return handler
  }

  return fn as unknown as TFunction<'alerts'>
}

describe.each([
  {
    language: 'en',
    buy: 'BUY',
    sell: 'SELL',
    ambiguous: 'Ambiguous exchange response',
    warning: 'do not assume the position is closed',
    health: 'Warning',
  },
  {
    language: 'pl',
    buy: 'KUPNO',
    sell: 'SPRZEDAŻ',
    ambiguous: 'Niejednoznaczna odpowiedź giełdy',
    warning: 'nie zakładaj, że pozycja jest zamknięta',
    health: 'Ostrzeżenie',
  },
  {
    language: 'de',
    buy: 'KAUF',
    sell: 'VERKAUF',
    ambiguous: 'Mehrdeutige Antwort des Handelsplatzes',
    warning: 'gehen Sie nicht davon aus, dass die Position geschlossen ist',
    health: 'Warnung',
  },
  {
    language: 'fr',
    buy: 'ACHAT',
    sell: 'VENTE',
    ambiguous: 'Réponse ambiguë de la plateforme d’échange',
    warning: 'ne supposez pas que la position est clôturée',
    health: 'Avertissement',
  },
])('real alert resources in $language', expectations => {
  it('renders the localized side while preserving quote precision and identifiers', () => {
    const args = ['BUY', '1', 'ETH-BTC', '0.000012345 BTC', 'venue']
    const alert = _alert({
      body_loc_key: 'alerts.body.order_fill_full_quoted',
      body_loc_args: args,
    })
    const result = resolveAlertBody(alert, i18n.getFixedT(expectations.language, 'alerts'))

    expect(result).toContain(`${expectations.buy} 1 ETH-BTC`)
    expect(result).toContain('0.000012345 BTC')
    expect(result).toContain('venue')
    expect(result).not.toContain('$')
    expect(args).toEqual(['BUY', '1', 'ETH-BTC', '0.000012345 BTC', 'venue'])
  })

  it.each(['alerts.body.order_unknown', 'alerts.body.order_unknown_unresolved'])(
    'preserves the safety instruction and translates the reason for %s',
    bodyKey => {
      const args = ['SELL', '0.2', 'BTC-USD', 'ambiguous venue response']
      const alert = _alert({ body_loc_key: bodyKey, body_loc_args: args })
      const result = resolveAlertBody(alert, i18n.getFixedT(expectations.language, 'alerts'))

      expect(result).toContain(`${expectations.sell} 0.2 BTC-USD`)
      expect(result).toContain(expectations.ambiguous)
      expect(result).toContain(expectations.warning)
      expect(args).toEqual(['SELL', '0.2', 'BTC-USD', 'ambiguous venue response'])
    }
  )

  it('localizes the health value without translating an identically named process', () => {
    const alert = _alert({
      body_loc_key: 'alerts.body.critical_system_error',
      body_loc_args: ['warning', 'container-id', 'WARNING'],
    })
    const result = resolveAlertBody(alert, i18n.getFixedT(expectations.language, 'alerts'))

    expect(result).toContain('warning')
    expect(result).toContain('container-id')
    expect(result).toContain(expectations.health)
  })
})

describe('resolveAlertTitle', () => {
  it('returns the server-rendered title when no loc_key is set', () => {
    const result = resolveAlertTitle(_alert({ title: 'EN title' }), _makeT())

    expect(result).toBe('EN title')
  })

  it('strips the iOS `alerts.` prefix before calling t()', () => {
    const t = _makeT({ 'title.order_fill_full': 'Zlecenie zrealizowane' })
    const result = resolveAlertTitle(_alert({ title_loc_key: 'alerts.title.order_fill_full' }), t)

    expect(result).toBe('Zlecenie zrealizowane')
  })

  it('passes positional args as a { "N": value } map to t()', () => {
    const t = _makeT({
      'title.x': opts => `${opts['0']}-${opts['1']}-${opts['2']}`,
    })
    const result = resolveAlertTitle(
      _alert({ title_loc_key: 'alerts.title.x', title_loc_args: ['a', 'b', 'c'] }),
      t
    )

    expect(result).toBe('a-b-c')
  })

  it('falls back to alert.title when t() returns the key (catalog miss)', () => {
    const t = _makeT({})
    const result = resolveAlertTitle(
      _alert({ title: 'Fallback title', title_loc_key: 'alerts.title.unknown' }),
      t
    )

    expect(result).toBe('Fallback title')
  })

  it('returns the server-rendered title when title_loc_key is undefined', () => {
    const alert = _alert({ title: 'Server title' })

    delete (alert as { title_loc_key?: unknown }).title_loc_key
    const result = resolveAlertTitle(alert, _makeT())

    expect(result).toBe('Server title')
  })
})

describe('resolveAlertBody', () => {
  it.each([
    'body.order_fill_full',
    'body.order_fill_full_quoted',
    'body.order_rejected',
    'body.margin_warning',
    'body.order_unknown',
    'body.order_unknown_unresolved',
  ])('localizes order side in %s without changing identifiers or wire arguments', key => {
    const args = ['BUY', '1', 'BUY', 'venue diagnostic', 'SELL']
    const before = [...args]
    const t = _makeT({
      'argument.side.buy': 'localized buy',
      [key]: opts => `${opts['0']}|${opts['2']}|${opts['4']}`,
    })

    expect(
      resolveAlertBody(_alert({ body_loc_key: `alerts.${key}`, body_loc_args: args }), t)
    ).toBe('localized buy|BUY|SELL')
    expect(args).toEqual(before)
  })

  it.each([
    'body.order_rejected',
    'body.margin_warning',
    'body.order_unknown',
    'body.order_unknown_unresolved',
  ])('localizes a known fallback reason in %s while preserving unknown diagnostics', key => {
    const t = _makeT({
      'argument.side.sell': 'localized sell',
      'argument.reason.unknown': 'localized unknown reason',
      'argument.reason.ambiguous': 'localized ambiguous response',
      [key]: opts => `${opts['0']}|${opts['3']}`,
    })

    for (const [reason, expected] of [
      ['unknown reason', 'localized unknown reason'],
      ['AMBIGUOUS VENUE RESPONSE', 'localized ambiguous response'],
      ['venue supplied error', 'venue supplied error'],
      ['constructor', 'constructor'],
    ]) {
      const alert = _alert({
        body_loc_key: `alerts.${key}`,
        body_loc_args: ['sell', '1', 'EUR-PLN', reason as string],
      })

      expect(resolveAlertBody(alert, t)).toBe(`localized sell|${expected}`)
    }
  })

  it.each(['healthy', 'warning', 'error'])(
    'localizes health status %s only in the health argument position',
    status => {
      const t = _makeT({
        [`argument.status.${status}`]: 'localized status',
        'body.critical_system_error': opts => `${opts['0']}|${opts['1']}|${opts['2']}`,
      })
      const alert = _alert({
        body_loc_key: 'alerts.body.critical_system_error',
        body_loc_args: [status, status, status.toUpperCase()],
      })

      expect(resolveAlertBody(alert, t)).toBe(`${status}|${status}|localized status`)
    }
  )

  it('keeps unknown side values and missing argument translations unchanged', () => {
    const t = _makeT({ 'body.order_fill_full_quoted': opts => opts['0'] as string })

    for (const side of ['BUY', 'UNKNOWN', '__proto__']) {
      const alert = _alert({
        body_loc_key: 'alerts.body.order_fill_full_quoted',
        body_loc_args: [side],
      })

      expect(resolveAlertBody(alert, t)).toBe(side)
    }
  })

  it('keeps the server body when a newer body key is absent from the client catalog', () => {
    const alert = _alert({
      body: 'Server-rendered explicit currency and warning',
      body_loc_key: 'alerts.body.order_fill_full_quoted',
      body_loc_args: ['BUY', '1', 'ETH-BTC', '0.00001 BTC', 'venue'],
    })

    expect(resolveAlertBody(alert, _makeT({ 'argument.side.buy': 'localized buy' }))).toBe(
      alert.body
    )
  })

  it('handles missing semantic argument positions without changing the fallback', () => {
    const alert = _alert({ body_loc_key: 'alerts.body.order_unknown', body_loc_args: [] })

    expect(resolveAlertBody(alert, _makeT())).toBe(alert.body)
  })

  it('returns the server-rendered body when no loc_key is set', () => {
    const result = resolveAlertBody(_alert({ body: 'EN body' }), _makeT())

    expect(result).toBe('EN body')
  })

  it('strips the iOS `alerts.` prefix before calling t()', () => {
    const t = _makeT({ 'body.order_fill_full': 'Polish body' })
    const result = resolveAlertBody(_alert({ body_loc_key: 'alerts.body.order_fill_full' }), t)

    expect(result).toBe('Polish body')
  })

  it('keeps a non-prefixed loc_key unchanged (defensive)', () => {
    const t = _makeT({ 'custom.key': 'Custom rendered' })
    const result = resolveAlertBody(_alert({ body_loc_key: 'custom.key' }), t)

    expect(result).toBe('Custom rendered')
  })

  it('falls back to alert.body when t() returns the key (catalog miss)', () => {
    const result = resolveAlertBody(
      _alert({ body: 'Fallback body', body_loc_key: 'alerts.body.unknown' }),
      _makeT()
    )

    expect(result).toBe('Fallback body')
  })

  it('passes empty args object when body_loc_args is null', () => {
    const t = _makeT({
      'body.x': opts => `args=${Object.keys(opts).filter(k => k !== 'defaultValue').length}`,
    })
    const alert = _alert({ body_loc_key: 'alerts.body.x' })

    delete (alert as { body_loc_args?: unknown }).body_loc_args
    const result = resolveAlertBody(alert, t)

    expect(result).toBe('args=0')
  })
})
