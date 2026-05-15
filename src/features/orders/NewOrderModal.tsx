import React, { useState, useEffect, useMemo } from 'react'
import { v7 as uuid7 } from 'uuid'
import { useTranslation } from 'react-i18next'
import { Modal } from '../../components/ui/Modal'
import { NativeSelect } from '../../components/NativeSelect'
import { MarketDataOnlyBadge } from '../../components/MarketDataOnlyBadge'
import { useExchanges, useExchangeInstrumentsDetail } from '../../hooks/queries/market'
import { useCreateOrder } from '../../hooks/queries/orders'
import { useWallets } from '../../hooks/queries/wallets'
import { APIError } from '../../lib/apiClient'
import { lookupOrderErrorMessageKey } from './errorMessages'

interface NewOrderModalProps {
  open: boolean
  onClose: () => void
}

export const NewOrderModal: React.FC<NewOrderModalProps> = ({ open, onClose }) => {
  const { t } = useTranslation('orders')
  const exchangeSelectId = 'new-order-exchange'
  const instrumentSelectId = 'new-order-instrument'
  const sideSelectId = 'new-order-side'
  const orderTypeSelectId = 'new-order-type'
  const quantityInputId = 'new-order-quantity'
  const priceInputId = 'new-order-price'
  const stopPriceInputId = 'new-order-stop-price'
  const modeSelectId = 'new-order-mode'
  const walletSelectId = 'new-order-wallet'
  const { data: exchanges } = useExchanges()
  const { data: walletsResponse } = useWallets()
  const createOrder = useCreateOrder()

  const SIDE_OPTIONS = useMemo(
    () => [
      { value: 'buy', label: t('newOrderModal.sideOptions.buy') },
      { value: 'sell', label: t('newOrderModal.sideOptions.sell') },
    ],
    [t]
  )

  const ORDER_TYPE_OPTIONS = useMemo(
    () => [
      { value: 'market', label: t('newOrderModal.orderTypeOptions.market') },
      { value: 'limit', label: t('newOrderModal.orderTypeOptions.limit') },
      { value: 'stop', label: t('newOrderModal.orderTypeOptions.stop') },
      { value: 'stop_limit', label: t('newOrderModal.orderTypeOptions.stopLimit') },
    ],
    [t]
  )

  const MODE_OPTIONS = useMemo(
    () => [
      { value: 'live', label: t('newOrderModal.modeOptions.live') },
      { value: 'paper', label: t('newOrderModal.modeOptions.paper') },
    ],
    [t]
  )

  const [exchange, setExchange] = useState('')
  const [instrument, setInstrument] = useState('')
  const [instrumentPublicId, setInstrumentPublicId] = useState('')
  const [side, setSide] = useState('buy')
  const [orderType, setOrderType] = useState('limit')
  const [quantity, setQuantity] = useState('')
  const [price, setPrice] = useState('')
  const [stopPrice, setStopPrice] = useState('')
  const [mode, setMode] = useState('live')
  const [walletPublicId, setWalletPublicId] = useState('')
  const [error, setError] = useState('')
  const [confirming, setConfirming] = useState(false)

  const { data: instruments } = useExchangeInstrumentsDetail(exchange || null)
  const capabilityMap = useMemo(() => {
    const map = new Map<string, boolean>()

    for (const row of instruments?.payload ?? []) {
      map.set(row.symbol, row.can_trade)
    }

    return map
  }, [instruments])
  const selectedIsMarketDataOnly = instrument.length > 0 && capabilityMap.get(instrument) === false

  useEffect(() => {
    const head = exchanges?.payload?.[0]

    if (head !== undefined && !exchange) {
      setExchange(head)
    }
  }, [exchanges, exchange])

  const wallets = walletsResponse?.payload

  useEffect(() => {
    const head = wallets?.[0]

    if (head !== undefined && !walletPublicId) {
      setWalletPublicId(head.public_id)
    }
  }, [wallets, walletPublicId])

  useEffect(() => {
    setInstrument('')
    setInstrumentPublicId('')
  }, [exchange])

  useEffect(() => {
    const first = instruments?.payload?.[0]

    if (first !== undefined && !instrument) {
      setInstrument(first.symbol)
      setInstrumentPublicId(first.symbol)
    }
  }, [instruments, instrument])

  const exchangeOptions = (exchanges?.payload ?? []).map(e => ({ value: e, label: e }))
  const instrumentOptions = (instruments?.payload ?? []).map(row => ({
    value: row.symbol,
    label: row.can_trade
      ? row.symbol
      : t('newOrderModal.instrumentMarketDataOnlySuffix', { symbol: row.symbol }),
  }))
  const walletOptions = (wallets ?? []).map(w => ({
    value: w.public_id,
    label: w.is_paper ? t('newOrderModal.walletPaperSuffix', { label: w.label }) : w.label,
  }))

  const needsPrice = orderType === 'limit' || orderType === 'stop_limit'
  const needsStopPrice = orderType === 'stop' || orderType === 'stop_limit'

  const handleInstrumentChange = (val: string) => {
    setInstrument(val)
    setInstrumentPublicId(val)
  }

  const translateErrorCode = (details: unknown): string | null => {
    const key = lookupOrderErrorMessageKey(details)

    if (key === null) {
      return null
    }

    return t(`newOrderModal.errorCodes.${key}`)
  }

  const handleSubmit = () => {
    setError('')

    if (!exchange || !instrument || !quantity || !walletPublicId) {
      setError(t('newOrderModal.errors.missingRequired'))

      return
    }

    const qty = Number.parseFloat(quantity)

    if (Number.isNaN(qty) || qty <= 0) {
      setError(t('newOrderModal.errors.quantityPositive'))

      return
    }

    if (needsPrice && !price) {
      setError(t('newOrderModal.errors.priceRequired'))

      return
    }

    if (needsPrice && (Number.isNaN(Number.parseFloat(price)) || Number.parseFloat(price) <= 0)) {
      setError(t('newOrderModal.errors.pricePositive'))

      return
    }

    if (needsStopPrice && !stopPrice) {
      setError(t('newOrderModal.errors.stopPriceRequired'))

      return
    }

    if (
      needsStopPrice &&
      (Number.isNaN(Number.parseFloat(stopPrice)) || Number.parseFloat(stopPrice) <= 0)
    ) {
      setError(t('newOrderModal.errors.stopPricePositive'))

      return
    }

    setConfirming(true)
  }

  const handleConfirm = async () => {
    const idempotencyKey = uuid7()

    const body = {
      instrument,
      instrument_public_id: instrumentPublicId,
      exchange,
      mode,
      side,
      order_type: orderType,
      quantity: Number.parseFloat(quantity),
      price: needsPrice ? Number.parseFloat(price) : null,
      stop_price: needsStopPrice ? Number.parseFloat(stopPrice) : null,
      wallet_public_id: walletPublicId,
      idempotency_key: idempotencyKey,
    }

    try {
      await createOrder.mutateAsync(body)
      handleClose()
    } catch (err) {
      setConfirming(false)

      if (err instanceof APIError) {
        const mapped = translateErrorCode(err.details)

        setError(mapped ?? err.message)

        return
      }

      setError(err instanceof Error ? err.message : t('newOrderModal.errors.createFailed'))
    }
  }

  const handleClose = () => {
    setExchange('')
    setInstrument('')
    setInstrumentPublicId('')
    setSide('buy')
    setOrderType('limit')
    setQuantity('')
    setPrice('')
    setStopPrice('')
    setMode('live')
    setWalletPublicId('')
    setError('')
    setConfirming(false)
    onClose()
  }

  return (
    <Modal open={open} onClose={handleClose}>
      <div className='p-6 max-w-lg w-full'>
        <h3 className='text-lg font-semibold text-alpine-900 mb-4'>
          {confirming ? t('newOrderModal.titleConfirm') : t('newOrderModal.titleEdit')}
        </h3>

        {error && (
          <div className='mb-4 rounded-lg bg-loss-900/20 border border-loss-600 px-4 py-2 text-sm text-loss-400'>
            {error}
          </div>
        )}

        {confirming ? (
          <div className='space-y-3'>
            <div className='rounded-xl border border-dark-600 bg-dark-700 p-4 space-y-2 text-sm'>
              <div className='flex justify-between'>
                <span className='text-muted-500'>{t('newOrderModal.fields.instrument')}</span>
                <span className='text-alpine-900 font-medium'>{instrument}</span>
              </div>
              <div className='flex justify-between'>
                <span className='text-muted-500'>{t('newOrderModal.fields.exchange')}</span>
                <span className='text-alpine-900'>{exchange}</span>
              </div>
              <div className='flex justify-between'>
                <span className='text-muted-500'>{t('newOrderModal.fields.side')}</span>
                <span
                  className={
                    side === 'buy' ? 'text-gain-400 font-medium' : 'text-loss-400 font-medium'
                  }
                >
                  {t(`newOrderModal.sideOptions.${side}`, { defaultValue: side.toUpperCase() })}
                </span>
              </div>
              <div className='flex justify-between'>
                <span className='text-muted-500'>{t('newOrderModal.fields.type')}</span>
                <span className='text-alpine-900'>
                  {t(`newOrderModal.orderTypeOptions.${orderType}`, {
                    defaultValue: orderType,
                  })}
                </span>
              </div>
              <div className='flex justify-between'>
                <span className='text-muted-500'>{t('newOrderModal.fields.quantity')}</span>
                <span className='text-alpine-900 font-medium'>{quantity}</span>
              </div>
              {needsPrice && (
                <div className='flex justify-between'>
                  <span className='text-muted-500'>{t('newOrderModal.fields.price')}</span>
                  <span className='text-alpine-900'>${price}</span>
                </div>
              )}
              {needsStopPrice && (
                <div className='flex justify-between'>
                  <span className='text-muted-500'>{t('newOrderModal.fields.stopPrice')}</span>
                  <span className='text-alpine-900'>${stopPrice}</span>
                </div>
              )}
              <div className='flex justify-between'>
                <span className='text-muted-500'>{t('newOrderModal.fields.mode')}</span>
                <span className='text-alpine-900'>
                  {t(`newOrderModal.modeOptions.${mode}`, { defaultValue: mode })}
                </span>
              </div>
            </div>
            <div className='flex justify-end gap-3 pt-2'>
              <button
                onClick={() => setConfirming(false)}
                className='px-4 py-2 text-sm text-muted-600 hover:text-alpine-900 transition-colors'
              >
                {t('newOrderModal.buttons.back')}
              </button>
              <button
                onClick={handleConfirm}
                disabled={createOrder.isPending}
                className='px-4 py-2 text-sm font-medium rounded-lg bg-brand-600 text-white hover:bg-brand-500 disabled:opacity-50 transition-colors'
              >
                {createOrder.isPending
                  ? t('newOrderModal.buttons.submitting')
                  : t('newOrderModal.buttons.confirmOrder')}
              </button>
            </div>
          </div>
        ) : (
          <div className='space-y-4'>
            <div className='grid grid-cols-2 gap-4'>
              <div>
                <label htmlFor={exchangeSelectId} className='block text-xs text-muted-500 mb-1'>
                  {t('newOrderModal.fields.exchange')}
                </label>
                <NativeSelect
                  id={exchangeSelectId}
                  value={exchange}
                  onChange={setExchange}
                  options={exchangeOptions}
                />
              </div>
              <div>
                <label
                  htmlFor={instrumentSelectId}
                  className='flex items-center gap-2 text-xs text-muted-500 mb-1'
                >
                  <span>{t('newOrderModal.fields.instrument')}</span>
                  {selectedIsMarketDataOnly && <MarketDataOnlyBadge size='sm' />}
                </label>
                <NativeSelect
                  id={instrumentSelectId}
                  value={instrument}
                  onChange={handleInstrumentChange}
                  options={instrumentOptions}
                />
              </div>
            </div>
            {selectedIsMarketDataOnly && (
              <div className='rounded-lg border border-warning-500/40 bg-warning-500/10 px-3 py-2 text-xs text-warning-600'>
                {translateErrorCode({ error_code: 'instrument_market_data_only' })}
              </div>
            )}
            <div className='grid grid-cols-2 gap-4'>
              <div>
                <label htmlFor={sideSelectId} className='block text-xs text-muted-500 mb-1'>
                  {t('newOrderModal.fields.side')}
                </label>
                <NativeSelect
                  id={sideSelectId}
                  value={side}
                  onChange={setSide}
                  options={SIDE_OPTIONS}
                />
              </div>
              <div>
                <label htmlFor={orderTypeSelectId} className='block text-xs text-muted-500 mb-1'>
                  {t('newOrderModal.fields.orderType')}
                </label>
                <NativeSelect
                  id={orderTypeSelectId}
                  value={orderType}
                  onChange={setOrderType}
                  options={ORDER_TYPE_OPTIONS}
                />
              </div>
            </div>
            <div>
              <label htmlFor={quantityInputId} className='block text-xs text-muted-500 mb-1'>
                {t('newOrderModal.fields.quantity')}
              </label>
              <input
                id={quantityInputId}
                type='number'
                step='any'
                min='0'
                value={quantity}
                onChange={e => setQuantity(e.target.value)}
                className='w-full rounded-lg border border-dark-600 bg-dark-700 px-3 py-2 text-sm text-alpine-900 focus:border-brand-500 focus:outline-none'
                placeholder={t('newOrderModal.placeholders.quantity')}
              />
            </div>
            {needsPrice && (
              <div>
                <label htmlFor={priceInputId} className='block text-xs text-muted-500 mb-1'>
                  {t('newOrderModal.fields.price')}
                </label>
                <input
                  id={priceInputId}
                  type='number'
                  step='any'
                  min='0'
                  value={price}
                  onChange={e => setPrice(e.target.value)}
                  className='w-full rounded-lg border border-dark-600 bg-dark-700 px-3 py-2 text-sm text-alpine-900 focus:border-brand-500 focus:outline-none'
                  placeholder={t('newOrderModal.placeholders.price')}
                />
              </div>
            )}
            {needsStopPrice && (
              <div>
                <label htmlFor={stopPriceInputId} className='block text-xs text-muted-500 mb-1'>
                  {t('newOrderModal.fields.stopPrice')}
                </label>
                <input
                  id={stopPriceInputId}
                  type='number'
                  step='any'
                  min='0'
                  value={stopPrice}
                  onChange={e => setStopPrice(e.target.value)}
                  className='w-full rounded-lg border border-dark-600 bg-dark-700 px-3 py-2 text-sm text-alpine-900 focus:border-brand-500 focus:outline-none'
                  placeholder={t('newOrderModal.placeholders.stopPrice')}
                />
              </div>
            )}
            <div className='grid grid-cols-2 gap-4'>
              <div>
                <label htmlFor={modeSelectId} className='block text-xs text-muted-500 mb-1'>
                  {t('newOrderModal.fields.mode')}
                </label>
                <NativeSelect
                  id={modeSelectId}
                  value={mode}
                  onChange={setMode}
                  options={MODE_OPTIONS}
                />
              </div>
              <div>
                <label htmlFor={walletSelectId} className='block text-xs text-muted-500 mb-1'>
                  {t('newOrderModal.fields.wallet')}
                </label>
                <NativeSelect
                  id={walletSelectId}
                  value={walletPublicId}
                  onChange={setWalletPublicId}
                  options={walletOptions}
                />
              </div>
            </div>
            <div className='flex justify-end gap-3 pt-2'>
              <button
                onClick={handleClose}
                className='px-4 py-2 text-sm text-muted-600 hover:text-alpine-900 transition-colors'
              >
                {t('newOrderModal.buttons.cancel')}
              </button>
              <button
                onClick={handleSubmit}
                disabled={selectedIsMarketDataOnly}
                className='px-4 py-2 text-sm font-medium rounded-lg bg-brand-600 text-white hover:bg-brand-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
              >
                {t('newOrderModal.buttons.reviewOrder')}
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
