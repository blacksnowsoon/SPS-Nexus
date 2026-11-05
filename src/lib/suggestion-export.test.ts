import { afterEach, describe, expect, it, vi } from 'vitest'
import type { TestSuggestion } from '../types'
import { exportSuggestionToPdf } from './suggestion-export'

const suggestion: TestSuggestion = {
  id: 'suggestion-1',
  module: 'المستخدمون',
  title: 'إضافة تحقق إضافي',
  description: '<p>وصف الاقتراح<script>alert(1)</script></p>',
  shared_document_url: 'https://example.com/shared',
  created_by: 'tester-1',
  created_at: '2026-11-03T10:00:00.000Z',
  updated_at: '2026-11-04T10:00:00.000Z',
  status: 'sent',
  author_name: 'مختبر SPS',
  avatar_url: null,
}

describe('exportSuggestionToPdf', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('creates an A4 print document with suggestion details, safe content, and title-based filename', () => {
    const printDocument = {
      open: vi.fn(),
      write: vi.fn(),
      close: vi.fn(),
      readyState: 'complete',
      title: '',
    }
    const printWindow = {
      document: printDocument,
      closed: false,
      addEventListener: vi.fn(),
      setTimeout: (callback: () => void) => callback(),
      focus: vi.fn(),
      print: vi.fn(),
    } as unknown as Window
    vi.spyOn(window, 'open').mockReturnValue(printWindow)

    expect(exportSuggestionToPdf(suggestion, new Date('2026-11-05T00:00:00.000Z'))).toBe(true)

    const html = printDocument.write.mock.calls[0][0]
    expect(html).toContain('<title>إضافة تحقق إضافي - 2026-11-05</title>')
    expect(html).toContain('اسم المستخدم: مختبر SPS')
    expect(html).toContain('تاريخ التحديث:')
    expect(html).toContain('تاريخ التصدير:')
    expect(html).toContain('size: A4')
    expect(html).toContain('counter(page)')
    expect(html).toContain('counter(pages)')
    expect(html).toContain('وصف الاقتراح')
    expect(html).not.toContain('<script>alert(1)</script>')
    expect(html).not.toContain('window.print()')
    expect(html).toContain('https://example.com/shared')
    expect(printDocument.title).toBe('إضافة تحقق إضافي - 2026-11-05')
    expect(printDocument.close).toHaveBeenCalledOnce()
    expect(printWindow.addEventListener).toHaveBeenCalledWith('load', expect.any(Function), { once: true })
    expect(printWindow.print).toHaveBeenCalledOnce()
  })

  it('returns false when the browser blocks the print window', () => {
    vi.spyOn(window, 'open').mockReturnValue(null)

    expect(exportSuggestionToPdf(suggestion)).toBe(false)
  })

  it('uses the creation date when the updated date is missing', () => {
    const printDocument = {
      open: vi.fn(),
      write: vi.fn(),
      close: vi.fn(),
      readyState: 'complete',
      title: '',
    }
    const printWindow = {
      document: printDocument,
      closed: false,
      addEventListener: vi.fn(),
      setTimeout: (callback: () => void) => callback(),
      focus: vi.fn(),
      print: vi.fn(),
    } as unknown as Window
    vi.spyOn(window, 'open').mockReturnValue(printWindow)

    const { updated_at: _updatedAt, ...suggestionWithoutUpdatedAt } = suggestion
    expect(exportSuggestionToPdf(suggestionWithoutUpdatedAt, new Date('2026-11-05T00:00:00.000Z'))).toBe(true)
    const formattedCreatedAt = new Intl.DateTimeFormat('ar-EG', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(suggestion.created_at))
    expect(printDocument.write.mock.calls[0][0]).toContain(`تاريخ التحديث: ${formattedCreatedAt}`)
  })
})
