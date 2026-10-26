import type { RoundScenario, RoundWorkflow, ScenarioExecution } from '../../types'
import { EmptyState } from '../common/EmptyState'
import {
  statusDotClasses,
  statusLabels,
  workflowBadgeClasses,
  workflowLabels,
} from '../constants'

export interface ScenarioBrowserProps {
  scenarios: RoundScenario[]
  workflows: RoundWorkflow[]
  executions: ScenarioExecution[]
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
}

export function ScenarioBrowser({
  scenarios,
  workflows,
  executions,
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
}: ScenarioBrowserProps) {
  return (
    <section className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs min-h-[560px] max-lg:min-h-0 flex flex-col">
      <div className="flex items-center justify-between flex-wrap gap-2.5 p-3 sm:p-3.5 border-b border-slate-200/90">
        <label className="flex items-center gap-2 flex-1 min-w-[200px] border border-slate-200 bg-slate-50/70 rounded-xl px-3 py-1.5 text-slate-400 focus-within:border-blue-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
          <span aria-hidden="true" className="text-sm font-semibold">⌕</span>
          <input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="ابحث في السيناريوهات والخطوات…"
            className="w-full bg-transparent border-0 outline-none p-0 text-xs text-slate-800 placeholder:text-slate-400"
          />
        </label>
        <select
          aria-label="تصفية حسب النظام"
          value={moduleFilter}
          onChange={(event) => onModuleFilterChange(event.target.value)}
          className="min-w-[130px] border border-slate-200 bg-white rounded-xl px-3 py-1.5 text-xs text-slate-700 font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
        >
          <option value="">كل الأنظمة</option>
          {modules.map((module) => (
            <option key={module} value={module}>
              {module}
            </option>
          ))}
        </select>
        <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap px-1">
          {scenarios.length} سيناريو
        </span>
      </div>

      <div className="flex items-center flex-wrap gap-2 px-3 sm:px-3.5 py-2 bg-slate-50/70 border-b border-slate-200/90 text-xs">
        <select
          aria-label="تصفية حالة السيناريو"
          value={lifecycleFilter}
          onChange={(event) => onLifecycleFilterChange(event.target.value)}
          className="flex-1 min-w-[120px] border border-slate-200 bg-white rounded-lg px-2.5 py-1 text-xs text-slate-600 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
        >
          <option value="">كل حالات المشكلة</option>
          {Object.entries(workflowLabels).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
        <select
          aria-label="تصفية نتيجة الاختبار"
          value={executionFilter}
          onChange={(event) => onExecutionFilterChange(event.target.value)}
          className="flex-1 min-w-[120px] border border-slate-200 bg-white rounded-lg px-2.5 py-1 text-xs text-slate-600 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
        >
          <option value="">كل نتائجك</option>
          {Object.entries(statusLabels).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
        
      </div>

      {scenarios.length === 0 ? (
        <div className="p-6">
          <EmptyState title="لا توجد نتائج" body="جرّب تغيير البحث أو عوامل التصفية." />
        </div>
      ) : (
        <div className="flex-1 overflow-auto max-h-[calc(100vh-320px)] max-lg:max-h-[480px] p-2 space-y-1">
          {scenarios.map((scenario) => {
            const workflow = workflows.find((item) => item.scenario_id === scenario.scenario_id)
            const execution = executions.find((item) => item.scenario_id === scenario.scenario_id)
            const isSelected = selectedScenarioId === scenario.scenario_id
            const wStatus = workflow?.status ?? 'open'
            const eStatus = execution?.status ?? 'not_tested'

            return (
              <button
                className={`w-full flex items-center gap-2.5 p-2.5 rounded-xl border text-start transition-all ${
                  isSelected
                    ? 'bg-blue-50/80 border-blue-200 shadow-xs'
                    : 'bg-white border-transparent hover:bg-slate-50/80 hover:border-slate-200/60'
                }`}
                key={scenario.scenario_id}
                onClick={() => onSelectScenario(scenario.scenario_id)}
              >
                <span
                  className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                    wStatus === 'has_issues' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {scenario.source_number}
                </span>

                <span className="flex-1 min-w-0 grid gap-0.5">
                  <strong className="text-xs font-semibold text-slate-800 truncate">
                    {scenario.title}
                  </strong>
                  <small className="text-[10px] text-slate-400 truncate">
                    {scenario.module} <span className="text-slate-300">·</span> {scenario.section}
                  </small>
                </span>

                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold max-w-[90px] truncate ${workflowBadgeClasses[wStatus]}`}
                >
                  {workflowLabels[wStatus]}
                </span>

                <span
                  className={`w-2 h-2 rounded-full flex-shrink-0 ${statusDotClasses[eStatus]}`}
                  title={statusLabels[eStatus]}
                />
              </button>
            )
          })}
        </div>
      )}
    </section>
  )
}
