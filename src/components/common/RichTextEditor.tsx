import { useEffect, useRef } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import TextAlign from '@tiptap/extension-text-align'
import { FontSize } from '@tiptap/extension-text-style/font-size'
import { TextStyle } from '@tiptap/extension-text-style/text-style'

interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
}

const toolbarButtonClass =
  'min-w-8 h-8 px-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50'

const fontSizes: Record<string, string> = {
  '2': '13px',
  '3': '16px',
  '4': '18px',
  '5': '24px',
}

export function RichTextEditor({ value, onChange }: RichTextEditorProps) {
  const onChangeRef = useRef(onChange)

  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  const editor = useEditor({
    extensions: [
      StarterKit,
      TextStyle,
      FontSize,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
    ],
    content: value || '<p></p>',
    editorProps: {
      attributes: {
        class:
          'min-h-52 max-h-[70vh] w-full resize-y overflow-auto p-3 text-sm leading-7 text-slate-800 focus:outline-none [&_h2]:text-lg [&_h2]:font-bold [&_h3]:text-base [&_h3]:font-semibold [&_ol]:list-decimal [&_ol]:ps-6 [&_ul]:list-disc [&_ul]:ps-6',
        'aria-label': 'وصف الاقتراح',
        'aria-multiline': 'true',
        'data-placeholder': 'اكتب تفاصيل الاقتراح…',
        role: 'textbox',
      },
    },
    onUpdate: ({ editor }) => {
      onChangeRef.current(editor.getHTML())
    },
  })

  useEffect(() => {
    if (!editor) return

    const nextValue = value || '<p></p>'
    if (editor.getHTML() !== nextValue) {
      editor.commands.setContent(nextValue, { emitUpdate: false })
    }
  }, [editor, value])

  return (
    <div className="mt-1 rounded-xl border border-slate-200 bg-white focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20">
      <div className="flex flex-wrap items-center gap-1 rounded-t-xl border-b border-slate-200 bg-slate-50 p-2" aria-label="أدوات تنسيق الوصف">
        <button type="button" className={toolbarButtonClass} onClick={() => editor?.chain().focus().setTextAlign('right').run()} aria-label="محاذاة لليمين">☰</button>
        <button type="button" className={toolbarButtonClass} onClick={() => editor?.chain().focus().setTextAlign('center').run()} aria-label="محاذاة للوسط">≡</button>
        <button type="button" className={toolbarButtonClass} onClick={() => editor?.chain().focus().setTextAlign('left').run()} aria-label="محاذاة لليسار">☷</button>
        <select
          className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-700"
          defaultValue=""
          aria-label="نمط العنوان"
          onChange={(event) => {
            if (event.target.value === 'H2') editor?.chain().focus().setHeading({ level: 2 }).run()
            if (event.target.value === 'H3') editor?.chain().focus().setHeading({ level: 3 }).run()
            if (event.target.value === 'P') editor?.chain().focus().setParagraph().run()
            event.target.value = ''
          }}
        >
          <option value="">عنوان</option>
          <option value="H2">عنوان كبير</option>
          <option value="H3">عنوان فرعي</option>
          <option value="P">نص عادي</option>
        </select>
        <button type="button" className={toolbarButtonClass} onClick={() => editor?.chain().focus().toggleOrderedList().run()} aria-label="قائمة مرقمة">1. القائمة</button>
        <select
          className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-700"
          defaultValue="3"
          aria-label="حجم الخط"
          onChange={(event) => {
            const fontSize = fontSizes[event.target.value]
            if (fontSize) editor?.chain().focus().setFontSize(fontSize).run()
          }}
        >
          <option value="2">صغير</option>
          <option value="3">عادي</option>
          <option value="4">كبير</option>
          <option value="5">كبير جدًا</option>
        </select>
      </div>
      <EditorContent editor={editor} />
    </div>
  )
}
