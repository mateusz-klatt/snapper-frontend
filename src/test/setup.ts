import { vi, beforeAll, afterAll } from 'vitest'
import '@testing-library/jest-dom'
import { configure } from '@testing-library/react'

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

const { default: i18n } = await import('../i18n/config')

const catalogModules = import.meta.glob('../locales/*/*.json', {
  eager: true,
  import: 'default',
}) as Record<string, Record<string, unknown>>

const CATALOG_PATH_RE = /locales\/([^/]+)\/([^/]+)\.json$/

for (const [path, content] of Object.entries(catalogModules)) {
  const match = CATALOG_PATH_RE.exec(path)

  if (match === null) continue
  const [, lng, ns] = match as unknown as [string, string, string]

  i18n.addResourceBundle(lng, ns, content, true, true)
}

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
