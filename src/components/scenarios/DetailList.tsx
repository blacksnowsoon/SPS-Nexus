export interface DetailListProps {
  title: string
  items: string[]
  numbered?: boolean
}

export function DetailList({ title, items, numbered = false }: DetailListProps) {
  return (
    <section className="my-3.5">
      <h3 className="text-[11px] font-semibold text-slate-700 mb-2">{title}</h3>
      <ol
        className={`text-xs text-slate-600 leading-relaxed space-y-1.5 ps-5 ${
          numbered ? 'list-decimal marker:text-blue-600 marker:font-bold' : 'list-disc'
        }`}
      >
        {items.map((item, index) => (
          <li key={`${index}-${item}`} className="ps-1">
            {item}
          </li>
        ))}
      </ol>
    </section>
  )
}
