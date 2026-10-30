import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent } from '@testing-library/react'
import { isAppHashNavigationPending, navigateHash, observeAppHashNavigation } from './navigation'

const nextHashChange = (): Promise<HashChangeEvent> =>
  new Promise(resolve => globalThis.addEventListener('hashchange', resolve, { once: true }))

const link = (href = '#positions?wallet=w-main'): HTMLAnchorElement => {
  const anchor = document.createElement('a')

  anchor.href = href
  anchor.textContent = 'Positions'
  document.body.append(anchor)

  return anchor
}

describe('native application hash navigation origin', () => {
  let stopObserving: () => void

  beforeEach(() => {
    globalThis.history.replaceState(null, '', '#overview?wallet=w-main')
    stopObserving = observeAppHashNavigation()
  })

  afterEach(() => {
    stopObserving()
    document.body.replaceChildren()
    expect(isAppHashNavigationPending()).toBe(false)
  })

  it('preserves the native popstate then hashchange delivery and consumes its origin', async () => {
    const events: string[] = []

    const record = (event: Event): void => {
      events.push(event.type)
    }

    const changed = nextHashChange()

    globalThis.addEventListener('popstate', record)
    globalThis.addEventListener('hashchange', record)
    navigateHash('backtests/run-1?wallet=w-main')
    expect(globalThis.location.hash).toBe('#backtests/run-1?wallet=w-main')
    expect(isAppHashNavigationPending()).toBe(true)
    await changed
    expect(events).toEqual(['popstate', 'hashchange'])
    expect(isAppHashNavigationPending()).toBe(false)
    globalThis.removeEventListener('popstate', record)
    globalThis.removeEventListener('hashchange', record)
  })

  it('consumes the native event for an empty hash with its trailing fragment delimiter', async () => {
    const changed = nextHashChange()

    navigateHash('')
    expect(globalThis.location.hash).toBe('')
    expect(isAppHashNavigationPending()).toBe(true)
    expect((await changed).newURL).toBe(globalThis.location.href)
    expect(globalThis.location.href.endsWith('#')).toBe(true)
    expect(isAppHashNavigationPending()).toBe(false)
  })

  it('records one native anchor origin across overlapping scoped observers', async () => {
    const stopSecond = observeAppHashNavigation()
    const anchor = link()
    const changed = nextHashChange()

    fireEvent.click(anchor)
    await changed
    expect(isAppHashNavigationPending()).toBe(false)
    stopSecond()
  })

  it('does not reserve origin for a same-hash no-op', () => {
    navigateHash('#overview?wallet=w-main')
    expect(isAppHashNavigationPending()).toBe(false)
  })

  it('keeps native origin through time-query normalization but distinguishes detail routes', async () => {
    const changed = nextHashChange()

    navigateHash('#backtests/run-1?wallet=w-main')
    globalThis.history.replaceState(null, '', '#backtests/run-1?wallet=w-main&as_of=2026-10-29')
    expect(isAppHashNavigationPending()).toBe(true)
    globalThis.history.replaceState(null, '', '#backtests/run-2?wallet=w-main')
    expect(isAppHashNavigationPending()).toBe(false)
    await changed
  })

  it('consumes each rapid repeated destination exactly once before a real Back traversal', async () => {
    const changed = new Promise<void>(resolve => {
      let count = 0

      const onChange = (): void => {
        count += 1
        if (count !== 3) return

        globalThis.removeEventListener('hashchange', onChange)
        resolve()
      }

      globalThis.addEventListener('hashchange', onChange)
    })

    navigateHash('#positions?wallet=w-main')
    navigateHash('#overview?wallet=w-main')
    navigateHash('#positions?wallet=w-main')
    expect(isAppHashNavigationPending()).toBe(true)
    await changed
    expect(isAppHashNavigationPending()).toBe(false)
    const back = nextHashChange()

    globalThis.history.back()
    await back
    expect(globalThis.location.hash).toBe('#overview?wallet=w-main')
    expect(isAppHashNavigationPending()).toBe(false)
  })

  it('does not misidentify Back queued before native app-navigation events drain', async () => {
    const changed = new Promise<void>(resolve => {
      let count = 0

      const onChange = (): void => {
        count += 1
        if (count !== 2) return

        globalThis.removeEventListener('hashchange', onChange)
        resolve()
      }

      globalThis.addEventListener('hashchange', onChange)
    })

    navigateHash('#positions?wallet=w-main')
    globalThis.history.back()
    await changed
    expect(globalThis.location.hash).toBe('#overview?wallet=w-main')
    expect(isAppHashNavigationPending()).toBe(false)
  })

  it('observes a plain self-anchor without preventing its native navigation', async () => {
    const anchor = link()
    const changed = nextHashChange()
    const event = new MouseEvent('click', { bubbles: true, cancelable: true })

    anchor.target = '_SELF'
    anchor.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(false)
    await changed
    expect(globalThis.location.hash).toBe('#positions?wallet=w-main')
  })

  it('rejects cancelled origin when the capture checkpoint preceded target cancellation', () => {
    const checkpoint = vi
      .spyOn(globalThis, 'queueMicrotask')
      .mockImplementation(callback => callback())
    const anchor = link()

    anchor.addEventListener('click', event => event.preventDefault())

    try {
      fireEvent.click(anchor)
      globalThis.history.replaceState(null, '', anchor.href)
      expect(isAppHashNavigationPending()).toBe(false)
    } finally {
      checkpoint.mockRestore()
      globalThis.dispatchEvent(new HashChangeEvent('hashchange', { newURL: anchor.href }))
    }
  })

  it('cleans cancelled link bookkeeping in a later task without a scope classification', async () => {
    const anchor = link()

    anchor.addEventListener('click', event => event.preventDefault())
    fireEvent.click(anchor)
    await new Promise<void>(resolve => setTimeout(resolve, 0))
    globalThis.history.replaceState(null, '', anchor.href)
    expect(isAppHashNavigationPending()).toBe(false)
  })

  it('removes cancelled capture bookkeeping before a later genuine Back to that destination', async () => {
    globalThis.history.replaceState(null, '', '#positions?wallet=w-main')
    globalThis.history.pushState(null, '', '#overview?wallet=w-main')
    const anchor = link()

    anchor.addEventListener('click', event => event.preventDefault())
    fireEvent.click(anchor)
    await Promise.resolve()
    expect(isAppHashNavigationPending()).toBe(false)
    const back = nextHashChange()

    globalThis.history.back()
    await back
    expect(globalThis.location.hash).toBe('#positions?wallet=w-main')
    expect(isAppHashNavigationPending()).toBe(false)
  })

  it('does not duplicate a captured anchor when its handler uses the native navigation helper', async () => {
    const anchor = link()
    const changed = nextHashChange()

    anchor.addEventListener('click', event => {
      event.preventDefault()
      navigateHash(anchor.hash)
    })
    fireEvent.click(anchor)
    expect(isAppHashNavigationPending()).toBe(true)
    await changed
    expect(isAppHashNavigationPending()).toBe(false)
    const back = nextHashChange()

    globalThis.history.back()
    await back
    expect(isAppHashNavigationPending()).toBe(false)
  })

  it.each([
    { name: 'Alt', init: { altKey: true } },
    { name: 'Ctrl', init: { ctrlKey: true } },
    { name: 'Meta', init: { metaKey: true } },
    { name: 'Shift', init: { shiftKey: true } },
    { name: 'middle button', init: { button: 1 } },
  ])('leaves $name link behavior unclassified', async ({ init }) => {
    const anchor = link()

    anchor.addEventListener('click', event => event.preventDefault())
    fireEvent.click(anchor, init)
    await Promise.resolve()
    globalThis.history.replaceState(null, '', '#positions?wallet=w-main')
    expect(isAppHashNavigationPending()).toBe(false)
  })

  it.each([
    { name: 'download', href: '#positions?wallet=w-main', target: '', download: true },
    { name: 'new tab', href: '#positions?wallet=w-main', target: '_blank', download: false },
    { name: 'other frame', href: '#positions?wallet=w-main', target: 'frame', download: false },
    { name: 'same hash', href: '#overview?wallet=w-main', target: '', download: false },
    { name: 'no fragment', href: '/', target: '', download: false },
    { name: 'other origin', href: 'https://example.com/#positions', target: '', download: false },
    { name: 'other path', href: '/other#positions', target: '', download: false },
    { name: 'other query', href: '/?other=true#positions', target: '', download: false },
  ])('leaves $name links unclassified', async ({ href, target, download }) => {
    const anchor = link(href)

    anchor.target = target
    if (download) anchor.download = 'report'
    anchor.addEventListener('click', event => event.preventDefault())
    fireEvent.click(anchor)
    await Promise.resolve()
    globalThis.history.replaceState(null, '', anchor.hash)
    expect(isAppHashNavigationPending()).toBe(false)
  })

  it('ignores an already cancelled event, a non-element target and a non-anchor element', () => {
    const anchor = link()
    const cancelled = new MouseEvent('click', { bubbles: true, cancelable: true })

    cancelled.preventDefault()
    anchor.dispatchEvent(cancelled)
    document.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    fireEvent.click(document.body)
    globalThis.history.replaceState(null, '', anchor.hash)
    expect(isAppHashNavigationPending()).toBe(false)
  })

  it('ignores unrelated native hashchange events without consuming a queued origin', async () => {
    navigateHash('#positions?wallet=w-main')
    globalThis.dispatchEvent(new HashChangeEvent('hashchange'))
    expect(isAppHashNavigationPending()).toBe(true)
    await nextHashChange()
  })

  it('removes its anchor observer on stop', async () => {
    stopObserving()
    const anchor = link()
    const changed = nextHashChange()

    fireEvent.click(anchor)
    await changed
    expect(isAppHashNavigationPending()).toBe(false)
  })
})
