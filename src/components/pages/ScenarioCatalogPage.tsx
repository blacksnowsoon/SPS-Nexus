import { useState, type FormEvent } from 'react'
import type { ScenarioCatalogDraft, ScenarioCatalogItem } from '../../types'

const moduleOptions = [
  'نظام إدارة السفن',
  'نظام إدارة البوابات',
  'نظام إدارة البضائع العامة',
  'نظام إدارة المتعاملين و طلبات المستخدمين',
  'نظام إدارة خدمة العملاء',
  'نظام ادارة التسميح المالي',
  'نظام الرصد البيئي والحوادث',
  'نظام الفواتير',
]

const sectionOptions = [
  'سناريو دورة عمل المنافيست الوارد',
  'سناريوهات إدارة البوابات',
  'سناريوهات الإعدادات والبيانات الأساسية',
  'سناريوهات دورة عمل إضافة مهيئة على سفينة',
  'سناريوهات دورة عمل إقرار صادر',
  'سناريوهات دورة عمل المنافيست الصادر',
  'سناريوهات دورة عمل تفريغ وشحن الحاويات',
  'سناريوهات دورة عمل حاويات الترانزيت',
  'سناريوهات دورة عمل منافيست طلب الارسال',
  'سناريوهات دورة عمل موقف الرسالة',
  'سناريوهات قائمة الحاويات المحملة على السفينة',
  'سناريوهات قائمة الحاويات المشحونة',
  'سيناريوهات إدارة الاستبيانات',
  'سيناريوهات إدارة الشكاوى والمقترحات',
  'سيناريوهات إدارة ومتابعة أعمال المراقبة والرصد ومتابعة المحاضر',
  'سيناريوهات إصدار ومراجعة الفواتير',
  'سيناريوهات تخطيط التراكي',
  'سيناريوهات تسجيل وإصدار شهادة التخلص الآمن',
  'سيناريوهات تعريف الفواتير',
  'سيناريوهات دورة عمل إدارة القطار',
  'سيناريوهات دورة عمل الشحن والتفريغ الفعلي للقطارات',
  'سيناريوهات دورة عمل دخول وخروج الحاويات',
  'سيناريوهات طلبات التوكيل الملاحي',
  'سيناريوهات طلبات جمع النفايات',
  'سيناريوهات متابعة وتنفيذ عمليات رفع النفايات',
  'سيناريوهات نظام التسميح المالي',
  'سيناريوهات نظام المتعاملين و طلبات المستخدمين',
]

const categoryOptions = [
  'طلب التراكي',
  'طلب تموين السفينة بالمياه',
  'طلب تزويد السفينة بالوقود أو الزيت',
  'طلب الدخول',
  'طلب المغادرة وتصريح السفر',
  'طلب تعديل بيانات الزيارة',
  'طلب نقل سفينة',
  'طلب نقل وكالة',
  'طلب زيارة رقابية',
  'أرصدة وحسابات العملاء',
  'إعدادات تطبيق التسميح المالي',
  'القواعد العامة للتسميح المالي',
  'حركات الإيداعات للعملاء',
  'حسابي المالي',
  'مراجعة وتسوية أذونات التوريد للعملاء',
  'مراجعة وتسوية الفواتير',
  'إعدادات التخطيط وأسس اختيار ترتيب السفن',
  'إنشاء مقترح الخطة وتجميع المصادر',
  'الزيارات المخطط لها والتي لم يخطط لها',
  'الطلبات المقدمة للجنة التراكي',
  'القرارات الصادرة على الطلبات',
  'المحادثات)الشات(وقواعد التواصل في يومية العمل',
  'ترحيل أوامر الشغل التي لم تنفذ',
  'تفاعلات الجهات الخارجية مع يومية العمل',
  'تنفيذات يومية العمل ومحاكي الميناء',
  'يومية العمل والاعتماد',
]

export interface ScenarioCatalogPageProps {
  scenarios: ScenarioCatalogItem[]
  busyAction: string
  onSave: (draft: ScenarioCatalogDraft, scenarioId?: string) => Promise<boolean>
}

const emptyDraft: ScenarioCatalogDraft = {
  module: '',
  section: '',
  category: '',
  source_number: 1,
  title: '',
  description: '',
  steps: [],
  expected: [],
}

export function ScenarioCatalogPage({ scenarios, busyAction, onSave }: ScenarioCatalogPageProps) {
  const [selectedId, setSelectedId] = useState('')
  const [draft, setDraft] = useState<ScenarioCatalogDraft>(emptyDraft)
  const [search, setSearch] = useState('')
  const [formError, setFormError] = useState('')
  const selectedScenario = scenarios.find((scenario) => scenario.id === selectedId)
  const filteredScenarios = scenarios.filter((scenario) =>
    `${scenario.title} ${scenario.module} ${scenario.section} ${scenario.category}`
      .toLocaleLowerCase()
      .includes(search.trim().toLocaleLowerCase()),
  )
  const selectableValues = (options: string[], currentValue: string) =>
    currentValue && !options.includes(currentValue) ? [...options, currentValue] : options

  const startNew = () => {
    setSelectedId('')
    setDraft(emptyDraft)
    setFormError('')
  }

  const selectScenario = (scenario: ScenarioCatalogItem) => {
    setSelectedId(scenario.id)
    setDraft({
      module: scenario.module,
      section: scenario.section,
      category: scenario.category,
      source_number: scenario.source_number,
      title: scenario.title,
      description: scenario.description,
      steps: scenario.steps,
      expected: scenario.expected,
    })
    setFormError('')
  }

  const updateDraft = <K extends keyof ScenarioCatalogDraft>(field: K, value: ScenarioCatalogDraft[K]) => {
    setDraft((current) => ({ ...current, [field]: value }))
  }

  const saveScenario = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!draft.module.trim() || !draft.section.trim() || !draft.title.trim()) {
      setFormError('النظام والقسم وعنوان السيناريو حقول مطلوبة.')
      return
    }
    if (!Number.isInteger(draft.source_number) || draft.source_number < 1) {
      setFormError('رقم السيناريو يجب أن يكون رقمًا صحيحًا أكبر من صفر.')
      return
    }

    setFormError('')
    const saved = await onSave(
      {
        ...draft,
        module: draft.module.trim(),
        section: draft.section.trim(),
        category: draft.category.trim(),
        title: draft.title.trim(),
        description: draft.description.trim(),
        steps: draft.steps.map((step) => step.trim()).filter(Boolean),
        expected: draft.expected.map((item) => item.trim()).filter(Boolean),
      },
      selectedId || undefined,
    )
    if (saved && !selectedId) startNew()
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(260px,0.8fr)_minmax(0,1.5fr)] gap-4 items-start">
      <section className="bg-white border border-slate-200/90 rounded-xl shadow-xs overflow-hidden">
        <div className="flex items-center justify-between gap-2 p-4 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-bold text-slate-900">كتالوج السيناريوهات</h2>
            <p className="text-[10px] text-slate-400 mt-1">{scenarios.length} سيناريو</p>
          </div>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold disabled:opacity-50"
            onClick={startNew}
            disabled={busyAction === 'catalog-save'}
          >
            <span aria-hidden="true">＋</span> سيناريو جديد
          </button>
        </div>
        <div className="p-3 border-b border-slate-100">
          <input
            aria-label="البحث في السيناريوهات"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="ابحث بالعنوان أو النظام أو القسم"
            className="w-full border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>
        <div className="max-h-[70vh] overflow-auto divide-y divide-slate-100">
          {filteredScenarios.map((scenario) => (
            <button
              key={scenario.id}
              type="button"
              aria-pressed={selectedId === scenario.id}
              onClick={() => selectScenario(scenario)}
              className={`w-full text-start px-4 py-3 transition-colors ${
                selectedId === scenario.id ? 'bg-blue-50' : 'hover:bg-slate-50'
              }`}
            >
              <span className="flex items-start gap-2">
                <small className="text-[10px] font-mono text-slate-400 shrink-0">{scenario.source_order}</small>
                <span className="min-w-0">
                  <strong className="block text-xs font-semibold text-slate-800 leading-relaxed">
                    {scenario.title}
                  </strong>
                  <small className="block text-[10px] text-slate-400 mt-0.5">
                    {scenario.module} · {scenario.section}
                  </small>
                </span>
              </span>
            </button>
          ))}
          {filteredScenarios.length === 0 && (
            <p className="text-xs text-slate-400 text-center py-8">لا توجد سيناريوهات مطابقة.</p>
          )}
        </div>
      </section>

      <form className="bg-white border border-slate-200/90 rounded-xl p-4 sm:p-5 shadow-xs space-y-3" onSubmit={(event) => void saveScenario(event)}>
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              {selectedScenario ? 'تعديل السيناريو' : 'إضافة سيناريو'}
            </h2>
            <p className="text-[10px] text-slate-400 mt-1">
              {selectedScenario
                ? `معرّف السيناريو: ${selectedScenario.id} · ترتيب المصدر: ${selectedScenario.source_order}`
                : 'سيُنشأ معرّف وترتيب المصدر تلقائيًا.'}
            </p>
          </div>
          {selectedScenario && (
            <button
              type="button"
              className="text-xs text-slate-500 hover:text-slate-800"
              onClick={startNew}
            >
              إلغاء التحديد
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="block text-xs font-semibold text-slate-700">
            النظام
            <select
              required
              value={draft.module}
              onChange={(event) => updateDraft('module', event.target.value)}
              className="mt-1 w-full border border-slate-200 rounded-lg p-2.5 text-xs"
            >
              <option value="">اختر النظام</option>
              {selectableValues(moduleOptions, draft.module).map((module) => (
                <option key={module} value={module}>{module}</option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-semibold text-slate-700">
            القسم
            <select
              required
              value={draft.section}
              onChange={(event) => updateDraft('section', event.target.value)}
              className="mt-1 w-full border border-slate-200 rounded-lg p-2.5 text-xs"
            >
              <option value="">اختر القسم</option>
              {selectableValues(sectionOptions, draft.section).map((section) => (
                <option key={section} value={section}>{section}</option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-semibold text-slate-700">
            الفئة
            <select
              value={draft.category}
              onChange={(event) => updateDraft('category', event.target.value)}
              className="mt-1 w-full border border-slate-200 rounded-lg p-2.5 text-xs"
            >
              <option value="">اختر الفئة (اختياري)</option>
              {selectableValues(categoryOptions, draft.category).map((category) => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-semibold text-slate-700">
            رقم السيناريو في القسم
            <input
              required
              type="number"
              min="1"
              step="1"
              value={draft.source_number}
              onChange={(event) => updateDraft('source_number', Number(event.target.value))}
              className="mt-1 w-full border border-slate-200 rounded-lg p-2.5 text-xs"
            />
          </label>
        </div>

        <label className="block text-xs font-semibold text-slate-700">
          عنوان السيناريو
          <input
            required
            value={draft.title}
            onChange={(event) => updateDraft('title', event.target.value)}
            className="mt-1 w-full border border-slate-200 rounded-lg p-2.5 text-xs"
          />
        </label>
        <label className="block text-xs font-semibold text-slate-700">
          الوصف
          <textarea
            rows={3}
            value={draft.description}
            onChange={(event) => updateDraft('description', event.target.value)}
            className="mt-1 w-full border border-slate-200 rounded-lg p-2.5 text-xs"
          />
        </label>
        <label className="block text-xs font-semibold text-slate-700">
          خطوات الاختبار <small className="text-slate-400 font-normal">كل خطوة في سطر مستقل</small>
          <textarea
            rows={5}
            value={draft.steps.join('\n')}
            onChange={(event) => updateDraft('steps', event.target.value.split('\n'))}
            className="mt-1 w-full border border-slate-200 rounded-lg p-2.5 text-xs"
          />
        </label>
        <label className="block text-xs font-semibold text-slate-700">
          النتائج المتوقعة <small className="text-slate-400 font-normal">كل نتيجة في سطر مستقل</small>
          <textarea
            rows={4}
            value={draft.expected.join('\n')}
            onChange={(event) => updateDraft('expected', event.target.value.split('\n'))}
            className="mt-1 w-full border border-slate-200 rounded-lg p-2.5 text-xs"
          />
        </label>

        {formError && (
          <p role="alert" className="text-xs text-rose-700 bg-rose-50 border border-rose-200/60 rounded-lg p-2.5">
            {formError}
          </p>
        )}

        <button
          className="inline-flex items-center justify-center px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold disabled:opacity-50"
          disabled={busyAction === 'catalog-save'}
        >
          {busyAction === 'catalog-save' ? 'جارٍ الحفظ…' : selectedScenario ? 'حفظ التعديلات' : 'إضافة السيناريو'}
        </button>
      </form>
    </div>
  )
}
