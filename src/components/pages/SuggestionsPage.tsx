import type { TestSuggestion } from '../../types'
import { sanitizeRichText } from '../../lib/rich-text'

interface SuggestionsPageProps {
  suggestions: TestSuggestion[]
  loading: boolean
}

function getInitials(name: string | null): string {
  const words = name?.trim().split(/\s+/).filter(Boolean) ?? []
  return words.slice(0, 2).map((word) => word[0]).join('').toUpperCase() || '?'
}

export function SuggestionsPage({ suggestions, loading }: SuggestionsPageProps) {
  if (loading && suggestions.length === 0) {
    return <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-xs text-slate-500">جارٍ تحميل الاقتراحات…</div>
  }

  if (suggestions.length === 0) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-xs">
        <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-blue-50 text-xl text-blue-600">✦</div>
        <h2 className="text-sm font-bold text-slate-800">لا توجد اقتراحات بعد</h2>
        <p className="mt-1 text-xs text-slate-500">ستظهر اقتراحات المختبِرين هنا بعد إرسالها.</p>
      </section>
    )
  }

  return (
    <div className="grid grid-cols-1 items-stretch gap-4 md:grid-cols-2">
      {suggestions.map((suggestion) => (
        <article key={suggestion.id} className="flex min-w-0 flex-col rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            {suggestion.avatar_url ? (
              <img src={suggestion.avatar_url} alt="" className="h-10 w-10 rounded-full border border-slate-200 object-cover" />
            ) : (
              <span aria-hidden="true" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-blue-100 text-xs font-bold text-blue-800">
                {getInitials(suggestion.author_name)}
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-bold text-slate-800">{suggestion.author_name || 'مختبِر'}</p>
              <time className="mt-0.5 block text-[10px] text-slate-400" dateTime={suggestion.created_at}>
                {new Intl.DateTimeFormat('ar-EG', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(suggestion.created_at))}
              </time>
            </div>
            <span className="max-w-32 truncate rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-semibold text-blue-700" title={suggestion.module}>
              {suggestion.module}
            </span>
          </div>
          <h2 className="mt-4 text-sm font-bold leading-6 text-slate-900">{suggestion.title}</h2>
          <div
            className="suggestion-rich-text mt-2 min-w-0 flex-1 break-words text-xs leading-6 text-slate-600 [&_h2]:my-2 [&_h2]:text-base [&_h2]:font-bold [&_h3]:my-2 [&_h3]:font-semibold [&_ol]:list-decimal [&_ol]:ps-6 [&_ul]:list-disc [&_ul]:ps-6"
            dangerouslySetInnerHTML={{ __html: sanitizeRichText(suggestion.description) }}
          />
          {suggestion.shared_document_url && (
            <a
              className="mt-4 inline-flex w-fit items-center gap-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100 dir-ltr"
              href={suggestion.shared_document_url}
              target="_blank"
              rel="noopener noreferrer"
            >
              ↗ مستند مشترك
            </a>
          )}
        </article>
      ))}
    </div>
  )
}
