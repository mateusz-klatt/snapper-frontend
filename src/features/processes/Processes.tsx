import React, { useState } from 'react'
import toast from 'react-hot-toast'
import { v7 as uuid7 } from 'uuid'
import { useTranslation } from 'react-i18next'
import { LiveOnlyNotice } from '../../components/LiveOnlyNotice'
import {
  useStartProcessByName,
  useStopProcessByName,
  usePatchProcessDesiredState,
  useConfiguredProcesses,
  useAvailableProcesses,
  useProcessRuns,
} from '../../hooks/queries/processes'
import { useHeartbeats, type HeartbeatData } from '../../hooks/useHeartbeats'
import { useConfirmDialog } from '../../hooks/useConfirmDialog'
import { useIsReadOnly } from '../../hooks/useIsReadOnly'
import { formatDateTime } from '../../lib/dateFormat'
import type { AppLocale } from '../../i18n/types'
import { ProcessControlCard } from './ProcessControlCard'
import { ExecutionModeModal } from './ExecutionModeModal'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { ProcessesSkeleton } from '../../components/Skeleton'
import type { ConfiguredProcess, AvailableProcess, ProcessRun } from '../../types/api'
import { noop } from '../../lib/noop'

const UNKNOWN_HEARTBEAT: HeartbeatData = {
  status: 'unknown',
  healthy: false,
  timestamp: 0,
}

const EXECUTOR_INSTANCE_PATTERN = /^(.+)_w([a-f0-9]{12})$/

type RemoteProcessAction = 'enable' | 'disable' | 'restart'

export const Processes: React.FC = () => {
  const { t, i18n } = useTranslation('processes')
  const readOnly = useIsReadOnly()
  const { openConfirm, dialogProps: confirmDialogProps } = useConfirmDialog()

  const resolveStatusBadge = (process: ConfiguredProcess): string => {
    if (process.is_one_shot) return t('badges.oneShot')
    if (process.enabled) return t('badges.autoStart')

    return t('badges.manual')
  }

  const [executionModeModal, setExecutionModeModal] = useState<{
    open: boolean
    componentName: string
    description: string
    onStart: (options: { executionMode: 'thread' | 'process' }) => void
  }>({
    open: false,
    componentName: '',
    description: '',
    onStart: noop,
  })
  const heartbeatTopics = React.useMemo(
    // Subscribe to the whole heartbeats root (a valid registry root); the
    // executor./feed. sub-prefixes are NOT roots and the server rejects the
    // entire batch, leaving every card "unknown". The bridge throttles this
    // root per-component (system.heartbeats. schema), so components no longer
    // starve one another, and getHeartbeat keys each card by its component.
    () => ['system.heartbeats.'],
    []
  )
  const allHeartbeats = useHeartbeats(heartbeatTopics)
  const { data: configuredProcesses, isLoading } = useConfiguredProcesses()
  const { data: availableProcesses } = useAvailableProcesses()
  const { data: processRuns } = useProcessRuns({
    enabled: Boolean(configuredProcesses?.count),
    limit: 50,
  })
  const registryByName = React.useMemo<Record<string, AvailableProcess>>(() => {
    const map: Record<string, AvailableProcess> = {}

    availableProcesses?.payload.forEach(process => {
      map[process.name] = process
    })

    return map
  }, [availableProcesses])
  const latestRunByProcess = React.useMemo<Record<string, ProcessRun>>(() => {
    if (!processRuns?.payload?.length) {
      return {}
    }

    return processRuns.payload.reduce<Record<string, ProcessRun>>((acc, run) => {
      const previous = acc[run.process_name]

      if (!previous) {
        acc[run.process_name] = run

        return acc
      }

      const previousStart = new Date(previous.started_at).getTime()
      const currentStart = new Date(run.started_at).getTime()

      if (currentStart >= previousStart) {
        acc[run.process_name] = run
      }

      return acc
    }, {})
  }, [processRuns])
  const longRunningProcesses = React.useMemo<ConfiguredProcess[]>(() => {
    if (!configuredProcesses) return []

    return configuredProcesses.payload.filter(
      process =>
        process.lifecycle === 'long_running' &&
        process.role !== 'strategy' &&
        process.role !== 'backtest' &&
        process.kind !== 'template' &&
        !process.parent_template
    )
  }, [configuredProcesses])
  const executorTemplates = React.useMemo<ConfiguredProcess[]>(() => {
    if (!configuredProcesses) return []

    return configuredProcesses.payload.filter(process => process.kind === 'template')
  }, [configuredProcesses])
  const walletInstances = React.useMemo<(ConfiguredProcess & { parent_template: string })[]>(() => {
    if (!configuredProcesses) return []

    return configuredProcesses.payload.filter(
      (process): process is ConfiguredProcess & { parent_template: string } =>
        process.kind === 'instance' &&
        typeof process.parent_template === 'string' &&
        process.parent_template.length > 0
    )
  }, [configuredProcesses])
  const taskProcesses = React.useMemo<ConfiguredProcess[]>(() => {
    if (!configuredProcesses) return []

    return configuredProcesses.payload.filter(
      process =>
        process.lifecycle === 'one_shot' &&
        process.role !== 'strategy' &&
        process.role !== 'backtest'
    )
  }, [configuredProcesses])
  const formatTimestamp = React.useCallback(
    (timestamp?: string | null) => {
      if (!timestamp) return null
      const date = new Date(timestamp)

      if (Number.isNaN(date.getTime())) {
        return null
      }

      return formatDateTime(date, i18n.language as AppLocale)
    },
    [i18n.language]
  )

  const getDescription = React.useCallback(
    (process: ConfiguredProcess): string => {
      const registryDetails = registryByName[process.name]

      return registryDetails?.description || process.note || ''
    },
    [registryByName]
  )

  const startProcess = useStartProcessByName()
  const stopProcess = useStopProcessByName()
  const patchDesiredState = usePatchProcessDesiredState()
  const [pendingRemote, setPendingRemote] = useState<Record<string, RemoteProcessAction>>({})

  const closeExecutionModeModal = React.useCallback(() => {
    setExecutionModeModal({
      open: false,
      componentName: '',
      description: '',
      onStart: noop,
    })
  }, [])

  const showExecutionModeModal = React.useCallback(
    (
      componentName: string,
      description: string,
      onStart: (options: { executionMode: 'thread' | 'process' }) => void
    ) => {
      setExecutionModeModal({
        open: true,
        componentName,
        description,
        onStart,
      })
    },
    []
  )

  const handleStart = React.useCallback(
    (name: string, description: string) => {
      showExecutionModeModal(name, description, ({ executionMode }) =>
        startProcess.mutate({ name, mode: executionMode })
      )
    },
    [startProcess, showExecutionModeModal]
  )

  const handleStop = React.useCallback(
    (processName: string, message: string) => {
      openConfirm({
        title: t('actions.stopTitle', { name: processName }),
        message,
        onConfirm: () => stopProcess.mutate({ name: processName }),
      })
    },
    [stopProcess, openConfirm, t]
  )

  const handleRestart = React.useCallback(
    (processName: string, stopMessage: string, openStartModal: () => void) => {
      openConfirm({
        title: t('actions.restartTitle', { name: processName }),
        message: stopMessage,
        onConfirm: () => stopProcess.mutate({ name: processName }, { onSuccess: openStartModal }),
      })
    },
    [stopProcess, openConfirm, t]
  )

  const clearPendingRemote = React.useCallback((name: string) => {
    setPendingRemote(prev => {
      const next = { ...prev }

      delete next[name]

      return next
    })
  }, [])

  const runRemote = React.useCallback(
    (name: string, action: RemoteProcessAction, restartNonce?: string) => {
      setPendingRemote(prev => ({ ...prev, [name]: action }))
      patchDesiredState
        .mutateAsync({
          name,
          body: { action, ...(restartNonce === undefined ? {} : { restart_nonce: restartNonce }) },
        })
        .catch((error: Error) => {
          toast.error(t('toast.remoteActionFailed', { message: error.message }), {
            duration: 5000,
            icon: '⚠️',
          })
        })
        .finally(() => clearPendingRemote(name))
    },
    [patchDesiredState, clearPendingRemote, t]
  )

  const remotePending = React.useCallback(
    (name: string, action: RemoteProcessAction): boolean => pendingRemote[name] === action,
    [pendingRemote]
  )

  const handleRemoteEnable = React.useCallback(
    (name: string) => runRemote(name, 'enable'),
    [runRemote]
  )

  const handleRemoteDisable = React.useCallback(
    (name: string, message: string) => {
      openConfirm({
        title: t('actions.stopTitle', { name }),
        message,
        onConfirm: () => runRemote(name, 'disable'),
      })
    },
    [runRemote, openConfirm, t]
  )

  const handleRemoteRestart = React.useCallback(
    (name: string, message: string) => {
      const restartNonce = uuid7()

      openConfirm({
        title: t('actions.restartTitle', { name }),
        message,
        onConfirm: () => runRemote(name, 'restart', restartNonce),
      })
    },
    [runRemote, openConfirm, t]
  )

  const getHeartbeat = React.useCallback(
    (processName: string): HeartbeatData | undefined => {
      if (processName.startsWith('executor_')) {
        const withoutPrefix = processName.slice('executor_'.length)
        const instanceMatch = EXECUTOR_INSTANCE_PATTERN.exec(withoutPrefix)
        const componentKey = instanceMatch
          ? `executor.${instanceMatch[1]}.${instanceMatch[2]}`
          : `executor.${withoutPrefix}`

        return allHeartbeats[componentKey] ?? UNKNOWN_HEARTBEAT
      }

      if (processName.includes('feed_publisher')) {
        const exchangeName = processName.replace('_feed_publisher', '')

        return allHeartbeats[`feed.${exchangeName}`] ?? UNKNOWN_HEARTBEAT
      }

      return undefined
    },
    [allHeartbeats]
  )

  if (isLoading) {
    return (
      <div className='p-6'>
        <ProcessesSkeleton />
      </div>
    )
  }

  return (
    <div className='space-y-6'>
      <LiveOnlyNotice />
      <div className='flex items-center justify-between'>
        <h1 className='text-2xl font-bold text-alpine-900'>{t('page.title')}</h1>
        <div className='text-sm text-muted-600'>{t('page.subtitle')}</div>
      </div>
      {}
      <div className='space-y-4'>
        <h2 className='text-lg font-semibold text-primary-600'>{t('sections.longRunning')}</h2>
        <div className='grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4'>
          {longRunningProcesses.map(process => {
            const description = getDescription(process)
            const heartbeat = getHeartbeat(process.name)

            return (
              <ProcessControlCard
                key={process.name}
                title={description || process.name}
                description={process.note && process.note !== description ? process.note : ''}
                status={process.running ? 'running' : 'stopped'}
                details={undefined}
                heartbeat={heartbeat}
                onStart={() =>
                  process.managed_remotely
                    ? handleRemoteEnable(process.name)
                    : handleStart(process.name, description)
                }
                onStop={() =>
                  process.managed_remotely
                    ? handleRemoteDisable(
                        process.name,
                        t('actions.stopMessage', { name: process.name })
                      )
                    : handleStop(process.name, t('actions.stopMessage', { name: process.name }))
                }
                onRestart={() =>
                  process.managed_remotely
                    ? handleRemoteRestart(
                        process.name,
                        t('actions.restartMessage', { name: process.name })
                      )
                    : handleRestart(
                        process.name,
                        t('actions.restartMessage', { name: process.name }),
                        () => handleStart(process.name, description)
                      )
                }
                isStarting={
                  process.managed_remotely
                    ? remotePending(process.name, 'enable')
                    : startProcess.isPending && startProcess.variables?.name === process.name
                }
                isStopping={
                  process.managed_remotely
                    ? remotePending(process.name, 'disable')
                    : stopProcess.isPending && stopProcess.variables?.name === process.name
                }
                isRestarting={process.managed_remotely && remotePending(process.name, 'restart')}
                readOnly={readOnly}
                managedRemotely={process.managed_remotely}
                enabled={process.enabled}
                coordinator={process.coordinator}
                coordinatorLabel={process.coordinator_label}
              />
            )
          })}
        </div>
      </div>
      {executorTemplates.length > 0 && (
        <div className='space-y-4'>
          <div>
            <h2 className='text-lg font-semibold text-primary-600'>
              {t('sections.executorTemplates')}
            </h2>
            <p className='text-sm text-muted-600 mt-1'>{t('sections.executorTemplatesHint')}</p>
          </div>
          <div className='grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4'>
            {executorTemplates.map(template => {
              const description = getDescription(template)
              const paramSummary = Object.keys(template.parameters).length
                ? t('template.paramCount', { count: Object.keys(template.parameters).length })
                : t('template.noParams')

              return (
                <div
                  key={template.name}
                  data-testid={`executor-template-${template.name}`}
                  className='bg-alpine-50 border border-dark-600 rounded-2xl p-6 flex flex-col gap-3'
                >
                  <div className='flex items-start justify-between gap-3'>
                    <div className='min-w-0 flex-1'>
                      <h3 className='text-lg font-semibold text-alpine-900 leading-snug'>
                        {description || template.name}
                      </h3>
                      <p className='text-xs text-muted-400 mt-1 font-mono'>{template.name}</p>
                    </div>
                    <span className='px-2 py-1 rounded-md text-xs font-medium text-info-400 bg-info-400/10 shrink-0'>
                      {t('template.badge')}
                    </span>
                  </div>
                  <div className='space-y-1 text-xs'>
                    <div className='flex gap-2'>
                      <span className='text-muted-400 font-medium shrink-0'>
                        {t('template.mode')}
                      </span>
                      <span className='text-muted-600'>{template.mode}</span>
                    </div>
                    <div className='flex gap-2'>
                      <span className='text-muted-400 font-medium shrink-0'>
                        {t('template.parameters')}
                      </span>
                      <span className='text-muted-600'>{paramSummary}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
      {walletInstances.length > 0 && (
        <div className='space-y-4'>
          <h2 className='text-lg font-semibold text-primary-600'>
            {t('sections.walletInstances')}
          </h2>
          <div className='grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4'>
            {walletInstances.map(instance => {
              const description = getDescription(instance)
              const heartbeat = getHeartbeat(instance.name)
              const walletShort = instance.wallet_public_id
                ? `${instance.wallet_public_id.slice(0, 8)}…`
                : t('card.detail.unknownWallet', { defaultValue: 'unknown' })
              const details: Record<string, string> = {
                wallet: walletShort,
                template: instance.parent_template,
              }

              return (
                <ProcessControlCard
                  key={instance.name}
                  title={description || instance.name}
                  description=''
                  status={instance.running ? 'running' : 'stopped'}
                  details={details}
                  heartbeat={heartbeat}
                  onStart={() => handleStart(instance.name, description)}
                  onStop={() =>
                    handleStop(instance.name, t('actions.stopMessage', { name: instance.name }))
                  }
                  onRestart={() =>
                    handleRestart(
                      instance.name,
                      t('actions.restartMessage', { name: instance.name }),
                      () => handleStart(instance.name, description)
                    )
                  }
                  isStarting={
                    startProcess.isPending && startProcess.variables?.name === instance.name
                  }
                  isStopping={
                    stopProcess.isPending && stopProcess.variables?.name === instance.name
                  }
                  readOnly={readOnly}
                />
              )
            })}
          </div>
        </div>
      )}
      {}
      {taskProcesses.length > 0 && (
        <div className='space-y-4'>
          <h2 className='text-lg font-semibold text-primary-600'>{t('sections.taskProcesses')}</h2>
          <div className='grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4'>
            {taskProcesses.map(process => {
              const status: 'running' | 'stopped' | 'error' = process.running
                ? 'running'
                : 'stopped'

              const statusBadge = resolveStatusBadge(process)
              const description = getDescription(process)
              const latestRun = latestRunByProcess[process.name]
              const details: Record<string, string> = {}

              if (latestRun) {
                const translatedStatus = t(`card.runStatus.${latestRun.status}`, {
                  defaultValue: latestRun.status,
                })

                details.last_run = `${translatedStatus} (${formatTimestamp(latestRun.started_at)})`
              }

              return (
                <ProcessControlCard
                  key={process.name}
                  title={description || process.name}
                  description=''
                  status={status}
                  statusBadge={statusBadge}
                  details={details}
                  readOnly={readOnly}
                  onStart={() => handleStart(process.name, description)}
                  onStop={() =>
                    handleStop(process.name, t('actions.stopMessage', { name: process.name }))
                  }
                  onRestart={() =>
                    handleRestart(
                      process.name,
                      t('actions.restartMessage', { name: process.name }),
                      () => handleStart(process.name, description)
                    )
                  }
                  isStarting={
                    startProcess.isPending && startProcess.variables?.name === process.name
                  }
                  isStopping={stopProcess.isPending && stopProcess.variables?.name === process.name}
                />
              )
            })}
          </div>
        </div>
      )}
      {}
      <ConfirmDialog {...confirmDialogProps} />
      <ExecutionModeModal
        open={executionModeModal.open}
        onClose={closeExecutionModeModal}
        onStart={executionModeModal.onStart}
        componentName={executionModeModal.componentName}
        description={executionModeModal.description}
      />
    </div>
  )
}
