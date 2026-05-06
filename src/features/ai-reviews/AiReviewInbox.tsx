import React, { useMemo, useState } from 'react'
import {
  Activity,
  Check,
  Inbox as InboxIcon,
  Loader2,
  MailOpen,
  ShieldAlert,
  X,
} from 'lucide-react'
import { EmptyState } from '../../components/ui'
import { useAuth } from '../../stores/auth'
import {
  useAiReviewActivity,
  usePendingAiReviews,
  useSubmitAiReviewDecision,
} from '../../hooks/queries'
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
  const { user } = useAuth()
  const isDelegate = user?.role === 'ai_delegate'
  const pendingQuery = usePendingAiReviews()
  const activity = useAiReviewActivity()
  const recent = useMemo(() => [...activity].slice(-ACTIVITY_DISPLAY_LIMIT).reverse(), [activity])

  if (!isDelegate) {
    return (
      <div className='p-6'>
        <div className='flex items-start gap-3 p-4 rounded-lg bg-warn-50 border border-warn-200 text-warn-800'>
          <ShieldAlert className='w-5 h-5 shrink-0 mt-0.5' />
          <div>
            <h2 className='font-semibold mb-1'>Reserved for AI delegates</h2>
            <p className='text-sm'>
              This inbox surfaces CONSULT reviews routed to an AI delegate principal. Sign in with
              an AI delegate account to see pending reviews and the live activity stream. Your
              current role is <span className='font-semibold'>{user?.role ?? 'unknown'}</span>.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className='p-6 space-y-6'>
      <header>
        <h1 className='text-2xl font-bold'>AI Review Inbox</h1>
        <p className='text-sm text-muted-500'>
          Pending CONSULT reviews routed to this delegate plus the live event stream.
        </p>
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

function PendingReviewRow({ item }: Readonly<{ item: PendingReviewItem }>): React.ReactElement {
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
      <td className='px-4 py-2 font-mono text-xs text-alpine-900'>
        {item.instrument ?? <span className='text-muted-500'>—</span>}
        {side !== null && (
          <span className='ml-2 rounded bg-brand-50 px-1.5 py-0.5 text-[10px] uppercase text-brand-700'>
            {side}
          </span>
        )}
      </td>
      <td className='px-4 py-2 max-w-md text-xs text-alpine-700'>
        {thesis === null ? (
          <span className='text-muted-500'>—</span>
        ) : (
          <span title={thesis}>{thesis.length > 120 ? `${thesis.slice(0, 120)}…` : thesis}</span>
        )}
      </td>
      <td className='px-4 py-2'>{item.status}</td>
      <td className='px-4 py-2 text-muted-600'>{new Date(item.deadline).toLocaleString()}</td>
      <td className='px-4 py-2'>
        <div className='flex flex-col gap-2 min-w-[12rem]'>
          <input
            type='text'
            placeholder='Rationale (optional)'
            value={rationale}
            onChange={event => setRationale(event.target.value)}
            disabled={isSubmitting}
            aria-label={`Rationale for review ${item.review_public_id}`}
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
              Approve
            </button>
            <button
              type='button'
              onClick={() => submitDecision('reject')}
              disabled={isSubmitting}
              data-testid={`reject-${item.review_public_id}`}
              className='inline-flex items-center gap-1 rounded border border-loss-500 px-2 py-1 text-xs font-medium text-loss-700 hover:bg-loss-50 disabled:cursor-not-allowed disabled:opacity-50'
            >
              <X size={12} />
              Reject
            </button>
          </div>
          {submit.isError && (
            <span className='text-[10px] text-loss-700' role='alert'>
              Submit failed: {submit.error.message}
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
  let content: React.ReactNode

  if (loading) {
    content = (
      <div className='flex items-center gap-2 text-muted-500 text-sm'>
        <Loader2 className='w-4 h-4 animate-spin' />
        Loading pending reviews…
      </div>
    )
  } else if (error !== null) {
    content = (
      <div className='p-3 rounded-lg bg-loss-50 border border-loss-200 text-loss-800 text-sm'>
        Failed to load pending reviews: {error.message}
      </div>
    )
  } else if (items.length === 0) {
    content = (
      <EmptyState
        icon={<MailOpen className='w-5 h-5' />}
        title='No pending reviews'
        message='New CONSULT requests routed to this delegate will appear here.'
      />
    )
  } else {
    content = (
      <div className='overflow-x-auto border border-dark-600 rounded-lg'>
        <table className='min-w-full text-sm'>
          <thead className='bg-dark-700 text-muted-700 text-left'>
            <tr>
              <th className='px-4 py-2 font-semibold'>Instrument</th>
              <th className='px-4 py-2 font-semibold'>Thesis</th>
              <th className='px-4 py-2 font-semibold'>Status</th>
              <th className='px-4 py-2 font-semibold'>Deadline</th>
              <th className='px-4 py-2 font-semibold'>Decision</th>
            </tr>
          </thead>
          <tbody className='divide-y divide-dark-600'>
            {items.map(item => (
              <PendingReviewRow key={item.review_public_id} item={item} />
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <section>
      <div className='flex items-center gap-2 mb-3'>
        <InboxIcon className='w-4 h-4 text-brand-600' />
        <h2 className='text-sm font-semibold text-muted-800'>Pending reviews</h2>
      </div>
      {content}
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
  let summary = 'No frames received'

  if (totalBuffered > 0) {
    summary = `Showing ${frames.length} of ${totalBuffered} buffered`
  }

  let content: React.ReactNode

  if (frames.length === 0) {
    content = (
      <EmptyState
        icon={<Activity className='w-5 h-5' />}
        title='No activity yet'
        message='AI review request, decision, and caps-violation frames will stream in here.'
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
          <h2 className='text-sm font-semibold text-muted-800'>Recent activity</h2>
        </div>
        <span className='text-xs text-muted-500'>{summary}</span>
      </div>
      {content}
    </section>
  )
}
