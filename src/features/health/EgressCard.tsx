import React, { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'

import { useEgressHealth } from '../../hooks/queries/system'
import { formatNumber } from '../../lib/utils'

import type {
  EgressActiveReservationSnapshot,
  EgressConnectionSnapshot,
  EgressContainerSummary,
  EgressHealthData,
  EgressRouteStatusSnapshot,
} from '../../types/api'

const EMPTY_VALUE = '—'

type EgressPolicy = NonNullable<EgressHealthData['on_all_quarantined']>

function formatRelativeAgeSeconds(seconds: number, t: TFunction<'health', undefined>): string {
  const ageS = Math.max(0, seconds)

  if (ageS < 1) return t('relativeAge.justNow')
  if (ageS < 60) return t('relativeAge.seconds', { seconds: ageS.toFixed(0) })
  if (ageS < 3600) return t('relativeAge.minutes', { minutes: (ageS / 60).toFixed(1) })
  if (ageS < 86400) return t('relativeAge.hours', { hours: (ageS / 3600).toFixed(1) })

  return t('relativeAge.days', { days: (ageS / 86400).toFixed(1) })
}

function formatRelativeAgeFromTimestamp(
  timestamp: string,
  now: Date,
  t: TFunction<'health', undefined>
): string {
  return formatRelativeAgeSeconds((now.getTime() - new Date(timestamp).getTime()) / 1000, t)
}

function formatOptionalText(value: string | null | undefined): string {
  if (value === null || value === undefined || value.length === 0) return EMPTY_VALUE

  return value
}

interface SummaryCellProps {
  readonly label: string
  readonly value: string
  readonly tone?: 'neutral' | 'success' | 'warning'
}

const SUMMARY_TONE_CLASS_BY_TONE = {
  neutral: 'text-alpine-900',
  success: 'text-gain-700',
  warning: 'text-warning-700',
} satisfies Record<NonNullable<SummaryCellProps['tone']>, string>

const SummaryCell: React.FC<SummaryCellProps> = ({ label, value, tone = 'neutral' }) => (
  <div className='flex flex-col rounded-md border border-dark-600 bg-alpine-50 p-3'>
    <span className='text-xs uppercase tracking-wide text-muted-600'>{label}</span>
    <span className={`mt-1 text-lg font-semibold ${SUMMARY_TONE_CLASS_BY_TONE[tone]}`}>
      {value}
    </span>
  </div>
)

interface ReportingContainersProps {
  readonly containers: readonly EgressContainerSummary[] | undefined
}

const ReportingContainers: React.FC<ReportingContainersProps> = ({ containers }) => {
  const { t } = useTranslation('health')
  const items = containers ?? []

  return (
    <div className='space-y-2'>
      <h4 className='text-xs uppercase tracking-wide text-muted-600'>
        {t('egress.containers.title')}
      </h4>
      {items.length === 0 ? (
        <p className='text-xs text-muted-500'>{t('egress.none')}</p>
      ) : (
        <div className='flex flex-col gap-1'>
          {items.map(item => (
            <span key={item.container} className='font-mono text-xs text-alpine-900'>
              {t('egress.containers.item', {
                container: item.container,
                age: formatRelativeAgeSeconds(item.last_seen_age_seconds, t),
                routeCount: formatNumber(item.route_count),
              })}
              {item.stale && (
                <span className='ml-1 text-warning-700'>{t('egress.containers.stale')}</span>
              )}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

interface RouteStatusProps {
  readonly route: EgressRouteStatusSnapshot
}

const RouteStatus: React.FC<RouteStatusProps> = ({ route }) => {
  const { t } = useTranslation('health')

  if (!route.enabled) {
    return <span className='text-muted-600'>{t('egress.status.disabled')}</span>
  }

  if (route.quarantined) {
    if (route.quarantine_seconds_remaining === null) {
      return <span className='text-warning-700'>{t('egress.status.quarantined')}</span>
    }

    return (
      <span className='text-warning-700'>
        {t('egress.status.quarantinedSeconds', {
          seconds: Math.ceil(route.quarantine_seconds_remaining).toString(),
        })}
      </span>
    )
  }

  return <span className='text-gain-700'>{t('egress.status.active')}</span>
}

interface ReservationListProps {
  readonly reservations: readonly EgressActiveReservationSnapshot[] | undefined
}

const ReservationList: React.FC<ReservationListProps> = ({ reservations }) => {
  const { t } = useTranslation('health')
  const items = reservations ?? []

  if (items.length === 0) {
    return <span className='text-muted-500'>{t('egress.none')}</span>
  }

  return (
    <div className='flex flex-col gap-1'>
      {items.map(item => (
        <span
          key={`${item.exchange}:${item.traffic_class}:${item.container}`}
          className='font-mono text-xs text-alpine-900'
        >
          {t('egress.reservation', {
            exchange: item.exchange,
            trafficClass: t(`egress.trafficClass.${item.traffic_class}`),
            container: item.container,
          })}
        </span>
      ))}
    </div>
  )
}

interface ConnectionListProps {
  readonly connections: readonly EgressConnectionSnapshot[] | undefined
}

const ConnectionList: React.FC<ConnectionListProps> = ({ connections }) => {
  const { t } = useTranslation('health')
  const items = connections ?? []
  const now = new Date()

  if (items.length === 0) {
    return <span className='text-muted-500'>{t('egress.none')}</span>
  }

  return (
    <div className='flex flex-col gap-1'>
      {items.map(item => {
        const trafficClass = t(`egress.trafficClass.${item.traffic_class}`)
        const key = `${item.host}:${item.kind}:${item.exchange}:${item.traffic_class}:${item.container}:${item.count.toString()}:${item.last_seen_at ?? ''}`

        return (
          <span key={key} className='font-mono text-xs text-alpine-900'>
            {item.kind === 'ws'
              ? t('egress.connection.ws', {
                  host: item.host,
                  kind: t('egress.connection.kind.ws'),
                  exchange: item.exchange,
                  trafficClass,
                  count: formatNumber(item.count),
                  container: item.container,
                })
              : t('egress.connection.rest', {
                  host: item.host,
                  kind: t('egress.connection.kind.rest'),
                  exchange: item.exchange,
                  trafficClass,
                  lastSeen:
                    item.last_seen_at === null || item.last_seen_at === undefined
                      ? t('egress.connection.lastSeenUnknown')
                      : formatRelativeAgeFromTimestamp(item.last_seen_at, now, t),
                  container: item.container,
                })}
          </span>
        )
      })}
    </div>
  )
}

interface RouteRowProps {
  readonly route: EgressRouteStatusSnapshot
}

const RouteRow: React.FC<RouteRowProps> = ({ route }) => {
  const { t } = useTranslation('health')
  const allowedExchanges = route.allowed_exchanges ?? []

  return (
    <tr className='border-t border-dark-600'>
      <td className='px-3 py-2 font-mono text-xs text-alpine-900'>{route.id}</td>
      <td className='px-3 py-2 text-xs text-muted-600'>{t(`egress.kind.${route.kind}`)}</td>
      <td className='px-3 py-2 text-xs text-muted-600'>{formatOptionalText(route.region)}</td>
      <td className='px-3 py-2 font-mono text-xs text-alpine-900'>
        {formatOptionalText(route.exit_ip)}
      </td>
      <td className='px-3 py-2 text-xs text-muted-600'>{formatOptionalText(route.provider)}</td>
      <td className='px-3 py-2 text-right font-mono text-xs text-alpine-900'>
        {route.priority.toString()}
      </td>
      <td className='px-3 py-2 text-xs text-muted-600'>
        {allowedExchanges.length === 0 ? t('egress.anyExchange') : allowedExchanges.join(', ')}
      </td>
      <td className='px-3 py-2 text-xs'>
        <RouteStatus route={route} />
      </td>
      <td className='px-3 py-2 text-right font-mono text-xs text-alpine-900'>
        {formatNumber(route.in_use_count)}
      </td>
      <td className='px-3 py-2 text-xs'>
        <ReservationList reservations={route.active_reservations} />
      </td>
      <td className='px-3 py-2 text-xs'>
        <ConnectionList connections={route.connections} />
      </td>
    </tr>
  )
}

interface RoutesTableProps {
  readonly routes: readonly EgressRouteStatusSnapshot[]
}

const RoutesTable: React.FC<RoutesTableProps> = ({ routes }) => {
  const { t } = useTranslation('health')

  return (
    <div className='overflow-x-auto'>
      <table className='w-full border-collapse text-sm'>
        <thead>
          <tr className='bg-alpine-50 text-left text-xs uppercase tracking-wide text-muted-600'>
            <th className='px-3 py-2'>{t('egress.columns.id')}</th>
            <th className='px-3 py-2'>{t('egress.columns.kind')}</th>
            <th className='px-3 py-2'>{t('egress.columns.region')}</th>
            <th className='px-3 py-2'>{t('egress.columns.exitIp')}</th>
            <th className='px-3 py-2'>{t('egress.columns.provider')}</th>
            <th className='px-3 py-2 text-right'>{t('egress.columns.priority')}</th>
            <th className='px-3 py-2'>{t('egress.columns.allowedExchanges')}</th>
            <th className='px-3 py-2'>{t('egress.columns.status')}</th>
            <th className='px-3 py-2 text-right'>{t('egress.columns.inUse')}</th>
            <th className='px-3 py-2'>{t('egress.columns.reservations')}</th>
            <th className='px-3 py-2'>{t('egress.columns.connections')}</th>
          </tr>
        </thead>
        <tbody>
          {routes.map(route => (
            <RouteRow key={route.id} route={route} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

function formatPolicy(
  policy: EgressHealthData['on_all_quarantined'],
  labels: Readonly<Record<EgressPolicy, string>>
): string {
  if (policy === null || policy === undefined) return EMPTY_VALUE

  return labels[policy]
}

export const EgressCard: React.FC = () => {
  const { t } = useTranslation('health')
  const { data, isLoading, error } = useEgressHealth()
  const payload = data?.payload
  const routes = payload?.routes ?? []
  const policyLabels = {
    raise: t('egress.policy.raise'),
    wait: t('egress.policy.wait'),
  } satisfies Record<EgressPolicy, string>

  const errorMessage = useMemo(() => {
    if (!error) return null
    if (error instanceof Error) return error.message

    return t('egress.fallbackError')
  }, [error, t])

  return (
    <section className='space-y-3 rounded-lg border border-dark-600 bg-alpine-50 p-4'>
      <header className='flex items-center justify-between'>
        <h3 className='text-lg font-medium text-alpine-900'>{t('egress.title')}</h3>
        {payload && (
          <span className='text-xs text-muted-600'>
            {payload.enabled ? t('egress.enabled') : t('egress.disabled')}
          </span>
        )}
      </header>
      {isLoading && <p className='text-sm text-muted-600'>{t('egress.loading')}</p>}
      {errorMessage !== null && (
        <p className='text-sm text-loss-600'>
          {t('egress.unavailable', { message: errorMessage })}
        </p>
      )}
      {payload && (
        <>
          <div className='grid grid-cols-2 gap-3 lg:grid-cols-4'>
            <SummaryCell
              label={t('egress.summary.pool')}
              value={payload.enabled ? t('egress.enabled') : t('egress.disabled')}
              tone={payload.enabled ? 'success' : 'warning'}
            />
            <SummaryCell
              label={t('egress.summary.policy')}
              value={formatPolicy(payload.on_all_quarantined, policyLabels)}
            />
            <SummaryCell
              label={t('egress.summary.fallbackRoute')}
              value={formatOptionalText(payload.private_fallback_route_id)}
              tone={payload.private_on_fallback ? 'warning' : 'neutral'}
            />
            <SummaryCell label={t('egress.summary.routes')} value={formatNumber(routes.length)} />
          </div>
          <ReportingContainers containers={payload.containers} />
          {payload.private_on_fallback && (
            <p className='rounded-md border border-warning-200 bg-warning-50 px-3 py-2 text-xs text-warning-700'>
              {t('egress.fallbackWarning')}
            </p>
          )}
          {!payload.enabled && (
            <p className='text-sm text-muted-600'>{t('egress.disabledMessage')}</p>
          )}
          {payload.enabled && routes.length === 0 && (
            <p className='text-sm text-muted-600'>{t('egress.noRoutes')}</p>
          )}
          {payload.enabled && routes.length > 0 && <RoutesTable routes={routes} />}
        </>
      )}
    </section>
  )
}
