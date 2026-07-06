import { describe, it, expect, vi, beforeEach } from 'vitest'
import { exportToCSV } from './csvExport'

describe('csvExport', () => {
  let mockClick: ReturnType<typeof vi.fn>
  let mockCreateObjectURL: ReturnType<typeof vi.fn>
  let mockRevokeObjectURL: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockClick = vi.fn()
    vi.spyOn(document, 'createElement').mockReturnValue({
      href: '',
      download: '',
      click: mockClick,
    } as unknown as HTMLAnchorElement)
    mockCreateObjectURL = vi.fn().mockReturnValue('blob:mock-url')
    mockRevokeObjectURL = vi.fn()
    globalThis.URL.createObjectURL = mockCreateObjectURL as typeof URL.createObjectURL
    globalThis.URL.revokeObjectURL = mockRevokeObjectURL as typeof URL.revokeObjectURL
  })
  it('creates CSV with headers and rows', () => {
    exportToCSV('test.csv', ['Name', 'Age'], [['Alice', '30']])
    expect(mockCreateObjectURL).toHaveBeenCalledWith(expect.any(Blob))
    const blob = mockCreateObjectURL.mock.calls[0]?.[0] as Blob

    expect(blob.type).toBe('text/csv;charset=utf-8;')
  })
  it('sets download filename and triggers click', () => {
    exportToCSV('orders.csv', ['ID'], [['1']])
    const results = (document.createElement as ReturnType<typeof vi.fn>).mock.results
    const link = results[results.length - 1]?.value

    expect(link.download).toBe('orders.csv')
    expect(link.href).toBe('blob:mock-url')
    expect(mockClick).toHaveBeenCalled()
  })
  it('revokes object URL after download', () => {
    exportToCSV('test.csv', ['A'], [['B']])
    expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:mock-url')
  })
  it.each([
    ['escapes fields containing commas', 'Field', 'value, with comma'],
    ['escapes fields containing double quotes', 'Field', 'value "quoted"'],
    ['escapes fields containing newlines', 'Field', 'line1\nline2'],
    ['does not escape plain fields', 'Name', 'Alice'],
  ])('%s', (_name, header, fieldValue) => {
    exportToCSV('test.csv', [header], [[fieldValue]])
    const blob = mockCreateObjectURL.mock.calls[0]?.[0] as Blob

    expect(blob).toBeInstanceOf(Blob)
  })
  it('handles multiple rows', () => {
    exportToCSV(
      'test.csv',
      ['A', 'B'],
      [
        ['1', '2'],
        ['3', '4'],
      ]
    )
    expect(mockCreateObjectURL).toHaveBeenCalledTimes(1)
    expect(mockClick).toHaveBeenCalledTimes(1)
  })
})
