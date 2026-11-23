import { describe, expect, it } from 'vitest'
import { PositionListResponseSchema } from './api.generated.zod'
import { validateResponse } from './api'

const schemaSources = import.meta.glob(['./*.ts', '!./*.test.ts'], {
  eager: true,
  import: 'default',
  query: '?raw',
}) as Record<string, string>

const FORBIDDEN_SCHEMA_OP = /\.(?:transform|preprocess)\s*\(/

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/**
 * Display-field bags are reattached by JSON pointer. A transform or a
 * reordered array would put a bag on the wrong record.
 */
const assertPathShape = (input: unknown, output: unknown): void => {
  if (Array.isArray(input)) {
    if (!Array.isArray(output)) {
      throw new Error('parsed value is no longer an array')
    }

    expect(output).toHaveLength(input.length)
    input.forEach((item, index) => {
      assertPathShape(item, output[index])
    })

    return
  }

  if (!isRecord(input) || !isRecord(output)) return

  expect(Object.keys(output).sort()).toEqual(Object.keys(input).sort())

  for (const key of Object.keys(input)) {
    assertPathShape(input[key], output[key])
  }
}

const position = (publicId: string, instrument: string) => ({
  type: 'position' as const,
  sequence_id: 1,
  public_id: publicId,
  timestamp: '2026-01-01T00:00:00.000Z',
  session_id: 'sess',
  instrument,
  instrument_public_id: `inst-${publicId}`,
  exchange: 'kraken' as const,
  mode: 'live' as const,
  quantity: publicId === 'btc' ? 0.3 : 1,
  realized_pnl: 0,
  wallet_public_id: 'wallet',
})

describe('schema path stability', () => {
  it('rejects transform and preprocess in every schema module', () => {
    const offenders = Object.entries(schemaSources)
      .filter(([, source]) => FORBIDDEN_SCHEMA_OP.test(source))
      .map(([path]) => path)

    expect(offenders).toEqual([])
  })

  it('keeps object keys and array order when a position list is parsed', () => {
    const input = {
      type: 'position_list' as const,
      sequence_id: 7,
      public_id: 'list-1',
      timestamp: '2026-01-01T00:00:00.000Z',
      session_id: 'sess',
      payload: [
        { ...position('btc', 'BTC-USD'), quantity_decimals: 8, mark_price: 1 },
        { ...position('xrp', 'XRP/EUR'), is_dust: true, price_decimals: 5 },
      ],
      count: 2,
    }
    const snapshot = structuredClone(input)
    const parsed = validateResponse(input, PositionListResponseSchema, '/positions')
    const rows = parsed.payload as Array<Record<string, unknown>>

    assertPathShape(snapshot, parsed)
    expect(rows.map(row => row.public_id)).toEqual(['btc', 'xrp'])
    expect(rows[0]).toMatchObject({
      instrument: 'BTC-USD',
      quantity: 0.3,
      quantity_decimals: 8,
    })
    expect(rows[0]).not.toHaveProperty('is_dust')
    expect(rows[1]).toMatchObject({
      instrument: 'XRP/EUR',
      is_dust: true,
      price_decimals: 5,
    })
    expect(rows[1]).not.toHaveProperty('quantity_decimals')
  })
})
