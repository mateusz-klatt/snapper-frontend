import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { I18nextProvider } from 'react-i18next'
import i18n from '../../i18n/config'
import type { AlertEventInfo } from '../../types/api'
import { Notifications } from './Notifications'

vi.mock('../../stores/auth', () => ({
  useAuth: vi.fn(() => ({
    isAuthenticated: true,
    user: { public_id: 'u-1', role: 'admin' },
  })),
}))

vi.mock('../../stores/app', () => ({
  useAppStore: vi.fn((selector: (s: Record<string, unknown>) => unknown) =>
    selector({
      asOf: null,
      currentOperatorPublicId: null,
      currentWalletPublicId: null,
    })
  ),
}))

const getAlertHistoryMock = vi.fn()
const getAlertMock = vi.fn()

vi.mock('../../lib/api/alerts', () => ({
  getAlertHistory: (before?: string, limit?: number) => getAlertHistoryMock(before, limit),
  getAlert: (publicId: string) => getAlertMock(publicId),
}))

const _alert = (publicId: string): AlertEventInfo =>
  ({
    type: 'alert_event_info',
    sequence_id: 0,
    public_id: publicId,
    timestamp: '2024-01-01T00:00:00Z',
    session_id: 'sid',
    user_public_id: 'u-1',
    operator_public_id: null,
    wallet_public_id: null,
    alert_type: 'order_fill_full',
    priority: 'medium',
    is_safety_critical: false,
    title: `Title ${publicId}`,
    body: `Body ${publicId}`,
    payload: null,
    title_loc_key: null,
    title_loc_args: [],
    body_loc_key: null,
    body_loc_args: [],
    dedup_key: null,
    thread_key: null,
    source_topic: null,
  }) as AlertEventInfo

const renderNotifications = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  return render(
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={queryClient}>
        <Notifications />
      </QueryClientProvider>
    </I18nextProvider>
  )
}

describe('Notifications', () => {
  beforeEach(() => {
    getAlertHistoryMock.mockReset()
    getAlertMock.mockReset()
    window.location.hash = '#notifications'
  })

  afterEach(() => {
    window.location.hash = ''
  })

  it('renders the page header and the alert list', async () => {
    getAlertHistoryMock.mockResolvedValueOnce({
      type: 'alert_history_response',
      sequence_id: 0,
      public_id: 'env',
      timestamp: '2024-01-01T00:00:00Z',
      session_id: 'sid',
      payload: [_alert('a1')],
      count: 1,
      next_cursor: null,
    })
    renderNotifications()

    expect(screen.getByRole('heading', { name: /alerts/i })).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByText('Title a1')).toBeInTheDocument()
    })
  })

  it('opens the detail modal when a list row is clicked and updates the hash', async () => {
    getAlertHistoryMock.mockResolvedValueOnce({
      type: 'alert_history_response',
      sequence_id: 0,
      public_id: 'env',
      timestamp: '2024-01-01T00:00:00Z',
      session_id: 'sid',
      payload: [_alert('open-me')],
      count: 1,
      next_cursor: null,
    })
    getAlertMock.mockResolvedValueOnce({
      type: 'alert_event_response',
      sequence_id: 0,
      public_id: 'env',
      timestamp: '2024-01-01T00:00:00Z',
      session_id: 'sid',
      payload: _alert('open-me'),
    })
    renderNotifications()

    await waitFor(() => {
      expect(screen.getByText('Title open-me')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', { name: /Title open-me/i }))

    await waitFor(() => {
      expect(screen.getByText('Body open-me')).toBeInTheDocument()
    })
    expect(window.location.hash).toBe('#notifications/open-me')
  })

  it('opens the modal directly on a deep-link hash', async () => {
    window.location.hash = '#notifications/deep-pid'
    getAlertHistoryMock.mockResolvedValueOnce({
      type: 'alert_history_response',
      sequence_id: 0,
      public_id: 'env',
      timestamp: '2024-01-01T00:00:00Z',
      session_id: 'sid',
      payload: [],
      count: 0,
      next_cursor: null,
    })
    getAlertMock.mockResolvedValueOnce({
      type: 'alert_event_response',
      sequence_id: 0,
      public_id: 'env',
      timestamp: '2024-01-01T00:00:00Z',
      session_id: 'sid',
      payload: _alert('deep-pid'),
    })
    renderNotifications()

    await waitFor(() => {
      expect(screen.getByText('Body deep-pid')).toBeInTheDocument()
    })
    expect(getAlertMock).toHaveBeenCalledWith('deep-pid')
  })

  it('preserves the scope ?wallet=/operator= query suffix when opening + closing the modal', async () => {
    window.location.hash = '#notifications?wallet=W1&operator=O1'
    getAlertHistoryMock.mockResolvedValueOnce({
      type: 'alert_history_response',
      sequence_id: 0,
      public_id: 'env',
      timestamp: '2024-01-01T00:00:00Z',
      session_id: 'sid',
      payload: [_alert('preserve-pid')],
      count: 1,
      next_cursor: null,
    })
    getAlertMock.mockResolvedValueOnce({
      type: 'alert_event_response',
      sequence_id: 0,
      public_id: 'env',
      timestamp: '2024-01-01T00:00:00Z',
      session_id: 'sid',
      payload: _alert('preserve-pid'),
    })
    renderNotifications()

    await waitFor(() => {
      expect(screen.getByText('Title preserve-pid')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', { name: /Title preserve-pid/i }))
    await waitFor(() => {
      expect(window.location.hash).toBe('#notifications/preserve-pid?wallet=W1&operator=O1')
    })

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape', code: 'Escape' })

    await waitFor(() => {
      expect(window.location.hash).toBe('#notifications?wallet=W1&operator=O1')
    })
  })

  it('closes the modal on Escape and restores the bare hash route', async () => {
    getAlertHistoryMock.mockResolvedValueOnce({
      type: 'alert_history_response',
      sequence_id: 0,
      public_id: 'env',
      timestamp: '2024-01-01T00:00:00Z',
      session_id: 'sid',
      payload: [_alert('close-me')],
      count: 1,
      next_cursor: null,
    })
    getAlertMock.mockResolvedValueOnce({
      type: 'alert_event_response',
      sequence_id: 0,
      public_id: 'env',
      timestamp: '2024-01-01T00:00:00Z',
      session_id: 'sid',
      payload: _alert('close-me'),
    })
    renderNotifications()

    await waitFor(() => {
      expect(screen.getByText('Title close-me')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', { name: /Title close-me/i }))
    await waitFor(() => {
      expect(screen.getByText('Body close-me')).toBeInTheDocument()
    })
    expect(window.location.hash).toBe('#notifications/close-me')

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape', code: 'Escape' })

    await waitFor(() => {
      expect(window.location.hash).toBe('#notifications')
    })
  })
})
