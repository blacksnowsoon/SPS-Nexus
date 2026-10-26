import type {
  ExecutionCounts,
  RoundScenario,
  RoundWorkflow,
  ScenarioExecution,
} from '../types'

export function countExecutions(
  scenarioCount: number,
  executions: Pick<ScenarioExecution, 'status'>[],
): ExecutionCounts {
  const counts: ExecutionCounts = {
    total: scenarioCount,
    not_tested: 0,
    passed: 0,
    failed: 0,
    not_applicable: 0,
  }

  for (const execution of executions) {
    if (execution.status === 'passed') {
      counts.passed += 1
    } else if (execution.status === 'failed') {
      counts.failed += 1
    } else if (execution.status === 'not_applicable') {
      counts.not_applicable += 1
    }
  }

  counts.not_tested = Math.max(
    scenarioCount - counts.passed - counts.failed - counts.not_applicable,
    0,
  )
  return counts
}

export function completionPercent(counts: ExecutionCounts): number {
  if (counts.total === 0) return 0
  return Math.round(((counts.total - counts.not_tested) / counts.total) * 100)
}

export function filterScenarios(
  scenarios: RoundScenario[],
  workflows: RoundWorkflow[],
  executions: ScenarioExecution[],
  query: string,
  moduleFilter: string,
  lifecycleFilter: string,
  executionFilter: string,
): RoundScenario[] {
  const normalizedQuery = query.trim().toLocaleLowerCase()
  const workflowById = new Map(workflows.map((workflow) => [workflow.scenario_id, workflow]))
  const executionById = new Map(executions.map((execution) => [execution.scenario_id, execution]))

  return scenarios.filter((scenario) => {
    const workflow = workflowById.get(scenario.scenario_id)
    const execution = executionById.get(scenario.scenario_id)
    const searchable = [
      scenario.title,
      scenario.description,
      scenario.module,
      scenario.section,
      scenario.category,
      ...scenario.steps,
      ...scenario.expected,
      execution?.notes ?? '',
    ]
      .join(' ')
      .toLocaleLowerCase()

    return (
      (!normalizedQuery || searchable.includes(normalizedQuery)) &&
      (!moduleFilter || scenario.module === moduleFilter) &&
      (!lifecycleFilter || workflow?.status === lifecycleFilter) &&
      (!executionFilter || (execution?.status ?? 'not_tested') === executionFilter)
    )
  })
}

export function nextWorkflowStatus(status: RoundWorkflow['status']): RoundWorkflow['status'] | null {
  if (status === 'has_issues') return 'in_progress'
  if (status === 'in_progress') return 'closed'
  return null
}

export function isEditableWorkflow(status: RoundWorkflow['status'] | undefined): boolean {
  return status === 'open'
}
