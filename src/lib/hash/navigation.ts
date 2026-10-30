type AppNavigation = {
  readonly destination: URL
  readonly click: MouseEvent | null
  scripted: boolean
}

let pending: AppNavigation[] = []

const route = (url: URL): string =>
  `${url.origin}${url.pathname}${url.search}${url.hash.split('?')[0]}`

const remove = (navigation: AppNavigation): void => {
  pending = pending.filter(candidate => candidate !== navigation)
  if (pending.length === 0) globalThis.removeEventListener('hashchange', onHashChange)
}

const onHashChange = (event: HashChangeEvent): void => {
  const navigation = pending.find(candidate => candidate.destination.href === event.newURL)

  if (navigation) remove(navigation)
}

const remember = (destination: URL, click: MouseEvent | null): AppNavigation => {
  const navigation = { destination, click, scripted: click === null }

  pending.push(navigation)
  globalThis.addEventListener('hashchange', onHashChange)

  return navigation
}

/** Preserve native fragment navigation while identifying its application origin. */
export function navigateHash(hash: string): void {
  const destination = new URL(`#${hash.replace(/^#/, '')}`, globalThis.location.href)

  if (destination.hash === globalThis.location.hash) return

  const anchorNavigation = pending.find(
    candidate =>
      candidate.destination.href === destination.href &&
      candidate.click !== null &&
      candidate.click.eventPhase !== Event.NONE
  )

  if (anchorNavigation) anchorNavigation.scripted = true
  else remember(destination, null)
  globalThis.location.hash = hash
}

/**
 * Match the route through scope-query normalization and final trusted-click cancellation.
 * Capture microtasks can precede target handlers, so cancellation is checked again here.
 */
export function isAppHashNavigationPending(): boolean {
  for (const navigation of pending) {
    if (navigation.click?.defaultPrevented && !navigation.scripted) remove(navigation)
  }

  const currentRoute = route(new URL(globalThis.location.href))

  return pending.some(navigation => route(navigation.destination) === currentRoute)
}

/** Observe ordinary links without changing their default or modified-click behavior. */
export function observeAppHashNavigation(): () => void {
  const onClick = (event: MouseEvent): void => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey ||
      !(event.target instanceof Element)
    )
      return

    const anchor = event.target.closest('a[href]')

    if (
      !(anchor instanceof HTMLAnchorElement) ||
      anchor.hasAttribute('download') ||
      (anchor.target !== '' && anchor.target.toLowerCase() !== '_self')
    )
      return

    const destination = new URL(anchor.href)
    const current = new URL(globalThis.location.href)

    if (
      destination.origin !== current.origin ||
      destination.pathname !== current.pathname ||
      destination.search !== current.search ||
      destination.hash === current.hash ||
      destination.hash === ''
    )
      return

    if (pending.some(navigation => navigation.click === event)) return

    const navigation = remember(destination, event)

    setTimeout(() => {
      if (event.defaultPrevented && !navigation.scripted) remove(navigation)
    }, 0)
  }

  document.addEventListener('click', onClick, true)

  return () => document.removeEventListener('click', onClick, true)
}
