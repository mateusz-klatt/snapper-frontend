import { describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { validateResponse } from './api'

describe('validateResponse', () => {
  const TestSchema = z.object({
    id: z.number(),
    name: z.string(),
  })

  it('returns parsed data when validation succeeds', () => {
    const data = { id: 1, name: 'test' }
    const result = validateResponse(data, TestSchema, '/api/test')

    expect(result).toEqual(data)
  })
  it('throws ApiValidationError when validation fails', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const data = { id: 'not-a-number', name: 123 }

    expect(() => validateResponse(data, TestSchema, '/api/test')).toThrow(
      'API response validation failed for /api/test'
    )
    expect(consoleSpy).toHaveBeenCalledWith(
      'API validation failed for /api/test:',
      expect.anything()
    )
    consoleSpy.mockRestore()
  })
  it('thrown error has correct name and properties', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})

    try {
      validateResponse({ invalid: true }, TestSchema, '/api/endpoint')
      expect.fail('Should have thrown')
    } catch (error) {
      expect((error as Error).name).toBe('ApiValidationError')
      expect((error as { endpoint: string }).endpoint).toBe('/api/endpoint')
      expect((error as { zodError: unknown }).zodError).toBeDefined()
    }

    vi.restoreAllMocks()
  })

  it('keeps valid display fields and drops invalid ones', () => {
    const schema = z.object({ id: z.number() }).strict()
    const data = { id: 1, quantity_decimals: 4, is_dust: true, price_decimals: 'nope' }
    const result = validateResponse(data, schema, '/api/test')

    expect(result).toMatchObject({ id: 1, quantity_decimals: 4, is_dust: true })
    expect(result).not.toHaveProperty('price_decimals')
    expect(data).toMatchObject({ id: 1, quantity_decimals: 4, is_dust: true })
    expect(data).not.toHaveProperty('price_decimals')
  })

  it('restores display fields when validation fails', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const schema = z.object({ id: z.number() }).strict()
    const data = { id: 'bad', quantity_decimals: 3 }

    expect(() => validateResponse(data, schema, '/api/test')).toThrow()
    expect(data).toMatchObject({ id: 'bad', quantity_decimals: 3 })
    vi.restoreAllMocks()
  })

  it('still rejects an unrelated unknown key on a strict schema', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const schema = z.object({ id: z.number() }).strict()

    expect(() => validateResponse({ id: 1, extra: true }, schema, '/api/test')).toThrow()
    vi.restoreAllMocks()
  })

  it('reattaches nested display fields', () => {
    const schema = z.object({ payload: z.array(z.object({ id: z.number() }).strict()) }).strict()
    const data = { payload: [{ id: 2, is_dust: false, quantity_decimals: 1.5 }] }
    const result = validateResponse(data, schema, '/api/test')

    expect(result.payload[0]).toMatchObject({ id: 2, is_dust: false })
    expect(result.payload[0]).not.toHaveProperty('quantity_decimals')
    expect(data.payload[0]).not.toHaveProperty('quantity_decimals')
    expect(data.payload[0]).toMatchObject({ is_dust: false })
  })
})
