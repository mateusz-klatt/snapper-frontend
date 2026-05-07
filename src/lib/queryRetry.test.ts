import { describe, it, expect } from 'vitest'
import { APIError } from './api/error'
import { calculateRetryDelay, shouldRetryQuery } from './queryRetry'

describe('calculateRetryDelay', () => {
  it('returns exponential backoff delay', () => {
    expect(calculateRetryDelay(0)).toBe(1000)
    expect(calculateRetryDelay(1)).toBe(2000)
    expect(calculateRetryDelay(2)).toBe(4000)
    expect(calculateRetryDelay(3)).toBe(8000)
  })
  it('caps delay at 30 seconds', () => {
    expect(calculateRetryDelay(5)).toBe(30000)
    expect(calculateRetryDelay(10)).toBe(30000)
  })
})

describe('shouldRetryQuery', () => {
  it('skips retry on APIError with 4xx status', () => {
    expect(shouldRetryQuery(0, new APIError('bad request', 400, 'Bad Request'))).toBe(false)
    expect(shouldRetryQuery(0, new APIError('unauthorized', 401, 'Unauthorized'))).toBe(false)
    expect(shouldRetryQuery(0, new APIError('forbidden', 403, 'Forbidden'))).toBe(false)
    expect(shouldRetryQuery(0, new APIError('not found', 404, 'Not Found'))).toBe(false)
    expect(shouldRetryQuery(2, new APIError('forbidden', 403, 'Forbidden'))).toBe(false)
  })

  it('retries up to 3× on APIError with 5xx status', () => {
    expect(shouldRetryQuery(0, new APIError('server error', 500, 'Server Error'))).toBe(true)
    expect(shouldRetryQuery(2, new APIError('unavailable', 503, 'Service Unavailable'))).toBe(true)
    expect(shouldRetryQuery(3, new APIError('server error', 500, 'Server Error'))).toBe(false)
  })

  it('retries up to 3× on non-APIError (e.g. network failure)', () => {
    const networkError = new Error('Network request failed')

    expect(shouldRetryQuery(0, networkError)).toBe(true)
    expect(shouldRetryQuery(2, networkError)).toBe(true)
    expect(shouldRetryQuery(3, networkError)).toBe(false)
  })
})
