import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { ExecutionHistoryBanner } from './ExecutionHistoryBanner'
import type { PnlExecutionCorrectionData, PnlExecutionHistoryData } from '../../types/api'

const correction = (
  overrides: Partial<PnlExecutionCorrectionData> = {}
): PnlExecutionCorrectionData => ({
  correction_public_id: '00000000-0000-7000-8000-0000000000d9',
  target_execution_public_id: '00000000-0000-7000-8000-0000000000e1',
  exchange: 'kraken',
  scope_sequence: 7,
  reason: 'unwitnessed_phantom',
  correction_time: '2026-07-19T21:54:00Z',
  ...overrides,
})

const corrected = (
  corrections: PnlExecutionCorrectionData[] = [correction()]
): PnlExecutionHistoryData => ({
  status: 'operator_corrected',
  corrections,
})

describe('ExecutionHistoryBanner', () => {
  it('renders nothing for a history that is exactly as recorded', () => {
    const { container } = render(
      <ExecutionHistoryBanner history={{ status: 'as_recorded', corrections: [] }} />
    )

    expect(container).toBeEmptyDOMElement()
  })

  it('discloses the corrected status and the applied correction count', () => {
    render(<ExecutionHistoryBanner history={corrected([correction(), correction()])} />)

    expect(screen.getByTestId('pnl-execution-history-banner')).toBeInTheDocument()
    expect(screen.getByText('Operator-corrected execution history')).toBeInTheDocument()
    expect(screen.getByTestId('pnl-execution-history-count')).toHaveTextContent(
      'Corrections applied: 2'
    )
  })

  it('cannot be dismissed, so the disclosure outlives any interaction', () => {
    render(<ExecutionHistoryBanner history={corrected()} />)

    const toggle = screen.getByTestId('pnl-execution-history-toggle')

    fireEvent.click(toggle)
    fireEvent.click(toggle)

    expect(screen.getByTestId('pnl-execution-history-banner')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /dismiss|close/i })).not.toBeInTheDocument()
  })

  it('keeps the per-correction detail collapsed until it is asked for', () => {
    render(<ExecutionHistoryBanner history={corrected()} />)

    expect(screen.queryByTestId('pnl-execution-history-correction')).not.toBeInTheDocument()
    expect(screen.getByTestId('pnl-execution-history-toggle')).toHaveAttribute(
      'aria-expanded',
      'false'
    )
    expect(screen.getByTestId('pnl-execution-history-toggle')).toHaveTextContent('Show corrections')
  })

  it('expands to name the exchange, sequence, reason, time, and both ids', () => {
    render(<ExecutionHistoryBanner history={corrected()} />)

    fireEvent.click(screen.getByTestId('pnl-execution-history-toggle'))

    const detail = screen.getByTestId('pnl-execution-history-correction')

    expect(detail).toHaveTextContent('No exchange fill witnessed this booking')
    expect(detail).toHaveTextContent('kraken #7')
    expect(screen.getByTestId('pnl-execution-history-correction-time')).toHaveTextContent(
      'Corrected at'
    )
    expect(screen.getByTestId('pnl-execution-history-target-id')).toHaveTextContent(
      '00000000-0000-7000-8000-0000000000e1'
    )
    expect(screen.getByTestId('pnl-execution-history-correction-id')).toHaveTextContent(
      '00000000-0000-7000-8000-0000000000d9'
    )
    expect(screen.getByTestId('pnl-execution-history-toggle')).toHaveAttribute(
      'aria-expanded',
      'true'
    )
    expect(screen.getByTestId('pnl-execution-history-toggle')).toHaveTextContent('Hide corrections')
  })

  it('renders the identifiers in a monospace face so they can be compared by eye', () => {
    render(<ExecutionHistoryBanner history={corrected()} />)

    fireEvent.click(screen.getByTestId('pnl-execution-history-toggle'))

    expect(screen.getByTestId('pnl-execution-history-target-id')).toHaveClass('font-mono')
    expect(screen.getByTestId('pnl-execution-history-correction-id')).toHaveClass('font-mono')
  })

  it('labels a legacy-lineage repudiation with its own reason', () => {
    render(
      <ExecutionHistoryBanner
        history={corrected([correction({ reason: 'unwitnessed_legacy_lineage' })])}
      />
    )

    fireEvent.click(screen.getByTestId('pnl-execution-history-toggle'))

    expect(screen.getByTestId('pnl-execution-history-correction')).toHaveTextContent(
      'Legacy lineage with no witnessing fill'
    )
  })

  it('collapses the detail again without withdrawing the disclosure', () => {
    render(<ExecutionHistoryBanner history={corrected()} />)

    const toggle = screen.getByTestId('pnl-execution-history-toggle')

    fireEvent.click(toggle)
    fireEvent.click(toggle)

    expect(screen.queryByTestId('pnl-execution-history-correction')).not.toBeInTheDocument()
    expect(screen.getByTestId('pnl-execution-history-count')).toHaveTextContent(
      'Corrections applied: 1'
    )
  })

  it('lists every correction when several bookings were repudiated', () => {
    render(
      <ExecutionHistoryBanner
        history={corrected([
          correction(),
          correction({
            correction_public_id: '00000000-0000-7000-8000-0000000000da',
            exchange: 'walutomat',
            scope_sequence: 2,
          }),
        ])}
      />
    )

    fireEvent.click(screen.getByTestId('pnl-execution-history-toggle'))

    const details = screen.getAllByTestId('pnl-execution-history-correction')

    expect(details).toHaveLength(2)
    expect(details[1]).toHaveTextContent('walutomat #2')
  })
})
