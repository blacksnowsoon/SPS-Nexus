import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildPassedScenarioExportRows, exportPassedScenariosToPdf } from './passed-scenario-export'
import type { IssueReporter, RoundScenario, ScenarioExecution } from '../types'
import { formatDate } from '../components/constants'

const scenario: RoundScenario = {
  round_id: 'round-1',
  scenario_id: 'scenario-1',
  sort_order: 1,
  module: 'المشتريات',
  section: 'الطلبات',
  category: 'التدفقات',
  source_number: 1,
  title: '<script>سيناريو</script>',
  description: 'وصف السيناريو',
  steps: ['الخطوة الأولى'],
  expected: ['النتيجة المتوقعة'],
  removed_at: null,
}

const execution: ScenarioExecution = {
  id: 'execution-1',
  round_id: 'round-1',
  scenario_id: 'scenario-1',
  user_id: 'user-1',
  status: 'passed',
  notes: 'تم التحقق من حفظ الطلب.',
  created_at: '2026-10-26T10:00:00Z',
  updated_at: '2026-10-26T10:00:00Z',
}

const reporter: IssueReporter = {
  id: 'user-1',
  display_name: 'سارة أحمد',
  avatar_url: 'https://example.com/avatar.png',
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('passed scenario exports', () => {
  it('includes scenario details and pass count without issue summaries', () => {
    const [row] = buildPassedScenarioExportRows([scenario], [execution], [reporter])

    expect(row).toMatchObject({
      'رقم السيناريو': 1,
      السيناريو: scenario.title,
      'خطوات الاختبار': 'الخطوة الأولى',
      'النتائج المتوقعة': 'النتيجة المتوقعة',
      'مرات النجاح': 1,
      المختبِر: reporter.display_name,
      'رابط صورة المختبِر': reporter.avatar_url,
      'تاريخ النجاح': formatDate(execution.created_at),
      'ملاحظات التنفيذ': execution.notes,
    })
    expect(row).not.toHaveProperty('ملخص المعالجة')
  })

  it('creates a downloadable XLSX workbook', async () => {
    const createObjectURL = vi.fn((_file: Blob) => 'blob:passed-scenarios')
    const revokeObjectURL = vi.fn()
    const previousCreate = Object.getOwnPropertyDescriptor(URL, 'createObjectURL')
    const previousRevoke = Object.getOwnPropertyDescriptor(URL, 'revokeObjectURL')
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: createObjectURL })
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revokeObjectURL })
    let downloadedName = ''
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      downloadedName = this.download
    })

    try {
      const { exportPassedScenariosToExcel } = await import('./passed-scenario-export')
      await exportPassedScenariosToExcel([scenario], [execution], [reporter], 'جولة/١')
      await new Promise<void>((resolve) => window.setTimeout(resolve, 0))

      expect(createObjectURL).toHaveBeenCalledOnce()
      expect(createObjectURL.mock.calls[0]?.[0]).toBeInstanceOf(Blob)
      expect(click).toHaveBeenCalledOnce()
      expect(downloadedName).toBe('جولة-١-passed-scenarios.xlsx')
      expect(revokeObjectURL).toHaveBeenCalledWith('blob:passed-scenarios')
    } finally {
      if (previousCreate) Object.defineProperty(URL, 'createObjectURL', previousCreate)
      else Reflect.deleteProperty(URL, 'createObjectURL')
      if (previousRevoke) Object.defineProperty(URL, 'revokeObjectURL', previousRevoke)
      else Reflect.deleteProperty(URL, 'revokeObjectURL')
    }
  })

  it('escapes scenario content in the print-ready PDF page', () => {
    const write = vi.fn()
    const printWindow = { document: { open: vi.fn(), write, close: vi.fn() } } as unknown as Window
    vi.spyOn(window, 'open').mockReturnValue(printWindow)

    expect(exportPassedScenariosToPdf([scenario], [execution], [reporter], 'جولة الاختبار')).toBe(true)

    const html = write.mock.calls[0][0]
    expect(html).toContain('&lt;script&gt;سيناريو&lt;/script&gt;')
    expect(html).not.toContain('<script>سيناريو</script>')
    expect(html).toContain('النتيجة المتوقعة')
    expect(html).toContain(reporter.display_name)
    expect(html).toContain(reporter.avatar_url)
    expect(html).toContain(execution.notes)
  })
})
