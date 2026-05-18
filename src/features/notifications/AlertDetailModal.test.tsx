import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { I18nextProvider } from 'react-i18next'
import i18n from '../../i18n/config'
import type { AlertEventInfo, AlertEventResponse } from '../../types/api'
import { AlertDetailModal } from './AlertDetailModal'

vi.mock('../../stores/auth', () => ({
  useAuth: vi.fn(() => ({
    isAuthenticated: true,
    user: { public_id: 'u-1', role: 'admin' },
  })),
}))

const getAlertMock = vi.fn()

vi.mock('../../lib/api/alerts', () => ({
  getAlert: (publicId: string) => getAlertMock(publicId),
  getAlertHistory: vi.fn(),
}))

const _alert = (override: Partial<AlertEventInfo> = {}): AlertEventInfo =>
  ({
    type: 'alert_event_info',
    sequence_id: 0,
    public_id: 'pid-detail',
    timestamp: '2024-01-01T12:00:00Z',
    session_id: 'sid',
    user_public_id: 'u-1',
    operator_public_id: null,
    wallet_public_id: null,
    alert_type: 'order_fill_full',
    priority: 'medium',
    is_safety_critical: false,
    title: 'Server title',
    body: 'Server body',
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

const _response = (alert: AlertEventInfo): AlertEventResponse =>
  ({
    type: 'alert_event_response',
    sequence_id: 0,
    public_id: 'env',
    timestamp: '2024-01-01T00:00:00Z',
    session_id: 'sid',
    payload: alert,
  }) as AlertEventResponse

const renderModal = (publicId: string | null, onClose: () => void = vi.fn()) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  return render(
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={queryClient}>
        <AlertDetailModal publicId={publicId} onClose={onClose} />
      </QueryClientProvider>
    </I18nextProvider>
  )
}

describe('AlertDetailModal', () => {
  beforeEach(() => {
    getAlertMock.mockReset()
  })

  it('does not open the modal when publicId is null', () => {
    renderModal(null)

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('renders the loading state while the fetch is in flight', async () => {
    getAlertMock.mockReturnValueOnce(new Promise(() => {}))
    renderModal('pid-1')

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent(/loading/i)
    })
  })

  it('renders the alert detail when the fetch resolves', async () => {
    await i18n.changeLanguage('en')
    getAlertMock.mockResolvedValueOnce(
      _response(_alert({ title: 'Title X', body: 'Body Y', alert_type: 'order_fill_full' }))
    )
    renderModal('pid-detail')

    await waitFor(() => {
      expect(screen.getByText('Body Y')).toBeInTheDocument()
    })
    expect(screen.getByText('Order filled')).toBeInTheDocument()
    expect(screen.getByText('medium')).toBeInTheDocument()
  })

  it('renders the error state when the fetch rejects', async () => {
    getAlertMock.mockRejectedValueOnce(new Error('Boom'))
    renderModal('pid-1')

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })
    expect(screen.getByRole('alert').textContent ?? '').toContain('Boom')
  })

  it('shows the thread and source topic when present', async () => {
    getAlertMock.mockResolvedValueOnce(
      _response(_alert({ thread_key: 'thr-99', source_topic: 'orders.events.executed' }))
    )
    renderModal('pid-1')

    await waitFor(() => {
      expect(screen.getByText('thr-99')).toBeInTheDocument()
    })
    expect(screen.getByText('orders.events.executed')).toBeInTheDocument()
  })

  it('renders "No" for non-safety-critical alerts and the raw ISO when the date fails to parse', async () => {
    getAlertMock.mockResolvedValueOnce(
      _response(
        _alert({
          is_safety_critical: false,
          timestamp: 'not-a-date',
        })
      )
    )
    renderModal('pid-1')

    await waitFor(() => {
      expect(screen.getByText('No')).toBeInTheDocument()
    })
    expect(screen.getByText('not-a-date')).toBeInTheDocument()
  })

  it('renders "Yes" for safety-critical alerts', async () => {
    getAlertMock.mockResolvedValueOnce(_response(_alert({ is_safety_critical: true })))
    renderModal('pid-1')

    await waitFor(() => {
      expect(screen.getByText('Yes')).toBeInTheDocument()
    })
  })

  it('uses the localized resolver for title + body when loc_keys present', async () => {
    await i18n.changeLanguage('pl')
    getAlertMock.mockResolvedValueOnce(
      _response(
        _alert({
          title: 'EN fallback title',
          body: 'EN fallback body',
          title_loc_key: 'alerts.title.order_fill_full',
          body_loc_key: 'alerts.body.order_fill_full',
          body_loc_args: ['BUY', '100', 'BTCUSD', '50000.00', 'Kraken'],
        })
      )
    )
    renderModal('pid-1')

    await waitFor(() => {
      expect(screen.getByText(/zrealizowane na Kraken/)).toBeInTheDocument()
    })
    await i18n.changeLanguage('en')
  })
})
