import React, { useCallback, useEffect, useReducer, useRef } from 'react'
import { toast } from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui'
import { useCreateAiDelegate } from '../../hooks/queries/ai-delegates'
import { useIsReadOnly } from '../../hooks/useIsReadOnly'
import { ConfigSnippetGenerator } from './ConfigSnippetGenerator'
import type { DelegateCreateBody, DelegateCreatedPayload, DelegateCapsBody } from '../../types/api'

type WizardStep = 'identity' | 'scope-and-caps' | 'review' | 'done'

interface CapsFormState {
  maxOrderQuantityPerInstrumentJson: string
  maxOpenOrders: string
  maxDailyNotionalUsd: string
  maxCancelsPerMinute: string
}

interface WizardState {
  step: WizardStep
  label: string
  operatorPublicId: string
  caps: CapsFormState
  capsError: string | null
  createdPayload: DelegateCreatedPayload | null
}

const INITIAL_CAPS: CapsFormState = {
  maxOrderQuantityPerInstrumentJson: '',
  maxOpenOrders: '',
  maxDailyNotionalUsd: '',
  maxCancelsPerMinute: '',
}

const INITIAL_STATE: WizardState = {
  step: 'identity',
  label: '',
  operatorPublicId: '',
  caps: INITIAL_CAPS,
  capsError: null,
  createdPayload: null,
}

type WizardAction =
  | { type: 'set-label'; value: string }
  | { type: 'set-operator'; value: string }
  | { type: 'set-cap'; key: keyof CapsFormState; value: string }
  | { type: 'goto'; step: WizardStep }
  | { type: 'set-caps-error'; error: string | null }
  | { type: 'set-created-payload'; payload: DelegateCreatedPayload }
  | { type: 'reset' }

function reducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case 'set-label':
      return { ...state, label: action.value }
    case 'set-operator':
      return { ...state, operatorPublicId: action.value }
    case 'set-cap':
      return {
        ...state,
        caps: { ...state.caps, [action.key]: action.value },
        capsError: null,
      }
    case 'goto':
      return { ...state, step: action.step }
    case 'set-caps-error':
      return { ...state, capsError: action.error }
    case 'set-created-payload':
      return { ...state, createdPayload: action.payload, step: 'done' }
    case 'reset':
      return INITIAL_STATE
  }
}

function parseNullableInt(raw: string): number | null | 'error' {
  const trimmed = raw.trim()

  if (trimmed === '') return null

  const parsed = Number(trimmed)

  if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed < 0) return 'error'

  return parsed
}

interface CapsParseErrors {
  invalidJson: string
  jsonObject: string
  negativeIntegers: string
}

function parseCapsToBody(
  caps: CapsFormState,
  errors: CapsParseErrors
): DelegateCapsBody | { error: string } {
  let perInstrument: Record<string, unknown> | null = null
  const qtyJson = caps.maxOrderQuantityPerInstrumentJson.trim()

  if (qtyJson !== '') {
    try {
      const parsed: unknown = JSON.parse(qtyJson)

      if (parsed !== null && (typeof parsed !== 'object' || Array.isArray(parsed))) {
        return { error: errors.jsonObject }
      }

      perInstrument = parsed as Record<string, unknown> | null
    } catch {
      return { error: errors.invalidJson }
    }
  }

  const maxOpen = parseNullableInt(caps.maxOpenOrders)
  const maxNotional = parseNullableInt(caps.maxDailyNotionalUsd)
  const maxCancels = parseNullableInt(caps.maxCancelsPerMinute)

  if (maxOpen === 'error' || maxNotional === 'error' || maxCancels === 'error') {
    return { error: errors.negativeIntegers }
  }

  return {
    max_order_quantity_per_instrument: perInstrument,
    max_open_orders: maxOpen,
    max_daily_notional_usd: maxNotional,
    max_cancels_per_minute: maxCancels,
  }
}

export function CreateDelegateWizard({
  open,
  onClose: parentOnClose,
}: Readonly<{ open: boolean; onClose: () => void }>): React.ReactElement {
  const { t } = useTranslation('aiIntegration')
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE)
  const mutation = useCreateAiDelegate()
  const readOnly = useIsReadOnly()
  const mountedRef = useRef(true)
  const resetRef = useRef(mutation.reset)
  const noop = useCallback(() => {}, [])
  const capsErrors: CapsParseErrors = {
    invalidJson: t('wizard.caps.errorInvalidJson'),
    jsonObject: t('wizard.caps.errorJsonObject'),
    negativeIntegers: t('wizard.caps.errorNegative'),
  }

  useEffect(() => {
    resetRef.current = mutation.reset
  })

  useEffect(() => {
    mountedRef.current = true

    return () => {
      mountedRef.current = false
      resetRef.current()
    }
  }, [])

  useEffect(() => {
    if (!open) dispatch({ type: 'reset' })
  }, [open])

  const handleClose = (): void => {
    mutation.reset()
    parentOnClose()
  }

  const advanceFromIdentity = (): void => {
    dispatch({ type: 'goto', step: 'scope-and-caps' })
  }

  const advanceToReview = (): void => {
    const parsed = parseCapsToBody(state.caps, capsErrors)

    if ('error' in parsed) {
      dispatch({ type: 'set-caps-error', error: parsed.error })

      return
    }

    dispatch({ type: 'goto', step: 'review' })
  }

  const handleSubmit = async (): Promise<void> => {
    const parsedCaps = parseCapsToBody(state.caps, capsErrors) as DelegateCapsBody
    const body: DelegateCreateBody = {
      label: state.label.trim(),
      caps: parsedCaps,
      operator_public_id:
        state.operatorPublicId.trim() === '' ? null : state.operatorPublicId.trim(),
    }

    try {
      const response = await mutation.mutateAsync(body)

      if (!mountedRef.current) {
        mutation.reset()

        return
      }

      dispatch({ type: 'set-created-payload', payload: response.payload })
      toast.success(t('wizard.toast.delegateCreated'))
    } catch (err) {
      if (!mountedRef.current) return
      const msg = err instanceof Error ? err.message : t('wizard.toast.failedToCreate')

      toast.error(msg)
    }
  }

  const modalOnClose = mutation.isPending ? noop : handleClose

  return (
    <Modal open={open} onClose={modalOnClose} title={t('wizard.title')} size='lg'>
      <div className='space-y-4'>
        <StepIndicator step={state.step} />

        {state.step === 'identity' && (
          <IdentityStep
            label={state.label}
            onChange={value => dispatch({ type: 'set-label', value })}
            onNext={advanceFromIdentity}
            onCancel={handleClose}
            readOnly={readOnly}
          />
        )}

        {state.step === 'scope-and-caps' && (
          <ScopeAndCapsStep
            operatorPublicId={state.operatorPublicId}
            caps={state.caps}
            capsError={state.capsError}
            onOperatorChange={value => dispatch({ type: 'set-operator', value })}
            onCapChange={(key, value) => dispatch({ type: 'set-cap', key, value })}
            onBack={() => dispatch({ type: 'goto', step: 'identity' })}
            onNext={advanceToReview}
            readOnly={readOnly}
          />
        )}

        {state.step === 'review' && (
          <ReviewStep
            label={state.label}
            operatorPublicId={state.operatorPublicId}
            caps={state.caps}
            isPending={mutation.isPending}
            onBack={() => dispatch({ type: 'goto', step: 'scope-and-caps' })}
            onSubmit={handleSubmit}
            readOnly={readOnly}
          />
        )}

        {state.step === 'done' && state.createdPayload !== null && (
          <DoneStep payload={state.createdPayload} onClose={handleClose} />
        )}
      </div>
    </Modal>
  )
}

function StepIndicator({ step }: Readonly<{ step: WizardStep }>): React.ReactElement {
  const { t } = useTranslation('aiIntegration')
  const steps: { id: WizardStep; label: string }[] = [
    { id: 'identity', label: t('wizard.step1') },
    { id: 'scope-and-caps', label: t('wizard.step2') },
    { id: 'review', label: t('wizard.step3') },
  ]
  const currentIndex = steps.findIndex(s => s.id === step)

  const stepClass = (idx: number): string => {
    if (step === 'done') return 'text-muted-400'
    if (idx <= currentIndex) return 'font-semibold text-brand-600'

    return 'text-muted-500'
  }

  return (
    <ol className='flex gap-3 text-sm border-b border-dark-600 pb-2'>
      {steps.map((s, idx) => (
        <li key={s.id} className={stepClass(idx)}>
          {s.label}
        </li>
      ))}
      <li className={step === 'done' ? 'font-semibold text-gain-600' : 'text-muted-400'}>
        {t('wizard.stepDone')}
      </li>
    </ol>
  )
}

function IdentityStep({
  label,
  onChange,
  onNext,
  onCancel,
  readOnly,
}: Readonly<{
  label: string
  onChange: (v: string) => void
  onNext: () => void
  onCancel: () => void
  readOnly: boolean
}>): React.ReactElement {
  const { t } = useTranslation('aiIntegration')

  return (
    <div className='space-y-4'>
      <div>
        <label htmlFor='wizard-label' className='block text-sm font-medium mb-1'>
          {t('wizard.identity.labelField')}
        </label>
        <input
          id='wizard-label'
          type='text'
          value={label}
          onChange={e => onChange(e.target.value)}
          placeholder={t('wizard.identity.labelPlaceholder')}
          className='w-full px-3 py-2 rounded-lg border border-dark-600 bg-alpine-50 text-muted-900'
        />
        <p className='mt-1 text-xs text-muted-500'>
          {t('wizard.identity.labelHelpPrefix')}
          <code>ai-&lt;label&gt;</code>
          {t('wizard.identity.labelHelpSuffix')}
        </p>
      </div>
      <div className='flex justify-end gap-2'>
        <Button variant='secondary' onClick={onCancel}>
          {t('wizard.buttons.cancel')}
        </Button>
        <Button variant='primary' onClick={onNext} disabled={label.trim() === '' || readOnly}>
          {t('wizard.buttons.next')}
        </Button>
      </div>
    </div>
  )
}

function ScopeAndCapsStep({
  operatorPublicId,
  caps,
  capsError,
  onOperatorChange,
  onCapChange,
  onBack,
  onNext,
  readOnly,
}: Readonly<{
  operatorPublicId: string
  caps: CapsFormState
  capsError: string | null
  onOperatorChange: (v: string) => void
  onCapChange: (k: keyof CapsFormState, v: string) => void
  onBack: () => void
  onNext: () => void
  readOnly: boolean
}>): React.ReactElement {
  const { t } = useTranslation('aiIntegration')

  return (
    <div className='space-y-4'>
      <section className='space-y-2'>
        <h3 className='text-sm font-semibold text-muted-800'>{t('wizard.scope.heading')}</h3>
        <div>
          <label htmlFor='wizard-operator' className='block text-sm font-medium mb-1'>
            {t('wizard.scope.operatorLabel')}
          </label>
          <input
            id='wizard-operator'
            type='text'
            value={operatorPublicId}
            onChange={e => onOperatorChange(e.target.value)}
            placeholder={t('wizard.scope.operatorPlaceholder')}
            className='w-full px-3 py-2 rounded-lg border border-dark-600 bg-alpine-50 font-mono text-xs'
          />
        </div>
      </section>

      <section className='space-y-2'>
        <h3 className='text-sm font-semibold text-muted-800'>{t('wizard.caps.heading')}</h3>
        <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
          <div>
            <label htmlFor='cap-max-open' className='block text-sm mb-1'>
              {t('wizard.caps.maxOpenOrders')}
            </label>
            <input
              id='cap-max-open'
              type='number'
              min={0}
              value={caps.maxOpenOrders}
              onChange={e => onCapChange('maxOpenOrders', e.target.value)}
              placeholder={t('wizard.caps.default')}
              className='w-full px-3 py-2 rounded-lg border border-dark-600 bg-alpine-50'
            />
          </div>
          <div>
            <label htmlFor='cap-max-daily' className='block text-sm mb-1'>
              {t('wizard.caps.maxDailyNotionalUsd')}
            </label>
            <input
              id='cap-max-daily'
              type='number'
              min={0}
              value={caps.maxDailyNotionalUsd}
              onChange={e => onCapChange('maxDailyNotionalUsd', e.target.value)}
              placeholder={t('wizard.caps.default')}
              className='w-full px-3 py-2 rounded-lg border border-dark-600 bg-alpine-50'
            />
          </div>
          <div>
            <label htmlFor='cap-max-cancels' className='block text-sm mb-1'>
              {t('wizard.caps.maxCancelsPerMinute')}
            </label>
            <input
              id='cap-max-cancels'
              type='number'
              min={0}
              value={caps.maxCancelsPerMinute}
              onChange={e => onCapChange('maxCancelsPerMinute', e.target.value)}
              placeholder={t('wizard.caps.default')}
              className='w-full px-3 py-2 rounded-lg border border-dark-600 bg-alpine-50'
            />
          </div>
          <div>
            <label htmlFor='cap-per-instrument' className='block text-sm mb-1'>
              {t('wizard.caps.perInstrument')}
            </label>
            <input
              id='cap-per-instrument'
              type='text'
              value={caps.maxOrderQuantityPerInstrumentJson}
              onChange={e => onCapChange('maxOrderQuantityPerInstrumentJson', e.target.value)}
              placeholder={t('wizard.caps.perInstrumentPlaceholder')}
              className='w-full px-3 py-2 rounded-lg border border-dark-600 bg-alpine-50 font-mono text-xs'
            />
          </div>
        </div>
        {capsError !== null && (
          <p className='text-sm text-loss-700' role='alert'>
            {capsError}
          </p>
        )}
      </section>

      <div className='flex justify-between'>
        <Button variant='secondary' onClick={onBack}>
          {t('wizard.buttons.back')}
        </Button>
        <Button variant='primary' onClick={onNext} disabled={readOnly}>
          {t('wizard.buttons.next')}
        </Button>
      </div>
    </div>
  )
}

function ReviewStep({
  label,
  operatorPublicId,
  caps,
  isPending,
  onBack,
  onSubmit,
  readOnly,
}: Readonly<{
  label: string
  operatorPublicId: string
  caps: CapsFormState
  isPending: boolean
  onBack: () => void
  onSubmit: () => void
  readOnly: boolean
}>): React.ReactElement {
  const { t } = useTranslation('aiIntegration')
  const operatorDefault = t('wizard.review.operatorDefault')
  const defaultValue = t('wizard.review.defaultValue')
  const rows: [string, string][] = [
    [t('wizard.review.rowLabel'), label],
    [t('wizard.review.rowOperator'), operatorPublicId.trim() || operatorDefault],
    [t('wizard.review.rowMaxOpenOrders'), caps.maxOpenOrders.trim() || defaultValue],
    [t('wizard.review.rowMaxDailyNotional'), caps.maxDailyNotionalUsd.trim() || defaultValue],
    [t('wizard.review.rowMaxCancelsPerMinute'), caps.maxCancelsPerMinute.trim() || defaultValue],
    [
      t('wizard.review.rowPerInstrument'),
      caps.maxOrderQuantityPerInstrumentJson.trim() || defaultValue,
    ],
  ]

  return (
    <div className='space-y-4'>
      <h3 className='text-sm font-semibold text-muted-800'>{t('wizard.review.heading')}</h3>
      <table className='w-full text-sm'>
        <tbody className='divide-y divide-dark-600'>
          {rows.map(([k, v]) => (
            <tr key={k}>
              <th scope='row' className='text-left py-2 pr-4 font-medium text-muted-600'>
                {k}
              </th>
              <td className='py-2 font-mono text-xs'>{v}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className='flex justify-between'>
        <Button variant='secondary' onClick={onBack} disabled={isPending}>
          {t('wizard.buttons.back')}
        </Button>
        <Button
          variant='primary'
          onClick={onSubmit}
          disabled={readOnly || isPending}
          loading={isPending}
        >
          {t('wizard.buttons.createDelegate')}
        </Button>
      </div>
    </div>
  )
}

function DoneStep({
  payload,
  onClose,
}: Readonly<{
  payload: DelegateCreatedPayload
  onClose: () => void
}>): React.ReactElement {
  const { t } = useTranslation('aiIntegration')

  return (
    <div className='space-y-4'>
      <ConfigSnippetGenerator payload={payload} />
      <div className='flex justify-end'>
        <Button variant='primary' onClick={onClose}>
          {t('wizard.buttons.iSavedClose')}
        </Button>
      </div>
    </div>
  )
}
