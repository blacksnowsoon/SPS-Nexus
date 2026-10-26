import { useState } from 'react'
import { isEditableWorkflow, nextWorkflowStatus } from '../../lib/checklist'
import type {
  ExecutionStatus,
  RoundScenario,
  RoundWorkflow,
  ScenarioExecution,
  ScenarioIssue,
  WorkflowStatus,
} from '../../types'
import {
  formatDate,
  statusLabels,
  workflowBadgeClasses,
  workflowLabels,
} from '../constants'
import { DetailList } from './DetailList'

export interface ScenarioDetailProps {
  scenario: RoundScenario | null
  workflow: RoundWorkflow | undefined
  execution: ScenarioExecution | undefined
  issues: ScenarioIssue[]
  isAdmin: boolean
  canExecute: boolean
  busyAction: string
  issueDraft: string
  onIssueDraftChange: (value: string) => void
  onSaveExecution: (status: ExecutionStatus, notes: string) => void
  onReportIssue: () => void
  onTransition: (status: WorkflowStatus) => void
  editing: boolean
  editValues: { title: string; description: string; steps: string; expected: string }
  onEditValue: (field: 'title' | 'description' | 'steps' | 'expected', value: string) => void
  onStartEditing: () => void
  onCancelEditing: () => void
  onSaveScenario: () => void
}

const executionPillStyles: Record<ExecutionStatus, { default: string; chosen: string }> = {
  passed: {
    default: 'border-slate-200 text-slate-700 hover:bg-slate-50',
    chosen: 'bg-emerald-50 border-emerald-300 text-emerald-800 font-bold shadow-xs',
  },
  failed: {
    default: 'border-slate-200 text-slate-700 hover:bg-slate-50',
    chosen: 'bg-rose-50 border-rose-300 text-rose-800 font-bold shadow-xs',
  },
  not_applicable: {
    default: 'border-slate-200 text-slate-700 hover:bg-slate-50',
    chosen: 'bg-slate-100 border-slate-300 text-slate-800 font-bold shadow-xs',
  },
  not_tested: {
    default: 'border-slate-200 text-slate-700',
    chosen: 'bg-slate-100 border-slate-300 text-slate-800',
  },
}

export function ScenarioDetail({
  scenario,
  workflow,
  execution,
  issues,
  isAdmin,
  canExecute,
  busyAction,
  issueDraft,
  onIssueDraftChange,
  onSaveExecution,
  onReportIssue,
  onTransition,
  editing,
  editValues,
  onEditValue,
  onStartEditing,
  onCancelEditing,
  onSaveScenario,
}: ScenarioDetailProps) {
  const [notes, setNotes] = useState(execution?.notes ?? '')

  if (!scenario) {
    return (
      <aside className="bg-white border border-slate-200/90 rounded-2xl p-8 sm:p-12 shadow-xs min-h-[500px] flex flex-col items-center justify-center text-center">
        <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 font-bold text-xl flex items-center justify-center mb-3">
          ↖
        </div>
        <h3 className="text-sm font-semibold text-slate-800 mb-1">اختر سيناريو لعرض التفاصيل</h3>
        <p className="text-xs text-slate-400">ستظهر هنا خطوات الاختبار والنتائج والملاحظات.</p>
      </aside>
    )
  }

  const currentStatus = execution?.status ?? 'not_tested'
  const wStatus = workflow?.status ?? 'open'
  const nextStatus = workflow ? nextWorkflowStatus(workflow.status) : null

  return (
    <aside className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs min-h-[500px]">
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
        <span className="text-xs font-mono font-bold text-slate-400 dir-ltr">#{scenario.source_number}</span>
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${workflowBadgeClasses[wStatus]}`}>
          {workflowLabels[wStatus]}
        </span>
        {isAdmin && isEditableWorkflow(workflow?.status) && !editing && (
          <button
            className="ms-auto w-7 h-7 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 flex items-center justify-center text-xs transition-colors"
            onClick={onStartEditing}
            aria-label="تعديل السيناريو"
          >
            ✎
          </button>
        )}
      </div>

      {editing ? (
        <div className="space-y-3.5">
          <label className="block text-xs font-semibold text-slate-700">
            عنوان السيناريو
            <input
              className="mt-1 w-full border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              value={editValues.title}
              onChange={(event) => onEditValue('title', event.target.value)}
            />
          </label>
          <label className="block text-xs font-semibold text-slate-700">
            الوصف
            <textarea
              className="mt-1 w-full border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              rows={2}
              value={editValues.description}
              onChange={(event) => onEditValue('description', event.target.value)}
            />
          </label>
          <label className="block text-xs font-semibold text-slate-700">
            الخطوات <small className="text-slate-400 font-normal">كل خطوة في سطر مستقل</small>
            <textarea
              className="mt-1 w-full border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              rows={4}
              value={editValues.steps}
              onChange={(event) => onEditValue('steps', event.target.value)}
            />
          </label>
          <label className="block text-xs font-semibold text-slate-700">
            النتائج المتوقعة <small className="text-slate-400 font-normal">كل نتيجة في سطر مستقل</small>
            <textarea
              className="mt-1 w-full border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              rows={3}
              value={editValues.expected}
              onChange={(event) => onEditValue('expected', event.target.value)}
            />
          </label>
          <div className="flex items-center gap-2 pt-2">
            <button
              className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs disabled:opacity-50 transition-colors"
              onClick={onSaveScenario}
              disabled={busyAction === 'scenario-save'}
            >
              {busyAction === 'scenario-save' ? 'جارٍ الحفظ…' : 'حفظ التعديلات'}
            </button>
            <button
              className="inline-flex items-center justify-center px-4 py-2 border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 rounded-xl text-xs font-semibold transition-colors"
              onClick={onCancelEditing}
            >
              إلغاء
            </button>
          </div>
        </div>
      ) : (
        <>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-snug tracking-tight mb-1">
            {scenario.title}
          </h2>
          <p className="text-xs text-slate-400 font-medium">
            {scenario.module} <span className="text-slate-300">·</span> {scenario.section}
            {scenario.category && (
              <>
                {' '}
                <span className="text-slate-300">·</span> {scenario.category}
              </>
            )}
          </p>

          {scenario.description && (
            <p className="text-xs text-slate-600 leading-relaxed mt-3 bg-slate-50/60 p-3 rounded-xl border border-slate-100">
              {scenario.description}
            </p>
          )}

          <div className="h-px bg-slate-100 my-4" />

          {scenario.steps.length > 0 && <DetailList title="خطوات الاختبار" items={scenario.steps} numbered />}
          {scenario.expected.length > 0 && <DetailList title="النتيجة المتوقعة" items={scenario.expected} />}

          <div className="h-px bg-slate-100 my-4" />

          <section className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-4 my-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-xs font-bold text-slate-800">نتيجة تنفيذك</h3>
                <p className="text-[10px] text-slate-400">لا تؤثر على نتائج بقية المختبِرين.</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {(['passed', 'failed', 'not_applicable'] as const).map((status) => {
                const isChosen = currentStatus === status
                const pillStyle = executionPillStyles[status]
                return (
                  <button
                    key={status}
                    className={`flex items-center justify-center gap-1.5 border rounded-xl py-2 px-1 text-xs transition-all ${
                      isChosen ? pillStyle.chosen : pillStyle.default
                    }`}
                    disabled={!canExecute || busyAction === `execution-${scenario.scenario_id}`}
                    onClick={() => onSaveExecution(isChosen ? 'not_tested' : status, notes)}
                  >
                    <span className="font-bold text-xs">
                      {status === 'passed' ? '✓' : status === 'failed' ? '!' : '–'}
                    </span>
                    {statusLabels[status]}
                  </button>
                )
              })}
            </div>

            <label className="block mt-3 text-xs font-semibold text-slate-700">
              ملاحظاتك
              <textarea
                rows={3}
                value={notes}
                disabled={!canExecute}
                onChange={(event) => setNotes(event.target.value)}
                onBlur={() => {
                  if (canExecute && notes !== (execution?.notes ?? '')) {
                    onSaveExecution(currentStatus, notes)
                  }
                }}
                placeholder="سجّل ملاحظاتك أو ما ظهر أثناء الاختبار…"
                className="mt-1 w-full border border-slate-200 bg-white rounded-xl p-2.5 text-xs text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:bg-slate-100 disabled:text-slate-400"
              />
            </label>

            {!canExecute && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200/60 rounded-lg p-2.5 mt-2.5">
                التنفيذ مقفل لأن الجولة غير نشطة أو السيناريو لديه مشكلة.
              </p>
            )}

            {canExecute && workflow?.status === 'open' && currentStatus === 'failed' && (
              <div className="border-t border-slate-200 pt-3 mt-3">
                <label className="block text-xs font-semibold text-rose-800">
                  إبلاغ عن مشكلة
                  <textarea
                    rows={2}
                    value={issueDraft}
                    onChange={(event) => onIssueDraftChange(event.target.value)}
                    placeholder="صف المشكلة التي واجهتها…"
                    className="mt-1 w-full border border-rose-200 bg-white rounded-xl p-2.5 text-xs text-slate-800 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                  />
                </label>
                <button
                  className="w-full mt-2 inline-flex items-center justify-center px-4 py-2 border border-rose-300 text-rose-700 bg-white hover:bg-rose-50 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50"
                  onClick={onReportIssue}
                  disabled={!issueDraft.trim() || busyAction === 'issue'}
                >
                  {busyAction === 'issue' ? 'جارٍ الإرسال…' : 'إرسال المشكلة وإغلاق السيناريو'}
                </button>
                <small className="block text-[10px] text-slate-400 mt-1 leading-relaxed">
                  إرسال البلاغ ينقل حالة السيناريو إلى «لديه مشكلة» ويوقف التنفيذ مؤقتًا.
                </small>
              </div>
            )}

            {canExecute && workflow?.status === 'open' && currentStatus !== 'failed' && (
              <p className="text-[11px] text-slate-400 mt-2">
                لتسجيل بلاغ مشكلة، سجّل نتيجة «فشل» لهذا السيناريو أولًا.
              </p>
            )}
          </section>

          {issues.length > 0 && (
            <section className="mt-4 pt-3 border-t border-slate-100">
              <h3 className="text-xs font-bold text-slate-700 mb-2">بلاغات المشكلة</h3>
              <div className="space-y-2">
                {issues.map((issue) => (
                  <article key={issue.id} className="border border-rose-100 bg-rose-50/40 rounded-xl p-3">
                    <small className="text-[10px] text-slate-400 font-medium block mb-1">
                      {formatDate(issue.created_at)}
                    </small>
                    <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">{issue.report}</p>
                  </article>
                ))}
              </div>
            </section>
          )}

          {isAdmin && nextStatus && (
            <button
              className="w-full mt-4 inline-flex items-center justify-center px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs disabled:opacity-50 transition-colors"
              onClick={() => onTransition(nextStatus)}
              disabled={busyAction === `workflow-${scenario.scenario_id}`}
            >
              {busyAction === `workflow-${scenario.scenario_id}`
                ? 'جارٍ التحديث…'
                : nextStatus === 'in_progress'
                  ? 'بدء المعالجة'
                  : 'إغلاق المشكلة'}
            </button>
          )}

          {workflow?.status === 'closed' && (
            <p className="text-xs text-slate-500 bg-slate-100 rounded-lg p-2.5 mt-3">
              تم إغلاق هذه المشكلة. السيناريو محفوظ في سجل الجولة.
            </p>
          )}
        </>
      )}
    </aside>
  )
}
