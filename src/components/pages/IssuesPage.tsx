import { useMemo, useState } from 'react'
import { exportIssuesToExcel, exportIssuesToPdf } from '../../lib/issue-export'
import type {
  IssueExecutionNote,
  IssueReporter,
  RoundScenario,
  RoundWorkflow,
  IssueStatus,
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
  onResolveIssue: (issueId: string) => void | Promise<void>
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
  const [moduleFilter, setModuleFilter] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [reportDrafts, setReportDrafts] = useState<Record<string, string>>({})
  const [exportError, setExportError] = useState('')
  const [exporting, setExporting] = useState(false)
  const [resolvingSelected, setResolvingSelected] = useState(false)
  const [expandedScenarioIds, setExpandedScenarioIds] = useState<string[]>([])
  const issueModules = useMemo(
    () =>
      [...new Set(
        issues
          .map((issue) => scenarios.find((scenario) => scenario.scenario_id === issue.scenario_id)?.module)
          .filter((module): module is string => Boolean(module)),
      )].sort((first, second) => first.localeCompare(second)),
    [issues, scenarios],
  )
  const visibleIssues = useMemo(
    () => {
      const normalizedQuery = searchQuery.trim().toLocaleLowerCase()

      return issues.filter((issue) => {
        const scenario = scenarios.find((item) => item.scenario_id === issue.scenario_id)
        const reporter = reporters.find((item) => item.id === issue.reported_by)
        const workflow = workflows.find((item) => item.scenario_id === issue.scenario_id)
        const executionNote = executionNotes.find(
          (item) => item.scenario_id === issue.scenario_id && item.user_id === issue.reported_by,
        )
        const matchesModule = !moduleFilter || scenario?.module === moduleFilter
        const searchableText = [
          issue.report,
          scenario?.title,
          scenario?.module,
          scenario?.section,
          reporter?.display_name,
          issueStatusLabels[issue.status],
          formatDate(issue.created_at),
          workflow?.issue_summary,
          executionNote?.notes,
        ]
          .filter(Boolean)
          .join(' ')
          .toLocaleLowerCase()

        return matchesModule && (!normalizedQuery || searchableText.includes(normalizedQuery))
      })
    },
    [executionNotes, issues, moduleFilter, reporters, scenarios, searchQuery, workflows],
  )
  const selectedIssues = useMemo(
    () => issues.filter((issue) => selectedIssueIds.includes(issue.id)),
    [issues, selectedIssueIds],
  )
  const visibleIssueGroups = useMemo(() => {
    const groups = new Map<string, { scenario: RoundScenario | undefined; issues: ScenarioIssue[] }>()

    visibleIssues.forEach((issue) => {
      let group = groups.get(issue.scenario_id)
      if (!group) {
        group = {
          scenario: scenarios.find((item) => item.scenario_id === issue.scenario_id),
          issues: [],
        }
        groups.set(issue.scenario_id, group)
      }
      group.issues.push(issue)
    })

    return [...groups.values()]
  }, [scenarios, visibleIssues])
  const selectedUnresolvedIssues = selectedIssues.filter((issue) => issue.status !== 'resolved')
  const allVisibleSelected =
    visibleIssues.length > 0 && visibleIssues.every((issue) => selectedIssueIds.includes(issue.id))

  const toggleIssue = (issueId: string, checked: boolean) => {
    setSelectedIssueIds((current) =>
      checked ? [...new Set([...current, issueId])] : current.filter((id) => id !== issueId),
    )
  }

  const toggleIssues = (issueIds: string[], checked: boolean) => {
    setSelectedIssueIds((current) => {
      const ids = new Set(issueIds)
      return checked
        ? [...new Set([...current, ...ids])]
        : current.filter((id) => !ids.has(id))
    })
  }

  const handleResolveSelected = async () => {
    setResolvingSelected(true)
    try {
      for (const issue of selectedUnresolvedIssues) {
        await onResolveIssue(issue.id)
      }
    } finally {
      setResolvingSelected(false)
    }
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
    <div className="space-y-2">
      <div className={`grid grid-cols-1 gap-3 ${isAdmin ? 'md:grid-cols-2' : ''}`}>
        {isAdmin && (
          <section className="rounded-2xl border border-slate-200/90 bg-white p-3 sm:p-4 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <span className="text-xs font-bold text-slate-800">تحديد وتصدير البلاغات</span>
              <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-semibold text-blue-700">
                تم تحديد {selectedIssues.length}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs font-semibold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  onChange={(event) =>
                    setSelectedIssueIds((current) => {
                      const visibleIds = new Set(visibleIssues.map((issue) => issue.id))
                      return event.target.checked
                        ? [...new Set([...current, ...visibleIds])]
                        : current.filter((id) => !visibleIds.has(id))
                    })
                  }
                  aria-label="تحديد كل البلاغات المعروضة"
                  className="accent-blue-600 w-4 h-4 rounded"
                />
                <span>تحديد الكل ({visibleIssues.length})</span>
              </label>
              <button
                type="button"
                className="inline-flex flex-1 items-center justify-center rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={selectedUnresolvedIssues.length === 0 || resolvingSelected}
                onClick={() => void handleResolveSelected()}
              >
                {resolvingSelected ? 'جارٍ الحل…' : `تحويل المحدد (${selectedUnresolvedIssues.length})`}
              </button>
              <button
                type="button"
                className="inline-flex flex-1 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={selectedIssues.length === 0 || exporting}
                onClick={() => void handleExport('excel')}
              >
                {exporting ? 'جارٍ التصدير…' : 'تصدير Excel'}
              </button>
              <button
                type="button"
                className="inline-flex flex-1 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={selectedIssues.length === 0 || exporting}
                onClick={() => void handleExport('pdf')}
              >
                تصدير PDF
              </button>
            </div>
            {exportError && (
              <p role="alert" className="mt-3 rounded-lg border border-rose-200/60 bg-rose-50 p-2.5 text-xs text-rose-600">
                {exportError}
              </p>
            )}
          </section>
        )}

        <section className="rounded-2xl border border-slate-200/90 bg-white p-3 sm:p-4 shadow-xs">
          <div className={"flex justify-between"}>
            <span className="mb-3 block text-xs font-bold text-slate-800">البحث والتصفية</span>
            <p className="mb-3 text-[10px] text-slate-400">
            عرض {visibleIssues.length} من {issues.length} بلاغ
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <label htmlFor="issue-search" className="block text-[10px] font-semibold text-slate-500">
              البحث في البلاغات
              <input
                id="issue-search"
                type="search"
                aria-label="البحث في البلاغات"
                placeholder="ابحث في التفاصيل أو السيناريو أو المبلّغ"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="mt-1.5 w-full min-w-0 rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-700 transition-colors focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </label>
            <label htmlFor="issue-module-filter" className="block text-[10px] font-semibold text-slate-500">
              تصفية حسب النظام
              <select
                id="issue-module-filter"
                aria-label="تصفية بلاغات المشكلات حسب النظام"
                value={moduleFilter}
                onChange={(event) => setModuleFilter(event.target.value)}
                className="mt-1.5 w-full min-w-0 rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-medium text-slate-700 transition-colors focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="">كل الأنظمة</option>
                {issueModules.map((module) => (
                  <option key={module} value={module}>{module}</option>
                ))}
              </select>
            </label>
          </div>
        </section>
      </div>

      

      {visibleIssues.length === 0 ? (
        <EmptyState
          title={searchQuery.trim() ? 'لا توجد بلاغات تطابق البحث' : 'لا توجد بلاغات لهذا النظام'}
          body="غيّر كلمات البحث أو اختر نظامًا آخر."
        />
      ) : (
      <section className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {visibleIssueGroups.map(({ scenario, issues: scenarioIssues }) => {
          const scenarioTitle = scenario?.title ?? scenarioIssues[0].scenario_id
          const scenarioId = scenarioIssues[0].scenario_id
          const selectedCount = scenarioIssues.filter((issue) => selectedIssueIds.includes(issue.id)).length
          const allGroupIssuesSelected = selectedCount === scenarioIssues.length
          const isExpanded = expandedScenarioIds.includes(scenarioId)
          const groupStatus: IssueStatus = scenarioIssues.some((issue) => issue.status === 'open')
            ? 'open'
            : scenarioIssues.some((issue) => issue.status === 'returned')
              ? 'returned'
              : 'resolved'

          return (
            <article
              className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs min-w-0"
              key={scenarioId}
            >
              <header className="flex items-start gap-3">
                {isAdmin && (
                  <input
                    className="accent-blue-600 w-4 h-4 mt-1 rounded cursor-pointer"
                    type="checkbox"
                    checked={allGroupIssuesSelected}
                    ref={(element) => {
                      if (element) element.indeterminate = selectedCount > 0 && !allGroupIssuesSelected
                    }}
                    onChange={(event) =>
                      toggleIssues(scenarioIssues.map((issue) => issue.id), event.target.checked)
                    }
                    aria-label={`تحديد بلاغات السيناريو ${scenarioTitle}`}
                  />
                )}
                <button
                  type="button"
                  className="min-w-0 flex-1 text-start"
                  aria-expanded={isExpanded}
                  aria-label={`${isExpanded ? 'إخفاء' : 'عرض'} بلاغات السيناريو ${scenarioTitle}`}
                  onClick={() =>
                    setExpandedScenarioIds((current) =>
                      isExpanded
                        ? current.filter((id) => id !== scenarioId)
                        : [...current, scenarioId],
                    )
                  }
                >
                  <div className="flex items-center flex-wrap gap-2">
                    <h2 className="text-sm font-bold text-slate-900 leading-snug">{scenarioTitle}</h2>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold ${issueStatusBadgeClasses[groupStatus]}`}
                    >
                      {issueStatusLabels[groupStatus]}
                    </span>
                    <span className="text-xs font-mono font-bold text-slate-400 dir-ltr">
                      #{scenario?.source_number}
                    </span>
                    <span className="ms-auto text-xs font-semibold text-slate-500">
                      {scenarioIssues.length} {scenarioIssues.length === 1 ? 'بلاغ' : 'بلاغات'}
                      <span className="ms-2 text-slate-400" aria-hidden="true">{isExpanded ? '−' : '+'}</span>
                    </span>
                  </div>
                  {scenario && (
                    <p className="text-[10px] text-slate-400 font-medium mt-1">
                      {scenario.module} · {scenario.section}
                      {scenario.category && (
                        <>
                          {' '}
                          <span className="text-slate-300">·</span> {scenario.category}
                        </>
                      )}
                    </p>
                  )}
                </button>
              </header>
              <div>
                <p className="text-xs text-slate-600 mt-3 whitespace-pre-wrap">{scenario?.description}</p>
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="rounded-lg bg-slate-50 p-3">
                    <strong className="text-xs text-slate-700">خطوات الاختبار</strong>
                    <ol className="list-decimal list-inside mt-1 text-xs text-slate-600 space-y-1">
                      {scenario?.steps.map((step, index) => <li key={`${index}-${step}`}>{step}</li>)}
                    </ol>
                  </div>
                  <div className="rounded-lg bg-emerald-50/60 p-3">
                    <strong className="text-xs text-slate-700">النتائج المتوقعة</strong>
                    <ul className="list-disc list-inside mt-1 text-xs text-slate-600 space-y-1">
                      {scenario?.expected.map((expected, index) => <li key={`${index}-${expected}`}>{expected}</li>)}
                    </ul>
                  </div>
                </div>
              </div>
              {isExpanded && (
              <div className="grid grid-cols-1 gap-3.5 pt-3 mt-3 border-t border-slate-100">
                {scenarioIssues.map((issue) => {
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
                      className="bg-slate-50/50 border border-slate-200/80 rounded-xl p-4 shadow-2xs flex flex-col justify-between"
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
                        </div>

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
                            <strong className="text-[12px] font-bold text-rose-800 block">تفاصيل البلاغ</strong>
                            <p className="text-xs text-slate-700 mt-0.5 whitespace-pre-wrap">{issue.report}</p>
                          </div>

                          {workflow?.issue_summary && (
                            <div className="pt-2 border-t border-rose-200/60">
                              <strong className="text-[12px] font-bold text-rose-800 block">ملخص المعالجة</strong>
                              <p className="text-xs text-slate-700 mt-0.5">{workflow.issue_summary}</p>
                            </div>
                          )}

                          {executionNote?.notes && (
                            <div className="pt-2 border-t border-rose-200/60">
                              <strong className="text-[12px] font-bold text-slate-700 block">ملاحظات التنفيذ</strong>
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
              </div>
              )}
            </article>
          )
        })}
      </section>
      )}
    </div>
  )
}
