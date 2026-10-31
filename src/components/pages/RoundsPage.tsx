import {  useState } from 'react'
import type { FormEvent } from 'react'
import type { Round, RoundStatus, ScenarioCatalogItem } from '../../types'
import { EmptyState } from '../common/EmptyState'
import { formatDate, roundLabels } from '../constants'

export interface RoundsPageProps {
  rounds: Round[]
  selectedRoundId: string
  isAdmin: boolean
  roundName: string
  roundDescription: string
  formError: string
  busyAction: string
  onRoundName: (value: string) => void
  onRoundDescription: (value: string) => void
  onCreateRound: (event: FormEvent<HTMLFormElement>) => void
  onSelectRound: (id: string) => void
  onUpdateStatus: (round: Round, status: RoundStatus) => void
  onUpdateRound: (round: Round, name: string, description: string) => Promise<boolean>
  onDeleteRound: (round: Round) => void
  scenarioCatalog: ScenarioCatalogItem[]
  includeAllScenarios: boolean
  onIncludeAllScenarios: (includeAll: boolean) => void
  selectedScenarioIds: string[]
  onSelectedScenarioIds: (ids: string[]) => void
  scenarioPickerSearch: string
  onScenarioPickerSearch: (value: string) => void
}

const roundBadgeClasses: Record<RoundStatus, string> = {
  planned: 'bg-slate-100 text-slate-600 border border-slate-200/60',
  active: 'bg-emerald-50 text-emerald-700 border border-emerald-200/60',
  completed: 'bg-blue-50 text-blue-700 border border-blue-200/60',
  archived: 'bg-slate-100 text-slate-500 border border-slate-200/60',
}

export function RoundsPage({
  rounds,
  selectedRoundId,
  isAdmin,
  roundName,
  roundDescription,
  formError,
  busyAction,
  onRoundName,
  onRoundDescription,
  onCreateRound,
  onSelectRound,
  onUpdateStatus,
  onUpdateRound,
  onDeleteRound,
  scenarioCatalog,
  includeAllScenarios,
  onIncludeAllScenarios,
  selectedScenarioIds,
  onSelectedScenarioIds,
  scenarioPickerSearch,
  onScenarioPickerSearch,
}: RoundsPageProps) {
  const [editingRoundId, setEditingRoundId] = useState('')
  const [editRoundName, setEditRoundName] = useState('')
  const [editRoundDescription, setEditRoundDescription] = useState('')
  const filteredCatalog = scenarioCatalog.filter((scenario) =>
    `${scenario.title} ${scenario.module} ${scenario.section}`
      .toLocaleLowerCase()
      .includes(scenarioPickerSearch.trim().toLocaleLowerCase()),
  )

  return (
    <div className="grid grid-cols-1 md:grid-cols-[minmax(340px,1fr)_minmax(0,1.2fr)] gap-2 items-start">
      {isAdmin && (
        <form
          className="mt-3 bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs space-y-3.5 max-md:order-last"
          onSubmit={onCreateRound}
        >
          <div>
            <h2 className="text-sm font-bold text-slate-900">إنشاء جولة جديدة</h2>
            <p className="text-xs text-slate-400 mt-1">
              {includeAllScenarios
                ? `سيتم نسخ جميع السيناريوهات (${scenarioCatalog.length}) إلى الجولة.`
                : `تم اختيار ${selectedScenarioIds.length} سيناريو.`}
            </p>
          </div>

          <label className="block text-xs font-semibold text-slate-700">
            اسم الجولة
            <input
              value={roundName}
              onChange={(event) => onRoundName(event.target.value)}
              placeholder="مثال: اختبار القبول - الجولة الأولى"
              className="mt-1 w-full border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </label>

          <label className="block text-xs font-semibold text-slate-700">
            وصف (اختياري)
            <textarea
              rows={2}
              value={roundDescription}
              onChange={(event) => onRoundDescription(event.target.value)}
              placeholder="ما الذي تتضمنه هذه الجولة؟"
              className="mt-1 w-full border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </label>

          <label className="flex items-center gap-2 pt-3 border-t border-slate-100 text-xs font-semibold text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={includeAllScenarios}
              onChange={(event) => onIncludeAllScenarios(event.target.checked)}
              className="accent-blue-600 w-4 h-4 rounded"
            />
            <span>إضافة كل السيناريوهات (افتراضي)</span>
          </label>

          {!includeAllScenarios && (
            <div className="border border-slate-200 rounded-xl p-2.5 space-y-2 bg-slate-50/50">
              <input
                aria-label="البحث عن سيناريو"
                value={scenarioPickerSearch}
                onChange={(event) => onScenarioPickerSearch(event.target.value)}
                placeholder="ابحث بالعنوان أو النظام أو القسم…"
                className="w-full border border-slate-200 bg-white rounded-lg p-2 text-xs text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
              <div className="max-h-[380px] overflow-auto space-y-1 divide-y divide-slate-100">
                {filteredCatalog.map((scenario) => (
                  <label
                    key={scenario.id}
                    className="flex items-center gap-2.5 py-1.5 px-1 text-xs text-slate-700 hover:bg-white rounded-md cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedScenarioIds.includes(scenario.id)}
                      onChange={(event) =>
                        onSelectedScenarioIds(
                          event.target.checked
                            ? [...selectedScenarioIds, scenario.id]
                            : selectedScenarioIds.filter((id) => id !== scenario.id),
                        )
                      }
                      className="accent-blue-600 w-3.5 h-3.5 rounded"
                    />
                    <span className="grid min-w-0">
                      <strong className="text-xs font-semibold text-slate-800 truncate">
                        {scenario.title}
                      </strong>
                      <small className="text-[10px] text-slate-400">
                        {scenario.module} · {scenario.section}
                      </small>
                    </span>
                  </label>
                ))}
                {filteredCatalog.length === 0 && (
                  <p className="text-xs text-slate-400 text-center py-4">لا توجد سيناريوهات مطابقة.</p>
                )}
              </div>
            </div>
          )}

          {formError && (
            <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200/60 rounded-lg p-2.5">
              {formError}
            </p>
          )}

          <button
            className="w-full inline-flex items-center justify-center px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs disabled:opacity-50 transition-colors"
            disabled={busyAction === 'round-create'}
          >
            {busyAction === 'round-create' ? 'جارٍ الإنشاء…' : 'إنشاء الجولة ونسخ السيناريوهات'}
          </button>
        </form>
      )}

      <section className="space-y-2 mt-3">
        {rounds.length === 0 ? (
          <EmptyState title="لا توجد جولات" body="ستظهر الجولات التي أنشأها المسؤول هنا." />
        ) : (
          rounds.map((round) => {
            const isCurrent = selectedRoundId === round.id
            return (
              <article
                className={`bg-white border rounded-2xl p-5 shadow-xs transition-all ${
                  isCurrent ? 'border-blue-400 ring-2 ring-blue-100' : 'border-slate-200/90'
                }`}
                key={round.id}
              >
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold ${roundBadgeClasses[round.status]}`}
                  >
                    {roundLabels[round.status]}
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">
                    {formatDate(round.created_at)}
                  </span>
                </div>

                <h2 className="text-sm font-bold text-slate-900 mt-3 mb-1">{round.name}</h2>
                {editingRoundId === round.id ? (
                  <form
                    className="space-y-2 mb-4"
                    onSubmit={async (event) => {
                      event.preventDefault()
                      if (await onUpdateRound(round, editRoundName, editRoundDescription)) {
                        setEditingRoundId('')
                      }
                    }}
                  >
                    <label className="block text-xs font-semibold text-slate-700">
                      اسم الجولة
                      <input
                        autoFocus
                        value={editRoundName}
                        onChange={(event) => setEditRoundName(event.target.value)}
                        className="mt-1 w-full border border-slate-200 rounded-lg p-2 text-xs text-slate-800"
                      />
                    </label>
                    <label className="block text-xs font-semibold text-slate-700">
                      الوصف
                      <textarea
                        rows={2}
                        value={editRoundDescription}
                        onChange={(event) => setEditRoundDescription(event.target.value)}
                        className="mt-1 w-full border border-slate-200 rounded-lg p-2 text-xs text-slate-800"
                      />
                    </label>
                    <div className="flex gap-2">
                      <button
                        className="inline-flex items-center justify-center px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold disabled:opacity-50"
                        disabled={busyAction === `round-${round.id}`}
                      >
                        حفظ
                      </button>
                      <button
                        type="button"
                        className="inline-flex items-center justify-center px-3 py-1.5 border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold"
                        onClick={() => setEditingRoundId('')}
                      >
                        إلغاء
                      </button>
                    </div>
                  </form>
                ) : (
                  <p className="text-xs text-slate-500 leading-relaxed mb-4">
                    {round.description || 'لا يوجد وصف لهذه الجولة.'}
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-100">
                  <button
                    className="inline-flex items-center justify-center px-3.5 py-1.5 border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 rounded-xl text-xs font-semibold shadow-2xs transition-colors"
                    onClick={() => onSelectRound(round.id)}
                  >
                    فتح الجولة
                  </button>
                  {isAdmin && round.status === 'planned' && (
                    <button
                      className="inline-flex items-center justify-center px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-2xs transition-colors disabled:opacity-50"
                      disabled={busyAction === `round-${round.id}`}
                      onClick={() => onUpdateStatus(round, 'active')}
                    >
                      تفعيل
                    </button>
                  )}
                  {isAdmin && round.status === 'active' && (
                    <button
                      className="inline-flex items-center justify-center px-3.5 py-1.5 border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 rounded-xl text-xs font-semibold shadow-2xs transition-colors disabled:opacity-50"
                      disabled={busyAction === `round-${round.id}`}
                      onClick={() => onUpdateStatus(round, 'completed')}
                    >
                      إنهاء الجولة
                    </button>
                  )}
                  {isAdmin && round.status === 'completed' && (
                    <button
                      className="inline-flex items-center justify-center px-3.5 py-1.5 border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 rounded-xl text-xs font-semibold shadow-2xs transition-colors disabled:opacity-50"
                      disabled={busyAction === `round-${round.id}`}
                      onClick={() => onUpdateStatus(round, 'archived')}
                    >
                      أرشفة
                    </button>
                  )}
                  {isAdmin && editingRoundId !== round.id && (
                    <button
                      className="inline-flex items-center justify-center px-3.5 py-1.5 border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 rounded-xl text-xs font-semibold shadow-2xs transition-colors disabled:opacity-50"
                      disabled={busyAction === `round-${round.id}`}
                      onClick={() => {
                        setEditRoundName(round.name)
                        setEditRoundDescription(round.description ?? '')
                        setEditingRoundId(round.id)
                      }}
                    >
                      تعديل
                    </button>
                  )}
                  {isAdmin && round.status !== 'active' && (
                    <button
                      className="inline-flex items-center justify-center px-3.5 py-1.5 border border-rose-200 text-rose-700 bg-white hover:bg-rose-50 rounded-xl text-xs font-semibold shadow-2xs transition-colors disabled:opacity-50"
                      disabled={busyAction === `round-${round.id}`}
                      onClick={() => {
                        if (
                          window.confirm(
                            `هل أنت متأكد من حذف الجولة «${round.name}»؟ سيؤدي ذلك إلى حذف بيانات التنفيذ وتقارير المشكلات المرتبطة بها نهائيًا.`,
                          )
                        ) {
                          onDeleteRound(round)
                        }
                      }}
                    >
                      حذف
                    </button>
                  )}
                </div>
              </article>
            )
          })
        )}
      </section>
    </div>
  )
}
