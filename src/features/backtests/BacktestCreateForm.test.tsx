import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { BacktestCreateForm } from './BacktestCreateForm'
import { useBacktestStrategyClasses, useCreateBacktest } from '../../hooks/queries/backtests'

const mockHasPermission = vi.fn(() => true)

vi.mock('../../stores/auth', () => ({
  useAuth: () => ({ hasPermission: mockHasPermission }),
}))
vi.mock('../../hooks/useIsReadOnly', () => ({
  useIsReadOnly: () => false,
}))

vi.mock('../../hooks/queries/backtests', () => ({
  useBacktestStrategyClasses: vi.fn(),
  useCreateBacktest: vi.fn(),
}))

const mockedClasses = vi.mocked(useBacktestStrategyClasses)
const mockedCreate = vi.mocked(useCreateBacktest)

const classesResult = (
  overrides: Partial<{ data: unknown; isLoading: boolean; error: unknown }> = {}
): ReturnType<typeof useBacktestStrategyClasses> =>
  ({
    data: { payload: ['MACDCrossover', 'RSIReversion'] },
    isLoading: false,
    error: null,
    ...overrides,
  }) as unknown as ReturnType<typeof useBacktestStrategyClasses>

const createResult = (
  mutateAsync: ReturnType<typeof vi.fn>,
  isPending = false
): ReturnType<typeof useCreateBacktest> =>
  ({ mutateAsync, isPending }) as unknown as ReturnType<typeof useCreateBacktest>

const fillRequired = (): void => {
  fireEvent.change(screen.getByLabelText('Strategy'), { target: { value: 'MACDCrossover' } })
  fireEvent.change(screen.getByLabelText('Instrument'), { target: { value: 'BTC-USD' } })
  fireEvent.change(screen.getByLabelText('Exchange (feed source)'), {
    target: { value: 'kraken' },
  })
  fireEvent.change(screen.getByLabelText('Start date'), { target: { value: '2026-01-01T00:00' } })
  fireEvent.change(screen.getByLabelText('End date'), { target: { value: '2026-02-01T00:00' } })
}

beforeEach(() => {
  vi.clearAllMocks()
  mockHasPermission.mockReturnValue(true)
  mockedClasses.mockReturnValue(classesResult())
  mockedCreate.mockReturnValue(createResult(vi.fn()))
})

describe('BacktestCreateForm', () => {
  it('does not expose the form without manage:backtests', () => {
    mockHasPermission.mockReturnValue(false)
    render(<BacktestCreateForm open={true} onClose={vi.fn()} />)

    expect(screen.queryByText('New backtest')).toBeFalsy()
    expect(mockedClasses).toHaveBeenCalledWith(false)
  })

  it('rechecks manage:backtests before submitting an already-rendered form', () => {
    const mutateAsync = vi.fn()

    mockedCreate.mockReturnValue(createResult(mutateAsync))
    render(<BacktestCreateForm open={true} onClose={vi.fn()} />)
    fillRequired()
    mockHasPermission.mockReturnValue(false)
    fireEvent.click(screen.getByText('Start backtest'))

    expect(mutateAsync).not.toHaveBeenCalled()
  })

  it('handles an unavailable strategy catalogue', () => {
    mockedClasses.mockReturnValue(classesResult({ data: undefined }))
    render(<BacktestCreateForm open={true} onClose={vi.fn()} />)

    expect((screen.getByLabelText('Strategy') as HTMLSelectElement).options).toHaveLength(1)
  })

  it('renders the modal with strategy options when open', () => {
    render(<BacktestCreateForm open={true} onClose={vi.fn()} />)
    expect(screen.getByText('New backtest')).toBeTruthy()
    const strategySelect = screen.getByLabelText('Strategy') as HTMLSelectElement
    const optionValues = [...strategySelect.options].map(o => o.value)

    expect(optionValues).toContain('MACDCrossover')
    expect(optionValues).toContain('RSIReversion')
  })

  it('does not render the form when closed', () => {
    render(<BacktestCreateForm open={false} onClose={vi.fn()} />)
    expect(screen.queryByText('New backtest')).toBeFalsy()
  })

  it('shows the loading hint while strategy classes load', () => {
    mockedClasses.mockReturnValue(classesResult({ isLoading: true }))
    render(<BacktestCreateForm open={true} onClose={vi.fn()} />)
    expect(screen.getByText('Loading strategies…')).toBeTruthy()
  })

  it('shows the error hint when strategy classes fail to load', () => {
    mockedClasses.mockReturnValue(classesResult({ error: new Error('boom') }))
    render(<BacktestCreateForm open={true} onClose={vi.fn()} />)
    expect(screen.getByText('Failed to load strategies')).toBeTruthy()
  })

  it('pre-selects the strategy passed via preSelectedStrategy', () => {
    render(<BacktestCreateForm open={true} onClose={vi.fn()} preSelectedStrategy='RSIReversion' />)
    expect((screen.getByLabelText('Strategy') as HTMLSelectElement).value).toBe('RSIReversion')
  })

  it('submits a complete body and calls onSuccess + onClose', async () => {
    const mutateAsync = vi.fn().mockResolvedValue({ payload: { public_id: 'run-xyz' } })
    const onClose = vi.fn()
    const onSuccess = vi.fn()

    mockedCreate.mockReturnValue(createResult(mutateAsync))
    render(<BacktestCreateForm open={true} onClose={onClose} onSuccess={onSuccess} />)
    fillRequired()
    fireEvent.change(screen.getByLabelText('Timeframe'), { target: { value: '1d' } })
    fireEvent.change(screen.getByLabelText('Initial cash'), { target: { value: '5000' } })
    fireEvent.change(screen.getByLabelText('Slippage (bps)'), { target: { value: '2' } })
    fireEvent.change(screen.getByLabelText('Commission (bps)'), { target: { value: '3' } })
    fireEvent.change(screen.getByLabelText('Target execution exchange'), {
      target: { value: 'paper' },
    })
    fireEvent.click(screen.getByText('Start backtest'))
    await vi.waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1))
    expect(mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        strategy_class: 'MACDCrossover',
        instrument_public_id: 'BTC-USD',
        exchange: 'kraken',
        timeframe: '1d',
        initial_cash: 5000,
        strategy_params: {},
        execution_mode: 'direct_db',
        fill_model: 'market',
        slippage_bps: 2,
        commission_bps: 3,
        target_execution_exchange: 'paper',
        start_date: expect.stringMatching(/Z$/),
        end_date: expect.stringMatching(/Z$/),
      })
    )
    await vi.waitFor(() => expect(onClose).toHaveBeenCalledTimes(1))
    expect(onSuccess).toHaveBeenCalledWith('run-xyz')
  })

  it('coerces cleared numeric fields to defaults instead of sending NaN', async () => {
    const mutateAsync = vi.fn().mockResolvedValue({ payload: { public_id: 'run-3' } })

    mockedCreate.mockReturnValue(createResult(mutateAsync))
    render(<BacktestCreateForm open={true} onClose={vi.fn()} />)
    fillRequired()
    fireEvent.change(screen.getByLabelText('Initial cash'), { target: { value: '' } })
    fireEvent.change(screen.getByLabelText('Slippage (bps)'), { target: { value: '' } })
    fireEvent.change(screen.getByLabelText('Commission (bps)'), { target: { value: '' } })
    fireEvent.click(screen.getByText('Start backtest'))
    await vi.waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1))
    expect(mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ initial_cash: 10000, slippage_bps: 0, commission_bps: 0 })
    )
  })

  it('defaults target_execution_exchange to null and changes execution mode', async () => {
    const mutateAsync = vi.fn().mockResolvedValue({ payload: { public_id: 'run-2' } })

    mockedCreate.mockReturnValue(createResult(mutateAsync))
    render(<BacktestCreateForm open={true} onClose={vi.fn()} />)
    fillRequired()
    fireEvent.change(screen.getByLabelText('Execution mode'), { target: { value: 'zmq_replay' } })
    fireEvent.click(screen.getByText('Start backtest'))
    await vi.waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1))
    expect(mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ execution_mode: 'zmq_replay', target_execution_exchange: null })
    )
  })

  it('blocks submit and shows a message when end date is not after start date', () => {
    const mutateAsync = vi.fn()

    mockedCreate.mockReturnValue(createResult(mutateAsync))
    render(<BacktestCreateForm open={true} onClose={vi.fn()} />)
    fillRequired()
    fireEvent.change(screen.getByLabelText('End date'), { target: { value: '2025-12-01T00:00' } })
    fireEvent.click(screen.getByText('Start backtest'))
    expect(screen.getByText('End date must be after start date')).toBeTruthy()
    expect(mutateAsync).not.toHaveBeenCalled()
  })

  it('surfaces the error message when the mutation rejects with an Error', async () => {
    const mutateAsync = vi.fn().mockRejectedValue(new Error('server said no'))

    mockedCreate.mockReturnValue(createResult(mutateAsync))
    render(<BacktestCreateForm open={true} onClose={vi.fn()} />)
    fillRequired()
    fireEvent.click(screen.getByText('Start backtest'))
    await vi.waitFor(() => expect(screen.getByText('server said no')).toBeTruthy())
  })

  it('falls back to a generic error when the mutation rejects with a non-Error', async () => {
    const mutateAsync = vi.fn().mockRejectedValue('weird')

    mockedCreate.mockReturnValue(createResult(mutateAsync))
    render(<BacktestCreateForm open={true} onClose={vi.fn()} />)
    fillRequired()
    fireEvent.click(screen.getByText('Start backtest'))
    await vi.waitFor(() => expect(screen.getByText('Unknown error')).toBeTruthy())
  })

  it('shows the submitting state and disables actions while pending', () => {
    mockedCreate.mockReturnValue(createResult(vi.fn(), true))
    render(<BacktestCreateForm open={true} onClose={vi.fn()} />)
    expect(screen.getByText('Starting…')).toBeTruthy()
    expect((screen.getByText('Cancel') as HTMLButtonElement).disabled).toBe(true)
  })

  it('calls onClose when cancel is clicked', () => {
    const onClose = vi.fn()

    render(<BacktestCreateForm open={true} onClose={onClose} />)
    fireEvent.click(screen.getByText('Cancel'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
