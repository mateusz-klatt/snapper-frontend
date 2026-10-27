import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Modal } from '../../components/ui/Modal'
import { ThemeSelect } from '../../components/ThemeSelect'
import { useIsReadOnly } from '../../hooks/useIsReadOnly'

interface AddSettingModalProps {
  open: boolean
  onClose: () => void
  onSave: (key: string, value: string, category: string, description: string) => Promise<void>
  existingCategories: string[]
  readOnly?: boolean
}

export const AddSettingModal = ({
  open,
  onClose,
  onSave,
  existingCategories,
  readOnly: inheritedReadOnly = false,
}: AddSettingModalProps) => {
  const { t } = useTranslation('settings')
  const isTimeTraveling = useIsReadOnly()
  const readOnly = isTimeTraveling || inheritedReadOnly
  const [key, setKey] = useState('')
  const [value, setValue] = useState('')
  const [category, setCategory] = useState('')
  const [newCategory, setNewCategory] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const resetForm = () => {
    setKey('')
    setValue('')
    setCategory('')
    setNewCategory('')
    setDescription('')
    setError(null)
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const handleSave = async () => {
    if (readOnly) return

    if (!key.trim()) {
      setError(t('addModal.validation.keyRequired'))

      return
    }

    if (!value.trim()) {
      setError(t('addModal.validation.valueRequired'))

      return
    }

    const finalCategory = newCategory.trim() || category

    if (!finalCategory) {
      setError(t('addModal.validation.categoryRequired'))

      return
    }

    try {
      setSaving(true)
      setError(null)
      await onSave(key.trim(), value, finalCategory, description.trim())
      handleClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.createFailed'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={handleClose} title={t('addModal.title')} size='md'>
      <form
        onSubmit={event => {
          event.preventDefault()
          void handleSave()
        }}
        className='space-y-4'
      >
        {readOnly && (
          <p role='status' className='text-sm text-accent-600'>
            {t('page.readOnly')}
          </p>
        )}
        {error && (
          <div className='p-3 bg-loss-50 border border-loss-500 rounded-lg'>
            <p className='text-loss-700 text-sm'>{error}</p>
          </div>
        )}
        <div>
          <label htmlFor='setting-key' className='block text-sm font-medium text-muted-700 mb-1'>
            {t('addModal.keyLabel')} <span className='text-loss-400'>*</span>
          </label>
          <input
            id='setting-key'
            readOnly={readOnly}
            type='text'
            value={key}
            onChange={e => setKey(e.target.value)}
            placeholder={t('addModal.keyPlaceholder')}
            className='w-full px-3 py-2 text-sm bg-alpine-50 border border-dark-600 rounded-lg text-alpine-900 placeholder-muted-400 focus:outline-none focus:border-brand-500'
          />
          <p className='mt-1 text-xs text-muted-500'>{t('addModal.keyHint')}</p>
        </div>
        <div>
          <label htmlFor='setting-value' className='block text-sm font-medium text-muted-700 mb-1'>
            {t('addModal.valueLabel')} <span className='text-loss-400'>*</span>
          </label>
          <textarea
            id='setting-value'
            readOnly={readOnly}
            value={value}
            onChange={e => setValue(e.target.value)}
            placeholder={t('addModal.valuePlaceholder')}
            rows={3}
            className='w-full px-3 py-2 text-sm bg-alpine-50 border border-dark-600 rounded-lg text-alpine-900 placeholder-muted-400 focus:outline-none focus:border-brand-500 font-mono'
          />
        </div>
        <div>
          <label
            htmlFor='setting-category'
            className='block text-sm font-medium text-muted-700 mb-1'
          >
            {t('addModal.categoryLabel')} <span className='text-loss-400'>*</span>
          </label>
          <div className='flex gap-2'>
            <ThemeSelect
              id='setting-category'
              disabled={readOnly}
              value={category}
              onChange={val => {
                setCategory(val)
                if (val) setNewCategory('')
              }}
              options={existingCategories.map(cat => ({ value: cat, label: cat }))}
              placeholder={t('addModal.categorySelectPlaceholder')}
              className='flex-1'
            />
          </div>
          <div className='mt-2'>
            <input
              type='text'
              readOnly={readOnly}
              value={newCategory}
              onChange={e => {
                setNewCategory(e.target.value)
                if (e.target.value) setCategory('')
              }}
              placeholder={t('addModal.newCategoryPlaceholder')}
              className='w-full px-3 py-2 text-sm bg-alpine-50 border border-dark-600 rounded-lg text-alpine-900 placeholder-muted-400 focus:outline-none focus:border-brand-500'
            />
          </div>
        </div>
        <div>
          <label
            htmlFor='setting-description'
            className='block text-sm font-medium text-muted-700 mb-1'
          >
            {t('addModal.descriptionLabel')}
          </label>
          <textarea
            id='setting-description'
            readOnly={readOnly}
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder={t('addModal.descriptionPlaceholder')}
            rows={2}
            className='w-full px-3 py-2 text-sm bg-alpine-50 border border-dark-600 rounded-lg text-alpine-900 placeholder-muted-400 focus:outline-none focus:border-brand-500'
          />
        </div>
        <div className='flex justify-end gap-2 pt-2'>
          <button
            type='button'
            onClick={handleClose}
            className='px-4 py-2 text-sm bg-muted-100 hover:bg-muted-200 text-alpine-900 rounded-lg transition-colors'
          >
            {t('addModal.cancel')}
          </button>
          <button
            type='submit'
            disabled={saving || readOnly}
            className='px-4 py-2 text-sm bg-brand-600 hover:bg-brand-700 disabled:bg-brand-800 disabled:cursor-not-allowed text-white rounded-lg transition-colors'
          >
            {saving ? t('addModal.creating') : t('addModal.create')}
          </button>
        </div>
      </form>
    </Modal>
  )
}
