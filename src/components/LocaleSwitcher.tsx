import React, { useCallback, useMemo, useRef, useState } from 'react'
import * as Popover from '@radix-ui/react-popover'
import { useTranslation } from 'react-i18next'
import { ChevronDown, Languages } from 'lucide-react'
import { clsx } from 'clsx'
import { useAppStore } from '../stores/app'
import { LOCALES } from '../i18n/locales'
import { ROW_1, ROW_2, ROW_3 } from '../i18n/types'
import { getCatalogLanguage } from '../i18n/countryLanguages'
import type { AppLocale } from '../i18n/types'

const ROWS: readonly [readonly AppLocale[], readonly AppLocale[], readonly AppLocale[]] = [
  ROW_1,
  ROW_2,
  ROW_3,
] as const
const COLS = 15

interface Neighbours {
  readonly left: AppLocale
  readonly right: AppLocale
  readonly up: AppLocale
  readonly down: AppLocale
}

const buildNeighbourMap = (): Readonly<Record<AppLocale, Neighbours>> => {
  const map: Record<string, Neighbours> = {}

  for (let r = 0; r < ROWS.length; r++) {
    const row = ROWS[r] as readonly AppLocale[]

    for (let c = 0; c < COLS; c++) {
      const code = row[c] as AppLocale
      const leftCol = (c - 1 + COLS) % COLS
      const rightCol = (c + 1) % COLS
      const upRow = Math.max(r - 1, 0)
      const downRow = Math.min(r + 1, ROWS.length - 1)

      map[code] = {
        left: (ROWS[r] as readonly AppLocale[])[leftCol] as AppLocale,
        right: (ROWS[r] as readonly AppLocale[])[rightCol] as AppLocale,
        up: (ROWS[upRow] as readonly AppLocale[])[c] as AppLocale,
        down: (ROWS[downRow] as readonly AppLocale[])[c] as AppLocale,
      }
    }
  }

  return map as Record<AppLocale, Neighbours>
}

const NEIGHBOURS: Readonly<Record<AppLocale, Neighbours>> = buildNeighbourMap()

const buildNameMap = (language: string): Readonly<Record<AppLocale, string>> => {
  const display = new Intl.DisplayNames([language], { type: 'region' })
  const out: Record<string, string> = {}

  for (const row of ROWS) {
    for (const code of row) {
      out[code] = display.of(code.toUpperCase()) as string
    }
  }

  return out as Record<AppLocale, string>
}

const COUNTRY_NAMES_BY_LANG: Record<string, Readonly<Record<AppLocale, string>>> = {}

const countryName = (code: AppLocale, displayLanguage: string): string => {
  const cached = COUNTRY_NAMES_BY_LANG[displayLanguage] ?? buildNameMap(displayLanguage)

  COUNTRY_NAMES_BY_LANG[displayLanguage] = cached

  return cached[code]
}

interface LocaleSwitcherProps {
  readonly align?: 'start' | 'center' | 'end'
  readonly triggerClassName?: string
}

const LocaleSwitcher: React.FC<Readonly<LocaleSwitcherProps>> = ({
  align = 'end',
  triggerClassName,
}) => {
  const locale = useAppStore(s => s.locale)
  const setLocale = useAppStore(s => s.setLocale)
  const { t } = useTranslation('common')
  const [open, setOpen] = useState(false)
  const buttonRefs = useRef<Map<AppLocale, HTMLButtonElement>>(new Map())

  const displayLanguage = useMemo(() => getCatalogLanguage(locale), [locale])

  const focusByCode = useCallback((code: AppLocale) => {
    buttonRefs.current.get(code)?.focus()
  }, [])

  const handleSelect = useCallback(
    (code: AppLocale) => {
      setLocale(code)
      setOpen(false)
    },
    [setLocale]
  )

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>, code: AppLocale) => {
      const key = event.key
      const neighbours = NEIGHBOURS[code]

      if (key === 'ArrowRight') {
        event.preventDefault()
        focusByCode(neighbours.right)

        return
      }

      if (key === 'ArrowLeft') {
        event.preventDefault()
        focusByCode(neighbours.left)

        return
      }

      if (key === 'ArrowDown') {
        event.preventDefault()
        focusByCode(neighbours.down)

        return
      }

      if (key === 'ArrowUp') {
        event.preventDefault()
        focusByCode(neighbours.up)
      }
    },
    [focusByCode]
  )

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type='button'
          aria-label={t('localeSwitcher.triggerAriaLabel')}
          title={t('localeSwitcher.triggerAriaLabel')}
          className={clsx(
            'inline-flex items-center gap-1 rounded-lg p-2 text-muted-600 hover:bg-dark-700 transition-colors',
            'focus:outline-hidden focus:ring-2 focus:ring-brand-500',
            triggerClassName
          )}
        >
          <span aria-hidden='true' className='text-base leading-none'>
            {LOCALES[locale].flag}
          </span>
          <Languages size={14} className='hidden sm:inline' />
          <ChevronDown size={12} aria-hidden='true' />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          side='bottom'
          align={align}
          sideOffset={6}
          onOpenAutoFocus={event => {
            event.preventDefault()
            buttonRefs.current.get(locale)?.focus()
          }}
          className='z-50 rounded-xl border border-dark-600 bg-alpine-50 p-2 shadow-lg'
        >
          <div className='flex flex-col gap-0.5'>
            {ROWS.map(row => (
              <div key={row.join('-')} className='flex flex-nowrap gap-0.5'>
                {row.map(code => {
                  const isCurrent = code === locale
                  const country = countryName(code, displayLanguage)
                  const labelKey = isCurrent
                    ? 'localeSwitcher.currentAriaLabel'
                    : 'localeSwitcher.flagAriaLabel'

                  return (
                    <button
                      key={code}
                      ref={el => {
                        if (el === null) {
                          buttonRefs.current.delete(code)

                          return
                        }

                        buttonRefs.current.set(code, el)
                      }}
                      type='button'
                      onClick={() => handleSelect(code)}
                      onKeyDown={e => handleKeyDown(e, code)}
                      aria-label={t(labelKey, { country })}
                      aria-current={isCurrent ? 'true' : undefined}
                      data-current={isCurrent ? 'true' : undefined}
                      className={clsx(
                        'flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-base',
                        'hover:bg-dark-700 transition-colors',
                        'focus:outline-hidden focus:ring-2 focus:ring-brand-500',
                        isCurrent && 'bg-brand-500/15 ring-1 ring-brand-500'
                      )}
                    >
                      <span aria-hidden='true'>{LOCALES[code].flag}</span>
                    </button>
                  )
                })}
              </div>
            ))}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}

export default LocaleSwitcher
