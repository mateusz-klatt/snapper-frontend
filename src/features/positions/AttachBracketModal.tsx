import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Modal } from '../../components/ui/Modal'
import { useCreateBracket } from '../../hooks/queries/positions'
import { useIsReadOnly } from '../../hooks/useIsReadOnly'
import { useAuth } from '../../stores/auth'
import { Permission } from '../../types/permissions.generated'
import { validateBracketPrices } from './validation'
import { formatQuoted, quoteCurrency } from './instrumentQuote'

interface AttachBracketModalProps {
  open: boolean
  onClose: () => void
  positionCyclePublicId: string
  instrument: string
  side: 'LONG' | 'SHORT'
  averagePrice: number
}

export const AttachBracketModal: React.FC<AttachBracketModalProps> = ({
  open,
  onClose,
  positionCyclePublicId,
  instrument,
  side,
  averagePrice,
}) => {
  const { t } = useTranslation('positions')
  const { hasPermission } = useAuth()
  const readOnly = useIsReadOnly()
  const canCreateOrders = hasPermission(Permission.CREATE_ORDERS) && !readOnly
  const createBracket = useCreateBracket()
  const [slPrice, setSlPrice] = useState('')
  const [tpPrice, setTpPrice] = useState('')
  const [error, setError] = useState('')
  const [confirming, setConfirming] = useState(false)
  const quote = quoteCurrency(instrument)

  const handleClose = () => {
    setSlPrice('')
    setTpPrice('')
    setError('')
    setConfirming(false)
    createBracket.reset()
    onClose()
  }

  const handleSubmit = () => {
    if (!hasPermission(Permission.CREATE_ORDERS) || readOnly) return

    setError('')
    const sl = slPrice ? Number.parseFloat(slPrice) : null
    const tp = tpPrice ? Number.parseFloat(tpPrice) : null
    const validationError = validateBracketPrices(sl, tp, side, averagePrice, quote)

    if (validationError) {
      const key = `validation.${validationError.key}` as 'validation.bracketRequired'

      setError(t(key, validationError.params ?? {}))

      return
    }

    setConfirming(true)
  }

  const handleConfirm = () => {
    if (!hasPermission(Permission.CREATE_ORDERS) || readOnly) return

    const sl = slPrice ? Number.parseFloat(slPrice) : null
    const tp = tpPrice ? Number.parseFloat(tpPrice) : null

    createBracket.mutate(
      {
        position_cycle_public_id: positionCyclePublicId,
        sl_price: sl,
        tp_price: tp,
      },
      {
        onSuccess: () => {
          handleClose()
        },
        onError: (err: Error) => {
          setError(err.message)
          setConfirming(false)
        },
      }
    )
  }

  const isEditingStep = !confirming

  return (
    <Modal
      open={open && canCreateOrders}
      onClose={handleClose}
      title={t('bracketModal.title', { instrument })}
      size='sm'
    >
      {isEditingStep ? (
        <div className='space-y-4'>
          <div className='rounded-lg border border-dark-600 bg-dark-700 p-3 text-sm'>
            <div className='flex justify-between'>
              <span className='text-muted-500'>{t('bracketModal.position')}</span>
              <span className='text-alpine-900'>
                {side} {instrument}
              </span>
            </div>
            <div className='mt-1 flex justify-between'>
              <span className='text-muted-500'>{t('bracketModal.entryPrice')}</span>
              <span className='font-mono text-alpine-900'>{formatQuoted(averagePrice, quote)}</span>
            </div>
          </div>
          <div>
            <label htmlFor='sl-price' className='mb-1 block text-sm text-muted-500'>
              {t('bracketModal.stopLossLabel')}
            </label>
            <input
              id='sl-price'
              type='number'
              step='any'
              value={slPrice}
              onChange={e => setSlPrice(e.target.value)}
              placeholder={
                side === 'LONG'
                  ? t('bracketModal.placeholders.slLong', { price: averagePrice.toFixed(2) })
                  : t('bracketModal.placeholders.slShort', { price: averagePrice.toFixed(2) })
              }
              className='w-full rounded-lg border border-dark-600 bg-dark-700 px-3 py-2 text-sm text-alpine-900 placeholder-muted-500 focus:border-brand-500 focus:outline-none'
              data-testid='sl-price-input'
            />
          </div>
          <div>
            <label htmlFor='tp-price' className='mb-1 block text-sm text-muted-500'>
              {t('bracketModal.takeProfitLabel')}
            </label>
            <input
              id='tp-price'
              type='number'
              step='any'
              value={tpPrice}
              onChange={e => setTpPrice(e.target.value)}
              placeholder={
                side === 'LONG'
                  ? t('bracketModal.placeholders.tpLong', { price: averagePrice.toFixed(2) })
                  : t('bracketModal.placeholders.tpShort', { price: averagePrice.toFixed(2) })
              }
              className='w-full rounded-lg border border-dark-600 bg-dark-700 px-3 py-2 text-sm text-alpine-900 placeholder-muted-500 focus:border-brand-500 focus:outline-none'
              data-testid='tp-price-input'
            />
          </div>
          {error ? (
            <div
              className='rounded-lg bg-loss-900/20 p-3 text-sm text-loss-400'
              data-testid='bracket-error'
            >
              {error}
            </div>
          ) : null}
          <div className='flex justify-end gap-2'>
            <button
              type='button'
              onClick={handleClose}
              className='rounded-lg border border-dark-600 px-4 py-2 text-sm text-muted-500 transition-colors hover:bg-muted-200'
            >
              {t('bracketModal.buttons.cancel')}
            </button>
            <button
              type='button'
              onClick={handleSubmit}
              disabled={!canCreateOrders}
              className='rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-500'
              data-testid='bracket-submit'
            >
              {t('bracketModal.buttons.review')}
            </button>
          </div>
        </div>
      ) : (
        <div className='space-y-4'>
          <div className='rounded-lg border border-dark-600 bg-dark-700 p-3 text-sm'>
            <div className='font-medium text-alpine-900'>{t('bracketModal.confirmTitle')}</div>
            <div className='mt-2 space-y-1'>
              <div className='flex justify-between'>
                <span className='text-muted-500'>{t('bracketModal.position')}</span>
                <span className='text-alpine-900'>
                  {side} {instrument}
                </span>
              </div>
              {slPrice && (
                <div className='flex justify-between'>
                  <span className='text-muted-500'>{t('bracketModal.stopLoss')}</span>
                  <span className='font-mono text-falling-400'>
                    {formatQuoted(Number.parseFloat(slPrice), quote)}
                  </span>
                </div>
              )}
              {tpPrice && (
                <div className='flex justify-between'>
                  <span className='text-muted-500'>{t('bracketModal.takeProfit')}</span>
                  <span className='font-mono text-rising-400'>
                    {formatQuoted(Number.parseFloat(tpPrice), quote)}
                  </span>
                </div>
              )}
            </div>
          </div>
          <div className='flex justify-end gap-2'>
            <button
              type='button'
              onClick={() => setConfirming(false)}
              disabled={createBracket.isPending}
              className='rounded-lg border border-dark-600 px-4 py-2 text-sm text-muted-500 transition-colors hover:bg-muted-200 disabled:opacity-50'
            >
              {t('bracketModal.buttons.back')}
            </button>
            <button
              type='button'
              onClick={handleConfirm}
              disabled={!canCreateOrders || createBracket.isPending}
              className='rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-500 disabled:opacity-50'
              data-testid='bracket-confirm'
            >
              {createBracket.isPending
                ? t('bracketModal.buttons.creating')
                : t('bracketModal.buttons.confirm')}
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}
