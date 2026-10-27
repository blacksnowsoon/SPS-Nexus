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

const issue: ScenarioIssue = {
  id: 'issue-1',
  round_id: 'round-1',
  scenario_id: 'scenario-1',
  reported_by: 'user-1',
  report: 'ظهرت رسالة خطأ عند الحفظ',
  created_at: '2026-10-26T10:00:00Z',
}

const reporter: IssueReporter = {
  id: 'user-1',
  display_name: 'سارة أحمد',
  avatar_url: 'https://example.com/avatar.png',
}

const executionNote: IssueExecutionNote = {
  scenario_id: 'scenario-1',
  user_id: 'user-1',
  notes: 'ظهرت رسالة تحقق بعد الضغط على حفظ',
}

function renderIssuesPage(isAdmin: boolean, roundIsActive = true, onTransition = vi.fn()) {
  return render(
    <IssuesPage
      workflows={[workflow]}
      scenarios={[scenario]}
      issues={[issue]}
      reporters={[reporter]}
      executionNotes={[executionNote]}
      roundName="جولة الاختبار"
      roundIsActive={roundIsActive}
      isAdmin={isAdmin}
      busyAction=""
      onOpenScenario={vi.fn()}
      onTransition={onTransition}
    />,
  )
}

describe('IssuesPage', () => {
  it('lets admins return issues to testers only while the round is active', async () => {
    const user = userEvent.setup()
    const onTransition = vi.fn()
    renderIssuesPage(true, true, onTransition)

    await user.click(screen.getByRole('button', { name: 'إعادة للمختبِر للتعديل' }))

    expect(onTransition).toHaveBeenCalledWith(workflow, 'open')

    cleanup()
    renderIssuesPage(true, false)
    expect(screen.queryByRole('button', { name: 'إعادة للمختبِر للتعديل' })).not.toBeInTheDocument()
  })

  it('shows the report author name and avatar', () => {
    const { container } = renderIssuesPage(false)

    expect(screen.getByText('سارة أحمد')).toBeInTheDocument()
    expect(screen.getByText('ملخص المشكلة')).toBeInTheDocument()
    expect(screen.getByText('تعذر حفظ البيانات')).toBeInTheDocument()
    expect(screen.queryByText('ملاحظات التنفيذ')).not.toBeInTheDocument()
    expect(screen.queryByText(executionNote.notes)).not.toBeInTheDocument()
    expect(screen.queryByText(issue.report)).not.toBeInTheDocument()
    expect(container.querySelector('img[src="https://example.com/avatar.png"]')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'تصدير Excel' })).not.toBeInTheDocument()
  })

  it('lets admins select issue reports for Excel and PDF export', async () => {
    const user = userEvent.setup()
    renderIssuesPage(true)

    const excelButton = screen.getByRole('button', { name: 'تصدير Excel' })
    const pdfButton = screen.getByRole('button', { name: 'تصدير PDF' })
    expect(screen.getByText('ملخص المشكلة')).toBeInTheDocument()
    expect(screen.getByText('تعذر حفظ البيانات')).toBeInTheDocument()
    expect(screen.getByText('ملاحظات التنفيذ')).toBeInTheDocument()
    expect(screen.getByText(executionNote.notes)).toBeInTheDocument()
    expect(excelButton).toBeDisabled()
    expect(pdfButton).toBeDisabled()

    await user.click(screen.getByRole('checkbox', { name: 'تحديد بلاغ حفظ طلب جديد' }))

    expect(excelButton).toBeEnabled()
    expect(pdfButton).toBeEnabled()
    await user.click(excelButton)
    await waitFor(() => expect(excelButton).toBeEnabled())
    await user.click(pdfButton)

    expect(exportIssuesToExcel).toHaveBeenCalledWith(
      [issue],
      [workflow],
      [scenario],
      [reporter],
      [executionNote],
      'جولة الاختبار',
    )
    expect(exportIssuesToPdf).toHaveBeenCalledWith(
      [issue],
      [workflow],
      [scenario],
      [reporter],
      [executionNote],
      'جولة الاختبار',
    )
  })
})
