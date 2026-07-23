import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDown, ChevronUp } from 'lucide-react'
import type { SettingRead } from '../../types/api'
import { formatDateTime } from '../../lib/dateFormat'
import type { AppLocale } from '../../i18n/types'
import { JsonEditor } from './JsonEditor'
import {
  isJsonString,
  isBooleanString,
  parseBooleanString,
  isSensitive,
  isEncrypted,
  getCategoryColor,
  getMaskedValue,
  tokenizeJson,
  formatJsonObject,
  type JsonValue,
  type JsonTokenType,
} from './settingsUtils'

type SettingHelpTextKey = 'item.helpText.allowShortSelling' | 'item.helpText.allowManualOrders'

const SETTING_HELP_TEXT_KEYS: Record<string, SettingHelpTextKey> = {
  allow_short_selling: 'item.helpText.allowShortSelling',
  allow_manual_orders: 'item.helpText.allowManualOrders',
}

const JSON_TOKEN_COLORS: Record<JsonTokenType, string> = {
  key: 'text-brand-600',
  string: 'text-accent-600',
  number: 'text-info-400',
  boolean: 'text-warning-500',
  null: 'text-muted-500',
  punctuation: 'text-muted-600',
  whitespace: '',
}

interface JsonSyntaxHighlightProps {
  readonly value: string
}

const JsonSyntaxHighlight: React.FC<JsonSyntaxHighlightProps> = ({ value }) => {
  const formatted = formatJsonObject(value) ?? value
  const tokens = tokenizeJson(formatted)

  return (
    <pre className='text-xs whitespace-pre-wrap break-all font-mono'>
      {tokens.map(token => (
        <span key={token.id} className={JSON_TOKEN_COLORS[token.type]}>
          {token.value}
        </span>
      ))}
    </pre>
  )
}

interface SaveCancelButtonsProps {
  readonly onSave: () => Promise<void>
  readonly onCancel: () => void
  readonly isSaving: boolean
  readonly readOnly?: boolean | undefined
}

const SaveCancelButtons: React.FC<SaveCancelButtonsProps> = ({
  onSave,
  onCancel,
  isSaving,
  readOnly,
}) => {
  const { t } = useTranslation('settings')

  return (
    <div className='flex gap-2'>
      <button
        type='button'
        onClick={onSave}
        disabled={isSaving || readOnly}
        className='px-3 py-1 text-xs bg-brand-600 hover:bg-brand-700 disabled:bg-brand-800 disabled:cursor-not-allowed text-white rounded transition-colors'
      >
        {isSaving ? t('item.saving') : t('item.save')}
      </button>
      <button
        type='button'
        onClick={onCancel}
        disabled={isSaving}
        className='px-3 py-1 text-xs border border-dark-600 bg-alpine-50 hover:bg-muted-200 disabled:bg-muted-100 disabled:cursor-not-allowed text-alpine-900 rounded transition-colors'
      >
        {t('item.cancel')}
      </button>
    </div>
  )
}

interface EditingViewProps {
  readonly isJson: boolean
  readonly jsonValue: JsonValue | null
  readonly setJsonValue: (v: JsonValue | null) => void
  readonly localValue: string
  readonly setLocalValue: (v: string) => void
  readonly onJsonSave: () => Promise<void>
  readonly onSave: () => Promise<void>
  readonly onCancel: () => void
  readonly isSaving: boolean
  readonly readOnly?: boolean | undefined
}

const EditingView: React.FC<EditingViewProps> = ({
  isJson,
  jsonValue,
  setJsonValue,
  localValue,
  setLocalValue,
  onJsonSave,
  onSave,
  onCancel,
  isSaving,
  readOnly,
}) => {
  const { t } = useTranslation('settings')

  if (isJson && jsonValue !== null) {
    return (
      <div className='space-y-2'>
        <JsonEditor
          value={jsonValue}
          onChange={setJsonValue}
          readOnly={readOnly}
          className='border border-dark-600 rounded-lg p-3 bg-dark-700'
        />
        <SaveCancelButtons
          onSave={onJsonSave}
          onCancel={onCancel}
          isSaving={isSaving}
          readOnly={readOnly}
        />
      </div>
    )
  }

  return (
    <div className='space-y-2'>
      <textarea
        value={localValue}
        onChange={e => setLocalValue(e.target.value)}
        readOnly={readOnly}
        className='w-full px-2 py-1.5 text-sm bg-alpine-50 border border-dark-600 rounded text-alpine-900 focus:outline-none focus:border-brand-500 resize-vertical min-h-[60px]'
        placeholder={t('item.valuePlaceholder')}
      />
      <SaveCancelButtons
        onSave={onSave}
        onCancel={onCancel}
        isSaving={isSaving}
        readOnly={readOnly}
      />
    </div>
  )
}

interface DisplayViewProps {
  readonly setting: SettingRead
  readonly showDeleteConfirm: boolean
  readonly setShowDeleteConfirm: (v: boolean) => void
  readonly setIsEditing: (v: boolean) => void
  readonly onDelete: (key: string) => Promise<void>
  readonly isSaving: boolean
  readonly readOnly?: boolean | undefined
}

const DisplayView: React.FC<DisplayViewProps> = ({
  setting,
  showDeleteConfirm,
  setShowDeleteConfirm,
  setIsEditing,
  onDelete,
  isSaving,
  readOnly,
}) => {
  const { t, i18n } = useTranslation('settings')
  const [isCollapsed, setIsCollapsed] = useState(true)
  const isJson = isJsonString(setting.value) && !isSensitive(setting.key)
  const lineCount = isJson ? (formatJsonObject(setting.value)?.split('\n').length ?? 1) : 0
  const isLongJson = isJson && lineCount > 3

  return (
    <div className='space-y-2'>
      <div className='bg-dark-700 border border-dark-600 rounded p-2'>
        {isJson ? (
          <div className={isLongJson && isCollapsed ? 'max-h-[72px] overflow-hidden' : ''}>
            <JsonSyntaxHighlight value={setting.value} />
          </div>
        ) : (
          <pre className='text-xs text-alpine-900 whitespace-pre-wrap break-all'>
            {getMaskedValue(setting.key, setting.value, t('item.emptyValue'))}
          </pre>
        )}
        {isLongJson && (
          <button
            type='button'
            onClick={() => setIsCollapsed(prev => !prev)}
            className='flex items-center gap-1 mt-1 text-xs text-brand-600 hover:text-brand-700 transition-colors'
          >
            {isCollapsed ? (
              <>
                <ChevronDown size={14} /> {t('item.showMore')}
              </>
            ) : (
              <>
                <ChevronUp size={14} /> {t('item.showLess')}
              </>
            )}
          </button>
        )}
      </div>
      {showDeleteConfirm ? (
        <div className='flex items-center gap-2 p-2 bg-loss-50 border border-loss-700 rounded'>
          <span className='text-xs text-loss-700'>{t('item.deleteConfirm')}</span>
          <button
            type='button'
            onClick={async () => {
              await onDelete(setting.key)
              setShowDeleteConfirm(false)
            }}
            disabled={isSaving || readOnly}
            className='px-2 py-1 text-xs bg-loss-600 hover:bg-loss-700 disabled:bg-loss-800 disabled:cursor-not-allowed text-white rounded transition-colors'
          >
            {isSaving ? t('item.deleting') : t('item.yesDelete')}
          </button>
          <button
            type='button'
            onClick={() => setShowDeleteConfirm(false)}
            disabled={isSaving}
            className='px-2 py-1 text-xs border border-dark-600 bg-alpine-50 hover:bg-muted-200 disabled:cursor-not-allowed text-alpine-900 rounded transition-colors'
          >
            {t('item.cancel')}
          </button>
        </div>
      ) : (
        <div className='flex justify-between items-center'>
          <div className='flex gap-2'>
            <button
              type='button'
              onClick={() => setIsEditing(true)}
              disabled={readOnly}
              className='px-3 py-1 text-xs border border-dark-600 bg-alpine-50 hover:bg-muted-200 text-alpine-900 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
            >
              {t('item.edit')}
            </button>
            <button
              type='button'
              onClick={() => setShowDeleteConfirm(true)}
              disabled={readOnly}
              className='px-3 py-1 text-xs bg-loss-50 hover:bg-loss-800 text-loss-700 hover:text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
            >
              {t('item.delete')}
            </button>
          </div>
          <div className='text-xs text-muted-500'>
            {formatDateTime(new Date(setting.updated_at), i18n.language as AppLocale)}
            {setting.updated_by && ` • ${setting.updated_by}`}
          </div>
        </div>
      )}
    </div>
  )
}

interface BooleanToggleProps {
  readonly setting: SettingRead
  readonly onUpdate: (
    key: string,
    value: string,
    category: string,
    description?: string | null | undefined
  ) => Promise<void>
  readonly onDelete: (key: string) => Promise<void>
  readonly isSaving: boolean
  readonly readOnly?: boolean | undefined
}

const BooleanToggle: React.FC<BooleanToggleProps> = ({
  setting,
  onUpdate,
  onDelete,
  isSaving,
  readOnly,
}) => {
  const { t, i18n } = useTranslation('settings')
  const isOn = parseBooleanString(setting.value)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleToggle = async () => {
    const next = (!isOn).toString()

    await onUpdate(setting.key, next, setting.category, setting.description)
  }

  const handleConfirmDelete = async () => {
    setIsDeleting(true)

    try {
      await onDelete(setting.key)
    } finally {
      setIsDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  const helpTextKey = SETTING_HELP_TEXT_KEYS[setting.key]
  const helpText = helpTextKey ? t(helpTextKey) : ''

  return (
    <div className='space-y-2'>
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-3'>
          <button
            type='button'
            onClick={handleToggle}
            disabled={isSaving || isDeleting || readOnly}
            data-testid={`setting-toggle-${setting.key}`}
            aria-pressed={isOn}
            aria-label={t('item.toggleAriaLabel', { key: setting.key })}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
              isOn ? 'bg-brand-600' : 'bg-muted-300'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                isOn ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
          <span className='font-mono text-sm text-alpine-900'>
            {isOn ? t('booleanValue.true') : t('booleanValue.false')}
          </span>
        </div>
        <div className='text-xs text-muted-500'>
          {formatDateTime(new Date(setting.updated_at), i18n.language as AppLocale)}
          {setting.updated_by && ` • ${setting.updated_by}`}
        </div>
      </div>
      {helpText && <p className='text-xs text-muted-600'>{helpText}</p>}
      {showDeleteConfirm ? (
        <div className='flex items-center gap-2 rounded border border-loss-700 bg-loss-50 p-2'>
          <span className='text-xs text-loss-700'>{t('item.deleteConfirm')}</span>
          <button
            type='button'
            onClick={handleConfirmDelete}
            disabled={isDeleting || readOnly}
            className='rounded bg-loss-600 px-2 py-1 text-xs text-white transition-colors hover:bg-loss-700 disabled:cursor-not-allowed disabled:bg-loss-800'
          >
            {isDeleting ? t('item.deleting') : t('item.yesDelete')}
          </button>
          <button
            type='button'
            onClick={() => setShowDeleteConfirm(false)}
            disabled={isDeleting}
            className='rounded border border-dark-600 bg-alpine-50 px-2 py-1 text-xs text-alpine-900 transition-colors hover:bg-muted-200 disabled:cursor-not-allowed'
          >
            {t('item.cancel')}
          </button>
        </div>
      ) : (
        <div>
          <button
            type='button'
            onClick={() => setShowDeleteConfirm(true)}
            disabled={isSaving || isDeleting || readOnly}
            data-testid={`setting-delete-${setting.key}`}
            className='rounded bg-loss-50 px-3 py-1 text-xs text-loss-700 transition-colors hover:bg-loss-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-50'
          >
            {t('item.delete')}
          </button>
        </div>
      )}
    </div>
  )
}

interface SettingItemProps {
  setting: SettingRead
  onUpdate: (
    key: string,
    value: string,
    category: string,
    description?: string | null | undefined
  ) => Promise<void>
  onDelete: (key: string) => Promise<void>
  isSaving: boolean
  readOnly?: boolean | undefined
}

export const SettingItem = ({
  setting,
  onUpdate,
  onDelete,
  isSaving,
  readOnly,
}: SettingItemProps) => {
  const { t } = useTranslation('settings')
  const [localValue, setLocalValue] = useState(setting.value)
  const [isEditing, setIsEditing] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const isBoolean = isBooleanString(setting.value) && !isSensitive(setting.key)
  const isJson = isJsonString(setting.value) && !isBooleanString(setting.value)
  const [jsonValue, setJsonValue] = useState<JsonValue | null>(null)

  useEffect(() => {
    setLocalValue(setting.value)

    if (isJsonString(setting.value)) {
      setJsonValue(JSON.parse(setting.value))
    }
  }, [setting.value])

  const handleSave = async () => {
    const valueChanged = localValue !== setting.value
    const isSensitiveKey = isSensitive(setting.key)
    const isCurrentlyEncrypted = isEncrypted(localValue)

    if (valueChanged || (isSensitiveKey && !isCurrentlyEncrypted)) {
      await onUpdate(setting.key, localValue, setting.category, setting.description)
    }

    setIsEditing(false)
  }

  const handleJsonSave = async () => {
    const stringValue = JSON.stringify(jsonValue, null, 2)
    const valueChanged = stringValue !== setting.value
    const isSensitiveKey = isSensitive(setting.key)
    const encryptedValueCandidate = typeof jsonValue === 'string' ? jsonValue : stringValue
    const isCurrentlyEncrypted = isEncrypted(encryptedValueCandidate)

    if (valueChanged || (isSensitiveKey && !isCurrentlyEncrypted)) {
      await onUpdate(setting.key, stringValue, setting.category, setting.description)
    }

    setIsEditing(false)
  }

  const handleCancel = () => {
    setLocalValue(setting.value)

    if (isJsonString(setting.value)) {
      setJsonValue(JSON.parse(setting.value))
    }

    setIsEditing(false)
  }

  let content: React.ReactNode

  if (isBoolean) {
    content = (
      <BooleanToggle
        setting={setting}
        onUpdate={onUpdate}
        onDelete={onDelete}
        isSaving={isSaving}
        readOnly={readOnly}
      />
    )
  } else if (isEditing) {
    content = (
      <EditingView
        isJson={isJson}
        jsonValue={jsonValue}
        setJsonValue={setJsonValue}
        localValue={localValue}
        setLocalValue={setLocalValue}
        onJsonSave={handleJsonSave}
        onSave={handleSave}
        onCancel={handleCancel}
        isSaving={isSaving}
        readOnly={readOnly}
      />
    )
  } else {
    content = (
      <DisplayView
        setting={setting}
        showDeleteConfirm={showDeleteConfirm}
        setShowDeleteConfirm={setShowDeleteConfirm}
        setIsEditing={setIsEditing}
        onDelete={onDelete}
        isSaving={isSaving}
        readOnly={readOnly}
      />
    )
  }

  return (
    <div className='bg-alpine-50 border border-dark-600 rounded-2xl p-3 hover:border-muted-400 transition-colors'>
      <div className='flex items-start justify-between mb-2'>
        <div className='flex-1 min-w-0'>
          <div className='flex items-center gap-2 mb-1 flex-wrap'>
            <h3 className='text-sm font-semibold text-alpine-900'>{setting.key}</h3>
            <span
              className={`px-1.5 py-0.5 rounded text-xs font-medium ${getCategoryColor(setting.category)}`}
            >
              {setting.category}
            </span>
            {isJson && (
              <span className='px-1.5 py-0.5 rounded text-xs font-medium bg-purple-50 text-purple-700'>
                {t('item.badges.json')}
              </span>
            )}
            {isSensitive(setting.key) && (
              <span className='px-1.5 py-0.5 rounded text-xs font-medium bg-warning-50 text-warning-700'>
                {t('item.badges.sensitive')}
              </span>
            )}
          </div>
          {setting.description && <p className='text-muted-600 text-xs'>{setting.description}</p>}
        </div>
      </div>
      <div className='space-y-2'>{content}</div>
    </div>
  )
}
