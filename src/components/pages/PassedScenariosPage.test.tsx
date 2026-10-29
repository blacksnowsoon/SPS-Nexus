import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { IssueReporter, RoundScenario, ScenarioExecution } from '../../types'
import { PassedScenariosPage } from './PassedScenariosPage'
import { formatDate } from '../constants'

const { excelExport } = vi.hoisted(() => ({ excelExport: vi.fn().mockResolvedValue(undefined) }))

vi.mock('../../lib/passed-scenario-export', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/passed-scenario-export')>()
  return { ...actual, exportPassedScenariosToExcel: excelExport }
})

afterEach(cleanup)

const scenario: RoundScenario = {
  round_id: 'round-1',
  scenario_id: 'scenario-1',
  sort_order: 1,
  module: 'المشتريات',
  section: 'الطلبات',
  category: 'التدفقات',
  source_number: 1,
  title: 'حفظ الطلب',
  description: 'تجربة حفظ طلب جديد',
  steps: ['إدخال البيانات', 'حفظ الطلب'],
  expected: ['يظهر الطلب في القائمة'],
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

describe('PassedScenariosPage', () => {
  it('shows execution reporter details and notes to testers without admin selection controls', () => {
    const { container } = render(
      <PassedScenariosPage
        scenarios={[scenario]}
        executions={[execution]}
        reporters={[reporter]}
        roundName="جولة الاختبار"
        isAdmin={false}
      />,
    )

    expect(screen.getByRole('heading', { name: scenario.title })).toBeInTheDocument()
    expect(screen.getByText('مرات النجاح: 1')).toBeInTheDocument()
    expect(screen.getByText(reporter.display_name!)).toBeInTheDocument()
    expect(screen.getByText((content) => content === `مختبِر · ${formatDate(execution.created_at)}`)).toBeInTheDocument()
    expect(screen.getByText(execution.notes)).toBeInTheDocument()
    expect(container.querySelector('img')).toHaveAttribute('src', reporter.avatar_url)
    expect(screen.queryByRole('button', { name: 'تصدير Excel' })).not.toBeInTheDocument()
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
    expect(screen.queryByText('ملخص المعالجة')).not.toBeInTheDocument()
  })

  it('lets admins select visible passed scenarios for export', async () => {
    const user = userEvent.setup()
    excelExport.mockClear()

    render(
      <PassedScenariosPage
        scenarios={[scenario]}
        executions={[execution]}
        reporters={[reporter]}
        roundName="جولة الاختبار"
        isAdmin
      />,
    )

    await user.click(screen.getByRole('checkbox', { name: `تحديد السيناريو ${scenario.title}` }))
    await user.click(screen.getByRole('button', { name: 'تصدير Excel' }))

    expect(excelExport).toHaveBeenCalledWith([scenario], [execution], [reporter], 'جولة الاختبار')
  })

  it('omits scenarios that have no passed execution', () => {
    render(
      <PassedScenariosPage
        scenarios={[scenario]}
        executions={[{ ...execution, status: 'failed' }]}
        reporters={[reporter]}
        roundName="جولة الاختبار"
        isAdmin={false}
      />,
    )

    expect(screen.getByText('لا توجد سيناريوهات ناجحة في هذه الجولة')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: scenario.title })).not.toBeInTheDocument()
  })
})
