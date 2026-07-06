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

interface FormAction {
  key: 'cancel' | 'submit'
  label: string
  icon: React.ComponentType<{ className?: string | undefined }>
  type: 'button' | 'submit'
  variant: 'primary' | 'secondary'
  loading: boolean
  disabled?: boolean | undefined
  onClick?: (() => void) | undefined
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
}) => {
  const actions: FormAction[] = [
    {
      key: 'cancel',
      label: cancelLabel,
      icon: X,
      type: 'button',
      variant: 'secondary',
      loading: false,
      disabled: isPending,
      onClick: onClose,
    },
    {
      key: 'submit',
      label: submitLabel,
      icon: Save,
      type: 'submit',
      variant: 'primary',
      disabled: readOnly,
      loading: isPending,
    },
  ]

  return (
    <Modal open={open} onClose={onClose} title={title} size={size}>
      <form onSubmit={onSubmit} className='space-y-6'>
        <fieldset disabled={readOnly} className='space-y-6'>
          {children}
        </fieldset>
        <div className='flex justify-end space-x-3 pt-4 border-t border-dark-600'>
          {actions.map(action => {
            const Icon = action.icon

            return (
              <Button
                key={action.key}
                type={action.type}
                variant={action.variant}
                size='sm'
                onClick={action.onClick}
                loading={action.loading}
                disabled={action.disabled}
              >
                <Icon className='w-3.5 h-3.5' />
                {action.label}
              </Button>
            )
          })}
        </div>
      </form>
    </Modal>
  )
}
