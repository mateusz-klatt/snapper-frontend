import { describe, expect, it } from 'vitest'

const catalogs = import.meta.glob('../../locales/*/orders.json', {
  eager: true,
  import: 'default',
})

const wireStatuses = [
  'new',
  'submitted',
  'open',
  'filled',
  'partially_filled',
  'cancelled',
  'rejected',
  'pending',
  'closed',
  'pending_new',
  'canceled',
  'expired',
]

describe('order status catalogs', () => {
  it('covers all 45 locales', () => {
    expect(Object.keys(catalogs)).toHaveLength(45)
  })

  it.each(Object.entries(catalogs))(
    '%s labels every wire status and aliases cancellation',
    (_, catalog) => {
      const { filters } = catalog as { filters: { options: Record<string, string> } }

      for (const status of wireStatuses) {
        expect(filters.options[status]).toEqual(expect.any(String))
        expect(filters.options[status]?.trim().length).toBeGreaterThan(0)
      }

      expect(filters.options.canceled).toBe(filters.options.cancelled)
    }
  )
})
