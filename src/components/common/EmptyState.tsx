export interface EmptyStateProps {
  title: string
  body: string
}

export function EmptyState({ title, body }: EmptyStateProps) {
  return (
    <div className="grid place-items-center text-center bg-white border border-slate-200/90 rounded-2xl p-10 sm:p-12 shadow-xs">
      <span className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 text-lg font-bold flex items-center justify-center mb-3">
        ☷
      </span>
      <h3 className="text-sm font-semibold text-slate-800 mb-1">{title}</h3>
      <p className="text-xs text-slate-500 max-w-sm leading-relaxed">{body}</p>
    </div>
  )
}
