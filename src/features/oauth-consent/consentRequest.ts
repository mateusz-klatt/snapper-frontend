import { useEffect, useState } from 'react'
import { OAUTH_CONSENT_PATH } from './consentApi'

/**
 * Memory-only holder for the opaque consent request.
 *
 * The backend sends the browser to `/oauth/authorize#request=<opaque>`. The
 * value is a bearer capability until consent, so it never leaves the page:
 * it is read from the fragment once, the current history entry is scrubbed
 * back to the bare path, and the value lives in this module for the page's
 * lifetime. Login renders in place, so the value survives an in-document
 * login without any browser storage. A reload after the scrub has nothing
 * to read and the page shows the restart state.
 */
let captured: string | null = null
let generation = 0

const fragmentRequest = (fragment: string): string | null => {
  const value = new URLSearchParams(fragment.replace(/^#/, '')).get('request')

  return value === null || value.length === 0 ? null : value
}

export const captureConsentRequest = (): void => {
  const { hash, search } = globalThis.location

  if (hash !== '') {
    captured = fragmentRequest(hash)
    generation += 1
  }

  if (hash !== '' || search !== '') {
    globalThis.history.replaceState(globalThis.history.state, '', OAUTH_CONSENT_PATH)
  }
}

export const releaseConsentRequest = (): void => {
  captured = null
}

interface ConsentFlow {
  request: string | null
  generation: number
}

const currentFlow = (): ConsentFlow => {
  captureConsentRequest()

  return { request: captured, generation }
}

export const useConsentFlow = (): ConsentFlow => {
  const [flow, setFlow] = useState(currentFlow)

  useEffect(() => {
    const onHashChange = (): void => setFlow(currentFlow())

    globalThis.addEventListener('hashchange', onHashChange)

    return () => globalThis.removeEventListener('hashchange', onHashChange)
  }, [])

  return flow
}
