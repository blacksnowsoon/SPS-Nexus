import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { exportIssuesToExcel, exportIssuesToPdf } from '../../lib/issue-export'
import type {
  IssueExecutionNote,
  IssueReporter,
  RoundScenario,
  RoundWorkflow,
  ScenarioIssue,
} from '../../types'
import { IssuesPage } from './IssuesPage'

vi.mock('../../lib/issue-export', () => ({
  exportIssuesToExcel: vi.fn().mockResolvedValue(undefined),
  exportIssuesToPdf: vi.fn().mockReturnValue(true),
}))

afterEach(cleanup)

const workflow: RoundWorkflow = {
  round_id: 'round-1',
  scenario_id: 'scenario-1',
  status: 'has_issues',
  assigned_to: null,
  issue_summary: 'تعذر حفظ البيانات',
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
  title: 'حفظ طلب جديد',
  description: 'وصف السيناريو',
  steps: [],
  expected: [],
  removed_at: null,
}

const anotherScenario: RoundScenario = {
  ...scenario,
  scenario_id: 'scenario-2',
  module: 'المالية',
  source_number: 2,
  title: 'اعتماد فاتورة',
}

const issue: ScenarioIssue = {
  id: 'issue-1',
  round_id: 'round-1',
  scenario_id: 'scenario-1',
  reported_by: 'user-1',
  report: 'ظهرت رسالة خطأ عند الحفظ',
  status: 'open',
  created_at: '2026-10-26T10:00:00Z',
}

const anotherIssue: ScenarioIssue = {
  ...issue,
  id: 'issue-2',
  reported_by: 'user-2',
  report: 'تعذر حفظ الطلب في حسابي',
}

const reporter: IssueReporter = {
  id: 'user-1',
  display_name: 'سارة أحمد',
  avatar_url: 'https://example.com/avatar.png',
}

const anotherReporter: IssueReporter = {
  id: 'user-2',
  display_name: 'أحمد علي',
  avatar_url: null,
}

const executionNote: IssueExecutionNote = {
  scenario_id: 'scenario-1',
  user_id: 'user-1',
  notes: 'ظهرت رسالة تحقق بعد الضغط على حفظ',
}

function renderIssuesPage(
  isAdmin: boolean,
  pageIssues = [issue],
  userId = 'user-1',
  handlers = {
    onReturnIssue: vi.fn(),
    onResolveIssue: vi.fn(),
    onUpdateIssue: vi.fn(),
  },
  pageScenarios = [scenario],
) {
  return render(
    <IssuesPage
      workflows={[workflow]}
      scenarios={pageScenarios}
      issues={pageIssues}
      reporters={[reporter, anotherReporter]}
      executionNotes={[executionNote]}
      roundName="جولة الاختبار"
      isAdmin={isAdmin}
      busyAction=""
      userId={userId}
      onOpenScenario={vi.fn()}
      onReturnIssue={handlers.onReturnIssue}
      onResolveIssue={handlers.onResolveIssue}
      onUpdateIssue={handlers.onUpdateIssue}
    />,
  )
}

describe('IssuesPage', () => {
  it('lets admins return and resolve each individual issue report', async () => {
    const user = userEvent.setup()
    const handlers = {
      onReturnIssue: vi.fn(),
      onResolveIssue: vi.fn(),
      onUpdateIssue: vi.fn(),
    }
    renderIssuesPage(true, [issue, anotherIssue], 'admin-1', handlers)

    expect(screen.getByText(issue.report)).toBeInTheDocument()
    expect(screen.getByText(anotherIssue.report)).toBeInTheDocument()
    expect(screen.getByText('سارة أحمد')).toBeInTheDocument()
    expect(screen.getByText('أحمد علي')).toBeInTheDocument()

    const returnButtons = screen.getAllByRole('button', { name: 'إعادة للمبلّغ للتعديل' })
    await user.click(returnButtons[0])
    expect(handlers.onReturnIssue).toHaveBeenCalledWith(issue.id)

    const resolveButtons = screen.getAllByRole('button', { name: 'تحديد كمحلول' })
    await user.click(resolveButtons[1])
    expect(handlers.onResolveIssue).toHaveBeenCalledWith(anotherIssue.id)
  })

  it('shows all report contents, author names, and execution notes to the team', () => {
    const { container } = renderIssuesPage(false)

    expect(screen.getByText('سارة أحمد')).toBeInTheDocument()
    expect(screen.getByText('تفاصيل البلاغ')).toBeInTheDocument()
    expect(screen.getByText(issue.report)).toBeInTheDocument()
    expect(screen.getByText('ملاحظات التنفيذ')).toBeInTheDocument()
    expect(screen.getByText(executionNote.notes)).toBeInTheDocument()
    expect(container.querySelector('img[src="https://example.com/avatar.png"]')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'تصدير Excel' })).not.toBeInTheDocument()
  })

  it('filters issue cards by scenario module', async () => {
    const user = userEvent.setup()
    const issueInAnotherModule = { ...anotherIssue, scenario_id: 'scenario-2' }
    renderIssuesPage(
      false,
      [issue, issueInAnotherModule],
      'user-1',
      undefined,
      [scenario, anotherScenario],
    )

    expect(screen.getByText(issue.report)).toBeInTheDocument()
    expect(screen.getByText(issueInAnotherModule.report)).toBeInTheDocument()

    await user.selectOptions(screen.getByRole('combobox', { name: 'تصفية بلاغات المشكلات حسب النظام' }), 'المالية')

    expect(screen.queryByText(issue.report)).not.toBeInTheDocument()
    expect(screen.getByText(issueInAnotherModule.report)).toBeInTheDocument()
    expect(screen.getByText('عرض 1 من 2 بلاغ')).toBeInTheDocument()
  })

  it('allows only the report creator to edit a returned report', async () => {
    const user = userEvent.setup()
    const returnedIssue = { ...issue, status: 'returned' as const }
    const handlers = {
      onReturnIssue: vi.fn(),
      onResolveIssue: vi.fn(),
      onUpdateIssue: vi.fn(),
    }
    renderIssuesPage(false, [returnedIssue, anotherIssue], 'user-1', handlers)

    expect(screen.getAllByRole('textbox', { name: 'تعديل بلاغك' })).toHaveLength(1)
    await user.clear(screen.getByRole('textbox', { name: 'تعديل بلاغك' }))
    await user.type(screen.getByRole('textbox', { name: 'تعديل بلاغك' }), 'تفاصيل أوضح للمشكلة')
    await user.click(screen.getByRole('button', { name: 'حفظ التعديل وإعادة الإرسال' }))

    expect(handlers.onUpdateIssue).toHaveBeenCalledWith(issue.id, 'تفاصيل أوضح للمشكلة')
  })

  it('lets admins select issue reports for Excel and PDF export', async () => {
    const user = userEvent.setup()
    renderIssuesPage(true)

    const excelButton = screen.getByRole('button', { name: 'تصدير Excel' })
    const pdfButton = screen.getByRole('button', { name: 'تصدير PDF' })
    expect(screen.getByText('تفاصيل البلاغ')).toBeInTheDocument()
    expect(screen.getByText(workflow.issue_summary)).toBeInTheDocument()
    expect(screen.getByText('ملاحظات التنفيذ')).toBeInTheDocument()
    expect(screen.getByText(executionNote.notes)).toBeInTheDocument()
    expect(excelButton).toBeDisabled()
    expect(pdfButton).toBeDisabled()

    await user.click(screen.getByRole('checkbox', { name: 'تحديد بلاغ سارة أحمد - حفظ طلب جديد' }))

    expect(excelButton).toBeEnabled()
    expect(pdfButton).toBeEnabled()
    await user.click(excelButton)
    await waitFor(() => expect(excelButton).toBeEnabled())
    await user.click(pdfButton)

    expect(exportIssuesToExcel).toHaveBeenCalledWith(
      [issue],
      [workflow],
      [scenario],
      [reporter, anotherReporter],
      [executionNote],
      'جولة الاختبار',
    )
    expect(exportIssuesToPdf).toHaveBeenCalledWith(
      [issue],
      [workflow],
      [scenario],
      [reporter, anotherReporter],
      [executionNote],
      'جولة الاختبار',
    )
  })
})
