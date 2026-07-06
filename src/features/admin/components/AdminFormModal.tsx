import React from 'react'
import { Save, X } from 'lucide-react'
import { Button } from '../../../components/ui'
import { Modal } from '../../../components/ui/Modal'

interface AdminFormModalProps {
  open: boolean
  onClose: () => void
  title: string
  size: 'sm' | 'md' | 'lg' | 'xl'
  onSubmit: (event: React.SubmitEvent<HTMLFormElement>) => void | Promise<void>
  readOnly?: boolean | undefined
  isPending: boolean
  cancelLabel: string
  submitLabel: string
  children: React.ReactNode
}

export const AdminFormModal: React.FC<Readonly<AdminFormModalProps>> = ({
  open,
  onClose,
  title,
  size,
  onSubmit,
  readOnly,
  isPending,
  cancelLabel,
  submitLabel,
  children,
}) => (
  <Modal open={open} onClose={onClose} title={title} size={size}>
    <form onSubmit={onSubmit} className='space-y-6'>
      <fieldset disabled={readOnly} className='space-y-6'>
        {children}
      </fieldset>
      <div className='flex justify-end space-x-3 pt-4 border-t border-dark-600'>
        <Button type='button' variant='secondary' size='sm' onClick={onClose} disabled={isPending}>
          <X className='w-3.5 h-3.5' />
          {cancelLabel}
        </Button>
        <Button type='submit' variant='primary' size='sm' loading={isPending} disabled={readOnly}>
          <Save className='w-3.5 h-3.5' />
          {submitLabel}
        </Button>
      </div>
    </form>
  </Modal>
)
