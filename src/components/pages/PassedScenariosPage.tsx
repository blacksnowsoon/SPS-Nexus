import { useMemo, useState } from 'react'
import type { IssueReporter, RoundScenario, ScenarioExecution } from '../../types'
import { exportPassedScenariosToExcel, exportPassedScenariosToPdf } from '../../lib/passed-scenario-export'
import { EmptyState } from '../common/EmptyState'
import { formatDate } from '../constants'

export interface PassedScenariosPageProps {
  scenarios: RoundScenario[]
  executions: ScenarioExecution[]
  reporters: IssueReporter[]
  roundName: string
  isAdmin: boolean
}

export function PassedScenariosPage({
  scenarios,
  executions,
  reporters,
  roundName,
  isAdmin,
}: PassedScenariosPageProps) {
  const [selectedScenarioIds, setSelectedScenarioIds] = useState<string[]>([])
  const [moduleFilter, setModuleFilter] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [exportError, setExportError] = useState('')
  const [exporting, setExporting] = useState(false)

  const passedScenarios = useMemo(() => {
    const passedIds = new Set(
      executions.filter((execution) => execution.status === 'passed').map((execution) => execution.scenario_id),
    )
    return scenarios.filter((scenario) => passedIds.has(scenario.scenario_id))
  }, [executions, scenarios])
  const modules = useMemo(
    () => [...new Set(passedScenarios.map((scenario) => scenario.module))].sort((a, b) => a.localeCompare(b)),
    [passedScenarios],
  )
  const visibleScenarios = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase()
    return passedScenarios.filter((scenario) => {
      const matchesModule = !moduleFilter || scenario.module === moduleFilter
      const text = [
        scenario.title,
        scenario.module,
        scenario.section,
        scenario.category,
        scenario.description,
        ...scenario.steps,
        ...scenario.expected,
        ...executions
          .filter((execution) => execution.scenario_id === scenario.scenario_id && execution.status === 'passed')
          .flatMap((execution) => [
            reporters.find((reporter) => reporter.id === execution.user_id)?.display_name ?? '',
            execution.notes,
          ]),
      ].join(' ').toLocaleLowerCase()
      return matchesModule && (!query || text.includes(query))
    })
  }, [executions, moduleFilter, passedScenarios, reporters, searchQuery])
  const selectedScenarios = passedScenarios.filter((scenario) =>
    selectedScenarioIds.includes(scenario.scenario_id),
  )
  const allVisibleSelected =
    visibleScenarios.length > 0 &&
    visibleScenarios.every((scenario) => selectedScenarioIds.includes(scenario.scenario_id))

  const handleExport = async (format: 'excel' | 'pdf') => {
    setExportError('')
    setExporting(true)
    try {
      const selectedExecutions = executions.filter(
        (execution) =>
          execution.status === 'passed' &&
          selectedScenarios.some((scenario) => scenario.scenario_id === execution.scenario_id),
      )
      if (format === 'excel') {
        await exportPassedScenariosToExcel(selectedScenarios, selectedExecutions, reporters, roundName)
      } else if (!exportPassedScenariosToPdf(selectedScenarios, selectedExecutions, reporters, roundName)) {
        setExportError('تعذر فتح نافذة التصدير. اسمح بالنوافذ المنبثقة لهذا الموقع ثم حاول مجددًا.')
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'خطأ غير معروف'
      setExportError(`تعذر تصدير السيناريوهات: ${message}`)
    } finally {
      setExporting(false)
    }
  }

  if (passedScenarios.length === 0) {
    return (
      <EmptyState
        title="لا توجد سيناريوهات ناجحة في هذه الجولة"
        body="ستظهر هنا السيناريوهات بعد تسجيل نتيجة ناجحة لها."
      />
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-3 p-3 bg-white border border-slate-200/90 rounded-2xl shadow-xs">
        <div className="flex items-center flex-wrap gap-2">
          {isAdmin && (
            <>
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  onChange={(event) =>
                    setSelectedScenarioIds((current) => {
                      const visibleIds = new Set(visibleScenarios.map((scenario) => scenario.scenario_id))
                      return event.target.checked
                        ? [...new Set([...current, ...visibleIds])]
                        : current.filter((id) => !visibleIds.has(id))
                    })
                  }
                  aria-label="تحديد كل السيناريوهات الناجحة المعروضة"
                  className="accent-blue-600 w-4 h-4 rounded"
                />
                <span>تحديد الكل ({visibleScenarios.length})</span>
              </label>
              <span className="text-xs text-slate-400">تم تحديد {selectedScenarios.length}</span>
              <button
                type="button"
                className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold disabled:opacity-50"
                disabled={selectedScenarios.length === 0 || exporting}
                onClick={() => void handleExport('excel')}
              >
                {exporting ? 'جارٍ التصدير…' : 'تصدير Excel'}
              </button>
              <button
                type="button"
                className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold disabled:opacity-50"
                disabled={selectedScenarios.length === 0 || exporting}
                onClick={() => void handleExport('pdf')}
              >
                تصدير PDF
              </button>
            </>
          )}
        </div>
        <div className="flex items-center flex-wrap gap-2">
          <label htmlFor="passed-scenario-search" className="text-xs font-semibold text-slate-700">
            البحث في السيناريوهات الناجحة
          </label>
          <input
            id="passed-scenario-search"
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="ابحث عن سيناريو"
            className="min-w-[180px] border border-slate-200 bg-white rounded-xl px-3 py-1.5 text-xs text-slate-700"
          />
          <label htmlFor="passed-scenario-module" className="text-xs font-semibold text-slate-700">
            النظام
          </label>
          <select
            id="passed-scenario-module"
            value={moduleFilter}
            onChange={(event) => setModuleFilter(event.target.value)}
            className="min-w-[150px] border border-slate-200 bg-white rounded-xl px-3 py-1.5 text-xs text-slate-700"
          >
            <option value="">كل الأنظمة</option>
            {modules.map((module) => <option key={module} value={module}>{module}</option>)}
          </select>
          <span className="text-xs text-slate-400">
            عرض {visibleScenarios.length} من {passedScenarios.length}
          </span>
        </div>
        {exportError && (
          <p role="alert" className="basis-full text-xs text-rose-600 bg-rose-50 border border-rose-200/60 rounded-lg p-2.5">
            {exportError}
          </p>
        )}
      </div>

      {visibleScenarios.length === 0 ? (
        <EmptyState
          title={searchQuery.trim() ? 'لا توجد سيناريوهات تطابق البحث' : 'لا توجد سيناريوهات لهذا النظام'}
          body="غيّر كلمات البحث أو اختر نظامًا آخر."
        />
      ) : (
        <section className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {visibleScenarios.map((scenario) => {
            const scenarioExecutions = executions.filter(
              (execution) => execution.scenario_id === scenario.scenario_id && execution.status === 'passed',
            )
            return (
              <article
                key={scenario.scenario_id}
                className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs"
              >
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                  {isAdmin && (
                    <input
                      type="checkbox"
                      checked={selectedScenarioIds.includes(scenario.scenario_id)}
                      onChange={(event) =>
                        setSelectedScenarioIds((current) =>
                          event.target.checked
                            ? [...new Set([...current, scenario.scenario_id])]
                            : current.filter((id) => id !== scenario.scenario_id),
                        )
                      }
                      aria-label={`تحديد السيناريو ${scenario.title}`}
                      className="accent-blue-600 w-4 h-4 rounded cursor-pointer"
                    />
                  )}
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                    ناجح
                  </span>
                  <span className="ms-auto text-xs font-mono font-bold text-slate-400">#{scenario.source_number}</span>
                </div>
                <h2 className="text-sm font-bold text-slate-900 mt-2.5 mb-0.5 leading-snug">{scenario.title}</h2>
                <p className="text-[10px] text-slate-400 font-medium">
                  {scenario.module} · {scenario.section}{scenario.category ? ` · ${scenario.category}` : ''}
                </p>
                <p className="text-xs text-slate-600 mt-3 whitespace-pre-wrap">{scenario.description}</p>
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="rounded-lg bg-slate-50 p-3">
                    <strong className="text-xs text-slate-700">خطوات الاختبار</strong>
                    <ol className="list-decimal list-inside mt-1 text-xs text-slate-600 space-y-1">
                      {scenario.steps.map((step, index) => <li key={`${index}-${step}`}>{step}</li>)}
                    </ol>
                  </div>
                  <div className="rounded-lg bg-emerald-50/60 p-3">
                    <strong className="text-xs text-slate-700">النتائج المتوقعة</strong>
                    <ul className="list-disc list-inside mt-1 text-xs text-slate-600 space-y-1">
                      {scenario.expected.map((expected, index) => <li key={`${index}-${expected}`}>{expected}</li>)}
                    </ul>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-100 space-y-3">
                  <p className="text-[10px] text-slate-400">مرات النجاح: {scenarioExecutions.length}</p>
                  {scenarioExecutions.map((execution) => {
                    const reporter = reporters.find((item) => item.id === execution.user_id)
                    return (
                      <div
                        key={execution.id}
                        className="rounded-lg border border-slate-100 bg-slate-50/70 p-3 space-y-2"
                      >
                        <div className="flex items-center gap-2">
                          {reporter?.avatar_url ? (
                            <img
                              src={reporter.avatar_url}
                              alt=""
                              className="w-7 h-7 rounded-full object-cover"
                            />
                          ) : (
                            <span className="w-7 h-7 rounded-full bg-white text-slate-700 font-bold text-xs flex items-center justify-center">
                              {(reporter?.display_name || 'م').slice(0, 1)}
                            </span>
                          )}
                          <div>
                            <strong className="text-xs font-semibold text-slate-800 block">
                              {reporter?.display_name || 'مستخدم'}
                            </strong>
                            <small className="text-[10px] text-slate-400 block">
                              مختبِر · {formatDate(execution.created_at)}
                            </small>
                          </div>
                        </div>
                        <div className="pt-2 border-t border-slate-200/70">
                          <strong className="text-[11px] font-bold text-slate-700 block">ملاحظات التنفيذ</strong>
                          <p className="text-xs text-slate-600 mt-0.5 whitespace-pre-wrap">
                            {execution.notes || 'لا توجد ملاحظات.'}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </article>
            )
          })}
        </section>
      )}
    </div>
  )
}
