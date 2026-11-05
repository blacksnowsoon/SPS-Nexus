import { lazy, Suspense, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { hasRichTextContent, isHttpUrl, sanitizeRichText } from '../../lib/rich-text'
import { clearSuggestionDraft, readSuggestionDraft, saveSuggestionDraft } from '../../lib/suggestion-draft'
import type { SavedTestSuggestion } from '../../types'

const RichTextEditor = lazy(() =>
  import('../common/RichTextEditor').then((module) => ({ default: module.RichTextEditor })),
)

export interface SuggestionFormValues {
  module: string
  title: string
  description: string
  sharedDocumentUrl: string
}

interface SuggestionFormProps {
  modules: string[]
  savedSuggestions: SavedTestSuggestion[]
  busyAction: string
  onSave: (values: SuggestionFormValues, suggestionId: string | null) => Promise<string | null>
  onSend: (suggestionId: string) => Promise<boolean>
  userId?: string
}

const emptyValues: SuggestionFormValues = {
  module: '',
  title: '',
  description: '',
  sharedDocumentUrl: '',
}

export function SuggestionForm({ modules, savedSuggestions, busyAction, onSave, onSend, userId }: SuggestionFormProps) {
  const [initialDraft] = useState(() => (userId ? readSuggestionDraft(userId) : null))
  const [module, setModule] = useState(initialDraft?.values.module ?? '')
  const [title, setTitle] = useState(initialDraft?.values.title ?? '')
  const [description, setDescription] = useState(initialDraft?.values.description ?? '')
  const [sharedDocumentUrl, setSharedDocumentUrl] = useState(initialDraft?.values.sharedDocumentUrl ?? '')
  const [formError, setFormError] = useState('')
  const [savedValues, setSavedValues] = useState<SuggestionFormValues>(initialDraft?.savedValues ?? emptyValues)
  const [editingId, setEditingId] = useState<string | null>(initialDraft?.editingId ?? null)
  const [editingStatus, setEditingStatus] = useState<'draft' | 'sent'>(initialDraft?.editingStatus ?? 'draft')

  const currentValues: SuggestionFormValues = {
    module,
    title,
    description,
    sharedDocumentUrl,
  }
  const isDirty = Object.keys(emptyValues).some((key) => {
    const field = key as keyof SuggestionFormValues
    return currentValues[field] !== savedValues[field]
  })

  useEffect(() => {
    if (!userId) return
    if (!isDirty) {
      clearSuggestionDraft(userId)
      return
    }
    saveSuggestionDraft(userId, {
      values: { module, title, description, sharedDocumentUrl },
      savedValues,
      editingId,
      editingStatus,
    })
  }, [userId, isDirty, module, title, description, sharedDocumentUrl, savedValues, editingId, editingStatus])

  const validate = (): SuggestionFormValues | null => {
    const safeDescription = description.trim()
    if (!module) {
      setFormError('اختر الوحدة المرتبطة بالاقتراح.')
      return null
    }
    if (!title.trim()) {
      setFormError('عنوان الاقتراح مطلوب.')
      return null
    }
    if (!hasRichTextContent(safeDescription)) {
      setFormError('اكتب وصفًا للاقتراح.')
      return null
    }
    const documentUrl = sharedDocumentUrl.trim()
    if (documentUrl && !isHttpUrl(documentUrl)) {
      setFormError('أدخل رابط مشاركة صالحًا يبدأ بـ http أو https.')
      return null
    }
    setFormError('')
    return {
      module,
      title: title.trim(),
      description: sanitizeRichText(safeDescription),
      sharedDocumentUrl: documentUrl,
    }
  }

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const values = validate()
    if (!values) return
    const suggestionId = await onSave(values, editingId)
    if (suggestionId) {
      setModule(values.module)
      setTitle(values.title)
      setDescription(values.description)
      setSharedDocumentUrl(values.sharedDocumentUrl)
      setEditingId(suggestionId)
      setEditingStatus('draft')
      setSavedValues(values)
    }
  }

  const sendCurrent = async () => {
    if (!editingId || isDirty || editingStatus !== 'draft') return
    if (await onSend(editingId)) {
      setModule('')
      setTitle('')
      setDescription('')
      setSharedDocumentUrl('')
      setSavedValues(emptyValues)
      setEditingId(null)
      setEditingStatus('draft')
    }
  }

  const editSuggestion = (suggestion: SavedTestSuggestion) => {
    setModule(suggestion.module)
    setTitle(suggestion.title)
    setDescription(suggestion.description)
    setSharedDocumentUrl(suggestion.shared_document_url ?? '')
    setSavedValues({
      module: suggestion.module,
      title: suggestion.title,
      description: suggestion.description,
      sharedDocumentUrl: suggestion.shared_document_url ?? '',
    })
    setEditingId(suggestion.id)
    setEditingStatus(suggestion.status)
    setFormError('')
  }

  const startNewSuggestion = () => {
    setModule('')
    setTitle('')
    setDescription('')
    setSharedDocumentUrl('')
    setSavedValues(emptyValues)
    setEditingId(null)
    setEditingStatus('draft')
    setFormError('')
  }

  return (
    <div className="space-y-5">
      <form className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs" onSubmit={(event) => void save(event)}>
        <div className="mb-5">
          <h2 className="text-base font-bold text-slate-900">أضف اقتراحًا</h2>
          <p className="mt-1 text-xs text-slate-500">شارك فكرة لتحسين الاختبارات أو إضافة تغطية جديدة.</p>
        </div>

      {formError && <p className="mb-4 rounded-lg border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-700" role="alert">{formError}</p>}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-xs font-semibold text-slate-700">
          الوحدة
          <select
            required
            className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-800"
            value={module}
            onChange={(event) => setModule(event.target.value)}
          >
            <option value="">اختر الوحدة</option>
            {modules.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          {modules.length === 0 && <span className="mt-1 block font-normal text-amber-700">لا توجد وحدات متاحة حاليًا.</span>}
        </label>

        <label className="block text-xs font-semibold text-slate-700">
          عنوان الاقتراح
          <input
            required
            maxLength={200}
            className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-800"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="اكتب عنوانًا مختصرًا"
          />
        </label>
      </div>

      <div className="mt-4 block text-xs font-semibold text-slate-700">
        الوصف
        <Suspense
          fallback={(
            <div
              className="mt-2 flex min-h-52 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-xs font-normal text-slate-500"
              role="status"
            >
              جارٍ تحميل محرر النص…
            </div>
          )}
        >
          <RichTextEditor value={description} onChange={setDescription} />
        </Suspense>
      </div>

      <label className="mt-4 block text-xs font-semibold text-slate-700">
        رابط مستند مشترك <span className="font-normal text-slate-400">(اختياري)</span>
        <input
          type="url"
          className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-800 dir-ltr"
          value={sharedDocumentUrl}
          onChange={(event) => setSharedDocumentUrl(event.target.value)}
          placeholder="https://..."
        />
      </label>

      <button
        type="submit"
        disabled={Boolean(busyAction) || !isDirty || modules.length === 0}
        className="mt-5 inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {busyAction === 'suggestion-save' ? 'جارٍ حفظ المسودة…' : 'حفظ المسودة'}
      </button>
      <button
        type="button"
        disabled={Boolean(busyAction) || isDirty || !editingId || editingStatus !== 'draft'}
        onClick={() => void sendCurrent()}
        className="ms-2 mt-5 inline-flex items-center justify-center rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
      >
        {busyAction === `suggestion-send-${editingId}` ? 'جارٍ إرسال الاقتراح…' : 'إرسال الاقتراح'}
      </button>
      {editingId && (
        <button
          type="button"
          className="ms-2 mt-5 inline-flex items-center justify-center rounded-xl border border-slate-300 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          onClick={startNewSuggestion}
        >
          اقتراح جديد
        </button>
      )}
      </form>

      <section className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900">اقتراحاتي المحفوظة</h2>
            <p className="mt-1 text-xs text-slate-500">المسودات لا تظهر للآخرين حتى ترسلها.</p>
          </div>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-600">{savedSuggestions.length}</span>
        </div>
        {savedSuggestions.length === 0 ? (
          <p className="rounded-xl bg-slate-50 p-4 text-center text-xs text-slate-500">لا توجد اقتراحات محفوظة بعد.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {savedSuggestions.map((suggestion) => (
              <article key={suggestion.id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate text-xs font-bold text-slate-800">{suggestion.title}</h3>
                    <p className="mt-1 text-[10px] text-slate-500">{suggestion.module}</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold ${
                    suggestion.status === 'sent' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                  }`}>
                    {suggestion.status === 'sent' ? 'تم الإرسال' : 'مسودة'}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {suggestion.status === 'draft' && (
                    <button
                      type="button"
                      disabled={Boolean(busyAction)}
                      onClick={() => void onSend(suggestion.id)}
                      className="rounded-lg bg-emerald-600 px-3 py-1.5 text-[10px] font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {busyAction === `suggestion-send-${suggestion.id}` ? 'جارٍ الإرسال…' : 'إرسال'}
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={Boolean(busyAction)}
                    onClick={() => editSuggestion(suggestion)}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-[10px] font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    تعديل وإعادة الإرسال
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
