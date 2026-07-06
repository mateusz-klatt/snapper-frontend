import React from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { ThemeSelect } from '../../../components/ThemeSelect'

const TEXT_INPUT_CLASSES =
  'w-full rounded-md border bg-alpine-50 px-3 py-2 text-alpine-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500'

const PASSWORD_INPUT_CLASSES =
  'w-full rounded-md border bg-alpine-50 px-3 py-2 pr-10 text-alpine-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500'

const errorBorderClass = (error: string | undefined): string =>
  error ? 'border-loss-500' : 'border-dark-600'

const inputClasses = (
  baseClasses: string,
  error: string | undefined,
  className: string | undefined
): string => `${baseClasses} ${errorBorderClass(error)}${className ? ` ${className}` : ''}`

interface AdminFieldFrameProps {
  id: string
  label: string
  error?: string | undefined
  children: React.ReactNode
}

export const AdminFieldFrame: React.FC<Readonly<AdminFieldFrameProps>> = ({
  id,
  label,
  error,
  children,
}) => (
  <div>
    <label htmlFor={id} className='block text-sm font-medium text-alpine-900 mb-2'>
      {label}
    </label>
    {children}
    {error && <p className='mt-1 text-sm text-loss-600'>{error}</p>}
  </div>
)

interface AdminTextFieldProps {
  id: string
  label: string
  type: 'email' | 'text'
  value: string
  placeholder: string
  onChange?: ((value: string) => void) | undefined
  error?: string | undefined
  disabled?: boolean | undefined
  readOnly?: boolean | undefined
  className?: string | undefined
}

export const AdminTextField: React.FC<Readonly<AdminTextFieldProps>> = ({
  id,
  label,
  type,
  value,
  onChange,
  placeholder,
  error,
  disabled,
  readOnly,
  className,
}) => (
  <AdminFieldFrame id={id} label={label} error={error}>
    <input
      type={type}
      id={id}
      value={value}
      onChange={onChange !== undefined ? event => onChange(event.target.value) : undefined}
      disabled={disabled}
      readOnly={readOnly}
      className={inputClasses(TEXT_INPUT_CLASSES, error, className)}
      placeholder={placeholder}
    />
  </AdminFieldFrame>
)

interface AdminPasswordFieldProps {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  placeholder: string
  visible: boolean
  onToggleVisible: () => void
  error?: string | undefined
}

export const AdminPasswordField: React.FC<Readonly<AdminPasswordFieldProps>> = ({
  id,
  label,
  value,
  onChange,
  placeholder,
  visible,
  onToggleVisible,
  error,
}) => (
  <AdminFieldFrame id={id} label={label} error={error}>
    <div className='relative'>
      <input
        type={visible ? 'text' : 'password'}
        id={id}
        value={value}
        onChange={event => onChange(event.target.value)}
        className={inputClasses(PASSWORD_INPUT_CLASSES, error, undefined)}
        placeholder={placeholder}
      />
      <button
        type='button'
        onClick={onToggleVisible}
        className='absolute inset-y-0 right-0 flex items-center pr-3 text-muted-400 hover:text-muted-600'
      >
        {visible ? <EyeOff className='w-4 h-4' /> : <Eye className='w-4 h-4' />}
      </button>
    </div>
  </AdminFieldFrame>
)

interface AdminSelectOption {
  value: string
  label: string
}

interface AdminSelectFieldProps {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  options: readonly AdminSelectOption[]
  placeholder?: string | undefined
  error?: string | undefined
}

export const AdminSelectField: React.FC<Readonly<AdminSelectFieldProps>> = ({
  id,
  label,
  value,
  onChange,
  options,
  placeholder,
  error,
}) => (
  <AdminFieldFrame id={id} label={label} error={error}>
    <ThemeSelect
      id={id}
      value={value}
      onChange={onChange}
      options={options}
      {...(placeholder !== undefined ? { placeholder } : {})}
    />
  </AdminFieldFrame>
)
