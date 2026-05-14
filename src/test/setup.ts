import { vi, beforeAll, afterAll } from 'vitest'
import '@testing-library/jest-dom'
import { configure } from '@testing-library/react'
import i18n from '../i18n/config'
import enOverview from '../locales/en/overview.json'
import plOverview from '../locales/pl/overview.json'
import enOrders from '../locales/en/orders.json'
import plOrders from '../locales/pl/orders.json'
import enPositions from '../locales/en/positions.json'
import plPositions from '../locales/pl/positions.json'
import enStrategies from '../locales/en/strategies.json'
import plStrategies from '../locales/pl/strategies.json'
import enSignals from '../locales/en/signals.json'
import plSignals from '../locales/pl/signals.json'
import enBacktests from '../locales/en/backtests.json'
import plBacktests from '../locales/pl/backtests.json'
import enMarket from '../locales/en/market.json'
import plMarket from '../locales/pl/market.json'
import enProcesses from '../locales/en/processes.json'
import plProcesses from '../locales/pl/processes.json'
import enHealth from '../locales/en/health.json'
import plHealth from '../locales/pl/health.json'
import enAiIntegration from '../locales/en/aiIntegration.json'
import plAiIntegration from '../locales/pl/aiIntegration.json'
import enAiReviews from '../locales/en/aiReviews.json'
import plAiReviews from '../locales/pl/aiReviews.json'
import enAdmin from '../locales/en/admin.json'
import plAdmin from '../locales/pl/admin.json'
import enSettings from '../locales/en/settings.json'
import plSettings from '../locales/pl/settings.json'

i18n.addResourceBundle('en', 'overview', enOverview, true, true)
i18n.addResourceBundle('pl', 'overview', plOverview, true, true)
i18n.addResourceBundle('en', 'orders', enOrders, true, true)
i18n.addResourceBundle('pl', 'orders', plOrders, true, true)
i18n.addResourceBundle('en', 'positions', enPositions, true, true)
i18n.addResourceBundle('pl', 'positions', plPositions, true, true)
i18n.addResourceBundle('en', 'strategies', enStrategies, true, true)
i18n.addResourceBundle('pl', 'strategies', plStrategies, true, true)
i18n.addResourceBundle('en', 'signals', enSignals, true, true)
i18n.addResourceBundle('pl', 'signals', plSignals, true, true)
i18n.addResourceBundle('en', 'backtests', enBacktests, true, true)
i18n.addResourceBundle('pl', 'backtests', plBacktests, true, true)
i18n.addResourceBundle('en', 'market', enMarket, true, true)
i18n.addResourceBundle('pl', 'market', plMarket, true, true)
i18n.addResourceBundle('en', 'processes', enProcesses, true, true)
i18n.addResourceBundle('pl', 'processes', plProcesses, true, true)
i18n.addResourceBundle('en', 'health', enHealth, true, true)
i18n.addResourceBundle('pl', 'health', plHealth, true, true)
i18n.addResourceBundle('en', 'aiIntegration', enAiIntegration, true, true)
i18n.addResourceBundle('pl', 'aiIntegration', plAiIntegration, true, true)
i18n.addResourceBundle('en', 'aiReviews', enAiReviews, true, true)
i18n.addResourceBundle('pl', 'aiReviews', plAiReviews, true, true)
i18n.addResourceBundle('en', 'admin', enAdmin, true, true)
i18n.addResourceBundle('pl', 'admin', plAdmin, true, true)
i18n.addResourceBundle('en', 'settings', enSettings, true, true)
i18n.addResourceBundle('pl', 'settings', plSettings, true, true)

configure({ asyncUtilTimeout: 5000 })

let consoleErrorSpy: ReturnType<typeof vi.spyOn>
let consoleWarnSpy: ReturnType<typeof vi.spyOn>
let consoleDebugSpy: ReturnType<typeof vi.spyOn>

beforeAll(() => {
  consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
  consoleDebugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {})
})
afterAll(() => {
  consoleErrorSpy.mockRestore()
  consoleWarnSpy.mockRestore()
  consoleDebugSpy.mockRestore()
})

if (typeof Element !== 'undefined') {
  Element.prototype.hasPointerCapture = vi.fn(() => false)
  Element.prototype.setPointerCapture = vi.fn()
  Element.prototype.releasePointerCapture = vi.fn()
  Element.prototype.scrollIntoView = vi.fn()
}

if (typeof HTMLDialogElement !== 'undefined') {
  HTMLDialogElement.prototype.showModal ??= function showModal(this: HTMLDialogElement): void {
    this.setAttribute('open', 'true')
  }

  HTMLDialogElement.prototype.close ??= function close(
    this: HTMLDialogElement,
    _returnValue?: string
  ): void {
    this.removeAttribute('open')
    this.dispatchEvent(new Event('close'))
  }
}

if (typeof navigator !== 'undefined') {
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText: vi.fn().mockResolvedValue(undefined) },
    writable: true,
    configurable: true,
  })
}

const localStorageMock = (() => {
  let store: Record<string, string> = {}

  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    },
    get length() {
      return Object.keys(store).length
    },
    key: (index: number) => Object.keys(store)[index] ?? null,
  }
})()

vi.stubGlobal('localStorage', localStorageMock)
const mockCanvasContext = {
  fillRect: vi.fn(),
  clearRect: vi.fn(),
  getImageData: vi.fn(() => ({ data: [] })),
  putImageData: vi.fn(),
  createImageData: vi.fn(),
  setTransform: vi.fn(),
  drawImage: vi.fn(),
  save: vi.fn(),
  fillText: vi.fn(),
  restore: vi.fn(),
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  closePath: vi.fn(),
  stroke: vi.fn(),
  translate: vi.fn(),
  scale: vi.fn(),
  rotate: vi.fn(),
  arc: vi.fn(),
  fill: vi.fn(),
  measureText: vi.fn(() => ({ width: 0 })),
  transform: vi.fn(),
  resetTransform: vi.fn(),
} as unknown as CanvasRenderingContext2D

function getMockCanvasContext(
  contextId: '2d',
  options?: CanvasRenderingContext2DSettings
): CanvasRenderingContext2D | null
function getMockCanvasContext(
  contextId: 'bitmaprenderer',
  options?: ImageBitmapRenderingContextSettings
): ImageBitmapRenderingContext | null
function getMockCanvasContext(
  contextId: 'webgl',
  options?: WebGLContextAttributes
): WebGLRenderingContext | null
function getMockCanvasContext(
  contextId: 'webgl2',
  options?: WebGLContextAttributes
): WebGL2RenderingContext | null
function getMockCanvasContext(contextId: string, _options?: unknown): RenderingContext | null {
  return contextId === '2d' ? mockCanvasContext : null
}

HTMLCanvasElement.prototype.getContext = getMockCanvasContext
