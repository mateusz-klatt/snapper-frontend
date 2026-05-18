import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import i18n from '../../i18n/config'
import type { AlertEventInfo } from '../../types/api'
import { AlertRow } from './AlertRow'

const _alert = (override: Partial<AlertEventInfo> = {}): AlertEventInfo =>
  ({
    type: 'alert_event_info',
    sequence_id: 0,
    public_id: 'pid-1',
    timestamp: '2024-01-01T12:00:00Z',
    session_id: 'sid',
    user_public_id: 'u-1',
    operator_public_id: null,
    wallet_public_id: null,
    alert_type: 'order_fill_full',
    priority: 'medium',
    is_safety_critical: false,
    title: 'Order filled',
    body: 'BUY 100 BTCUSD',
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

const renderRow = (alert: AlertEventInfo, onOpen: (pid: string) => void = vi.fn()) =>
  render(
    <I18nextProvider i18n={i18n}>
      <AlertRow alert={alert} onOpen={onOpen} />
    </I18nextProvider>
  )

describe('AlertRow', () => {
  it('renders the server-rendered title + body when no loc_key is set', () => {
    renderRow(_alert({ title: 'Server title', body: 'Server body' }))

    expect(screen.getByText('Server title')).toBeInTheDocument()
    expect(screen.getByText('Server body')).toBeInTheDocument()
  })

  it('resolves loc_key + loc_args via the i18n catalog when set', async () => {
    await i18n.changeLanguage('en')
    renderRow(
      _alert({
        title_loc_key: 'alerts.title.order_fill_full',
        body_loc_key: 'alerts.body.order_fill_full',
        body_loc_args: ['BUY', '100', 'BTCUSD', '50000.00', 'Kraken'],
      })
    )

    expect(screen.getByText('Order filled')).toBeInTheDocument()
    expect(screen.getByText(/BUY 100 BTCUSD/)).toBeInTheDocument()
    expect(screen.getByText(/filled on Kraken/)).toBeInTheDocument()
  })

  it('re-renders in Polish after locale switch (no fetch needed)', async () => {
    await i18n.changeLanguage('pl')
    renderRow(
      _alert({
        title_loc_key: 'alerts.title.order_fill_full',
        body_loc_key: 'alerts.body.order_fill_full',
        body_loc_args: ['BUY', '100', 'BTCUSD', '50000.00', 'Kraken'],
      })
    )

    expect(screen.getByText('Zlecenie zrealizowane')).toBeInTheDocument()
    expect(screen.getByText(/zrealizowane na Kraken/)).toBeInTheDocument()
    await i18n.changeLanguage('en')
  })

  it('calls onOpen with the alert public_id on click', () => {
    const onOpen = vi.fn()

    renderRow(_alert({ public_id: 'click-pid' }), onOpen)

    fireEvent.click(screen.getByRole('button'))

    expect(onOpen).toHaveBeenCalledWith('click-pid')
  })

  it('emits an accessibility label that combines title, body, and priority', () => {
    renderRow(_alert({ title: 'T', body: 'B', priority: 'high' }))

    expect(screen.getByRole('button')).toHaveAccessibleName('T. B. high priority.')
  })

  it('falls back to the raw ISO timestamp when Date parsing fails', () => {
    renderRow(_alert({ timestamp: 'not-a-date' }))

    expect(screen.getByText('not-a-date')).toBeInTheDocument()
  })

  it('renders the low-priority badge style for low alerts', () => {
    const { container } = renderRow(_alert({ priority: 'low' }))
    const dot = container.querySelector('.bg-info-500')

    expect(dot).not.toBeNull()
  })

  it('renders the muted-default badge style for unknown priority values', () => {
    const { container } = renderRow(_alert({ priority: 'unknown' }))
    const dot = container.querySelector('.bg-muted-400')

    expect(dot).not.toBeNull()
  })

  it('adds the safety-critical accent border + bolds the title for critical alerts', () => {
    const { container } = renderRow(_alert({ is_safety_critical: true, title: 'Critical alert' }))
    const button = container.querySelector('button')
    const titleSpan = screen.getByText('Critical alert')

    expect(button?.className).toContain('border-l-loss-500')
    expect(titleSpan.className).toContain('font-semibold')
  })
})
