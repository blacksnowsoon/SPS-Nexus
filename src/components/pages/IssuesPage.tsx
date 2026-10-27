import { useMemo, useState } from 'react'
import { exportIssuesToExcel, exportIssuesToPdf } from '../../lib/issue-export'
import type {
  IssueExecutionNote,
  IssueReporter,
  RoundScenario,
  RoundWorkflow,
  ScenarioIssue,
} from '../../types'
import { EmptyState } from '../common/EmptyState'
import {
  formatDate,
  issueStatusBadgeClasses,
  issueStatusLabels,
} from '../constants'

export interface IssuesPageProps {
  workflows: RoundWorkflow[]
  scenarios: RoundScenario[]
  issues: ScenarioIssue[]
  reporters: IssueReporter[]
  executionNotes: IssueExecutionNote[]
  roundName: string
  isAdmin: boolean
  busyAction: string
  userId: string
  onOpenScenario: (id: string) => void
  onReturnIssue: (issueId: string) => void
  onResolveIssue: (issueId: string) => void
  onUpdateIssue: (issueId: string, report: string) => void
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
  userId,
  onOpenScenario,
  onReturnIssue,
  onResolveIssue,
  onUpdateIssue,
}: IssuesPageProps) {
  const [selectedIssueIds, setSelectedIssueIds] = useState<string[]>([])
  const [reportDrafts, setReportDrafts] = useState<Record<string, string>>({})
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

  if (issues.length === 0) {
    return (
      <EmptyState
        title="لا توجد بلاغات في هذه الجولة"
        body="عند الإبلاغ عن مشكلة في سيناريو، سيظهر بلاغك هنا للفريق."
      />
    )
  }

  return (
    <div className="space-y-4">
      {isAdmin && (
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
        {issues.map((issue) => {
          const scenario = scenarios.find((item) => item.scenario_id === issue.scenario_id)
          const workflow = workflows.find((item) => item.scenario_id === issue.scenario_id)
          const reporter = reporters.find((item) => item.id === issue.reported_by)
          const executionNote = executionNotes.find(
            (item) => item.scenario_id === issue.scenario_id && item.user_id === issue.reported_by,
          )
          const canEdit = issue.reported_by === userId && issue.status === 'returned'
          const draft = reportDrafts[issue.id] ?? issue.report
          const issueBusy = busyAction.endsWith(issue.id)

          return (
            <article
              className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col justify-between"
              key={issue.id}
            >
              <div>
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                  {isAdmin && (
                    <input
                      className="accent-blue-600 w-4 h-4 rounded cursor-pointer"
                      type="checkbox"
                      checked={selectedIssueIds.includes(issue.id)}
                      onChange={(event) => toggleIssue(issue.id, event.target.checked)}
                      aria-label={`تحديد بلاغ ${reporter?.display_name || 'مستخدم'} - ${scenario?.title ?? issue.scenario_id}`}
                    />
                  )}
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold ${issueStatusBadgeClasses[issue.status]}`}
                  >
                    {issueStatusLabels[issue.status]}
                  </span>
                  <span className="ms-auto text-xs font-mono font-bold text-slate-400 dir-ltr">
                    #{scenario?.source_number}
                  </span>
                </div>

                <h2 className="text-sm font-bold text-slate-900 mt-2.5 mb-0.5 leading-snug">
                  {scenario?.title ?? issue.scenario_id}
                </h2>
                <p className="text-[10px] text-slate-400 font-medium">
                  {scenario?.module} · {scenario?.section}
                </p>

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

                  <div className="pt-2 border-t border-rose-200/60">
                    <strong className="text-[10px] font-bold text-rose-800 block">تفاصيل البلاغ</strong>
                    <p className="text-xs text-slate-700 mt-0.5 whitespace-pre-wrap">{issue.report}</p>
                  </div>

                  {workflow?.issue_summary && (
                    <div className="pt-2 border-t border-rose-200/60">
                      <strong className="text-[10px] font-bold text-rose-800 block">ملخص المعالجة</strong>
                      <p className="text-xs text-slate-700 mt-0.5">{workflow.issue_summary}</p>
                    </div>
                  )}

                  {isAdmin && executionNote?.notes && (
                    <div className="pt-2 border-t border-rose-200/60">
                      <strong className="text-[10px] font-bold text-slate-700 block">ملاحظات التنفيذ</strong>
                      <p className="text-xs text-slate-600 mt-0.5 whitespace-pre-wrap">{executionNote.notes}</p>
                    </div>
                  )}
                </div>

                {canEdit && (
                  <div className="block mt-3 text-xs font-semibold text-slate-700">
                    <label className="block" htmlFor={`issue-report-${issue.id}`}>تعديل بلاغك</label>
                    <textarea
                      id={`issue-report-${issue.id}`}
                      rows={3}
                      value={draft}
                      onChange={(event) =>
                        setReportDrafts((current) => ({ ...current, [issue.id]: event.target.value }))
                      }
                      className="mt-1 w-full border border-amber-200 bg-white rounded-xl p-2.5 text-xs text-slate-800 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                    />
                    <button
                      type="button"
                      className="mt-2 inline-flex items-center justify-center px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold disabled:opacity-50"
                      onClick={() => onUpdateIssue(issue.id, draft.trim())}
                      disabled={!draft.trim() || issueBusy}
                    >
                      {issueBusy ? 'جارٍ الحفظ…' : 'حفظ التعديل وإعادة الإرسال'}
                    </button>
                  </div>
                )}
              </div>

              <div className="flex items-center flex-wrap gap-2 mt-4 pt-3 border-t border-slate-100">
                <button
                  className="inline-flex items-center justify-center px-3.5 py-1.5 border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 rounded-xl text-xs font-semibold shadow-2xs transition-colors"
                  onClick={() => onOpenScenario(issue.scenario_id)}
                >
                  عرض السيناريو
                </button>
                {isAdmin && issue.status === 'open' && (
                  <button
                    className="inline-flex items-center justify-center px-3.5 py-1.5 border border-amber-200 text-amber-800 bg-white hover:bg-amber-50 rounded-xl text-xs font-semibold disabled:opacity-50"
                    onClick={() => onReturnIssue(issue.id)}
                    disabled={issueBusy}
                  >
                    إعادة للمبلّغ للتعديل
                  </button>
                )}
                {isAdmin && issue.status !== 'resolved' && (
                  <button
                    className="inline-flex items-center justify-center px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold disabled:opacity-50"
                    onClick={() => onResolveIssue(issue.id)}
                    disabled={issueBusy}
                  >
                    تحديد كمحلول
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
