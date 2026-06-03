import React, { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Modal } from '../../components/ui/Modal'
import { useBacktestStrategyClasses, useCreateBacktest } from '../../hooks/queries/backtests'
import { useIsReadOnly } from '../../hooks/useIsReadOnly'
import type { BacktestCreateBody } from '../../types/api'

export interface BacktestCreateFormProps {
  open: boolean
  onClose: () => void
  preSelectedStrategy?: string | undefined
  onSuccess?: ((runPublicId: string) => void) | undefined
}

type TargetExchange = NonNullable<BacktestCreateBody['target_execution_exchange']>

const EXCHANGE_OPTIONS = ['kraken', 'kraken_futures', 'kraken_equities', 'walutomat', 'polygon']
const TIMEFRAME_OPTIONS = ['1m', '5m', '15m', '1h', '4h', '1d']
const TARGET_EXCHANGE_OPTIONS: TargetExchange[] = ['paper', 'kraken', 'kraken_futures', 'walutomat']

const INPUT_CLASS =
  'w-full px-3 py-2 bg-alpine-50 border border-dark-600 rounded-md text-alpine-900 focus:outline-hidden focus:ring-2 focus:ring-brand-500'
const LABEL_CLASS = 'block text-sm font-medium text-muted-700 mb-2'
const HELP_CLASS = 'mt-1 text-xs text-muted-400'

export const BacktestCreateForm: React.FC<Readonly<BacktestCreateFormProps>> = ({
  open,
  onClose,
  preSelectedStrategy,
  onSuccess,
}) => {
  const { t } = useTranslation('backtests')
  const readOnly = useIsReadOnly()
  const strategyClasses = useBacktestStrategyClasses(open)
  const createBacktest = useCreateBacktest()

  const [strategyClass, setStrategyClass] = useState<string>('')
  const [instrumentPublicId, setInstrumentPublicId] = useState<string>('')
  const [exchange, setExchange] = useState<string>('')
  const [timeframe, setTimeframe] = useState<string>('1h')
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [initialCash, setInitialCash] = useState<string>('10000')
  const [executionMode, setExecutionMode] = useState<string>('direct_db')
  const [slippageBps, setSlippageBps] = useState<string>('0')
  const [commissionBps, setCommissionBps] = useState<string>('0')
  const [targetExchange, setTargetExchange] = useState<string>('')
  const [clientError, setClientError] = useState<string | null>(null)

  const availableStrategies = useMemo(
    () => [...(strategyClasses.data?.payload ?? [])].sort((a, b) => a.localeCompare(b)),
    [strategyClasses.data?.payload]
  )

  useEffect(() => {
    if (!open) {
      setStrategyClass('')
      setInstrumentPublicId('')
      setExchange('')
      setTimeframe('1h')
      setStartDate('')
      setEndDate('')
      setInitialCash('10000')
      setExecutionMode('direct_db')
      setSlippageBps('0')
      setCommissionBps('0')
      setTargetExchange('')
      setClientError(null)

      return
    }

    if (preSelectedStrategy) {
      setStrategyClass(preSelectedStrategy)
    }
  }, [open, preSelectedStrategy])

  const requiredFilled =
    strategyClass !== '' &&
    instrumentPublicId.trim() !== '' &&
    exchange !== '' &&
    startDate !== '' &&
    endDate !== ''

  const handleSubmit = async (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault()
    setClientError(null)

    if (startDate !== '' && endDate !== '' && new Date(endDate) <= new Date(startDate)) {
      setClientError(t('create.validation.endDateAfterStart'))

      return
    }

    const body: BacktestCreateBody = {
      strategy_class: strategyClass,
      instrument_public_id: instrumentPublicId.trim(),
      exchange,
      timeframe,
      start_date: new Date(startDate).toISOString(),
      end_date: new Date(endDate).toISOString(),
      initial_cash: initialCash.trim() === '' ? 10000 : Number.parseFloat(initialCash),
      strategy_params: {},
      execution_mode: executionMode,
      fill_model: 'market',
      slippage_bps: slippageBps.trim() === '' ? 0 : Number.parseFloat(slippageBps),
      commission_bps: commissionBps.trim() === '' ? 0 : Number.parseFloat(commissionBps),
      target_execution_exchange: targetExchange === '' ? null : (targetExchange as TargetExchange),
    }

    try {
      const response = await createBacktest.mutateAsync(body)

      onClose()
      onSuccess?.(response.payload.public_id)
    } catch (error) {
      setClientError(error instanceof Error ? error.message : t('create.errors.unknown'))
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={t('create.title')} size='lg'>
      <form onSubmit={handleSubmit} className='space-y-5'>
        <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
          <div>
            <label htmlFor='backtest-strategy' className={LABEL_CLASS}>
              {t('create.form.strategyLabel')}
            </label>
            <select
              id='backtest-strategy'
              value={strategyClass}
              onChange={e => setStrategyClass(e.target.value)}
              className={INPUT_CLASS}
              required
            >
              <option value=''>{t('create.form.strategyPlaceholder')}</option>
              {availableStrategies.map(name => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
            {strategyClasses.isLoading && (
              <p className={HELP_CLASS}>{t('create.form.strategyLoading')}</p>
            )}
            {strategyClasses.error && (
              <p className='mt-1 text-xs text-warning-400'>{t('create.form.strategyError')}</p>
            )}
          </div>
          <div>
            <label htmlFor='backtest-instrument' className={LABEL_CLASS}>
              {t('create.form.instrumentLabel')}
            </label>
            <input
              id='backtest-instrument'
              type='text'
              value={instrumentPublicId}
              onChange={e => setInstrumentPublicId(e.target.value)}
              placeholder={t('create.form.instrumentPlaceholder')}
              className={INPUT_CLASS}
              required
            />
            <p className={HELP_CLASS}>{t('create.form.instrumentHelp')}</p>
          </div>
        </div>
        <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
          <div>
            <label htmlFor='backtest-exchange' className={LABEL_CLASS}>
              {t('create.form.exchangeLabel')}
            </label>
            <select
              id='backtest-exchange'
              value={exchange}
              onChange={e => setExchange(e.target.value)}
              className={INPUT_CLASS}
              required
            >
              <option value=''>{t('create.form.exchangePlaceholder')}</option>
              {EXCHANGE_OPTIONS.map(name => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor='backtest-timeframe' className={LABEL_CLASS}>
              {t('create.form.timeframeLabel')}
            </label>
            <select
              id='backtest-timeframe'
              value={timeframe}
              onChange={e => setTimeframe(e.target.value)}
              className={INPUT_CLASS}
            >
              {TIMEFRAME_OPTIONS.map(name => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
          <div>
            <label htmlFor='backtest-start' className={LABEL_CLASS}>
              {t('create.form.startDateLabel')}
            </label>
            <input
              id='backtest-start'
              type='datetime-local'
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className={INPUT_CLASS}
              required
            />
          </div>
          <div>
            <label htmlFor='backtest-end' className={LABEL_CLASS}>
              {t('create.form.endDateLabel')}
            </label>
            <input
              id='backtest-end'
              type='datetime-local'
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className={INPUT_CLASS}
              required
            />
          </div>
        </div>
        <div className='grid grid-cols-1 sm:grid-cols-3 gap-4'>
          <div>
            <label htmlFor='backtest-cash' className={LABEL_CLASS}>
              {t('create.form.initialCashLabel')}
            </label>
            <input
              id='backtest-cash'
              type='number'
              min='0'
              step='any'
              value={initialCash}
              onChange={e => setInitialCash(e.target.value)}
              className={INPUT_CLASS}
            />
          </div>
          <div>
            <label htmlFor='backtest-slippage' className={LABEL_CLASS}>
              {t('create.form.slippageBpsLabel')}
            </label>
            <input
              id='backtest-slippage'
              type='number'
              min='0'
              max='500'
              step='any'
              value={slippageBps}
              onChange={e => setSlippageBps(e.target.value)}
              className={INPUT_CLASS}
            />
          </div>
          <div>
            <label htmlFor='backtest-commission' className={LABEL_CLASS}>
              {t('create.form.commissionBpsLabel')}
            </label>
            <input
              id='backtest-commission'
              type='number'
              min='0'
              max='500'
              step='any'
              value={commissionBps}
              onChange={e => setCommissionBps(e.target.value)}
              className={INPUT_CLASS}
            />
          </div>
        </div>
        <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
          <div>
            <label htmlFor='backtest-execution-mode' className={LABEL_CLASS}>
              {t('create.form.executionModeLabel')}
            </label>
            <select
              id='backtest-execution-mode'
              value={executionMode}
              onChange={e => setExecutionMode(e.target.value)}
              className={INPUT_CLASS}
            >
              <option value='direct_db'>{t('create.form.executionModeDirectDb')}</option>
              <option value='zmq_replay'>{t('create.form.executionModeZmqReplay')}</option>
            </select>
          </div>
          <div>
            <label htmlFor='backtest-target-exchange' className={LABEL_CLASS}>
              {t('create.form.targetExchangeLabel')}
            </label>
            <select
              id='backtest-target-exchange'
              value={targetExchange}
              onChange={e => setTargetExchange(e.target.value)}
              className={INPUT_CLASS}
            >
              <option value=''>{t('create.form.targetExchangeNone')}</option>
              {TARGET_EXCHANGE_OPTIONS.map(name => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
            <p className={HELP_CLASS}>{t('create.form.targetExchangeHelp')}</p>
          </div>
        </div>
        {clientError && <p className='text-sm text-loss-400'>{clientError}</p>}
        <div className='flex justify-end space-x-3 pt-4'>
          <button
            type='button'
            onClick={onClose}
            className='px-4 py-2 text-sm text-muted-600 hover:text-alpine-900'
            disabled={createBacktest.isPending}
          >
            {t('create.cancel')}
          </button>
          <button
            type='submit'
            disabled={readOnly || createBacktest.isPending || !requiredFilled}
            className='px-4 py-2 bg-info-600 text-white text-sm font-medium rounded-md hover:bg-info-700 disabled:opacity-50 disabled:cursor-not-allowed'
          >
            {createBacktest.isPending ? t('create.submitting') : t('create.submit')}
          </button>
        </div>
      </form>
    </Modal>
  )
}
