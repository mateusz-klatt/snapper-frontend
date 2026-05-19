import React from 'react'

interface AlertToastBodyProps {
  message: string
  cta: string
  onClick: () => void
}

/**
 * Body component for the live-refresh alert toast.
 *
 * The Phase E follow-up dispatcher (`stores/wsDispatcher.ts`) renders
 * this component via `React.createElement(AlertToastBody, ...)` from
 * inside `scheduleAlertToast`. Splitting the JSX out keeps the
 * dispatcher a pure `.ts` state-machine while letting the toast
 * markup live with the rest of the alerts feature.
 *
 * Layout: a two-line text block (title + body, joined by `\n`) above
 * a CTA button that opens the alert's detail modal. The button is
 * positioned underneath so a missed-tap on the text doesn't
 * accidentally fire the navigation — only the button-area click
 * matters.
 *
 * Props:
 *   `message`: the joined "title\nbody" string. Already locale-
 *     resolved server-side (Phase D `user.default_language`).
 *   `cta`: the localized call-to-action label ("View" / "Wyświetl"
 *     / …) — looked up via `i18n.t('toast.cta.view', { ns: 'alerts' })`
 *     by the dispatcher.
 *   `onClick`: handler invoked on CTA click — the dispatcher injects
 *     a closure that dismisses the toast and navigates to the alert's
 *     deep-link hash.
 */
export const AlertToastBody: React.FC<AlertToastBodyProps> = ({ message, cta, onClick }) => {
  return (
    <div className='flex flex-col gap-2'>
      <pre className='whitespace-pre-wrap text-sm leading-tight'>{message}</pre>
      <button
        type='button'
        onClick={onClick}
        className='self-start text-xs font-medium text-brand-700 hover:text-brand-900 hover:underline'
      >
        {cta}
      </button>
    </div>
  )
}
