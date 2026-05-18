import { describe, expect, it, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { I18nextProvider } from 'react-i18next'
import i18n from '../../i18n/config'
import type { AlertEventInfo, AlertHistoryResponse } from '../../types/api'
import { NotificationsList } from './NotificationsList'

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

vi.mock('../../lib/api/alerts', () => ({
  getAlertHistory: (before?: string, limit?: number) => getAlertHistoryMock(before, limit),
  getAlert: vi.fn(),
}))

const _alert = (publicId: string, override: Partial<AlertEventInfo> = {}): AlertEventInfo =>
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
    ...override,
  }) as AlertEventInfo

const _historyResponse = (
  payload: AlertEventInfo[],
  next_cursor: string | null
): AlertHistoryResponse =>
  ({
    type: 'alert_history_response',
    sequence_id: 0,
    public_id: 'env',
    timestamp: '2024-01-01T00:00:00Z',
    session_id: 'sid',
    payload,
    count: payload.length,
    next_cursor,
  }) as AlertHistoryResponse

const renderList = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  const onOpenAlert = vi.fn()
  const utils = render(
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={queryClient}>
        <NotificationsList onOpenAlert={onOpenAlert} />
      </QueryClientProvider>
    </I18nextProvider>
  )

  return { ...utils, onOpenAlert }
}

describe('NotificationsList', () => {
  beforeEach(() => {
    getAlertHistoryMock.mockReset()
  })

  it('renders the loading state while the first page is in flight', async () => {
    getAlertHistoryMock.mockReturnValueOnce(new Promise(() => {}))
    renderList()

    expect(await screen.findByRole('status')).toHaveTextContent(/loading/i)
  })

  it('renders the error state when the first page rejects', async () => {
    getAlertHistoryMock.mockRejectedValueOnce(new Error('Network down'))
    renderList()

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })
    expect(screen.getByRole('alert').textContent ?? '').toContain('Network down')
  })

  it('renders the empty state when the first page returns zero rows', async () => {
    getAlertHistoryMock.mockResolvedValueOnce(_historyResponse([], null))
    renderList()

    await waitFor(() => {
      expect(screen.getByText(/no alerts/i)).toBeInTheDocument()
    })
  })

  it('renders rows and exposes a Load more button when next_cursor is set', async () => {
    getAlertHistoryMock.mockResolvedValueOnce(
      _historyResponse([_alert('a1'), _alert('a2')], 'CURSOR_NEXT')
    )
    renderList()

    await waitFor(() => {
      expect(screen.getByText('Title a1')).toBeInTheDocument()
    })
    expect(screen.getByText('Title a2')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /load more/i })).toBeEnabled()
  })

  it('fetches the next page when Load more is clicked', async () => {
    getAlertHistoryMock
      .mockResolvedValueOnce(_historyResponse([_alert('first')], 'CURSOR_1'))
      .mockResolvedValueOnce(_historyResponse([_alert('second')], null))
    renderList()

    await waitFor(() => {
      expect(screen.getByText('Title first')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', { name: /load more/i }))
    await waitFor(() => {
      expect(screen.getByText('Title second')).toBeInTheDocument()
    })
    expect(getAlertHistoryMock).toHaveBeenNthCalledWith(2, 'CURSOR_1', 50)
  })

  it('hides Load more and surfaces the cap note when 500 rows are loaded', async () => {
    const bigPage = Array.from({ length: 500 }, (_unused, i) => _alert(`big-r${i}`))

    getAlertHistoryMock.mockResolvedValueOnce(_historyResponse(bigPage, 'CURSOR_BEYOND_CAP'))
    renderList()

    await waitFor(() => {
      expect(screen.getByText('Title big-r0')).toBeInTheDocument()
    })
    expect(screen.queryByRole('button', { name: /load more/i })).not.toBeInTheDocument()
    expect(screen.getByRole('note')).toHaveTextContent(/500/)
  })

  it('triggers onOpenAlert with the row public_id when a row is clicked', async () => {
    getAlertHistoryMock.mockResolvedValueOnce(_historyResponse([_alert('open-me')], null))
    const { onOpenAlert } = renderList()

    await waitFor(() => {
      expect(screen.getByText('Title open-me')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', { name: /Title open-me/i }))

    expect(onOpenAlert).toHaveBeenCalledWith('open-me')
  })

  it('shows the loading label on the Load more button while the next page is in flight', async () => {
    let resolveNext: (() => void) | undefined
    const pending = new Promise<AlertHistoryResponse>(resolve => {
      resolveNext = () => resolve(_historyResponse([_alert('p2')], null))
    })

    getAlertHistoryMock
      .mockResolvedValueOnce(_historyResponse([_alert('p1')], 'CURSOR_NEXT'))
      .mockReturnValueOnce(pending)
    renderList()

    await waitFor(() => {
      expect(screen.getByText('Title p1')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', { name: /load more/i }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /loading/i })).toBeDisabled()
    })
    resolveNext?.()
    await waitFor(() => {
      expect(screen.getByText('Title p2')).toBeInTheDocument()
    })
  })
})
