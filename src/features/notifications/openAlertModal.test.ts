import { afterEach, describe, expect, it, vi } from 'vitest'
import toast from 'react-hot-toast'

import { openAlertModal } from './openAlertModal'

vi.mock('react-hot-toast', () => ({
  default: {
    dismiss: vi.fn(),
  },
}))

const originalHash = globalThis.location.hash

afterEach(() => {
  globalThis.location.hash = originalHash
  vi.mocked(toast.dismiss).mockClear()
})

describe('openAlertModal', () => {
  it('flips the hash to the alert deep-link route with no query suffix', () => {
    globalThis.location.hash = '#notifications'
    openAlertModal('alert-pid-1', 'toast-id-A')
    expect(globalThis.location.hash).toBe('#notifications/alert-pid-1')
  })

  it('preserves the existing ?wallet=&operator=&as_of= suffix on navigation', () => {
    globalThis.location.hash = '#notifications?wallet=w-1&operator=o-1&as_of=2026-05-19T12:00:00Z'
    openAlertModal('alert-pid-2', 'toast-id-B')
    expect(globalThis.location.hash).toBe(
      '#notifications/alert-pid-2?wallet=w-1&operator=o-1&as_of=2026-05-19T12:00:00Z'
    )
  })

  it('dismisses the toast by id BEFORE the hash flip', () => {
    globalThis.location.hash = '#notifications'

    let hashAtDismiss: string | null = null

    vi.mocked(toast.dismiss).mockImplementation(() => {
      hashAtDismiss = globalThis.location.hash
    })

    openAlertModal('alert-pid-3', 'toast-id-C')

    expect(toast.dismiss).toHaveBeenCalledWith('toast-id-C')
    expect(hashAtDismiss).toBe('#notifications')
    expect(globalThis.location.hash).toBe('#notifications/alert-pid-3')
  })

  it('URL-encodes the public_id so a UUID7 with no special chars round-trips intact', () => {
    globalThis.location.hash = '#notifications'
    openAlertModal('019dbb34-f439-77bd-afa8-ee5321d60307', 'toast-id-D')
    expect(globalThis.location.hash).toBe('#notifications/019dbb34-f439-77bd-afa8-ee5321d60307')
  })
})
