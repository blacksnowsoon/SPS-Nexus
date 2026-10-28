import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { RoundScenario, RoundWorkflow, ScenarioExecution } from '../../types'
import { ScenarioDetail } from './ScenarioDetail'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

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

const workflow: RoundWorkflow = {
  round_id: scenario.round_id,
  scenario_id: scenario.scenario_id,
  status: 'has_issues',
  assigned_to: null,
  issue_summary: null,
  updated_at: '2026-10-26T10:00:00Z',
}

const execution: ScenarioExecution = {
  id: 'execution-1',
  round_id: scenario.round_id,
  scenario_id: scenario.scenario_id,
  user_id: 'user-1',
  status: 'failed',
  notes: '',
  updated_at: '2026-10-26T10:00:00Z',
}

function renderScenarioDetail(onReportIssue = vi.fn(), ownIssueStatus: 'open' | 'returned' | null = null) {
  return render(
    <ScenarioDetail
      scenario={scenario}
      workflow={workflow}
      execution={execution}
      issues={[]}
      ownIssueStatus={ownIssueStatus}
      isAdmin={false}
      canExecute
      busyAction=""
      issueDraft="المشكلة تظهر عند الحفظ"
      onIssueDraftChange={vi.fn()}
      onSaveExecution={vi.fn()}
      onReportIssue={onReportIssue}
      onTransition={vi.fn()}
      editing={false}
      editValues={{ title: '', description: '', steps: '', expected: '' }}
      onEditValue={vi.fn()}
      onStartEditing={vi.fn()}
      onCancelEditing={vi.fn()}
      onSaveScenario={vi.fn()}
    />,
  )
}

describe('ScenarioDetail issue reporting', () => {
  it('lets a failed tester report an issue without closing the shared scenario', async () => {
    const user = userEvent.setup()
    const onReportIssue = vi.fn()
    const confirm = vi.spyOn(window, 'confirm')
    renderScenarioDetail(onReportIssue)

    const reportButton = screen.getByRole('button', { name: 'إرسال بلاغ المشكلة' })
    await user.click(reportButton)

    expect(confirm).not.toHaveBeenCalled()
    expect(onReportIssue).toHaveBeenCalledOnce()
    expect(screen.getByText('البلاغ خاص بنتيجتك ولا يوقف تنفيذ السيناريو لبقية الفريق.')).toBeInTheDocument()
  })

  it('locks the execution status and notes after submitting an issue', () => {
    renderScenarioDetail(vi.fn(), 'open')

    expect(screen.getByRole('textbox', { name: 'ملاحظاتك' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '! فشل' })).toBeDisabled()
    expect(screen.getByText(/تم قفل نتيجة التنفيذ وملاحظاته/)).toBeInTheDocument()
  })

  it('allows the reporter to edit execution details after the admin returns the issue', () => {
    renderScenarioDetail(vi.fn(), 'returned')

    expect(screen.getByRole('textbox', { name: 'ملاحظاتك' })).toBeEnabled()
    expect(screen.getByRole('button', { name: '! فشل' })).toBeEnabled()
  })
})
