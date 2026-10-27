import { completionPercent, countExecutions } from '../../lib/checklist'
import type { Round, RoundScenario, ScenarioExecution, ScenarioIssue } from '../../types'
import { EmptyState } from '../common/EmptyState'
import { StatCard } from '../common/StatCard'
import {
  formatDate,
  statusBadgeClasses,
  statusLabels,
  issueStatusBadgeClasses,
  issueStatusLabels,
} from '../constants'

export interface OverviewPageProps {
  counts: ReturnType<typeof countExecutions>
  teamCounts: ReturnType<typeof countExecutions>
  isAdmin: boolean
  scenarioCount: number
  issues: ScenarioIssue[]
  round: Round
  onOpenScenarios: () => void
  onOpenIssues: () => void
  onSelectScenario: (id: string) => void
  scenarios: RoundScenario[]
  executions: ScenarioExecution[]
}

export function OverviewPage({
  counts,
  teamCounts,
  isAdmin,
  scenarioCount,
  issues,
  round,
  onOpenScenarios,
  onOpenIssues,
  onSelectScenario,
  scenarios,
  executions,
}: OverviewPageProps) {
  const failed = executions.filter((execution) => execution.status === 'failed')
  const openIssues = issues.filter((issue) => issue.status !== 'resolved')
  const progress = completionPercent(counts)
  const teamProgress = completionPercent(teamCounts)

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden flex flex-col sm:flex-row justify-between items-start sm:items-center rounded-2xl p-6 sm:p-7 text-white bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-600 shadow-sm gap-4">
        <div className="z-10">
          <span className="text-[11px] font-bold text-blue-200 tracking-wider uppercase">مرحبًا بعودتك</span>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight mt-1 mb-1.5">
            خطوة بخطوة، نرفع جودة SPS Nexus.
          </h2>
          <p className="text-xs text-blue-100">
            {round.name} · بدأت في {formatDate(round.created_at)}
          </p>
        </div>
        <button
          className="z-10 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-blue-700 bg-white hover:bg-blue-50 shadow-md transition-all whitespace-nowrap active:translate-y-0.5"
          onClick={onOpenScenarios}
        >
          متابعة السيناريوهات <span>←</span>
        </button>
        <div className="w-[220px] h-[220px] absolute -top-[100px] start-[32%] rounded-full border border-white/10 pointer-events-none" />
        <div className="w-[300px] h-[300px] absolute -top-[175px] start-[42%] rounded-full border border-white/10 pointer-events-none" />
      </section>

      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-sm font-bold text-slate-800">ملخص الجولة</h2>
            <p className="text-[11px] text-slate-400">حالة التنفيذ والمشكلات المفتوحة في هذه الجولة.</p>
          </div>
          <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
            محدّث من Supabase
          </span>
        </div>

        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="إجمالي السيناريوهات" value={scenarioCount} sub="في هذه الجولة" icon="☷" tone="blue" />
          <StatCard
            label={isAdmin ? 'تم تنفيذها · الفريق' : 'تم تنفيذها · أنت'}
            value={
              isAdmin
                ? teamCounts.passed + teamCounts.failed + teamCounts.not_applicable
                : counts.total - counts.not_tested
            }
            sub={`من أصل ${isAdmin ? teamCounts.total : counts.total}`}
            icon="✓"
            tone="green"
          />
          <StatCard label="لديها مشكلات" value={openIssues.length} sub="تحتاج متابعة" icon="⚑" tone="orange" />
          <StatCard
            label="نتائج فاشلة"
            value={isAdmin ? teamCounts.failed : failed.length}
            sub={isAdmin ? 'نتائج مرئية للفريق' : 'نتائجك أنت فقط'}
            icon="!"
            tone="red"
          />
        </section>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        <section className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-3 mb-1">
              <div>
                <h3 className="text-xs font-bold text-slate-800">
                  {isAdmin ? 'تقدم الفريق' : 'تقدمك في الجولة'}
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  {isAdmin ? 'مجموع نتائج تنفيذ المستخدمين المرئية' : 'نتائجك الشخصية في هذه الجولة'}
                </p>
              </div>
              <span className="text-2xl font-extrabold text-blue-600 font-mono dir-ltr">
                {isAdmin ? teamProgress : progress}%
              </span>
            </div>

            <div className="h-2 rounded-full bg-slate-100 overflow-hidden my-5">
              <span
                className="block h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-300"
                style={{ width: `${isAdmin ? teamProgress : progress}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-500 pt-2 border-t border-slate-100">
              <span className="inline-flex items-center gap-1.5">
                <i className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                ناجح <b className="text-slate-800 font-bold">{isAdmin ? teamCounts.passed : counts.passed}</b>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <i className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
                فشل <b className="text-slate-800 font-bold">{isAdmin ? teamCounts.failed : counts.failed}</b>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <i className="w-2 h-2 rounded-full bg-slate-300 inline-block" />
                لم يُختبر <b className="text-slate-800 font-bold">{isAdmin ? teamCounts.not_tested : counts.not_tested}</b>
              </span>
            </div>
            <div className="text-[10px] text-slate-400 mt-3 pt-2 border-t border-slate-100">
              ملاحظة: مقياس الفريق يعدّ كل نتيجة (مستخدم × سيناريو) على حدة.
            </div>
          </div>
        </section>

        <section className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
            <div>
              <h3 className="text-xs font-bold text-slate-800">المشكلات النشطة</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">سيناريوهات تتطلب متابعة الفريق</p>
            </div>
            <button
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors"
              onClick={onOpenIssues}
            >
              عرض الكل ←
            </button>
          </div>

          <div className="flex-1 flex flex-col justify-center">
            {openIssues.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">لا توجد مشكلات مفتوحة في هذه الجولة.</p>
            ) : (
              <div className="space-y-1">
                {openIssues.slice(0, 4).map((issue) => {
                  const scenario = scenarios.find((item) => item.scenario_id === issue.scenario_id)
                  return (
                    <button
                      className="w-full flex items-center gap-2.5 p-2 rounded-xl text-start hover:bg-slate-50 transition-colors"
                      key={issue.id}
                      onClick={() => onSelectScenario(issue.scenario_id)}
                    >
                      <span className="flex-1 min-w-0 grid">
                        <strong className="text-xs font-semibold text-slate-800 truncate">
                          {scenario?.title ?? issue.scenario_id}
                        </strong>
                        <small className="text-[10px] text-slate-400 truncate">{issue.report}</small>
                      </span>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold ${issueStatusBadgeClasses[issue.status]}`}
                      >
                        {issueStatusLabels[issue.status]}
                      </span>
                      <span className="text-xs text-slate-400">←</span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </section>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-sm font-bold text-slate-800">نتائج تنفيذك</h2>
            <p className="text-[11px] text-slate-400">حالات الاختبار التي سجلتها أنت.</p>
          </div>
          <button
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors"
            onClick={onOpenScenarios}
          >
            عرض السيناريوهات ←
          </button>
        </div>

        <section className="bg-white border border-slate-200/90 rounded-2xl p-3 sm:p-4 shadow-xs">
          {executions.length === 0 ? (
            <div className="py-6">
              <EmptyState
                title="ابدأ تنفيذ السيناريوهات"
                body="اختر سيناريو وسجّل نتيجة الاختبار والملاحظات الخاصة بك."
              />
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {executions.slice(0, 5).map((execution) => {
                const scenario = scenarios.find((item) => item.scenario_id === execution.scenario_id)
                const isPassed = execution.status === 'passed'
                const isFailed = execution.status === 'failed'

                return (
                  <button
                    className="w-full flex items-center gap-3 py-2.5 px-2 text-start rounded-xl hover:bg-slate-50 transition-colors"
                    key={execution.id}
                    onClick={() => onSelectScenario(execution.scenario_id)}
                  >
                    <span
                      className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold ${
                        isPassed
                          ? 'bg-emerald-50 text-emerald-700'
                          : isFailed
                            ? 'bg-rose-50 text-rose-700'
                            : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {isPassed ? '✓' : isFailed ? '!' : '–'}
                    </span>

                    <span className="flex-1 min-w-0 grid">
                      <strong className="text-xs font-semibold text-slate-800 truncate">
                        {scenario?.title ?? execution.scenario_id}
                      </strong>
                      <small className="text-[10px] text-slate-400 truncate">
                        {scenario?.module} · {scenario?.section}
                      </small>
                    </span>

                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold ${statusBadgeClasses[execution.status]}`}
                    >
                      {statusLabels[execution.status]}
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
