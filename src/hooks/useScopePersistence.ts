import { useCallback, useEffect, useRef, useState } from 'react'
import { useAppStore } from '../stores/app'
import { isAppHashNavigationPending, observeAppHashNavigation } from '../lib/hash/navigation'
import { useOperators, useWallets } from './queries/wallets'

const STORAGE_KEY_WALLET = 'snapper-current-wallet'
const STORAGE_KEY_OPERATOR = 'snapper-current-operator'
const SENTINEL_ALL = '__all__'
const ISO_WITH_OFFSET =
  /^(\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01]))T(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d{1,3})?)?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/

type ScopeIds = { readonly wallet: string | null; readonly operator: string | null }
type ScopeSnapshot = ScopeIds & { readonly asOf: string | null }
type UrlScope = ScopeIds & { readonly hasParams: boolean }
type IdList = ReadonlyArray<{ readonly public_id: string }>
type Preference = { readonly specified: boolean; readonly value: string | null }
type Preferences = { readonly wallet: Preference; readonly operator: Preference }
type NavigationIntent = Preferences & {
  readonly asOf: string | null
  readonly validTime: boolean
  readonly hasParams: boolean
}
type PendingSelection = { readonly intent: NavigationIntent; readonly version: number }
type ScopeStatus = 'loading' | 'ready' | 'error'

const preference = (raw: string | null): Preference => ({
  specified: raw !== null,
  value: raw === SENTINEL_ALL ? null : raw,
})

const hashParams = (): URLSearchParams => {
  const hash = globalThis.location.hash
  const queryIdx = hash.indexOf('?')

  return new URLSearchParams(queryIdx === -1 ? '' : hash.slice(queryIdx + 1))
}

export function readUrlScope(): UrlScope {
  const params = hashParams()

  return {
    wallet: preference(params.get('wallet')).value,
    operator: preference(params.get('operator')).value,
    hasParams: params.has('wallet') || params.has('operator'),
  }
}

function storedPreferences(): Preferences {
  try {
    return {
      wallet: preference(globalThis.localStorage.getItem(STORAGE_KEY_WALLET)),
      operator: preference(globalThis.localStorage.getItem(STORAGE_KEY_OPERATOR)),
    }
  } catch {
    return { wallet: preference(null), operator: preference(null) }
  }
}

export function readLocalStorageScope(): ScopeIds {
  const stored = storedPreferences()

  return { wallet: stored.wallet.value, operator: stored.operator.value }
}

export function writeUrlScope(
  wallet: string | null,
  operator: string | null,
  asOf?: string | null
): void {
  const hash = globalThis.location.hash
  const queryIdx = hash.indexOf('?')
  const route = queryIdx === -1 ? hash.slice(1) : hash.slice(1, queryIdx)
  const params = hashParams()

  params.set('wallet', wallet ?? SENTINEL_ALL)
  params.set('operator', operator ?? SENTINEL_ALL)

  if (asOf !== undefined) {
    if (asOf === null) params.delete('as_of')
    else params.set('as_of', asOf)
  }

  const next = `#${route}?${params.toString()}`

  if (globalThis.location.hash !== next) globalThis.history.replaceState(null, '', next)
}

export function writeLocalStorageScope(wallet: string | null, operator: string | null): void {
  try {
    globalThis.localStorage.setItem(STORAGE_KEY_WALLET, wallet ?? SENTINEL_ALL)
    globalThis.localStorage.setItem(STORAGE_KEY_OPERATOR, operator ?? SENTINEL_ALL)
  } catch {
    void 0
  }
}

const snapshot = (): ScopeSnapshot => {
  const state = useAppStore.getState()

  return {
    wallet: state.currentWalletPublicId,
    operator: state.currentOperatorPublicId,
    asOf: state.asOf,
  }
}

const sameScope = (left: ScopeSnapshot, right: ScopeSnapshot): boolean =>
  left.wallet === right.wallet && left.operator === right.operator && left.asOf === right.asOf

const snapshotIntent = (scope: ScopeSnapshot): NavigationIntent => ({
  wallet: { specified: true, value: scope.wallet },
  operator: { specified: true, value: scope.operator },
  asOf: scope.asOf,
  validTime: true,
  hasParams: true,
})

function navigationIntent(): NavigationIntent {
  const params = hashParams()
  const raw = params.get('as_of')
  const match = raw === null ? null : ISO_WITH_OFFSET.exec(raw)
  const parsed = raw === null ? Number.NaN : Date.parse(raw)
  const validTime =
    raw === null ||
    (match !== null &&
      Number.isFinite(parsed) &&
      new Date(`${match[1]}T00:00:00Z`).toISOString().slice(0, 10) === match[1])

  return {
    wallet: preference(params.get('wallet')),
    operator: preference(params.get('operator')),
    hasParams: params.has('wallet') || params.has('operator'),
    validTime,
    asOf: raw !== null && validTime ? new Date(parsed).toISOString() : null,
  }
}

const pickValidId = (candidate: string | null, list: IdList): string | null =>
  candidate !== null && list.some(item => item.public_id === candidate) ? candidate : null

function resolvePreference(
  pref: Preference,
  list: IdList,
  fallback: string | null,
  current: string | null
): string | null {
  if (!pref.specified) return fallback
  if (pref.value === null) return null

  return pickValidId(pref.value, list) ?? pickValidId(current, list)
}

class ScopeSynchronizer {
  private pending: PendingSelection | null = null
  private running = false
  private stopped = false
  private initial = true
  private generation = 0
  private locationKey: string | null = null
  private needsRefresh = false
  private commitTarget: ScopeSnapshot | null = null
  private activeGeneration = 0
  private readonly unsubscribe: () => void
  private readonly stopObservingNavigation: () => void
  private readonly onLocation = (event?: Event): void => {
    const intent = navigationIntent()
    const key = JSON.stringify(intent)
    const isPendingHistoryRestore =
      event?.type === 'popstate' &&
      useAppStore.getState().isWalletSelectionPending() &&
      !isAppHashNavigationPending()

    if (key === this.locationKey && !isPendingHistoryRestore) return

    this.locationKey = key
    this.onStatus('loading')
    this.generation += 1
    this.pending = { intent, version: useAppStore.getState().reserveScopeSelection() }
    if (!this.running) void this.drain()
  }

  constructor(
    private wallets: IdList,
    private operators: IdList,
    private readonly onStatus: (status: ScopeStatus) => void
  ) {
    this.stopObservingNavigation = observeAppHashNavigation()
    globalThis.addEventListener('hashchange', this.onLocation)
    globalThis.addEventListener('popstate', this.onLocation)
    this.unsubscribe = useAppStore.subscribe((state, previous) => {
      if (
        state.currentWalletPublicId !== previous.currentWalletPublicId ||
        state.currentOperatorPublicId !== previous.currentOperatorPublicId ||
        state.asOf !== previous.asOf
      ) {
        const current = snapshot()

        if (
          this.running &&
          this.commitTarget !== null &&
          this.activeGeneration === this.generation &&
          sameScope(current, this.commitTarget)
        )
          return

        this.generation += 1
        const store = useAppStore.getState()
        const version =
          state.currentWalletPublicId !== previous.currentWalletPublicId ||
          state.currentOperatorPublicId !== previous.currentOperatorPublicId
            ? store.reserveScopeSelection()
            : store.invalidateScopeSelection()

        if (this.running) {
          const intent = snapshotIntent(current)

          this.pending = { intent, version }
          this.locationKey = JSON.stringify(intent)
        }

        this.persist()
      }
    })
    this.onLocation()
  }

  update(wallets: IdList, operators: IdList): void {
    this.wallets = wallets
    this.operators = operators
    const current = snapshot()

    if (
      (current.wallet !== null && pickValidId(current.wallet, wallets) === null) ||
      (current.operator !== null && pickValidId(current.operator, operators) === null)
    )
      this.locationKey = null
    this.onLocation()
  }

  stop(): void {
    this.stopped = true
    this.generation += 1
    this.pending = null
    this.unsubscribe()
    this.stopObservingNavigation()
    globalThis.removeEventListener('hashchange', this.onLocation)
    globalThis.removeEventListener('popstate', this.onLocation)
  }

  retry(): void {
    this.needsRefresh = true
    this.locationKey = null
    this.onLocation()
  }

  private persist(): void {
    const current = snapshot()

    writeUrlScope(current.wallet, current.operator, current.asOf)
    writeLocalStorageScope(current.wallet, current.operator)
    this.locationKey = JSON.stringify(navigationIntent())
  }

  private resolve(intent: NavigationIntent): ScopeSnapshot {
    const current = snapshot()
    const saved = storedPreferences()
    const walletFallback = this.initial
      ? saved.wallet.specified
        ? pickValidId(saved.wallet.value, this.wallets)
        : intent.hasParams
          ? null
          : (this.wallets[0]?.public_id ?? null)
      : pickValidId(current.wallet, this.wallets)
    const operatorFallback = this.initial
      ? pickValidId(saved.operator.value, this.operators)
      : pickValidId(current.operator, this.operators)

    return {
      wallet: resolvePreference(intent.wallet, this.wallets, walletFallback, current.wallet),
      operator: resolvePreference(
        intent.operator,
        this.operators,
        operatorFallback,
        current.operator
      ),
      asOf: intent.validTime ? intent.asOf : current.asOf,
    }
  }

  private async drain(): Promise<void> {
    this.running = true

    try {
      while (this.pending !== null && !this.stopped) {
        const { intent, version } = this.pending
        const target = this.resolve(intent)
        const initial = this.initial
        const generation = this.generation

        this.pending = null
        this.initial = false
        this.commitTarget = target
        this.activeGeneration = generation
        let failed = false

        try {
          const pendingRefresh = useAppStore.getState().isWalletSelectionPending()

          if (initial || this.needsRefresh || pendingRefresh || !sameScope(target, snapshot())) {
            const committed = await useAppStore
              .getState()
              .selectScopeAndRefresh(
                target,
                initial || this.needsRefresh || pendingRefresh,
                () =>
                  !this.stopped &&
                  this.generation === generation &&
                  (target.wallet === null || pickValidId(target.wallet, this.wallets) !== null) &&
                  (target.operator === null ||
                    pickValidId(target.operator, this.operators) !== null),
                version
              )

            this.needsRefresh = !committed

            if (!committed && !this.stopped && this.pending === null) {
              await useAppStore.getState().waitForWalletSelection()
              if (!this.stopped)
                this.pending ??= {
                  intent: snapshotIntent(snapshot()),
                  version: useAppStore.getState().reserveScopeSelection(),
                }
            }
          }
        } catch {
          this.needsRefresh = false
          failed = true
        }

        if (this.pending === null && !this.stopped) {
          this.persist()
          if (failed) this.onStatus('error')
          else this.onStatus('ready')
        }
      }
    } finally {
      this.running = false
    }
  }
}

export function useScopePersistence(): { status: ScopeStatus; retry: () => void } {
  const { data: wallets, isError: walletError, refetch: retryWallets } = useWallets()
  const { data: operators, isError: operatorError, refetch: retryOperators } = useOperators()
  const accessFailed = walletError || operatorError
  const synchronizer = useRef<ScopeSynchronizer | null>(null)
  const [status, setStatus] = useState<ScopeStatus>('loading')
  const retry = useCallback(() => {
    if (accessFailed) {
      void retryWallets()
      void retryOperators()
    } else synchronizer.current?.retry()
  }, [accessFailed, retryWallets, retryOperators])

  useEffect(() => {
    if (wallets === undefined || operators === undefined || accessFailed) return

    if (synchronizer.current === null) {
      synchronizer.current = new ScopeSynchronizer(wallets.payload, operators.payload, setStatus)
    } else {
      synchronizer.current.update(wallets.payload, operators.payload)
    }
  }, [wallets, operators, accessFailed])

  useEffect(
    () => () => {
      synchronizer.current?.stop()
      synchronizer.current = null
    },
    []
  )

  return { status: accessFailed ? 'error' : status, retry }
}
