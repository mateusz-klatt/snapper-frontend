import { describe, expect, it } from 'vitest'
import type { TFunction } from 'i18next'
import type { AlertEventInfo } from '../../types/api'
import { resolveAlertBody, resolveAlertTitle } from './formatAlert'

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
