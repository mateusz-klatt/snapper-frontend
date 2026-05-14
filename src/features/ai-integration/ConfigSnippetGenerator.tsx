import React, { useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, Check, Clipboard } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '../../components/ui'
import { buildMcpConfigSnippet } from './buildMcpConfigSnippet'
import type { DelegateCreatedPayload } from '../../types/api'

export function ConfigSnippetGenerator({
  payload,
}: Readonly<{ payload: DelegateCreatedPayload }>): React.ReactElement {
  const { t } = useTranslation('aiIntegration')
  const [copied, setCopied] = useState(false)
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const snippet = useMemo(
    () => buildMcpConfigSnippet(payload, globalThis.location.origin),
    [payload]
  )

  useEffect(() => {
    return () => {
      if (copiedTimerRef.current !== null) {
        globalThis.clearTimeout(copiedTimerRef.current)
      }
    }
  }, [])

  const handleCopy = async (): Promise<void> => {
    await navigator.clipboard.writeText(snippet)
    setCopied(true)

    if (copiedTimerRef.current !== null) {
      globalThis.clearTimeout(copiedTimerRef.current)
    }

    copiedTimerRef.current = globalThis.setTimeout(() => {
      setCopied(false)
      copiedTimerRef.current = null
    }, 2000)
  }

  return (
    <div className='space-y-4'>
      <div
        className='flex items-start gap-3 p-4 rounded-lg bg-loss-50 border border-loss-200 text-loss-800'
        role='alert'
      >
        <AlertTriangle className='w-5 h-5 shrink-0 mt-0.5' />
        <div>
          <h3 className='font-semibold'>{t('snippet.warningTitle')}</h3>
          <p className='text-sm'>{t('snippet.warningMessage')}</p>
        </div>
      </div>

      <div>
        <label
          htmlFor='mcp-config-snippet'
          className='block text-sm font-medium text-muted-700 mb-1'
        >
          <code>.mcp.json</code>
        </label>
        <textarea
          id='mcp-config-snippet'
          readOnly
          rows={14}
          value={snippet}
          className='w-full font-mono text-xs p-3 rounded-lg border border-dark-600 bg-dark-700 text-muted-100'
        />
        <p className='mt-2 text-xs text-muted-600'>{t('snippet.snippetHelp')}</p>
      </div>

      <div className='flex items-center justify-between'>
        <p className='text-xs text-muted-500'>
          {t('snippet.baseUrlHelpPrefix')}
          <code>/api/mcp</code>
          {t('snippet.baseUrlHelpSuffix')}
        </p>
        <Button variant='primary' onClick={handleCopy} aria-label={t('snippet.copyAriaLabel')}>
          {copied ? (
            <>
              <Check className='w-4 h-4 mr-1 inline' />
              {t('snippet.copied')}
            </>
          ) : (
            <>
              <Clipboard className='w-4 h-4 mr-1 inline' />
              {t('snippet.copy')}
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
