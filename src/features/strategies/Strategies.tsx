import React, { useState, useEffect, useMemo } from 'react'
import { v7 as uuid7 } from 'uuid'
import { useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Gauge } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { ThemeSelect } from '../../components/ThemeSelect'
import {
  useStartProcessByName,
  useStopProcessByName,
  usePatchProcessDesiredState,
  useAvailableProcesses,
  useCreateProcessConfig,
  useConfiguredProcesses,
} from '../../hooks/queries/processes'
import { useStrategies } from '../../hooks/queries/strategies'
import { useWebSocketStore } from '../../stores/websocket'
import { useAppStore } from '../../stores/app'
import { useAuth } from '../../stores/auth'
import { useIsReadOnly } from '../../hooks/useIsReadOnly'
import { LiveOnlyNotice } from '../../components/LiveOnlyNotice'
import { Permission } from '../../types/permissions.generated'
import { StrategyLaunchModal, type StrategyLaunchData } from './StrategyLaunchModal'
import { StrategyScopeEditModal, type StrategyScopeEditTarget } from './StrategyScopeEditModal'
import { BacktestCreateForm } from '../backtests/BacktestCreateForm'
import { currentHashQuery } from '../../lib/hash/currentHashQuery'
import { StrategyCard, type FeedHealth, type HealthStatus } from './StrategyCard'
import { StrategiesSkeleton } from '../../components/Skeleton'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { useConfirmDialog } from '../../hooks/useConfirmDialog'
import type { StrategyProcess, ConfiguredProcess } from '../../types/api'

type RemoteProcessAction = 'enable' | 'disable' | 'restart'
type StrategyCardAction = () => void

const remoteActionPermissions = (action: RemoteProcessAction): readonly Permission[] => {
  if (action === 'enable') return [Permission.START_STRATEGIES]
  if (action === 'disable') return [Permission.STOP_STRATEGIES]

  return [Permission.START_STRATEGIES, Permission.STOP_STRATEGIES]
}

interface StrategyCardRenderParams {
  strategy: StrategyProcess
  canConfigure: boolean
  canStart: boolean
  canStop: boolean
  canBacktest: boolean
  readOnly: boolean
  health: HealthStatus | undefined
  activeStrategyProcess: string | null
  startPending: boolean
  stopPending: boolean
  remotePending: (name: string, action: RemoteProcessAction) => boolean
  requestRemoteEnable: (name: string) => void
  requestStartStrategy: (name: string, mode: string) => void
  requestRemoteDisable: (name: string) => void
  requestStopStrategy: (name: string) => void
  requestRemoteRestart: (name: string) => void
  setBacktestStrategyClass: React.Dispatch<React.SetStateAction<string | null>>
  config: ConfiguredProcess | undefined
  requestEditScope: (config: ConfiguredProcess) => void
}

function startAction(params: StrategyCardRenderParams): StrategyCardAction | undefined {
  if (!params.canStart) {
    return undefined
  }

  if (params.strategy.managed_remotely) {
    return () => params.requestRemoteEnable(params.strategy.name)
  }

  return () => params.requestStartStrategy(params.strategy.name, params.strategy.mode)
}

function stopAction(params: StrategyCardRenderParams): StrategyCardAction | undefined {
  if (!params.canStop) {
    return undefined
  }

  if (params.strategy.managed_remotely) {
    return () => params.requestRemoteDisable(params.strategy.name)
  }

  return () => params.requestStopStrategy(params.strategy.name)
}

function restartAction(params: StrategyCardRenderParams): StrategyCardAction | undefined {
  if (!params.canStart || !params.canStop || !params.strategy.managed_remotely) {
    return undefined
  }

  return () => params.requestRemoteRestart(params.strategy.name)
}

function backtestAction(params: StrategyCardRenderParams): StrategyCardAction | undefined {
  const backtestClass = params.strategy.strategy_class ?? null

  if (!params.canBacktest || !backtestClass || params.readOnly) {
    return undefined
  }

  return () => params.setBacktestStrategyClass(backtestClass)
}

function editScopeAction(params: StrategyCardRenderParams): StrategyCardAction | undefined {
  const config = params.config

  if (!params.canConfigure || params.readOnly || config === undefined) {
    return undefined
  }

  const parameters = config.parameters
  const isScoped = 'operator_public_id' in parameters || 'wallet_public_id' in parameters

  if (!isScoped) {
    return undefined
  }

  return () => params.requestEditScope(config)
}

function strategyIsStarting(params: StrategyCardRenderParams): boolean {
  if (params.strategy.managed_remotely) {
    return params.remotePending(params.strategy.name, 'enable')
  }

  return params.startPending && params.activeStrategyProcess === params.strategy.name
}

function strategyIsStopping(params: StrategyCardRenderParams): boolean {
  if (params.strategy.managed_remotely) {
    return params.remotePending(params.strategy.name, 'disable')
  }

  return params.stopPending && params.activeStrategyProcess === params.strategy.name
}

function strategyIsRestarting(params: StrategyCardRenderParams): boolean {
  return params.strategy.managed_remotely && params.remotePending(params.strategy.name, 'restart')
}

function renderStrategyCard(params: StrategyCardRenderParams): React.ReactElement {
  const strategy = params.strategy

  return (
    <StrategyCard
      key={strategy.name}
      name={strategy.name}
      running={strategy.running}
      autoStartEnabled={strategy.enabled}
      mode={strategy.mode}
      health={params.health}
      coordinator={strategy.coordinator}
      coordinatorLabel={strategy.coordinator_label}
      managedRemotely={strategy.managed_remotely}
      onStart={startAction(params)}
      onStop={stopAction(params)}
      onRestart={restartAction(params)}
      onBacktest={backtestAction(params)}
      onEditScope={editScopeAction(params)}
      isStarting={strategyIsStarting(params)}
      isStopping={strategyIsStopping(params)}
      isRestarting={strategyIsRestarting(params)}
      readOnly={params.readOnly}
    />
  )
}

export const Strategies: React.FC = () => {
  const { t } = useTranslation('strategies')
  const { hasPermission } = useAuth()
  const readOnly = useIsReadOnly()
  const canConfigure = hasPermission(Permission.CONFIGURE_STRATEGIES)
  const canStart = hasPermission(Permission.START_STRATEGIES)
  const canStop = hasPermission(Permission.STOP_STRATEGIES)
  const canControl = canStart || canStop
  const canBacktest = hasPermission(Permission.MANAGE_BACKTESTS)
  const [strategyModalOpen, setStrategyModalOpen] = useState(false)
  const [backtestStrategyClass, setBacktestStrategyClass] = useState<string | null>(null)
  const [activeStrategyProcess, setActiveStrategyProcess] = useState<string | null>(null)
  const [healthStatuses, setHealthStatuses] = useState<Record<string, HealthStatus>>({})
  const { openConfirm, dialogProps: confirmDialogProps } = useConfirmDialog()
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'running' | 'stopped'>('all')
  const queryClient = useQueryClient()
  const { wsClient } = useWebSocketStore()
  const isTimeTraveling = useAppStore(s => s.isTimeTraveling)
  const startProcess = useStartProcessByName()
  const stopProcess = useStopProcessByName()
  const patchDesiredState = usePatchProcessDesiredState()
  const [pendingRemote, setPendingRemote] = useState<Record<string, RemoteProcessAction>>({})
  const createProcessConfig = useCreateProcessConfig()
  const { data: strategiesData, isLoading } = useStrategies()
  const { data: availableProcesses } = useAvailableProcesses()
  const strategyTemplates = useMemo(() => {
    return availableProcesses?.payload.filter(process => process.role === 'strategy') ?? []
  }, [availableProcesses?.payload])
  const strategies = useMemo(() => strategiesData?.payload ?? [], [strategiesData?.payload])
  const { data: configuredData } = useConfiguredProcesses()
  const configByName = useMemo(
    () => new Map((configuredData?.payload ?? []).map(config => [config.name, config])),
    [configuredData?.payload]
  )
  const [editScopeTarget, setEditScopeTarget] = useState<StrategyScopeEditTarget | null>(null)

  const runIfAllowed = <T,>(permissions: readonly Permission[], action: () => T): T | undefined => {
    if (readOnly || permissions.some(permission => !hasPermission(permission))) return undefined

    return action()
  }

  const requestEditScope = (config: ConfiguredProcess): void => {
    runIfAllowed([Permission.CONFIGURE_STRATEGIES], () => {
      setEditScopeTarget({
        processName: config.name,
        template: config.template ?? null,
        parameters: config.parameters,
      })
    })
  }

  useEffect(() => {
    if (isTimeTraveling || !wsClient) {
      return
    }

    const activeClient = wsClient
    const heartbeatTopics = strategies.map(s => {
      const strategyId = s.name.startsWith('strategy_') ? s.name.replace(/^strategy_/, '') : s.name

      return `system.heartbeats.strategy.${strategyId}`
    })

    if (heartbeatTopics.length === 0) {
      return
    }

    activeClient.subscribe(heartbeatTopics)
    const unsubscribeConnection = activeClient.onConnection((connected: boolean) => {
      if (connected) {
        activeClient.subscribe(heartbeatTopics)
      }
    })
    const unsubscribeHeartbeat = activeClient.onMessage('heartbeat', message => {
      const meta = message.meta as
        | {
            feed_health?: Record<string, FeedHealth>
            inputs?: string[]
            outputs?: string[]
            running?: boolean
          }
        | undefined

      if (message.component.startsWith('strategy.') || message.component.startsWith('strategy_')) {
        const rawName = message.component.replace(/^strategy[._]/, '')
        const matched = strategies.find(s => s.name === rawName || s.name === `strategy_${rawName}`)

        if (matched) {
          const status = message.status

          setHealthStatuses(prev => ({
            ...prev,
            [matched.name]: {
              status,
              lag_ms: message.lag_ms || 0,
              timestamp: Date.now(),
              seq: message.sequence,
              feed_health: meta?.feed_health,
              inputs: meta?.inputs,
              outputs: meta?.outputs,
            },
          }))
        }
      }
    })

    return () => {
      unsubscribeConnection()
      unsubscribeHeartbeat()
      activeClient.unsubscribe(heartbeatTopics)
    }
  }, [strategies, wsClient, isTimeTraveling])

  const handleStrategyLaunch = async (data: StrategyLaunchData) => {
    await runIfAllowed([Permission.CONFIGURE_STRATEGIES], async () => {
      try {
        const canStartNow = hasPermission(Permission.START_STRATEGIES) && !readOnly

        await createProcessConfig.mutateAsync({
          name: data.processName,
          template: data.template,
          enabled: canStartNow && data.autostart,
          mode: data.executionMode,
          parameters: data.parameters,
          ...(data.note === undefined ? {} : { note: data.note }),
        })
        toast.success(t('toast.saved', { name: data.processName }))

        if (canStartNow && data.startImmediately) {
          await startProcess.mutateAsync({
            name: data.processName,
            mode: data.executionMode,
          })
          toast.success(t('toast.started', { name: data.processName }))
          setActiveStrategyProcess(data.processName)
        }

        setStrategyModalOpen(false)
        queryClient.invalidateQueries({ queryKey: ['strategies'] })
      } catch (error) {
        const message = error instanceof Error ? error.message : t('toast.unknownError')

        toast.error(t('toast.registerFailed', { message }))
      }
    })
  }

  const requestStartStrategy = (processName: string, mode: string) => {
    runIfAllowed([Permission.START_STRATEGIES], () => {
      openConfirm({
        title: t('confirm.startTitle', { name: processName }),
        message: t('confirm.startMessage', { name: processName }),
        variant: 'default',
        onConfirm: () => handleStartStrategy(processName, mode),
      })
    })
  }

  const requestStopStrategy = (processName: string) => {
    runIfAllowed([Permission.STOP_STRATEGIES], () => {
      openConfirm({
        title: t('confirm.stopTitle', { name: processName }),
        message: t('confirm.stopMessage', { name: processName }),
        variant: 'danger',
        onConfirm: () => handleStopStrategy(processName),
      })
    })
  }

  const mutateRemote = (
    name: string,
    action: RemoteProcessAction,
    callbacks: { onSuccess: () => void; onError: (error: Error) => void },
    restartNonce?: string
  ) => {
    runIfAllowed(remoteActionPermissions(action), () => {
      setActiveStrategyProcess(name)
      setPendingRemote(prev => ({ ...prev, [name]: action }))
      patchDesiredState
        .mutateAsync({
          name,
          body: { action, ...(restartNonce === undefined ? {} : { restart_nonce: restartNonce }) },
        })
        .then(callbacks.onSuccess)
        .catch((error: unknown) =>
          callbacks.onError(error instanceof Error ? error : new Error(String(error)))
        )
        .finally(() => {
          setPendingRemote(prev => {
            const next = { ...prev }

            delete next[name]

            return next
          })
        })
    })
  }

  const remotePending = (name: string, action: RemoteProcessAction): boolean =>
    pendingRemote[name] === action

  const requestRemoteEnable = (processName: string) => {
    runIfAllowed([Permission.START_STRATEGIES], () => {
      openConfirm({
        title: t('confirm.startTitle', { name: processName }),
        message: t('confirm.startMessage', { name: processName }),
        variant: 'default',
        onConfirm: () =>
          mutateRemote(processName, 'enable', {
            onSuccess: () => {
              toast.success(t('toast.startSuccess'), { duration: 3000, icon: '🚀' })
            },
            onError: (error: Error) => {
              setActiveStrategyProcess(null)
              toast.error(t('toast.startFailed', { message: error.message }), {
                duration: 5000,
                icon: '⚠️',
              })
            },
          }),
      })
    })
  }

  const requestRemoteDisable = (processName: string) => {
    runIfAllowed([Permission.STOP_STRATEGIES], () => {
      openConfirm({
        title: t('confirm.stopTitle', { name: processName }),
        message: t('confirm.stopMessage', { name: processName }),
        variant: 'danger',
        onConfirm: () =>
          mutateRemote(processName, 'disable', {
            onSuccess: () => {
              setActiveStrategyProcess(null)
              toast.success(t('toast.stopSuccess'), { duration: 3000, icon: '✋' })
            },
            onError: (error: Error) => {
              setActiveStrategyProcess(null)
              toast.error(t('toast.stopFailed', { message: error.message }), {
                duration: 5000,
                icon: '⚠️',
              })
            },
          }),
      })
    })
  }

  const requestRemoteRestart = (processName: string) => {
    runIfAllowed([Permission.START_STRATEGIES, Permission.STOP_STRATEGIES], () => {
      const restartNonce = uuid7()

      openConfirm({
        title: t('confirm.restartTitle', { name: processName }),
        message: t('confirm.restartMessage', { name: processName }),
        variant: 'default',
        onConfirm: () =>
          mutateRemote(
            processName,
            'restart',
            {
              onSuccess: () => {
                toast.success(t('toast.restartSuccess'), { duration: 3000, icon: '🔄' })
              },
              onError: (error: Error) => {
                setActiveStrategyProcess(null)
                toast.error(t('toast.restartFailed', { message: error.message }), {
                  duration: 5000,
                  icon: '⚠️',
                })
              },
            },
            restartNonce
          ),
      })
    })
  }

  const handleStartStrategy = (processName: string, mode: string) => {
    runIfAllowed([Permission.START_STRATEGIES], () => {
      setActiveStrategyProcess(processName)
      startProcess.mutate(
        {
          name: processName,
          mode: (mode || 'thread') as 'thread' | 'process',
        },
        {
          onSuccess: () => {
            toast.success(t('toast.startSuccess'), {
              duration: 3000,
              icon: '🚀',
            })
            queryClient.invalidateQueries({ queryKey: ['strategies'] })
          },
          onError: (error: Error) => {
            setActiveStrategyProcess(null)
            const errorMessage = error.message.toLowerCase()

            if (errorMessage.includes('already running')) {
              toast.error(t('toast.alreadyRunning'), {
                duration: 4000,
                icon: '⚠️',
              })
            } else if (errorMessage.includes('not found')) {
              toast.error(t('toast.configNotFound'), {
                duration: 5000,
                icon: '❌',
              })
            } else if (errorMessage.includes('network') || errorMessage.includes('timeout')) {
              toast.error(t('toast.networkError'), {
                duration: 5000,
                icon: '🌐',
              })
            } else {
              toast.error(t('toast.startFailed', { message: error.message }), {
                duration: 5000,
                icon: '⚠️',
              })
            }
          },
        }
      )
    })
  }

  const handleStopStrategy = (processName: string) => {
    runIfAllowed([Permission.STOP_STRATEGIES], () => {
      setActiveStrategyProcess(processName)
      stopProcess.mutate(
        { name: processName },
        {
          onSuccess: () => {
            setActiveStrategyProcess(null)
            toast.success(t('toast.stopSuccess'), {
              duration: 3000,
              icon: '✋',
            })
            queryClient.invalidateQueries({ queryKey: ['strategies'] })
          },
          onError: (error: Error) => {
            const errorMessage = error.message.toLowerCase()

            if (errorMessage.includes('not running')) {
              toast.error(t('toast.notRunning'), {
                duration: 4000,
                icon: '⚠️',
              })

              if (activeStrategyProcess === processName) {
                setActiveStrategyProcess(null)
              }
            } else if (errorMessage.includes('network') || errorMessage.includes('timeout')) {
              toast.error(t('toast.networkError'), {
                duration: 5000,
                icon: '🌐',
              })
            } else {
              toast.error(t('toast.stopFailed', { message: error.message }), {
                duration: 5000,
                icon: '⚠️',
              })
            }
          },
        }
      )
    })
  }

  if (isLoading) {
    return (
      <div className='p-4'>
        <StrategiesSkeleton />
      </div>
    )
  }

  const filteredStrategies = strategies.filter(s => {
    const nameMatch = searchTerm === '' || s.name.toLowerCase().includes(searchTerm.toLowerCase())
    const statusMatch =
      statusFilter === 'all' || (statusFilter === 'running' ? s.running : !s.running)

    return nameMatch && statusMatch
  })

  return (
    <div className='space-y-6'>
      <LiveOnlyNotice />
      <div className='space-y-2'>
        <div className='flex flex-wrap items-center justify-between gap-2'>
          <h2 className='text-xl font-bold text-alpine-900'>{t('page.title')}</h2>
          {canConfigure && (
            <button
              onClick={() => setStrategyModalOpen(true)}
              disabled={createProcessConfig.isPending || startProcess.isPending || readOnly}
              className='px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-md hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed'
            >
              {createProcessConfig.isPending ? t('page.saving') : t('page.register')}
            </button>
          )}
        </div>
        <p className='text-xs text-muted-500'>
          {canConfigure || canControl
            ? t('page.descriptionCanManage')
            : t('page.descriptionViewer')}
        </p>
      </div>
      {}
      <div className='flex items-center gap-3'>
        <div className='flex-1'>
          <input
            type='text'
            placeholder={t('page.searchPlaceholder')}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className='input'
          />
        </div>
        <ThemeSelect
          value={statusFilter}
          onChange={value => setStatusFilter(value as 'all' | 'running' | 'stopped')}
          options={[
            { value: 'all', label: t('page.filter.all') },
            { value: 'running', label: t('page.filter.running') },
            { value: 'stopped', label: t('page.filter.stopped') },
          ]}
          className='max-w-48'
        />
      </div>
      {}
      <div className='space-y-4'>
        <h3 className='text-lg font-medium text-alpine-900'>{t('page.configuredHeading')}</h3>
        {filteredStrategies.length > 0 && (
          <div className='grid grid-cols-1 lg:grid-cols-2 gap-4'>
            {filteredStrategies.map(strategy =>
              renderStrategyCard({
                strategy,
                canConfigure,
                canStart,
                canStop,
                canBacktest,
                readOnly,
                health: healthStatuses[strategy.name],
                activeStrategyProcess,
                startPending: startProcess.isPending,
                stopPending: stopProcess.isPending,
                remotePending,
                requestRemoteEnable,
                requestStartStrategy,
                requestRemoteDisable,
                requestStopStrategy,
                requestRemoteRestart,
                setBacktestStrategyClass,
                config: configByName.get(strategy.name),
                requestEditScope,
              })
            )}
          </div>
        )}
        {filteredStrategies.length === 0 && strategies.length > 0 && (
          <div className='bg-alpine-50 border border-dark-600 rounded-2xl p-6 text-center'>
            <p className='text-muted-500'>{t('page.noMatches')}</p>
            <button
              onClick={() => {
                setSearchTerm('')
                setStatusFilter('all')
              }}
              className='mt-2 text-sm text-brand-600 hover:text-brand-700'
            >
              {t('page.clearFilters')}
            </button>
          </div>
        )}
        {filteredStrategies.length === 0 && strategies.length === 0 && (
          <div className='bg-alpine-50 border border-dark-600 rounded-2xl p-8 text-center'>
            <div className='mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-dark-700'>
              <Gauge className='text-muted-500' size={24} />
            </div>
            <p className='text-muted-500 font-medium'>{t('page.emptyTitle')}</p>
            <p className='text-sm text-muted-400 mt-1'>
              {canConfigure || canControl ? t('page.emptyCanManage') : t('page.emptyViewer')}
            </p>
            {canConfigure && (
              <button
                onClick={() => setStrategyModalOpen(true)}
                disabled={readOnly}
                className='mt-3 px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-md hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed'
              >
                {t('page.register')}
              </button>
            )}
          </div>
        )}
      </div>
      {}
      <ConfirmDialog {...confirmDialogProps} />
      <StrategyLaunchModal
        open={strategyModalOpen && canConfigure && !readOnly}
        onClose={() => setStrategyModalOpen(false)}
        templates={strategyTemplates}
        onSubmit={handleStrategyLaunch}
        isSubmitting={createProcessConfig.isPending || startProcess.isPending}
      />
      <StrategyScopeEditModal
        open={editScopeTarget !== null && canConfigure && !readOnly}
        onClose={() => setEditScopeTarget(null)}
        target={editScopeTarget}
      />
      <BacktestCreateForm
        open={backtestStrategyClass !== null && canBacktest && !readOnly}
        onClose={() => setBacktestStrategyClass(null)}
        preSelectedStrategy={backtestStrategyClass ?? undefined}
        onSuccess={runPublicId => {
          globalThis.location.hash = `#backtests/${runPublicId}${currentHashQuery()}`
        }}
      />
    </div>
  )
}
