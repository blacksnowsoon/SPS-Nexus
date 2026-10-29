import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { RoundScenario, RoundWorkflow, ScenarioExecution } from '../../types'
import { ScenarioBrowser } from './ScenarioBrowser'

afterEach(cleanup)

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
  round_id: 'round-1',
  scenario_id: 'scenario-1',
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
  created_at: '2026-10-26T10:00:00Z',
  updated_at: '2026-10-26T10:00:00Z',
}

function renderBrowser(ownIssueStatus: 'open' | 'returned') {
  return render(
    <ScenarioBrowser
      scenarios={[scenario]}
      workflows={[workflow]}
      executions={[execution]}
      ownIssueStatuses={{ [scenario.scenario_id]: ownIssueStatus }}
      selectedScenarioId=""
      onSelectScenario={vi.fn()}
      search=""
      onSearchChange={vi.fn()}
      moduleFilter=""
      onModuleFilterChange={vi.fn()}
      modules={['المشتريات']}
      lifecycleFilter=""
      onLifecycleFilterChange={vi.fn()}
      executionFilter=""
      onExecutionFilterChange={vi.fn()}
    />,
  )
}

describe('ScenarioBrowser issue status', () => {
  it('shows that execution is locked after a report is submitted', () => {
    renderBrowser('open')

    expect(screen.getByLabelText('حالة البلاغ: التنفيذ مغلق')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /حفظ طلب جديد.*لديه مشكلة.*التنفيذ مغلق/ })).toBeInTheDocument()
  })

  it('shows when an admin returns the report for edits', () => {
    renderBrowser('returned')

    expect(screen.getByLabelText('حالة البلاغ: للتعديل')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /حفظ طلب جديد.*لديه مشكلة.*للتعديل/ })).toBeInTheDocument()
  })
})
