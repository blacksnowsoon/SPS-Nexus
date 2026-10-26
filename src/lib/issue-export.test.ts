import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildIssueExportRows, exportIssuesToExcel, exportIssuesToPdf } from './issue-export'
import type {
  IssueExecutionNote,
  IssueReporter,
  RoundScenario,
  RoundWorkflow,
  ScenarioIssue,
} from '../types'

const issue: ScenarioIssue = {
  id: 'issue-1',
  round_id: 'round-1',
  scenario_id: 'scenario-1',
  reported_by: 'user-1',
  report: '<script>alert("x")</script>',
  created_at: '2026-10-26T10:00:00Z',
}

const workflow: RoundWorkflow = {
  round_id: 'round-1',
  scenario_id: 'scenario-1',
  status: 'has_issues',
  assigned_to: null,
  issue_summary: 'تعذر الحفظ',
  updated_at: '2026-10-26T10:00:00Z',
}

const scenario: RoundScenario = {
  round_id: 'round-1',
  scenario_id: 'scenario-1',
  sort_order: 1,
  module: 'المشتريات',
  section: 'الطلبات',
  category: 'التدفقات',
  source_number: 1,
  title: 'حفظ الطلب',
  description: '',
  steps: [],
  expected: [],
  removed_at: null,
}

const reporter: IssueReporter = {
  id: 'user-1',
  display_name: 'سارة أحمد',
  avatar_url: null,
}

const executionNote: IssueExecutionNote = {
  scenario_id: 'scenario-1',
  user_id: 'user-1',
  notes: 'ظهرت رسالة تحقق بعد الحفظ',
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('issue exports', () => {
  it('exports summary and execution notes separately without repeating the report text', () => {
    const [row] = buildIssueExportRows([issue], [workflow], [scenario], [reporter], [executionNote])

    expect(row).toMatchObject({
      'ملخص المشكلة': 'تعذر الحفظ',
      'ملاحظات التنفيذ': executionNote.notes,
    })
    expect(row).not.toHaveProperty('تفاصيل البلاغ')
    expect(Object.values(row)).not.toContain(issue.report)
  })

  it('creates a downloadable XLSX workbook', async () => {
    const createObjectURL = vi.fn((_file: Blob) => 'blob:issue-export')
    const revokeObjectURL = vi.fn()
    const previousCreate = Object.getOwnPropertyDescriptor(URL, 'createObjectURL')
    const previousRevoke = Object.getOwnPropertyDescriptor(URL, 'revokeObjectURL')
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: createObjectURL })
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revokeObjectURL })
    let downloadedName = ''
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(function (this: HTMLAnchorElement) {
        downloadedName = this.download
      })

    try {
      await exportIssuesToExcel([issue], [workflow], [scenario], [reporter], [executionNote], 'جولة/١')
      await new Promise<void>((resolve) => window.setTimeout(resolve, 0))

      expect(createObjectURL).toHaveBeenCalledOnce()
      const workbook = createObjectURL.mock.calls[0]?.[0]
      expect(workbook).toBeInstanceOf(Blob)
      expect(workbook?.size).toBeGreaterThan(0)
      expect(click).toHaveBeenCalledOnce()
      expect(downloadedName).toBe('جولة-١-issues.xlsx')
      expect(revokeObjectURL).toHaveBeenCalledWith('blob:issue-export')
    } finally {
      if (previousCreate) Object.defineProperty(URL, 'createObjectURL', previousCreate)
      else Reflect.deleteProperty(URL, 'createObjectURL')
      if (previousRevoke) Object.defineProperty(URL, 'revokeObjectURL', previousRevoke)
      else Reflect.deleteProperty(URL, 'revokeObjectURL')
    }
  })

  it('escapes issue content in the print-ready PDF page', () => {
    const write = vi.fn()
    const printWindow = {
      document: { open: vi.fn(), write, close: vi.fn() },
    } as unknown as Window
    vi.spyOn(window, 'open').mockReturnValue(printWindow)

    expect(exportIssuesToPdf([issue], [workflow], [scenario], [reporter], [executionNote], 'جولة الاختبار')).toBe(true)

    const html = write.mock.calls[0][0]
    expect(html).toContain('<html lang="ar" dir="rtl">')
    expect(html).toContain('ملخص المشكلة')
    expect(html).toContain('تعذر الحفظ')
    expect(html).toContain('ملاحظات التنفيذ')
    expect(html).toContain(executionNote.notes)
    expect(html).not.toContain('&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;')
    expect(html).toContain('سارة أحمد')
  })
})
