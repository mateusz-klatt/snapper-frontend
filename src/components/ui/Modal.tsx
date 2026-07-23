import React, { useCallback, useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import clsx from 'clsx'

import { ModalPortalContext } from './modalPortalContext'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

const getFocusableElements = (root: HTMLElement): HTMLElement[] =>
  Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    el => !el.hasAttribute('aria-hidden')
  )

export const Modal: React.FC<Readonly<ModalProps>> = ({
  open,
  onClose,
  title,
  children,
  size = 'md',
}) => {
  const { t } = useTranslation('common')
  const titleId = useId()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const previousActiveElement = useRef<HTMLElement | null>(null)
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null)

  const setDialogNode = useCallback((node: HTMLDialogElement | null) => {
    dialogRef.current = node
    setPortalContainer(node)
  }, [])

  useEffect(() => {
    const dialog = dialogRef.current

    if (dialog === null || !open) {
      return
    }

    previousActiveElement.current = document.activeElement as HTMLElement | null
    dialog.showModal()
    document.body.style.overflow = 'hidden'
    const focusable = getFocusableElements(contentRef.current as HTMLElement)

    focusable[0]?.focus()

    return () => {
      document.body.style.overflow = 'unset'
      previousActiveElement.current?.focus()
      previousActiveElement.current = null
    }
  }, [open])

  useEffect(() => {
    if (!open) {
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (event.defaultPrevented) {
          return
        }

        onClose()

        return
      }

      if (event.key !== 'Tab') {
        return
      }

      const focusable = getFocusableElements(contentRef.current as HTMLElement)

      if (focusable.length === 0) {
        event.preventDefault()

        return
      }

      const first = focusable[0] as HTMLElement
      const last = focusable.at(-1) as HTMLElement
      const active = document.activeElement

      if (event.shiftKey && active === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && active === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open, onClose])

  if (!open) return null
  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  }
  const modalContent = (
    <dialog
      ref={setDialogNode}
      className='fixed inset-0 z-50 m-0 h-full max-h-none w-full max-w-none overflow-y-auto bg-transparent p-0 backdrop:bg-muted-900/40'
      aria-labelledby={title ? titleId : undefined}
    >
      <div
        data-testid='modal-backdrop'
        aria-hidden='true'
        onClick={onClose}
        className='fixed inset-0 w-full h-full cursor-default'
      />
      <div className='relative flex min-h-full items-center justify-center p-4'>
        <div
          ref={contentRef}
          className={clsx(
            'relative w-full rounded-2xl border border-dark-600 bg-alpine-50 shadow-xl',
            sizeClasses[size]
          )}
        >
          {title && (
            <div className='flex items-center justify-between border-b border-dark-600 p-6'>
              <h3 id={titleId} className='text-lg font-semibold text-alpine-900'>
                {title}
              </h3>
              <button
                type='button'
                onClick={onClose}
                className='text-muted-500 transition-colors hover:text-alpine-900'
                aria-label={t('close')}
              >
                <svg className='w-6 h-6' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M6 18L18 6M6 6l12 12'
                  />
                </svg>
              </button>
            </div>
          )}
          <div className='p-6'>
            <ModalPortalContext.Provider value={portalContainer}>
              {children}
            </ModalPortalContext.Provider>
          </div>
        </div>
      </div>
    </dialog>
  )

  return createPortal(modalContent, document.body)
}
