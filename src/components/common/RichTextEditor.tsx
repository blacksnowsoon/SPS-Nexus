import { useEffect, useRef } from 'react'

interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
}

const toolbarButtonClass =
  'min-w-8 h-8 px-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50'

export function RichTextEditor({ value, onChange }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const editor = editorRef.current
    if (!editor || document.activeElement === editor) return

    const nextValue = value || '<p><br></p>'
    if (editor.innerHTML !== nextValue) {
      editor.innerHTML = nextValue
    }
  }, [value])

  const runCommand = (command: string, commandValue?: string) => {
    editorRef.current?.focus()
    document.execCommand(command, false, commandValue)
    if (editorRef.current) onChange(editorRef.current.innerHTML)
  }

  return (
    <div className="mt-1 rounded-xl border border-slate-200 bg-white focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20">
      <div className="flex flex-wrap items-center gap-1 rounded-t-xl border-b border-slate-200 bg-slate-50 p-2" aria-label="أدوات تنسيق الوصف">
        <button type="button" className={toolbarButtonClass} onMouseDown={(event) => event.preventDefault()} onClick={() => runCommand('justifyRight')} aria-label="محاذاة لليمين">☰</button>
        <button type="button" className={toolbarButtonClass} onMouseDown={(event) => event.preventDefault()} onClick={() => runCommand('justifyCenter')} aria-label="محاذاة للوسط">≡</button>
        <button type="button" className={toolbarButtonClass} onMouseDown={(event) => event.preventDefault()} onClick={() => runCommand('justifyLeft')} aria-label="محاذاة لليسار">☷</button>
        <select
          className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-700"
          defaultValue=""
          aria-label="نمط العنوان"
          onChange={(event) => {
            if (event.target.value) runCommand('formatBlock', event.target.value)
            event.target.value = ''
          }}
        >
          <option value="">عنوان</option>
          <option value="H2">عنوان كبير</option>
          <option value="H3">عنوان فرعي</option>
          <option value="P">نص عادي</option>
        </select>
        <button type="button" className={toolbarButtonClass} onMouseDown={(event) => event.preventDefault()} onClick={() => runCommand('insertOrderedList')} aria-label="قائمة مرقمة">1. القائمة</button>
        <select
          className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-700"
          defaultValue="3"
          aria-label="حجم الخط"
          onChange={(event) => runCommand('fontSize', event.target.value)}
        >
          <option value="2">صغير</option>
          <option value="3">عادي</option>
          <option value="4">كبير</option>
          <option value="5">كبير جدًا</option>
        </select>
      </div>
      <div
        ref={editorRef}
        className="min-h-52 max-h-[70vh] w-full resize-y overflow-auto p-3 text-sm leading-7 text-slate-800 focus:outline-none before:pointer-events-none before:text-slate-400 data-[empty=true]:before:content-[attr(data-placeholder)] data-[empty=false]:before:content-none [&_h2]:text-lg [&_h2]:font-bold [&_h3]:text-base [&_h3]:font-semibold [&_ol]:list-decimal [&_ol]:ps-6 [&_ul]:list-disc [&_ul]:ps-6"
        contentEditable
        role="textbox"
        aria-label="وصف الاقتراح"
        aria-multiline="true"
        data-placeholder="اكتب تفاصيل الاقتراح…"
        data-empty={!value}
        onInput={(event) => onChange(event.currentTarget.innerHTML)}
      />
    </div>
  )
}
