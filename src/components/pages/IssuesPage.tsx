import { useMemo, useState } from 'react'
import { nextWorkflowStatus } from '../../lib/checklist'
import { exportIssuesToExcel, exportIssuesToPdf } from '../../lib/issue-export'
import type {
  IssueExecutionNote,
  IssueReporter,
  RoundScenario,
  RoundWorkflow,
  ScenarioIssue,
  WorkflowStatus,
} from '../../types'
import { EmptyState } from '../common/EmptyState'
import { formatDate, workflowBadgeClasses, workflowLabels } from '../constants'

export interface IssuesPageProps {
  workflows: RoundWorkflow[]
  scenarios: RoundScenario[]
  issues: ScenarioIssue[]
  reporters: IssueReporter[]
  executionNotes: IssueExecutionNote[]
  roundName: string
  isAdmin: boolean
  busyAction: string
  onOpenScenario: (id: string) => void
  onTransition: (workflow: RoundWorkflow, status: WorkflowStatus) => void
}

export function IssuesPage({
  workflows,
  scenarios,
  issues,
  reporters,
  executionNotes,
  roundName,
  isAdmin,
  busyAction,
  onOpenScenario,
  onTransition,
}: IssuesPageProps) {
  const [selectedIssueIds, setSelectedIssueIds] = useState<string[]>([])
  const [exportError, setExportError] = useState('')
  const [exporting, setExporting] = useState(false)
  const selectedIssues = useMemo(
    () => issues.filter((issue) => selectedIssueIds.includes(issue.id)),
    [issues, selectedIssueIds],
  )
  const allSelected = issues.length > 0 && issues.every((issue) => selectedIssueIds.includes(issue.id))

  const toggleIssue = (issueId: string, checked: boolean) => {
    setSelectedIssueIds((current) =>
      checked ? [...new Set([...current, issueId])] : current.filter((id) => id !== issueId),
    )
  }

  const handleExport = async (format: 'excel' | 'pdf') => {
    setExportError('')
    setExporting(true)
    try {
      if (format === 'excel') {
        await exportIssuesToExcel(selectedIssues, workflows, scenarios, reporters, executionNotes, roundName)
      } else if (!exportIssuesToPdf(selectedIssues, workflows, scenarios, reporters, executionNotes, roundName)) {
        setExportError('تعذر فتح نافذة التصدير. اسمح بالنوافذ المنبثقة لهذا الموقع ثم حاول مجددًا.')
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'خطأ غير معروف'
      setExportError(`تعذر تصدير البلاغات: ${message}`)
    } finally {
      setExporting(false)
    }
  }

  if (workflows.length === 0) {
    return (
      <EmptyState
        title="لا توجد مشكلات في هذه الجولة"
        body="عند الإبلاغ عن مشكلة في سيناريو، ستظهر هنا للفريق."
      />
    )
  }

  return (
    <div className="space-y-4">
      {isAdmin && issues.length > 0 && (
        <div className="flex items-center flex-wrap gap-2.5 p-3 sm:p-3.5 bg-white border border-slate-200/90 rounded-2xl shadow-xs">
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={(event) =>
                setSelectedIssueIds(event.target.checked ? issues.map((issue) => issue.id) : [])
              }
              aria-label="تحديد كل البلاغات"
              className="accent-blue-600 w-4 h-4 rounded"
            />
            <span>تحديد الكل ({issues.length})</span>
          </label>
          <span className="text-xs text-slate-400 ms-auto">تم تحديد {selectedIssues.length}</span>
          <button
            className="inline-flex items-center justify-center px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-colors disabled:opacity-50"
            disabled={selectedIssues.length === 0 || exporting}
            onClick={() => void handleExport('excel')}
          >
            {exporting ? 'جارٍ التصدير…' : 'تصدير Excel'}
          </button>
          <button
            className="inline-flex items-center justify-center px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-colors disabled:opacity-50"
            disabled={selectedIssues.length === 0 || exporting}
            onClick={() => void handleExport('pdf')}
          >
            تصدير PDF
          </button>
          {exportError && (
            <p className="basis-full text-xs text-rose-600 bg-rose-50 border border-rose-200/60 rounded-lg p-2.5 mt-1">
              {exportError}
            </p>
          )}
        </div>
      )}

      <section className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {workflows.map((workflow) => {
          const scenario = scenarios.find((item) => item.scenario_id === workflow.scenario_id)
          const issue = issues.find((item) => item.scenario_id === workflow.scenario_id)
          const reporter = issue && reporters.find((item) => item.id === issue.reported_by)
          const executionNote =
            issue &&
            executionNotes.find(
              (item) => item.scenario_id === issue.scenario_id && item.user_id === issue.reported_by,
            )
          const next = nextWorkflowStatus(workflow.status)

          return (
            <article
              className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col justify-between"
              key={workflow.scenario_id}
            >
              <div>
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                  {isAdmin && issue && (
                    <input
                      className="accent-blue-600 w-4 h-4 rounded cursor-pointer"
                      type="checkbox"
                      checked={selectedIssueIds.includes(issue.id)}
                      onChange={(event) => toggleIssue(issue.id, event.target.checked)}
                      aria-label={`تحديد بلاغ ${scenario?.title ?? workflow.scenario_id}`}
                    />
                  )}
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold ${workflowBadgeClasses[workflow.status]}`}
                  >
                    {workflowLabels[workflow.status]}
                  </span>
                  <span className="ms-auto text-xs font-mono font-bold text-slate-400 dir-ltr">
                    #{scenario?.source_number}
                  </span>
                </div>

                <h2 className="text-sm font-bold text-slate-900 mt-2.5 mb-0.5 leading-snug">
                  {scenario?.title ?? workflow.scenario_id}
                </h2>
                <p className="text-[10px] text-slate-400 font-medium">
                  {scenario?.module} · {scenario?.section}
                </p>

                {issue && (
                  <div className="border-s-4 border-rose-300 bg-rose-50/50 p-3 rounded-lg mt-3 space-y-2">
                    <div className="flex items-center gap-2">
                      {reporter?.avatar_url ? (
                        <img src={reporter.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover" />
                      ) : (
                        <span className="w-7 h-7 rounded-full bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center">
                          {(reporter?.display_name || 'م').slice(0, 1)}
                        </span>
                      )}
                      <div>
                        <strong className="text-xs font-semibold text-slate-800 block">
                          {reporter?.display_name || 'مستخدم'}
                        </strong>
                        <small className="text-[10px] text-slate-400 block">
                          مُبلّغ · {formatDate(issue.created_at)}
                        </small>
                      </div>
                    </div>

                    

                    {workflow.issue_summary && (
                      <div className="pt-2 border-t border-rose-200/60">
                        <strong className="text-[10px] font-bold text-rose-800 block">ملخص المشكلة</strong>
                        <p className="text-xs text-slate-700 mt-0.5">{workflow.issue_summary}</p>
                      </div>
                    )}

                    {isAdmin && executionNote?.notes && (
                      <div className="pt-2 border-t border-rose-200/60">
                        <strong className="text-[10px] font-bold text-slate-700 block">ملاحظات التنفيذ</strong>
                        <p className="text-xs text-slate-600 mt-0.5">{executionNote.notes}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-100">
                <button
                  className="inline-flex items-center justify-center px-3.5 py-1.5 border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 rounded-xl text-xs font-semibold shadow-2xs transition-colors"
                  onClick={() => onOpenScenario(workflow.scenario_id)}
                >
                  عرض السيناريو
                </button>
                {isAdmin && next && (
                  <button
                    className="inline-flex items-center justify-center px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-2xs disabled:opacity-50 transition-colors"
                    onClick={() => onTransition(workflow, next)}
                    disabled={busyAction === `workflow-${workflow.scenario_id}`}
                  >
                    {next === 'in_progress' ? 'بدء المعالجة' : 'إغلاق المشكلة'}
                  </button>
                )}
              </div>
            </article>
          )
        })}
      </section>
    </div>
  )
}
