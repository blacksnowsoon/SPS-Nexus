export interface StatCardProps {
  label: string
  value: number
  sub: string
  icon: string
  tone: 'blue' | 'green' | 'orange' | 'red' | string
}

const toneStyles: Record<string, string> = {
  blue: 'bg-blue-50 text-blue-600',
  green: 'bg-emerald-50 text-emerald-600',
  orange: 'bg-amber-50 text-amber-600',
  red: 'bg-rose-50 text-rose-600',
}

export function StatCard({ label, value, sub, icon, tone }: StatCardProps) {
  const iconStyle = toneStyles[tone] || 'bg-slate-100 text-slate-600'

  return (
    <article className="grid grid-cols-[38px_1fr] items-center gap-x-3 gap-y-0.5 p-3.5 sm:p-4 bg-white border border-slate-200/90 rounded-xl shadow-xs transition-shadow hover:shadow-sm">
      <span
        className={`row-span-3 w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold ${iconStyle}`}
      >
        {icon}
      </span>
      <span className="text-[11px] font-medium text-slate-500 leading-tight">{label}</span>
      <strong className="text-xl sm:text-2xl font-bold text-slate-800 leading-tight tracking-tight">
        {value}
      </strong>
      <span className="text-[10px] text-slate-400 leading-tight">{sub}</span>
    </article>
  )
}
