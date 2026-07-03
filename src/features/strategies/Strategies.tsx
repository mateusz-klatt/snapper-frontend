import React, { useState, useEffect, useMemo } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Gauge } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { ThemeSelect } from '../../components/ThemeSelect'
import {
  useStartProcessByName,
  useStopProcessByName,
  useAvailableProcesses,
  useCreateProcessConfig,
} from '../../hooks/queries/processes'
import { useStrategies } from '../../hooks/queries/strategies'
import { useWebSocketStore } from '../../stores/websocket'
import { useAppStore } from '../../stores/app'
import { useAuth } from '../../stores/auth'
import { useIsReadOnly } from '../../hooks/useIsReadOnly'
import { LiveOnlyNotice } from '../../components/LiveOnlyNotice'
import { Permission } from '../../types/permissions.generated'
import { StrategyLaunchModal, type StrategyLaunchData } from './StrategyLaunchModal'
import { BacktestCreateForm } from '../backtests/BacktestCreateForm'
import { currentHashQuery } from '../../lib/hash/currentHashQuery'
import { StrategyCard, type FeedHealth, type HealthStatus } from './StrategyCard'
import { StrategiesSkeleton } from '../../components/Skeleton'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { useConfirmDialog } from '../../hooks/useConfirmDialog'

export const Strategies: React.FC = () => {
  const { t } = useTranslation('strategies')
  const { hasPermission } = useAuth()
  const readOnly = useIsReadOnly()
  const canManage = hasPermission(Permission.MANAGE_PROCESSES)
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
  const createProcessConfig = useCreateProcessConfig()
  const { data: strategiesData, isLoading } = useStrategies()
  const { data: availableProcesses } = useAvailableProcesses()
  const strategyTemplates = useMemo(() => {
    return availableProcesses?.payload.filter(process => process.role === 'strategy') ?? []
  }, [availableProcesses?.payload])
  const strategies = useMemo(() => strategiesData?.payload ?? [], [strategiesData?.payload])

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
    try {
      await createProcessConfig.mutateAsync({
        name: data.processName,
        template: data.template,
        enabled: data.autostart,
        mode: data.executionMode,
        parameters: data.parameters,
        ...(data.note === undefined ? {} : { note: data.note }),
      })
      toast.success(t('toast.saved', { name: data.processName }))

      if (data.startImmediately) {
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
  }

  const requestStartStrategy = (processName: string, mode: string) => {
    openConfirm({
      title: t('confirm.startTitle', { name: processName }),
      message: t('confirm.startMessage', { name: processName }),
      variant: 'default',
      onConfirm: () => handleStartStrategy(processName, mode),
    })
  }

  const requestStopStrategy = (processName: string) => {
    openConfirm({
      title: t('confirm.stopTitle', { name: processName }),
      message: t('confirm.stopMessage', { name: processName }),
      variant: 'danger',
      onConfirm: () => handleStopStrategy(processName),
    })
  }

  const handleStartStrategy = (processName: string, mode: string) => {
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
  }

  const handleStopStrategy = (processName: string) => {
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
          {canManage && (
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
          {canManage ? t('page.descriptionCanManage') : t('page.descriptionViewer')}
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
            {filteredStrategies.map(strategy => {
              const backtestClass: string | null = strategy.strategy_class ?? null

              return (
                <StrategyCard
                  key={strategy.name}
                  name={strategy.name}
                  running={strategy.running}
                  autoStartEnabled={strategy.enabled}
                  mode={strategy.mode}
                  health={healthStatuses[strategy.name]}
                  coordinator={strategy.coordinator}
                  managedRemotely={strategy.managed_remotely}
                  onStart={
                    canManage && !strategy.managed_remotely
                      ? () => requestStartStrategy(strategy.name, strategy.mode)
                      : undefined
                  }
                  onStop={
                    canManage && !strategy.managed_remotely
                      ? () => requestStopStrategy(strategy.name)
                      : undefined
                  }
                  onBacktest={
                    canBacktest && backtestClass && !readOnly
                      ? () => setBacktestStrategyClass(backtestClass)
                      : undefined
                  }
                  isStarting={startProcess.isPending && activeStrategyProcess === strategy.name}
                  isStopping={stopProcess.isPending && activeStrategyProcess === strategy.name}
                  readOnly={readOnly}
                />
              )
            })}
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
              {canManage ? t('page.emptyCanManage') : t('page.emptyViewer')}
            </p>
            {canManage && (
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
        open={strategyModalOpen}
        onClose={() => setStrategyModalOpen(false)}
        templates={strategyTemplates}
        onSubmit={handleStrategyLaunch}
        isSubmitting={createProcessConfig.isPending || startProcess.isPending}
      />
      <BacktestCreateForm
        open={backtestStrategyClass !== null}
        onClose={() => setBacktestStrategyClass(null)}
        preSelectedStrategy={backtestStrategyClass ?? undefined}
        onSuccess={runPublicId => {
          globalThis.location.hash = `#backtests/${runPublicId}${currentHashQuery()}`
        }}
      />
    </div>
  )
}
