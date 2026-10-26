import { describe, expect, it } from 'vitest'
import cases from '../../uat-test-cases.json'
import { completionPercent, countExecutions, filterScenarios, isEditableWorkflow, nextWorkflowStatus } from './checklist'
import type { RoundScenario, RoundWorkflow, ScenarioExecution } from '../types'

const scenario: RoundScenario = {
  round_id: 'round-1',
  scenario_id: 'case-1',
  sort_order: 1,
  module: 'نظام السفن',
  section: 'طلبات',
  category: 'تراكي',
  source_number: 1,
  title: 'طلب تجريبي',
  description: 'وصف',
  steps: ['الخطوة الأولى', 'إرسال الطلب'],
  expected: ['يظهر الطلب'],
  removed_at: null,
}

describe('source UAT scenarios', () => {
  it('preserves the complete source inventory and array-valued steps/results', () => {
    expect(cases).toHaveLength(266)
    expect(new Set(cases.map((item) => item.id)).size).toBe(266)
    expect(new Set(cases.map((item) => item.module)).size).toBe(8)
    expect(new Set(cases.map((item) => item.section)).size).toBe(27)
    for (const item of cases) {
      expect(item.title.trim()).not.toBe('')
      expect(Array.isArray(item.steps)).toBe(true)
      expect(Array.isArray(item.expected)).toBe(true)
      expect(item.steps.every((step) => typeof step === 'string')).toBe(true)
      expect(item.expected.every((result) => typeof result === 'string')).toBe(true)
    }
  })
})

describe('execution summaries', () => {
  it('counts user executions against the full scenario denominator', () => {
    const result = countExecutions(4, [{ status: 'passed' }, { status: 'failed' }])
    expect(result).toEqual({
      total: 4,
      not_tested: 2,
      passed: 1,
      failed: 1,
      not_applicable: 0,
    })
    expect(completionPercent(result)).toBe(50)
    expect(completionPercent(countExecutions(0, []))).toBe(0)
  })

  it('filters on scenario fields, execution notes, module, lifecycle, and user status', () => {
    const workflow: RoundWorkflow = {
      round_id: 'round-1',
      scenario_id: 'case-1',
      status: 'open',
      assigned_to: null,
      issue_summary: null,
      updated_at: '',
    }
    const execution: ScenarioExecution = {
      id: 'execution-1',
      round_id: 'round-1',
      scenario_id: 'case-1',
      user_id: 'user-1',
      status: 'failed',
      notes: 'ظهرت رسالة خطأ',
      updated_at: '',
    }

    expect(filterScenarios([scenario], [workflow], [execution], 'رسالة خطأ', '', '', '')).toEqual([scenario])
    expect(filterScenarios([scenario], [workflow], [execution], '', 'نظام آخر', '', '')).toEqual([])
    expect(filterScenarios([scenario], [workflow], [execution], '', '', 'closed', '')).toEqual([])
    expect(filterScenarios([scenario], [workflow], [], '', '', '', 'not_tested')).toEqual([scenario])
  })
})

describe('round scenario issue workflow', () => {
  it('allows only the prescribed admin transitions', () => {
    expect(nextWorkflowStatus('has_issues')).toBe('in_progress')
    expect(nextWorkflowStatus('in_progress')).toBe('closed')
    expect(nextWorkflowStatus('open')).toBeNull()
    expect(nextWorkflowStatus('closed')).toBeNull()
  })

  it('locks tester execution and scenario editing after issue reporting', () => {
    expect(isEditableWorkflow('open')).toBe(true)
    expect(isEditableWorkflow('has_issues')).toBe(false)
    expect(isEditableWorkflow('in_progress')).toBe(false)
    expect(isEditableWorkflow('closed')).toBe(false)
  })
})
