import React, { useState } from 'react'
import { LiveOnlyNotice } from '../../components/LiveOnlyNotice'
import {
  useStartProcessByName,
  useStopProcessByName,
  useConfiguredProcesses,
  useAvailableProcesses,
  useProcessRuns,
} from '../../hooks/queries/processes'
import { useHeartbeats, type HeartbeatData } from '../../hooks/useHeartbeats'
import { useConfirmDialog } from '../../hooks/useConfirmDialog'
import { useIsReadOnly } from '../../hooks/useIsReadOnly'
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

const resolveStatusBadge = (process: ConfiguredProcess): string => {
  if (process.is_one_shot) return 'one-shot'
  if (process.enabled) return 'auto-start'

  return 'manual'
}

export const Processes: React.FC = () => {
  const readOnly = useIsReadOnly()
  const { openConfirm, dialogProps: confirmDialogProps } = useConfirmDialog()
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
    () => ['system.heartbeats.executor.', 'system.heartbeats.feed.'],
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
  const formatTimestamp = React.useCallback((timestamp?: string | null) => {
    if (!timestamp) return null
    const date = new Date(timestamp)

    if (Number.isNaN(date.getTime())) {
      return null
    }

    return date.toLocaleString()
  }, [])

  const getDescription = React.useCallback(
    (process: ConfiguredProcess): string => {
      const registryDetails = registryByName[process.name]

      return registryDetails?.description || process.note || ''
    },
    [registryByName]
  )

  const startProcess = useStartProcessByName()
  const stopProcess = useStopProcessByName()

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
        title: `Stop ${processName}`,
        message,
        onConfirm: () => stopProcess.mutate({ name: processName }),
      })
    },
    [stopProcess, openConfirm]
  )

  const handleRestart = React.useCallback(
    (processName: string, stopMessage: string, openStartModal: () => void) => {
      openConfirm({
        title: `Restart ${processName}`,
        message: stopMessage,
        onConfirm: () => stopProcess.mutate({ name: processName }, { onSuccess: openStartModal }),
      })
    },
    [stopProcess, openConfirm]
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
        <h1 className='text-2xl font-bold text-alpine-900'>Process Control</h1>
        <div className='text-sm text-muted-600'>Real-time process monitoring and control</div>
      </div>
      {}
      <div className='space-y-4'>
        <h2 className='text-lg font-semibold text-primary-600'>Long-Running Processes</h2>
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
                onStart={() => handleStart(process.name, description)}
                onStop={() =>
                  handleStop(process.name, `This will stop the ${process.name} process.`)
                }
                onRestart={() =>
                  handleRestart(
                    process.name,
                    `This will restart the ${process.name} process.`,
                    () => handleStart(process.name, description)
                  )
                }
                isStarting={startProcess.isPending && startProcess.variables?.name === process.name}
                isStopping={stopProcess.isPending && stopProcess.variables?.name === process.name}
                readOnly={readOnly}
              />
            )
          })}
        </div>
      </div>
      {executorTemplates.length > 0 && (
        <div className='space-y-4'>
          <div>
            <h2 className='text-lg font-semibold text-primary-600'>Executor Templates</h2>
            <p className='text-sm text-muted-600 mt-1'>
              Editing template config affects all wallets on this exchange after restart. Templates
              are config-only — start the per-wallet instance below to run an executor.
            </p>
          </div>
          <div className='grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4'>
            {executorTemplates.map(template => {
              const description = getDescription(template)
              const paramSummary = Object.keys(template.parameters).length
                ? `${Object.keys(template.parameters).length} parameter(s)`
                : 'no parameters set'

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
                      template
                    </span>
                  </div>
                  <div className='space-y-1 text-xs'>
                    <div className='flex gap-2'>
                      <span className='text-muted-400 font-medium shrink-0'>Mode:</span>
                      <span className='text-muted-600'>{template.mode}</span>
                    </div>
                    <div className='flex gap-2'>
                      <span className='text-muted-400 font-medium shrink-0'>Parameters:</span>
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
          <h2 className='text-lg font-semibold text-primary-600'>Wallet Instances</h2>
          <div className='grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4'>
            {walletInstances.map(instance => {
              const description = getDescription(instance)
              const heartbeat = getHeartbeat(instance.name)
              const walletShort = instance.wallet_public_id
                ? `${instance.wallet_public_id.slice(0, 8)}…`
                : 'unknown'
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
                    handleStop(instance.name, `This will stop the ${instance.name} process.`)
                  }
                  onRestart={() =>
                    handleRestart(
                      instance.name,
                      `This will restart the ${instance.name} process.`,
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
          <h2 className='text-lg font-semibold text-primary-600'>Task Processes</h2>
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
                details.last_run = `${latestRun.status} (${formatTimestamp(latestRun.started_at)})`
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
                    handleStop(process.name, `This will stop the ${process.name} process.`)
                  }
                  onRestart={() =>
                    handleRestart(
                      process.name,
                      `This will restart the ${process.name} process.`,
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
