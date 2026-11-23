import { describe, expect, it } from 'vitest'
import { canonicalOrderStatus } from './orderStatus'

describe('canonicalOrderStatus', () => {
  it.each(['canceled', 'CANCELED', 'Canceled', 'cancelled', 'CANCELLED'])(
    'normalizes %s to cancelled',
    status => {
      expect(canonicalOrderStatus(status)).toBe('cancelled')
    }
  )

  it.each([
    'new',
    'submitted',
    'open',
    'filled',
    'partially_filled',
    'rejected',
    'pending',
    'closed',
    'pending_new',
    'expired',
    'error',
    'unknown',
    '',
  ])('preserves %s apart from casing', status => {
    expect(canonicalOrderStatus(status)).toBe(status)
    expect(canonicalOrderStatus(status.toUpperCase())).toBe(status)
  })
})
