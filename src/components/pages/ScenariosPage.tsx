import { useState } from 'react'
import type {
  ExecutionStatus,
  IssueStatus,
  RoundScenario,
  RoundWorkflow,
  ScenarioExecution,
  ScenarioIssue,
  SavedTestSuggestion,
  WorkflowStatus,
} from '../../types'
import { ScenarioBrowser } from '../scenarios/ScenarioBrowser'
import { ScenarioDetail } from '../scenarios/ScenarioDetail'
import { SuggestionForm, type SuggestionFormValues } from './SuggestionForm'

export interface ScenariosPageProps {
  scenarios: RoundScenario[]
  workflows: RoundWorkflow[]
  ownExecutions: ScenarioExecution[]
  ownIssueStatuses: Record<string, IssueStatus>
  selectedScenarioId: string
  onSelectScenario: (scenarioId: string) => void
  search: string
  onSearchChange: (value: string) => void
  moduleFilter: string
  onModuleFilterChange: (value: string) => void
  modules: string[]
  suggestionModules: string[]
  savedSuggestions: SavedTestSuggestion[]
  suggestionBusyAction: string
  onSaveSuggestion: (values: SuggestionFormValues, suggestionId: string | null) => Promise<string | null>
  onSendSuggestion: (suggestionId: string) => Promise<boolean>
  lifecycleFilter: string
  onLifecycleFilterChange: (value: string) => void
  executionFilter: string
  onExecutionFilterChange: (value: string) => void
  selectedScenario: RoundScenario | null
  currentWorkflow: RoundWorkflow | undefined
  currentExecution: ScenarioExecution | undefined
  selectedIssues: ScenarioIssue[]
  ownIssueStatus: IssueStatus | null
  isAdmin: boolean
  canExecute: boolean
  userId: string
  busyAction: string
  issueDraft: string
  onIssueDraftChange: (value: string) => void
  onSaveExecution: (status: ExecutionStatus, notes: string, saveNotes?: boolean) => void
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
  ownIssueStatuses,
  selectedScenarioId,
  onSelectScenario,
  search,
  onSearchChange,
  moduleFilter,
  onModuleFilterChange,
  modules,
  suggestionModules,
  savedSuggestions,
  suggestionBusyAction,
  onSaveSuggestion,
  onSendSuggestion,
  lifecycleFilter,
  onLifecycleFilterChange,
  executionFilter,
  onExecutionFilterChange,
  selectedScenario,
  currentWorkflow,
  currentExecution,
  selectedIssues,
  ownIssueStatus,
  isAdmin,
  canExecute,
  userId,
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
  const [activeTab, setActiveTab] = useState<'details' | 'suggestion'>('details')

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(280px,1fr)_minmax(0,2fr)] gap-4 items-start">
      <ScenarioBrowser
        scenarios={scenarios}
        workflows={workflows}
        executions={ownExecutions}
        ownIssueStatuses={ownIssueStatuses}
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
      <section className="min-w-0">
        <div className="mb-3 flex gap-1 border-b border-slate-200" role="tablist" aria-label="محتوى السيناريوهات">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'details'}
            className={`border-b-2 px-4 py-2.5 text-xs font-semibold ${
              activeTab === 'details' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
            onClick={() => setActiveTab('details')}
          >
            تفاصيل السيناريو
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'suggestion'}
            className={`border-b-2 px-4 py-2.5 text-xs font-semibold ${
              activeTab === 'suggestion' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
            onClick={() => setActiveTab('suggestion')}
          >
            أضف مقترح
          </button>
        </div>
        {activeTab === 'details' ? (
          <ScenarioDetail
            scenario={selectedScenario}
            key={`${selectedScenario?.round_id ?? 'empty'}:${selectedScenario?.scenario_id ?? 'empty'}:${userId}`}
            workflow={currentWorkflow}
            execution={currentExecution}
            issues={selectedIssues}
            ownIssueStatus={ownIssueStatus}
            isAdmin={isAdmin}
            canExecute={canExecute}
            userId={userId}
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
        ) : (
          <SuggestionForm
            modules={suggestionModules}
            savedSuggestions={savedSuggestions}
            busyAction={suggestionBusyAction}
            onSave={onSaveSuggestion}
            onSend={onSendSuggestion}
          />
        )}
      </section>
    </div>
  )
}
