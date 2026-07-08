import React, { useMemo, useState } from 'react'
import { Activity, Check, Inbox as InboxIcon, Loader2, MailOpen, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { EmptyState } from '../../components/ui'
import { useAuth } from '../../stores/auth'
import { formatDateTime } from '../../lib/dateFormat'
import type { AppLocale } from '../../i18n/types'
import type { AdminAiReviewItem } from '../../types/api'
import {
  useAiReviewActivity,
  useAiReviews,
  usePendingAiReviews,
  useSubmitAiReviewDecision,
} from '../../hooks/queries/ai-reviews'
import { AiReviewActivityRow } from './AiReviewActivityRow'

const ACTIVITY_DISPLAY_LIMIT = 50

/**
 * Delegate-facing AI Review inbox.
 *
 * Two surfaces stitched together:
 *
 *   1. **Pending list** — REST poll of ``GET /api/ai-reviews/pending``
 *      (5s + refetch-on-focus); the snapshot of every CONSULT review
 *      currently waiting on this delegate's decision.
 *   2. **Activity stream** — WS-driven view of the last
 *      ``ACTIVITY_DISPLAY_LIMIT`` frames maintained by
 *      :class:`WSDispatcher`. Reverses chronological order so the
 *      most recent event is at the top.
 *
 * Non-delegate roles are routed here by the resource gate but the
 * REST returns 422 + the WS scope filter drops every ai_reviews
 * frame, so the page renders a role-aware notice instead.
 */
export function AiReviewInbox(): React.ReactElement {
  const { t } = useTranslation('aiReviews')
  const { user } = useAuth()
  const isDelegate = user?.role === 'ai_delegate'
  const pendingQuery = usePendingAiReviews()
  const activity = useAiReviewActivity()
  const recent = useMemo(() => [...activity].slice(-ACTIVITY_DISPLAY_LIMIT).reverse(), [activity])

  if (!isDelegate) {
    return <OperatorDecisionsView />
  }

  return (
    <div className='p-6 space-y-6'>
      <header>
        <h1 className='text-2xl font-bold'>{t('page.title')}</h1>
        <p className='text-sm text-muted-500'>{t('page.subtitle')}</p>
      </header>

      <PendingReviewsSection
        loading={pendingQuery.isLoading}
        error={pendingQuery.error}
        items={pendingQuery.data?.items ?? []}
      />

      <ActivitySection frames={recent} totalBuffered={activity.length} />
    </div>
  )
}

interface PendingReviewItem {
  review_public_id: string
  selected_delegate_public_id: string
  wallet_public_id: string
  dispatch_version: number
  status: string
  deadline: string | Date
  fanout_after: string | Date
  instrument?: string | null | undefined
  signal_envelope?: Record<string, unknown> | null | undefined
}

const truncate120 = (text: string): string => (text.length > 120 ? `${text.slice(0, 120)}…` : text)

function InstrumentCell({
  instrument,
  badge,
}: Readonly<{ instrument: string | null; badge?: React.ReactNode }>): React.ReactElement {
  return (
    <td className='px-4 py-2 font-mono text-xs text-alpine-900'>
      {instrument ?? <span className='text-muted-500'>—</span>}
      {badge}
    </td>
  )
}

function TruncatedCell({ text }: Readonly<{ text: string | null }>): React.ReactElement {
  return (
    <td className='px-4 py-2 max-w-md text-xs text-alpine-700'>
      {text === null || text.length === 0 ? (
        <span className='text-muted-500'>—</span>
      ) : (
        <span title={text}>{truncate120(text)}</span>
      )}
    </td>
  )
}

function ReviewSectionState({
  loading,
  error,
  isEmpty,
  loadingText,
  errorText,
  emptyIcon,
  emptyTitle,
  emptyMessage,
  children,
}: Readonly<{
  loading: boolean
  error: Error | null
  isEmpty: boolean
  loadingText: string
  errorText: string
  emptyIcon: React.ReactNode
  emptyTitle: string
  emptyMessage: string
  children: React.ReactNode
}>): React.ReactElement {
  if (loading) {
    return (
      <div className='flex items-center gap-2 text-muted-500 text-sm'>
        <Loader2 className='w-4 h-4 animate-spin' />
        {loadingText}
      </div>
    )
  }

  if (error !== null) {
    return (
      <div className='p-3 rounded-lg bg-loss-50 border border-loss-200 text-loss-800 text-sm'>
        {errorText}
      </div>
    )
  }

  if (isEmpty) {
    return <EmptyState icon={emptyIcon} title={emptyTitle} message={emptyMessage} />
  }

  return <>{children}</>
}

function ReviewTable({
  headers,
  children,
}: Readonly<{ headers: readonly string[]; children: React.ReactNode }>): React.ReactElement {
  return (
    <div className='overflow-x-auto border border-dark-600 rounded-lg'>
      <table className='min-w-full text-sm'>
        <thead className='bg-dark-700 text-muted-700 text-left'>
          <tr>
            {headers.map(header => (
              <th key={header} className='px-4 py-2 font-semibold'>
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className='divide-y divide-dark-600'>{children}</tbody>
      </table>
    </div>
  )
}

function PendingReviewRow({ item }: Readonly<{ item: PendingReviewItem }>): React.ReactElement {
  const { t, i18n } = useTranslation('aiReviews')
  const [rationale, setRationale] = useState('')
  const submit = useSubmitAiReviewDecision()
  const thesis = (item.signal_envelope?.['thesis'] ?? null) as string | null
  const side = (item.signal_envelope?.['side'] ?? null) as string | null
  const isSubmitting = submit.isPending

  const submitDecision = (decision: 'approve' | 'reject'): void => {
    submit.mutate({
      reviewPublicId: item.review_public_id,
      decision,
      ...(rationale.length > 0 ? { rationale } : {}),
    })
  }

  return (
    <tr data-testid={`pending-review-row-${item.review_public_id}`}>
      <InstrumentCell
        instrument={item.instrument ?? null}
        badge={
          side !== null && (
            <span className='ml-2 rounded bg-brand-50 px-1.5 py-0.5 text-[10px] uppercase text-brand-700'>
              {side}
            </span>
          )
        }
      />
      <TruncatedCell text={thesis} />
      <td className='px-4 py-2'>{item.status}</td>
      <td className='px-4 py-2 text-muted-600'>
        {formatDateTime(new Date(item.deadline), i18n.language as AppLocale)}
      </td>
      <td className='px-4 py-2'>
        <div className='flex flex-col gap-2 min-w-[12rem]'>
          <input
            type='text'
            placeholder={t('pending.rationalePlaceholder')}
            value={rationale}
            onChange={event => setRationale(event.target.value)}
            disabled={isSubmitting}
            aria-label={t('pending.rationaleAriaLabel', { reviewId: item.review_public_id })}
            className='rounded border border-dark-600 bg-alpine-50 px-2 py-1 text-xs text-alpine-900 placeholder-muted-500 focus:border-brand-500 focus:outline-hidden focus:ring-1 focus:ring-brand-500 disabled:opacity-50'
          />
          <div className='flex gap-2'>
            <button
              type='button'
              onClick={() => submitDecision('approve')}
              disabled={isSubmitting}
              data-testid={`approve-${item.review_public_id}`}
              className='inline-flex items-center gap-1 rounded border border-gain-500 px-2 py-1 text-xs font-medium text-gain-700 hover:bg-gain-50 disabled:cursor-not-allowed disabled:opacity-50'
            >
              <Check size={12} />
              {t('pending.approve')}
            </button>
            <button
              type='button'
              onClick={() => submitDecision('reject')}
              disabled={isSubmitting}
              data-testid={`reject-${item.review_public_id}`}
              className='inline-flex items-center gap-1 rounded border border-loss-500 px-2 py-1 text-xs font-medium text-loss-700 hover:bg-loss-50 disabled:cursor-not-allowed disabled:opacity-50'
            >
              <X size={12} />
              {t('pending.reject')}
            </button>
          </div>
          {submit.isError && (
            <span className='text-[10px] text-loss-700' role='alert'>
              {t('pending.submitError', { message: submit.error.message })}
            </span>
          )}
        </div>
      </td>
    </tr>
  )
}

function PendingReviewsSection({
  loading,
  error,
  items,
}: Readonly<{
  loading: boolean
  error: Error | null
  items: ReadonlyArray<{
    review_public_id: string
    selected_delegate_public_id: string
    wallet_public_id: string
    dispatch_version: number
    status: string
    deadline: string | Date
    fanout_after: string | Date
    instrument?: string | null | undefined
    signal_envelope?: Record<string, unknown> | null | undefined
  }>
}>): React.ReactElement {
  const { t } = useTranslation('aiReviews')
  const errorText = error !== null ? t('pending.loadError', { message: error.message }) : ''

  return (
    <section>
      <div className='flex items-center gap-2 mb-3'>
        <InboxIcon className='w-4 h-4 text-brand-600' />
        <h2 className='text-sm font-semibold text-muted-800'>{t('pending.title')}</h2>
      </div>
      <ReviewSectionState
        loading={loading}
        error={error}
        isEmpty={items.length === 0}
        loadingText={t('pending.loading')}
        errorText={errorText}
        emptyIcon={<MailOpen className='w-5 h-5' />}
        emptyTitle={t('pending.emptyTitle')}
        emptyMessage={t('pending.emptyMessage')}
      >
        <ReviewTable
          headers={[
            t('pending.columns.instrument'),
            t('pending.columns.thesis'),
            t('pending.columns.status'),
            t('pending.columns.deadline'),
            t('pending.columns.decision'),
          ]}
        >
          {items.map(item => (
            <PendingReviewRow key={item.review_public_id} item={item} />
          ))}
        </ReviewTable>
      </ReviewSectionState>
    </section>
  )
}

function ActivitySection({
  frames,
  totalBuffered,
}: Readonly<{
  frames: ReadonlyArray<Parameters<typeof AiReviewActivityRow>[0]['frame']>
  totalBuffered: number
}>): React.ReactElement {
  const { t } = useTranslation('aiReviews')
  let summary = t('activity.summaryEmpty')

  if (totalBuffered > 0) {
    summary = t('activity.summaryCount', { shown: frames.length, total: totalBuffered })
  }

  let content: React.ReactNode

  if (frames.length === 0) {
    content = (
      <EmptyState
        icon={<Activity className='w-5 h-5' />}
        title={t('activity.emptyTitle')}
        message={t('activity.emptyMessage')}
      />
    )
  } else {
    content = (
      <ul
        data-testid='ai-review-activity-list'
        className='border border-dark-600 rounded-lg bg-alpine-50 dark:bg-dark-800'
      >
        {frames.map(frame => (
          <AiReviewActivityRow
            key={`${frame.type}|${frame.review_public_id}|${frame.dispatch_version}`}
            frame={frame}
          />
        ))}
      </ul>
    )
  }

  return (
    <section>
      <div className='flex items-center justify-between mb-3'>
        <div className='flex items-center gap-2'>
          <Activity className='w-4 h-4 text-brand-600' />
          <h2 className='text-sm font-semibold text-muted-800'>{t('activity.title')}</h2>
        </div>
        <span className='text-xs text-muted-500'>{summary}</span>
      </div>
      {content}
    </section>
  )
}

/**
 * Operator/admin read-only AI decisions view.
 *
 * Non-delegate roles are routed to the AI Reviews screen by the resource
 * gate but the delegate inbox (pending list + WS activity) is empty for
 * them (`GET /api/ai-reviews/pending` 422s; the WS scope filter drops
 * every ai_reviews frame). This surface answers "what did the AI decide?"
 * by polling the operator-scoped `GET /api/ai-reviews`, which returns
 * terminal decided rows with the decision + rationale.
 */
function OperatorDecisionsView(): React.ReactElement {
  const { t, i18n } = useTranslation('aiReviews')
  const reviewsQuery = useAiReviews()
  const items = reviewsQuery.data?.items ?? []
  const error = reviewsQuery.error
  const errorText = error !== null ? t('decisions.loadError', { message: error.message }) : ''

  return (
    <div className='p-6 space-y-6'>
      <header>
        <h1 className='text-2xl font-bold'>{t('decisions.title')}</h1>
        <p className='text-sm text-muted-500'>{t('decisions.subtitle')}</p>
      </header>
      <section>
        <div className='flex items-center gap-2 mb-3'>
          <InboxIcon className='w-4 h-4 text-brand-600' />
          <h2 className='text-sm font-semibold text-muted-800'>{t('decisions.sectionTitle')}</h2>
        </div>
        <ReviewSectionState
          loading={reviewsQuery.isLoading}
          error={error}
          isEmpty={items.length === 0}
          loadingText={t('decisions.loading')}
          errorText={errorText}
          emptyIcon={<MailOpen className='w-5 h-5' />}
          emptyTitle={t('decisions.emptyTitle')}
          emptyMessage={t('decisions.emptyMessage')}
        >
          <ReviewTable
            headers={[
              t('pending.columns.instrument'),
              t('pending.columns.status'),
              t('pending.columns.decision'),
              t('decisions.columns.rationale'),
              t('decisions.columns.decidedAt'),
            ]}
          >
            {items.map(item => (
              <AiDecisionRow key={item.review_public_id} item={item} locale={i18n.language} />
            ))}
          </ReviewTable>
        </ReviewSectionState>
      </section>
    </div>
  )
}

function AiDecisionRow({
  item,
  locale,
}: Readonly<{ item: AdminAiReviewItem; locale: string }>): React.ReactElement {
  const { t } = useTranslation('aiReviews')
  const envelope = item.signal_envelope ?? {}
  const instrument = (envelope['instrument'] ?? envelope['symbol'] ?? null) as string | null
  const rationale = item.rationale

  return (
    <tr data-testid={`ai-decision-row-${item.review_public_id}`}>
      <InstrumentCell instrument={instrument} />
      <td className='px-4 py-2'>{item.status}</td>
      <td className='px-4 py-2'>
        {item.decision === null ? (
          <span className='text-muted-500'>{t('decisions.decisionPending')}</span>
        ) : (
          <span
            className={item.decision === 'approve' ? 'text-gain-700' : 'text-loss-700'}
            data-testid={`ai-decision-value-${item.review_public_id}`}
          >
            {item.decision === 'approve' ? t('pending.approve') : t('pending.reject')}
          </span>
        )}
      </td>
      <TruncatedCell text={rationale} />
      <td className='px-4 py-2 text-muted-600'>
        {item.resolved_at === null ? (
          <span className='text-muted-500'>—</span>
        ) : (
          formatDateTime(new Date(item.resolved_at), locale as AppLocale)
        )}
      </td>
    </tr>
  )
}
