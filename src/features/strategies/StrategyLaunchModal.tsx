import React, { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Modal } from '../../components/ui/Modal'
import type { AvailableProcess, OperatorInfo, UserProfile, WalletInfo } from '../../types/api'
import { useProcessSchema } from '../../hooks/queries/processes'
import { useOperators, useWallets } from '../../hooks/queries/wallets'
import { useUsers } from '../../hooks/queries/users'
import { useIsReadOnly } from '../../hooks/useIsReadOnly'
import { ScopeFields } from './ScopeFields'

export interface StrategyLaunchData {
  template: string
  processName: string
  strategyName: string
  executionMode: 'thread' | 'process'
  autostart: boolean
  startImmediately: boolean
  note?: string | undefined
  parameters: Record<string, unknown>
}
interface StrategyLaunchModalProps {
  open: boolean
  onClose: () => void
  templates: AvailableProcess[]
  onSubmit: (data: StrategyLaunchData) => Promise<void>
  isSubmitting?: boolean
}

const stripUnderscores = (value: string): string => {
  let start = 0
  let end = value.length

  while (start < end && value.codePointAt(start) === 95) start++
  while (end > start && value.codePointAt(end - 1) === 95) end--

  return value.slice(start, end)
}

const sanitizeName = (value: string) =>
  stripUnderscores(value.toLowerCase().replaceAll(/[^a-z0-9_]+/g, '_'))

export const StrategyLaunchModal: React.FC<Readonly<StrategyLaunchModalProps>> = ({
  open,
  onClose,
  templates,
  onSubmit,
  isSubmitting = false,
}) => {
  const { t } = useTranslation('strategies')
  const readOnly = useIsReadOnly()
  const sortedTemplates = useMemo(
    () => [...templates].sort((a, b) => a.name.localeCompare(b.name)),
    [templates]
  )
  const [selectedTemplate, setSelectedTemplate] = useState<string>('')
  const [processName, setProcessName] = useState<string>('')
  const [strategyName, setStrategyName] = useState<string>('')
  const [executionMode, setExecutionMode] = useState<'thread' | 'process'>('thread')
  const [autostart, setAutostart] = useState<boolean>(false)
  const [startImmediately, setStartImmediately] = useState<boolean>(true)
  const [note, setNote] = useState<string>('')
  const [operatorId, setOperatorId] = useState<string>('')
  const [walletId, setWalletId] = useState<string>('')
  const [referenceValues, setReferenceValues] = useState<Record<string, string>>({})
  const processSchema = useProcessSchema(selectedTemplate, {
    enabled: open && selectedTemplate.length > 0,
  })
  const defaultKwargs = useMemo(() => {
    const raw = processSchema.data?.payload.default_parameters ?? {}

    return typeof raw === 'object' && raw !== null ? { ...raw } : {}
  }, [processSchema.data?.payload.default_parameters])
  const defaultStrategyName =
    typeof defaultKwargs.name === 'string' ? defaultKwargs.name : undefined
  const { data: operatorsData } = useOperators()
  const { data: walletsData } = useWallets()
  const { data: usersData } = useUsers(false)
  const operators: OperatorInfo[] = operatorsData?.payload ?? []
  const wallets: WalletInfo[] = walletsData?.payload ?? []
  const users: UserProfile[] = usersData?.payload ?? []
  const referenceParams = useMemo<Record<string, string>>(() => {
    const raw = processSchema.data?.payload.reference_identity_params

    return raw && typeof raw === 'object' ? raw : {}
  }, [processSchema.data?.payload.reference_identity_params])
  const referenceEntries = Object.entries(referenceParams)
  const selectedRole = sortedTemplates.find(item => item.name === selectedTemplate)?.role
  const isScoped = selectedRole === 'strategy' && referenceEntries.length > 0
  const noOperators = operators.length === 0
  const referenceComplete = referenceEntries.every(([name]) => Boolean(referenceValues[name]))
  const scopeComplete = !isScoped || (Boolean(operatorId) && Boolean(walletId) && referenceComplete)
  const scopeBlocked = isScoped && noOperators

  useEffect(() => {
    if (!open) {
      return
    }

    const schemaMode = processSchema.data?.payload.default_mode

    if (schemaMode === 'thread' || schemaMode === 'process') {
      setExecutionMode(schemaMode)
    }
  }, [open, processSchema.data?.payload.default_mode])
  useEffect(() => {
    if (!open) {
      setSelectedTemplate('')
      setProcessName('')
      setStrategyName('')
      setExecutionMode('thread')
      setAutostart(false)
      setStartImmediately(true)
      setNote('')
      setOperatorId('')
      setWalletId('')
      setReferenceValues({})

      return
    }

    const head = templates[0]

    if (!selectedTemplate && head !== undefined) {
      setSelectedTemplate(head.name)
    }
  }, [open, selectedTemplate, templates])
  useEffect(() => {
    if (!selectedTemplate) {
      return
    }

    const baseTemplate = sanitizeName(selectedTemplate)

    if (!processName) {
      setProcessName(`${baseTemplate}_instance`)
    }

    const defaultName = defaultStrategyName ?? baseTemplate.replace(/^strategy_/, '')

    if (!strategyName) {
      setStrategyName(sanitizeName(defaultName))
    }
  }, [selectedTemplate, defaultStrategyName, processName, strategyName])

  const handleSubmit = async (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault()
    const template = selectedTemplate
    const params: Record<string, unknown> = {
      ...defaultKwargs,
      name: sanitizeName(strategyName),
    }
    const defaultOutput = defaultKwargs.output

    if (typeof defaultOutput === 'string') {
      const baseOutput: string = defaultOutput
      const prefix = baseOutput.includes('.')
        ? baseOutput.slice(0, baseOutput.lastIndexOf('.') + 1)
        : ''

      params.output = `${prefix}${sanitizeName(strategyName)}`
    }

    if (isScoped) {
      params.operator_public_id = operatorId
      params.wallet_public_id = walletId
      const baseNested = defaultKwargs.params
      const nested: Record<string, unknown> =
        typeof baseNested === 'object' && baseNested !== null
          ? { ...(baseNested as Record<string, unknown>) }
          : {}

      for (const [name, value] of Object.entries(referenceValues)) {
        nested[name] = value
      }

      params.params = nested
    }

    try {
      const trimmedNote = note.trim()

      await onSubmit({
        template,
        processName: sanitizeName(processName),
        strategyName: sanitizeName(strategyName),
        executionMode,
        autostart,
        startImmediately,
        ...(trimmedNote ? { note: trimmedNote } : {}),
        parameters: params,
      })
    } catch (error) {
      console.error('Failed to submit strategy registration', error)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={t('launchModal.title')} size='lg'>
      {templates.length === 0 ? (
        <div className='space-y-3 text-sm text-muted-600'>
          <p>{t('launchModal.emptyTemplates')}</p>
          <div className='flex justify-end pt-2'>
            <button
              type='button'
              onClick={onClose}
              className='px-4 py-2 text-sm text-muted-600 hover:text-alpine-900'
            >
              {t('launchModal.close')}
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className='space-y-5'>
          <div>
            <label
              htmlFor='strategy-template'
              className='block text-sm font-medium text-muted-700 mb-2'
            >
              {t('launchModal.templateLabel')}
            </label>
            <select
              id='strategy-template'
              value={selectedTemplate}
              onChange={e => {
                setSelectedTemplate(e.target.value)
                setProcessName('')
                setStrategyName('')
                setReferenceValues({})
              }}
              className='w-full px-3 py-2 bg-alpine-50 border border-dark-600 rounded-md text-alpine-900 focus:outline-hidden focus:ring-2 focus:ring-brand-500'
              required
            >
              <option value=''>{t('launchModal.templatePlaceholder')}</option>
              {sortedTemplates.map(template => (
                <option key={template.name} value={template.name}>
                  {template.name}
                </option>
              ))}
            </select>
            {selectedTemplate && (
              <p className='mt-1 text-xs text-muted-500'>
                {sortedTemplates.find(template => template.name === selectedTemplate)
                  ?.description || t('launchModal.templateFallbackDescription')}
              </p>
            )}
            {processSchema.isLoading && (
              <p className='mt-2 text-xs text-muted-400'>{t('launchModal.loadingDefaults')}</p>
            )}
            {processSchema.error && (
              <p className='mt-2 text-xs text-warning-400'>{t('launchModal.loadDefaultsError')}</p>
            )}
          </div>
          {isScoped && (
            <div className='space-y-4 rounded-md border border-dark-600 p-4'>
              <p className='text-sm font-medium text-muted-700'>
                {t('launchModal.scopeSectionLabel')}
              </p>
              <ScopeFields
                referenceEntries={referenceEntries}
                operators={operators}
                wallets={wallets}
                users={users}
                operatorId={operatorId}
                walletId={walletId}
                referenceValues={referenceValues}
                onOperatorChange={setOperatorId}
                onWalletChange={setWalletId}
                onReferenceChange={(name, value) =>
                  setReferenceValues(prev => ({ ...prev, [name]: value }))
                }
                scopeBlocked={scopeBlocked}
              />
            </div>
          )}
          <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
            <div>
              <label
                htmlFor='process-name'
                className='block text-sm font-medium text-muted-700 mb-2'
              >
                {t('launchModal.processNameLabel')}
              </label>
              <input
                id='process-name'
                type='text'
                value={processName}
                onChange={e => setProcessName(e.target.value)}
                placeholder={t('launchModal.processNamePlaceholder')}
                className='w-full px-3 py-2 bg-alpine-50 border border-dark-600 rounded-md text-alpine-900 focus:outline-hidden focus:ring-2 focus:ring-brand-500'
                required
              />
              <p className='mt-1 text-xs text-muted-400'>{t('launchModal.processNameHelp')}</p>
            </div>
            <div>
              <label
                htmlFor='strategy-instance-name'
                className='block text-sm font-medium text-muted-700 mb-2'
              >
                {t('launchModal.instanceNameLabel')}
              </label>
              <input
                id='strategy-instance-name'
                type='text'
                value={strategyName}
                onChange={e => setStrategyName(e.target.value)}
                placeholder={t('launchModal.instanceNamePlaceholder')}
                className='w-full px-3 py-2 bg-alpine-50 border border-dark-600 rounded-md text-alpine-900 focus:outline-hidden focus:ring-2 focus:ring-brand-500'
                required
              />
              <p className='mt-1 text-xs text-muted-400'>{t('launchModal.instanceNameHelp')}</p>
            </div>
          </div>
          <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
            <div>
              <label
                htmlFor='execution-mode'
                className='block text-sm font-medium text-muted-700 mb-2'
              >
                {t('launchModal.executionModeLabel')}
              </label>
              <select
                id='execution-mode'
                value={executionMode}
                onChange={e => setExecutionMode(e.target.value as 'thread' | 'process')}
                className='w-full px-3 py-2 bg-alpine-50 border border-dark-600 rounded-md text-alpine-900 focus:outline-hidden focus:ring-2 focus:ring-brand-500'
              >
                <option value='thread'>{t('launchModal.executionModeThread')}</option>
                <option value='process'>{t('launchModal.executionModeProcess')}</option>
              </select>
              <p className='mt-1 text-xs text-muted-400'>{t('launchModal.executionModeHelp')}</p>
            </div>
            <div className='space-y-2'>
              <span className='block text-sm font-medium text-muted-700 mb-2'>
                {t('launchModal.flagsLabel')}
              </span>
              <label className='flex items-center text-sm text-muted-600'>
                <input
                  type='checkbox'
                  className='mr-2 text-info-500 focus:ring-brand-500'
                  checked={autostart}
                  onChange={e => setAutostart(e.target.checked)}
                />{' '}
                {t('launchModal.autostartLabel')}
              </label>
              <label className='flex items-center text-sm text-muted-600'>
                <input
                  type='checkbox'
                  className='mr-2 text-info-500 focus:ring-brand-500'
                  checked={startImmediately}
                  onChange={e => setStartImmediately(e.target.checked)}
                />{' '}
                {t('launchModal.startImmediatelyLabel')}
              </label>
            </div>
          </div>
          <div>
            <label
              htmlFor='strategy-note'
              className='block text-sm font-medium text-muted-700 mb-2'
            >
              {t('launchModal.noteLabel')}
            </label>
            <textarea
              id='strategy-note'
              value={note}
              onChange={e => setNote(e.target.value)}
              maxLength={512}
              rows={2}
              className='w-full px-3 py-2 bg-alpine-50 border border-dark-600 rounded-md text-alpine-900 focus:outline-hidden focus:ring-2 focus:ring-brand-500'
              placeholder={t('launchModal.notePlaceholder')}
            />
            <p className='mt-1 text-xs text-muted-400'>{t('launchModal.noteHelp')}</p>
          </div>
          <div className='flex justify-end space-x-3 pt-4'>
            <button
              type='button'
              onClick={onClose}
              className='px-4 py-2 text-sm text-muted-600 hover:text-alpine-900'
              disabled={isSubmitting}
            >
              {t('launchModal.cancel')}
            </button>
            <button
              type='submit'
              disabled={
                readOnly ||
                isSubmitting ||
                processSchema.isLoading ||
                !!processSchema.error ||
                !selectedTemplate ||
                !processName.trim() ||
                !strategyName.trim() ||
                scopeBlocked ||
                !scopeComplete
              }
              className='px-4 py-2 bg-info-600 text-white text-sm font-medium rounded-md hover:bg-info-700 disabled:opacity-50 disabled:cursor-not-allowed'
            >
              {isSubmitting ? t('launchModal.submitting') : t('launchModal.submit')}
            </button>
          </div>
        </form>
      )}
    </Modal>
  )
}
