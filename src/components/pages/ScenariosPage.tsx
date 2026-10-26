import type {
  ExecutionStatus,
  RoundScenario,
  RoundWorkflow,
  ScenarioExecution,
  ScenarioIssue,
  WorkflowStatus,
} from '../../types'
import { ScenarioBrowser } from '../scenarios/ScenarioBrowser'
import { ScenarioDetail } from '../scenarios/ScenarioDetail'

export interface ScenariosPageProps {
  scenarios: RoundScenario[]
  workflows: RoundWorkflow[]
  ownExecutions: ScenarioExecution[]
  selectedScenarioId: string
  onSelectScenario: (scenarioId: string) => void
  search: string
  onSearchChange: (value: string) => void
  moduleFilter: string
  onModuleFilterChange: (value: string) => void
  modules: string[]
  lifecycleFilter: string
  onLifecycleFilterChange: (value: string) => void
  executionFilter: string
  onExecutionFilterChange: (value: string) => void
  selectedScenario: RoundScenario | null
  currentWorkflow: RoundWorkflow | undefined
  currentExecution: ScenarioExecution | undefined
  selectedIssues: ScenarioIssue[]
  isAdmin: boolean
  canExecute: boolean
  busyAction: string
  issueDraft: string
  onIssueDraftChange: (value: string) => void
  onSaveExecution: (status: ExecutionStatus, notes: string) => void
  onReportIssue: () => void
  onTransition: (status: WorkflowStatus) => void
  editingScenario: boolean
  editValues: { title: string; description: string; steps: string; expected: string }
  onEditValue: (field: 'title' | 'description' | 'steps' | 'expected', value: string) => void
  onStartEditing: () => void
  onCancelEditing: () => void
  onSaveScenario: () => void
}

export function ScenariosPage({
  scenarios,
  workflows,
  ownExecutions,
  selectedScenarioId,
  onSelectScenario,
  search,
  onSearchChange,
  moduleFilter,
  onModuleFilterChange,
  modules,
  lifecycleFilter,
  onLifecycleFilterChange,
  executionFilter,
  onExecutionFilterChange,
  selectedScenario,
  currentWorkflow,
  currentExecution,
  selectedIssues,
  isAdmin,
  canExecute,
  busyAction,
  issueDraft,
  onIssueDraftChange,
  onSaveExecution,
  onReportIssue,
  onTransition,
  editingScenario,
  editValues,
  onEditValue,
  onStartEditing,
  onCancelEditing,
  onSaveScenario,
}: ScenariosPageProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(280px,1fr)_minmax(0,2fr)] gap-4 items-start">
      <ScenarioBrowser
        scenarios={scenarios}
        workflows={workflows}
        executions={ownExecutions}
        selectedScenarioId={selectedScenarioId}
        onSelectScenario={onSelectScenario}
        search={search}
        onSearchChange={onSearchChange}
        moduleFilter={moduleFilter}
        onModuleFilterChange={onModuleFilterChange}
        modules={modules}
        lifecycleFilter={lifecycleFilter}
        onLifecycleFilterChange={onLifecycleFilterChange}
        executionFilter={executionFilter}
        onExecutionFilterChange={onExecutionFilterChange}
      />
      <ScenarioDetail
        scenario={selectedScenario}
        key={selectedScenario?.scenario_id ?? 'empty'}
        workflow={currentWorkflow}
        execution={currentExecution}
        issues={selectedIssues}
        isAdmin={isAdmin}
        canExecute={canExecute}
        busyAction={busyAction}
        issueDraft={issueDraft}
        onIssueDraftChange={onIssueDraftChange}
        onSaveExecution={onSaveExecution}
        onReportIssue={onReportIssue}
        onTransition={onTransition}
        editing={editingScenario}
        editValues={editValues}
        onEditValue={onEditValue}
        onStartEditing={onStartEditing}
        onCancelEditing={onCancelEditing}
        onSaveScenario={onSaveScenario}
      />
    </div>
  )
}
