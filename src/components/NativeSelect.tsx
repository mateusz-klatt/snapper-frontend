import React from 'react'
import { ChevronDownIcon } from 'lucide-react'
import { clsx } from 'clsx'

interface SelectOption {
  readonly value: string
  readonly label: string
}

interface NativeSelectProps {
  readonly id?: string
  readonly value: string
  readonly onChange: (value: string) => void
  readonly options: readonly SelectOption[]
  readonly disabled?: boolean
  readonly className?: string
  readonly ariaLabel?: string
}

/**
 * Native ``<select>``-backed dropdown matching ``ThemeSelect`` styling.
 *
 * Use this in flows that need deterministic Playwright interaction
 * (``selectOption``) — Radix Select renders the listbox in a portal
 * outside the dialog DOM tree and exhibits non-deterministic
 * listbox-open timing under headless Chromium, which makes the place-
 * order happy-path test flaky. The native variant accepts keyboard
 * input on the trigger directly and lets Playwright pick options by
 * value without any portal traversal.
 *
 * The styling matches ``ThemeSelect`` (rounded-xl border, hover/focus
 * ring, placeholder colour) and exposes the same prop surface so the
 * two are drop-in interchangeable.
 */
export const NativeSelect: React.FC<Readonly<NativeSelectProps>> = ({
  id,
  value,
  onChange,
  options,
  disabled,
  className,
  ariaLabel,
}) => (
  <div className={clsx('relative inline-block', className)}>
    <select
      id={id}
      aria-label={ariaLabel}
      value={value}
      disabled={disabled}
      onChange={event => onChange(event.target.value)}
      className={clsx(
        'w-full appearance-none cursor-pointer rounded-xl border border-dark-600 bg-alpine-50 px-3 py-2 pr-8 text-sm text-alpine-900',
        'hover:bg-dark-50 focus:border-brand-500 focus:outline-hidden focus:ring-2 focus:ring-brand-500',
        'disabled:cursor-not-allowed disabled:opacity-50'
      )}
    >
      {options.map(option => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
    <ChevronDownIcon
      size={14}
      className='pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-500'
      aria-hidden='true'
    />
  </div>
)
