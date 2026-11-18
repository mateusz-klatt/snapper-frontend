import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, renderHook } from '@testing-library/react'

type ConsentRequestModule = typeof import('./consentRequest')

const load = async (): Promise<ConsentRequestModule> => {
  vi.resetModules()

  return import('./consentRequest')
}

const visit = (url: string, state: unknown = null): void => {
  globalThis.history.replaceState(state, '', url)
}

const flowOf = (module: ConsentRequestModule) => renderHook(() => module.useConsentFlow())

describe('consentRequest', () => {
  beforeEach(() => {
    visit('/')
  })

  afterEach(() => {
    vi.restoreAllMocks()
    visit('/')
  })

  it('captures the fragment once and scrubs the current entry, keeping history state', async () => {
    const module = await load()

    visit('/oauth/authorize?ignored=1#request=opaque-1', { kept: true })
    module.captureConsentRequest()

    expect(globalThis.location.pathname).toBe('/oauth/authorize')
    expect(globalThis.location.search).toBe('')
    expect(globalThis.location.hash).toBe('')
    expect(globalThis.history.state).toEqual({ kept: true })
    expect(flowOf(module).result.current).toEqual({ request: 'opaque-1', generation: 1 })
  })

  it('keeps the captured value across remounts and leaves a clean URL alone', async () => {
    const module = await load()

    visit('/oauth/authorize#request=opaque-1')
    module.captureConsentRequest()
    const replaceState = vi.spyOn(globalThis.history, 'replaceState')
    const first = flowOf(module)

    first.unmount()

    expect(flowOf(module).result.current).toEqual({ request: 'opaque-1', generation: 1 })
    expect(replaceState).not.toHaveBeenCalled()
  })

  it('never takes the capability from the query string', async () => {
    const module = await load()

    visit('/oauth/authorize?request=from-query')

    expect(flowOf(module).result.current).toEqual({ request: null, generation: 0 })
    expect(globalThis.location.search).toBe('')
  })

  it('treats an empty or unrelated fragment as a new flow without a request', async () => {
    const module = await load()

    visit('/oauth/authorize#request=opaque-1')
    module.captureConsentRequest()
    visit('/oauth/authorize#request=')
    module.captureConsentRequest()

    expect(flowOf(module).result.current).toEqual({ request: null, generation: 2 })
  })

  it('switches to a genuinely new flow announced by a fragment change', async () => {
    const module = await load()

    visit('/oauth/authorize#request=opaque-1')
    const { result, unmount } = flowOf(module)

    expect(result.current).toEqual({ request: 'opaque-1', generation: 1 })

    act(() => {
      visit('/oauth/authorize#request=opaque-2')
      globalThis.dispatchEvent(new HashChangeEvent('hashchange'))
    })

    expect(result.current).toEqual({ request: 'opaque-2', generation: 2 })
    unmount()
    const removeEventListener = vi.spyOn(globalThis, 'removeEventListener')

    flowOf(module).unmount()
    expect(removeEventListener).toHaveBeenCalledWith('hashchange', expect.any(Function))
  })

  it('forgets the capability once released', async () => {
    const module = await load()

    visit('/oauth/authorize#request=opaque-1')
    module.captureConsentRequest()
    module.releaseConsentRequest()

    expect(flowOf(module).result.current).toEqual({ request: null, generation: 1 })
  })
})
