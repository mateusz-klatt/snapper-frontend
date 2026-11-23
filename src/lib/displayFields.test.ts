import { describe, expect, it } from 'vitest'
import {
  applyDisplayFields,
  attachDisplayFields,
  detachDisplayFields,
  readDisplayFields,
} from './displayFields'

describe('readDisplayFields', () => {
  it('reads camelCase fields and keeps an explicit false dust flag', () => {
    expect(readDisplayFields({ quantityDecimals: 8, priceDecimals: 2, isDust: false })).toEqual({
      quantityDecimals: 8,
      priceDecimals: 2,
      isDust: false,
    })
  })

  it('falls through an invalid camelCase value to the snake_case field', () => {
    expect(
      readDisplayFields({
        quantityDecimals: 1.5,
        quantity_decimals: 4,
        priceDecimals: -1,
        price_decimals: 3,
        isDust: 'no',
        is_dust: true,
      })
    ).toEqual({ quantityDecimals: 4, priceDecimals: 3, isDust: true })
  })

  it('returns empty fields for a non-record or unusable values', () => {
    expect(readDisplayFields([])).toEqual({
      quantityDecimals: null,
      priceDecimals: null,
      isDust: null,
    })
    expect(readDisplayFields({ quantityDecimals: 21, isDust: 'no' })).toEqual({
      quantityDecimals: null,
      priceDecimals: null,
      isDust: null,
    })
  })
})

describe('applyDisplayFields', () => {
  it('assigns only the fields that parsed', () => {
    const entity = { id: 1 }

    expect(applyDisplayFields(entity, { quantity_decimals: 8, is_dust: false })).toEqual({
      id: 1,
      quantityDecimals: 8,
      isDust: false,
    })
    expect(applyDisplayFields({ id: 2 }, {})).toEqual({ id: 2 })
    expect(applyDisplayFields({ id: 3 }, { price_decimals: 5 })).toEqual({
      id: 3,
      priceDecimals: 5,
    })
  })
})

describe('detachDisplayFields', () => {
  it('removes display fields from nested records and remembers the valid ones', () => {
    const payload = {
      rows: [{ quantity_decimals: 8, price_decimals: 'nope', is_dust: false, id: 1 }, 'skip'],
    }
    const bags = detachDisplayFields(payload)

    expect(payload.rows[0]).toEqual({ id: 1 })
    expect(bags.get('/rows/0')).toEqual({ quantity_decimals: 8, is_dust: false })
  })

  it('keeps a valid price precision and drops invalid quantity and dust flags', () => {
    const payload = {
      price_decimals: 4,
      quantity_decimals: 'nope',
      is_dust: 'nope',
    }
    const bags = detachDisplayFields(payload)

    expect(payload).toEqual({})
    expect(bags.get('')).toEqual({ price_decimals: 4 })

    const restored = {}

    attachDisplayFields(restored, bags)
    expect(restored).toEqual({ price_decimals: 4 })
  })

  it('keeps a key that contains a slash or a tilde as one path segment', () => {
    const payload = {
      'XRP/EUR': { quantity_decimals: 8, id: 1 },
      'a~b': [{ is_dust: true, name: 'tilde' }],
    }
    const bags = detachDisplayFields(payload)

    expect(payload).toEqual({ 'XRP/EUR': { id: 1 }, 'a~b': [{ name: 'tilde' }] })
    expect(bags.get('/XRP~1EUR')).toEqual({ quantity_decimals: 8 })
    expect(bags.get('/a~0b/0')).toEqual({ is_dust: true })

    const restored = { 'XRP/EUR': { id: 1 }, 'a~b': [{ name: 'tilde' }] }

    attachDisplayFields(restored, bags)
    expect(restored['XRP/EUR']).toEqual({ id: 1, quantity_decimals: 8 })
    expect(restored['a~b'][0]).toEqual({ name: 'tilde', is_dust: true })
  })

  it('ignores values that are not records', () => {
    expect(detachDisplayFields(null).size).toBe(0)
    expect(detachDisplayFields([{ quantity_decimals: 2 }]).get('/0')).toEqual({
      quantity_decimals: 2,
    })
  })
})

describe('attachDisplayFields', () => {
  it('writes a bag back onto the record at its path', () => {
    const root = { payload: [{ id: 2 }] }

    attachDisplayFields(root, new Map([['/payload/0', { is_dust: true, quantity_decimals: 4 }]]))
    expect(root.payload[0]).toEqual({ id: 2, is_dust: true, quantity_decimals: 4 })
  })

  it('does nothing when the path does not land on a record', () => {
    const root = { payload: [1] }

    attachDisplayFields(root, new Map([['/payload/0/extra', { is_dust: true }]]))
    attachDisplayFields(root, new Map([['/missing', { is_dust: false }]]))
    expect(root).toEqual({ payload: [1] })
  })
})
