import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Loader2, ShieldAlert, ShieldCheck } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '../../components/ui'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import {
  approveConsent,
  classifyConsentError,
  denyConsent,
  fetchConsent,
  isAllowedScope,
  scopesApprovable,
  type ConsentDetails,
  type ConsentOperator,
  type ConsentErrorKind,
} from './consentApi'
import { releaseConsentRequest, useConsentFlow } from './consentRequest'

type TerminalKind = Exclude<ConsentErrorKind, 'replacement_required' | 'unknown'> | 'expired'

type PageState =
  | { status: 'loading' }
  | { status: 'loadFailed' }
  | { status: 'ready'; details: ConsentDetails; deadline: number }
  | { status: 'failed'; kind: TerminalKind }
  | { status: 'redirecting' }

const SCOPE_LABEL_KEYS = {
  'snapper.read': 'consent.scopes.snapperRead',
  offline_access: 'consent.scopes.offlineAccess',
} as const

const ERROR_KEYS = {
  invalid_request: 'invalidRequest',
  expired: 'expired',
  access_denied: 'accessDenied',
  disabled: 'disabled',
} as const satisfies Readonly<Record<TerminalKind, string>>

const isTerminal = (
  kind: ConsentErrorKind
): kind is Exclude<ConsentErrorKind, 'replacement_required' | 'unknown'> =>
  kind !== 'replacement_required' && kind !== 'unknown'

const initialOperator = (details: ConsentDetails): string | null =>
  details.operators.length === 1 ? (details.operators.at(0) as ConsentOperator).public_id : null

interface OAuthConsentPageProps {
  navigate: (url: string) => void
}

export function OAuthConsentPage({
  navigate,
}: Readonly<OAuthConsentPageProps>): React.ReactElement {
  const flow = useConsentFlow()

  return <ConsentFlowView key={flow.generation} request={flow.request} navigate={navigate} />
}

interface ConsentFlowViewProps {
  request: string | null
  navigate: (url: string) => void
}

function ConsentFlowView({
  request,
  navigate,
}: Readonly<ConsentFlowViewProps>): React.ReactElement {
  const [state, setState] = useState<PageState>(() =>
    request === null ? { status: 'failed', kind: 'invalid_request' } : { status: 'loading' }
  )
  const [attempt, setAttempt] = useState(0)
  const submittingRef = useRef(false)
  const expiredDuringSubmitRef = useRef(false)

  useEffect(() => {
    if (request === null) return
    let active = true

    fetchConsent(request).then(
      details => {
        if (active) {
          setState({ status: 'ready', details, deadline: Date.now() + details.expires_in * 1_000 })
        }
      },
      (error: unknown) => {
        if (!active) return
        const kind = classifyConsentError(error)

        setState(isTerminal(kind) ? { status: 'failed', kind } : { status: 'loadFailed' })
      }
    )

    return () => {
      active = false
    }
  }, [request, attempt])

  const retry = useCallback((): void => {
    setState({ status: 'loading' })
    setAttempt(current => current + 1)
  }, [])

  const terminal = state.status === 'failed' || state.status === 'redirecting'

  useEffect(() => {
    if (terminal) releaseConsentRequest()
  }, [terminal])

  const deadline = state.status === 'ready' ? state.deadline : null

  useEffect(() => {
    if (deadline === null) return
    const timer = setTimeout(
      () => {
        if (submittingRef.current) {
          expiredDuringSubmitRef.current = true
        } else {
          setState({ status: 'failed', kind: 'expired' })
        }
      },
      Math.max(0, deadline - Date.now())
    )

    return () => clearTimeout(timer)
  }, [deadline])

  const redirect = useCallback(
    (url: string): void => {
      setState({ status: 'redirecting' })
      navigate(url)
    },
    [navigate]
  )

  const fail = useCallback((kind: TerminalKind): void => setState({ status: 'failed', kind }), [])

  const startSubmit = useCallback((): void => {
    submittingRef.current = true
  }, [])

  const settleSubmit = useCallback((): boolean => {
    submittingRef.current = false
    if (!expiredDuringSubmitRef.current) return false
    setState({ status: 'failed', kind: 'expired' })

    return true
  }, [])

  return (
    <div className='min-h-screen flex items-center justify-center bg-alpine-100 dark:bg-dark-900 px-4 py-8'>
      <main className='w-full max-w-lg rounded-2xl border border-dark-600 bg-alpine-50 p-6 shadow-sm'>
        <ConsentBody
          state={state}
          request={request}
          lifecycle={{
            onRedirect: redirect,
            onFail: fail,
            onRetry: retry,
            onSubmitStart: startSubmit,
            onSubmitSettled: settleSubmit,
          }}
        />
      </main>
    </div>
  )
}

interface FlowLifecycle {
  onRedirect: (url: string) => void
  onFail: (kind: TerminalKind) => void
  onRetry: () => void
  onSubmitStart: () => void
  onSubmitSettled: () => boolean
}

interface ConsentBodyProps {
  state: PageState
  request: string | null
  lifecycle: FlowLifecycle
}

function ConsentBody({
  state,
  request,
  lifecycle,
}: Readonly<ConsentBodyProps>): React.ReactElement {
  const { t } = useTranslation('aiIntegration')

  if (state.status === 'loading') return <Pending label={t('consent.loading')} />

  if (state.status === 'redirecting') return <Pending label={t('consent.redirecting')} />

  if (state.status === 'failed') return <FailurePanel kind={state.kind} />

  if (state.status === 'loadFailed') return <LoadFailedPanel onRetry={lifecycle.onRetry} />

  return <ConsentForm details={state.details} request={request as string} lifecycle={lifecycle} />
}

function Pending({ label }: Readonly<{ label: string }>): React.ReactElement {
  return (
    <output className='flex items-center justify-center gap-2 py-8 text-muted-500'>
      <Loader2 className='h-5 w-5 animate-spin' aria-hidden='true' />
      <span>{label}</span>
    </output>
  )
}

function FailurePanel({ kind }: Readonly<{ kind: TerminalKind }>): React.ReactElement {
  const { t } = useTranslation('aiIntegration')
  const key = ERROR_KEYS[kind]

  return (
    <section role='alert' className='flex items-start gap-3' data-testid='oauth-consent-error'>
      <ShieldAlert className='mt-0.5 h-5 w-5 shrink-0 text-warning-600' aria-hidden='true' />
      <div>
        <h1 className='mb-1 text-lg font-semibold text-alpine-900'>
          {t(`consent.errors.${key}.title`)}
        </h1>
        <p className='text-sm text-muted-600'>{t(`consent.errors.${key}.message`)}</p>
      </div>
    </section>
  )
}

function LoadFailedPanel({ onRetry }: Readonly<{ onRetry: () => void }>): React.ReactElement {
  const { t } = useTranslation('aiIntegration')
  const { t: tCommon } = useTranslation('common')

  return (
    <section className='space-y-4' data-testid='oauth-consent-load-failed'>
      <div role='alert' className='flex items-start gap-3'>
        <ShieldAlert className='mt-0.5 h-5 w-5 shrink-0 text-warning-600' aria-hidden='true' />
        <div>
          <h1 className='mb-1 text-lg font-semibold text-alpine-900'>
            {t('consent.errors.unknown.title')}
          </h1>
          <p className='text-sm text-muted-600'>{t('consent.errors.unknown.message')}</p>
        </div>
      </div>
      <div className='flex justify-end'>
        <Button onClick={onRetry}>{tCommon('retry')}</Button>
      </div>
    </section>
  )
}

interface ConsentFormProps {
  details: ConsentDetails
  request: string
  lifecycle: FlowLifecycle
}

function ConsentForm({
  details,
  request,
  lifecycle,
}: Readonly<ConsentFormProps>): React.ReactElement {
  const { t } = useTranslation('aiIntegration')
  const [operatorPublicId, setOperatorPublicId] = useState<string | null>(() =>
    initialOperator(details)
  )
  const [submitting, setSubmitting] = useState(false)
  const [confirmingReplacement, setConfirmingReplacement] = useState(false)
  const [submitFailed, setSubmitFailed] = useState(false)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true

    return () => {
      mountedRef.current = false
    }
  }, [])

  const approvable = details.read_only && scopesApprovable(details.scopes)
  const operatorChosen = details.operators.length === 0 || operatorPublicId !== null
  const operatorForRequest = details.operators.length === 0 ? null : operatorPublicId

  const submit = async (decide: () => Promise<string>): Promise<void> => {
    setSubmitting(true)
    setSubmitFailed(false)
    lifecycle.onSubmitStart()

    try {
      const target = await decide()

      if (mountedRef.current) lifecycle.onRedirect(target)
    } catch (error) {
      if (!mountedRef.current) return
      const kind = classifyConsentError(error)

      if (isTerminal(kind)) {
        lifecycle.onFail(kind)

        return
      }

      if (lifecycle.onSubmitSettled()) return
      setSubmitting(false)

      if (kind === 'replacement_required') {
        setConfirmingReplacement(true)
      } else {
        setSubmitFailed(true)
      }
    }
  }

  const approve = (replaceExistingGrant: boolean): Promise<void> =>
    submit(() =>
      approveConsent({ request, operatorPublicId: operatorForRequest, replaceExistingGrant })
    )

  const deny = (): Promise<void> => submit(() => denyConsent(request, operatorForRequest))

  return (
    <div className='space-y-5'>
      <header className='space-y-2'>
        <h1 className='text-xl font-semibold text-alpine-900'>{t('consent.title')}</h1>
        <p className='text-sm text-muted-600'>
          {t('consent.intro', { client: details.client_name })}
        </p>
      </header>
      <p
        className='flex items-start gap-2 rounded-lg border border-accent-400/40 bg-accent-400/10 px-3 py-2 text-sm text-alpine-900'
        data-testid='oauth-consent-read-only'
      >
        <ShieldCheck className='mt-0.5 h-4 w-4 shrink-0' aria-hidden='true' />
        <span>{t('consent.readOnlyGuarantee')}</span>
      </p>
      <section className='space-y-2'>
        <h2 className='text-sm font-semibold text-alpine-900'>{t('consent.scopesHeading')}</h2>
        <ul className='space-y-1 text-sm text-muted-600'>
          {details.scopes.map(scope => (
            <li key={scope} data-testid='oauth-consent-scope'>
              {isAllowedScope(scope)
                ? t(SCOPE_LABEL_KEYS[scope])
                : t('consent.unrecognizedScope', { scope })}
            </li>
          ))}
        </ul>
        {!approvable && (
          <p role='alert' className='text-sm text-warning-600'>
            {t('consent.notApprovable')}
          </p>
        )}
      </section>
      <dl className='grid gap-1 text-sm sm:grid-cols-[8rem_1fr]'>
        <dt className='text-muted-500'>{t('consent.resourceLabel')}</dt>
        <dd className='break-all font-mono text-alpine-900'>{details.resource}</dd>
      </dl>
      {details.operators.length > 1 && (
        <label className='block space-y-1 text-sm'>
          <span className='text-muted-500'>{t('consent.operatorLabel')}</span>
          <select
            id='oauth-consent-operator'
            name='operator_public_id'
            className='input w-full'
            value={operatorPublicId ?? ''}
            onChange={event =>
              setOperatorPublicId(event.target.value === '' ? null : event.target.value)
            }
          >
            <option value=''>{t('consent.operatorPlaceholder')}</option>
            {details.operators.map(operator => (
              <option key={operator.public_id} value={operator.public_id}>
                {operator.name}
              </option>
            ))}
          </select>
        </label>
      )}
      {details.operators.length === 1 && (
        <dl className='grid gap-1 text-sm sm:grid-cols-[8rem_1fr]'>
          <dt className='text-muted-500'>{t('consent.operatorLabel')}</dt>
          <dd className='text-alpine-900'>{(details.operators.at(0) as ConsentOperator).name}</dd>
        </dl>
      )}
      {submitFailed && (
        <p role='alert' className='text-sm text-loss-600'>
          {t('consent.submitFailed')}
        </p>
      )}
      <div className='flex flex-wrap justify-end gap-3'>
        <Button
          variant='secondary'
          disabled={!operatorChosen || submitting}
          onClick={() => void deny()}
        >
          {t('consent.deny')}
        </Button>
        <Button
          disabled={!approvable || !operatorChosen || submitting}
          loading={submitting}
          onClick={() => void approve(false)}
        >
          {t('consent.approve')}
        </Button>
      </div>
      <ConfirmDialog
        open={confirmingReplacement}
        title={t('consent.replace.title')}
        message={t('consent.replace.message', { client: details.client_name })}
        confirmText={t('consent.replace.confirm')}
        cancelText={t('consent.replace.cancel')}
        variant='danger'
        onConfirm={() => {
          setConfirmingReplacement(false)
          void approve(true)
        }}
        onCancel={() => setConfirmingReplacement(false)}
      />
    </div>
  )
}
