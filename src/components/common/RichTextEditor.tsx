import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { EditorContent, useEditor, useEditorState } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import TextAlign from '@tiptap/extension-text-align'
import { FontSize } from '@tiptap/extension-text-style/font-size'
import { TextStyle } from '@tiptap/extension-text-style/text-style'
import { normalizePastedHtml } from '../../lib/rich-text'

interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
  ariaLabel?: string
  placeholder?: string
}

type TextAlignment = 'right' | 'center' | 'left' | 'justify'

const toolbarButtonClass =
  'inline-flex min-w-8 h-8 items-center justify-center px-2 rounded-lg border text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40'
const inactiveButtonClass = 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
const activeButtonClass = 'border-blue-300 bg-blue-50 text-blue-700'
const selectClass = 'h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-700'

const fontSizes: Record<string, string> = {
  '2': '13px',
  '3': '16px',
  '4': '18px',
  '5': '24px',
}

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  )
}

const alignIcons: Record<TextAlignment, ReactNode> = {
  right: <Icon><path d="M4 6h16M10 10h10M4 14h16M10 18h10" /></Icon>,
  center: <Icon><path d="M4 6h16M7 10h10M4 14h16M7 18h10" /></Icon>,
  left: <Icon><path d="M4 6h16M4 10h10M4 14h16M4 18h10" /></Icon>,
  justify: <Icon><path d="M4 6h16M4 10h16M4 14h16M4 18h16" /></Icon>,
}

const alignments: { value: TextAlignment; label: string }[] = [
  { value: 'right', label: 'محاذاة لليمين' },
  { value: 'center', label: 'محاذاة للوسط' },
  { value: 'left', label: 'محاذاة لليسار' },
  { value: 'justify', label: 'ضبط النص' },
]

function Divider() {
  return <span className="mx-1 h-5 w-px bg-slate-200" aria-hidden="true" />
}

interface ToolbarButtonProps {
  label: string
  onClick: () => void
  active?: boolean
  disabled?: boolean
  children: ReactNode
}

function ToolbarButton({ label, onClick, active, disabled, children }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      className={`${toolbarButtonClass} ${active ? activeButtonClass : inactiveButtonClass}`}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      aria-label={label}
      aria-pressed={active === undefined ? undefined : active}
      title={label}
      disabled={disabled}
    >
      {children}
    </button>
  )
}

export function RichTextEditor({
  value,
  onChange,
  ariaLabel = 'وصف الاقتراح',
  placeholder = 'اكتب تفاصيل الاقتراح…',
}: RichTextEditorProps) {
  const onChangeRef = useRef(onChange)
  const lastValueRef = useRef(value)

  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        blockquote: false,
        code: false,
        codeBlock: false,
        horizontalRule: false,
        link: false,
      }),
      TextStyle,
      FontSize,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
    ],
    content: value || '<p></p>',
    editorProps: {
      attributes: {
        class:
          'rich-text-content min-h-52 w-full resize-y overflow-auto p-3 text-sm leading-7 text-slate-800 focus:outline-none [&_h1]:text-xl [&_h1]:font-bold [&_h2]:text-lg [&_h2]:font-bold [&_h3]:text-base [&_h3]:font-semibold',
        'aria-label': ariaLabel,
        'aria-multiline': 'true',
        'data-placeholder': placeholder,
        role: 'textbox',
      },
      transformPastedHTML: normalizePastedHtml,
    },
    onUpdate: ({ editor }) => {
      const nextValue = editor.getHTML()
      lastValueRef.current = nextValue
      onChangeRef.current(nextValue)
    },
  })

  const state = useEditorState({
    editor,
    selector: ({ editor }) => {
      if (!editor) return null
      const fontSize = editor.getAttributes('textStyle').fontSize as string | undefined
      return {
        bold: editor.isActive('bold'),
        italic: editor.isActive('italic'),
        underline: editor.isActive('underline'),
        strike: editor.isActive('strike'),
        bulletList: editor.isActive('bulletList'),
        orderedList: editor.isActive('orderedList'),
        textAlign: (['right', 'center', 'left', 'justify'] as const).find((alignment) => editor.isActive({ textAlign: alignment })),
        blockType: editor.isActive('heading', { level: 1 })
          ? 'H1'
          : editor.isActive('heading', { level: 2 })
            ? 'H2'
            : editor.isActive('heading', { level: 3 })
              ? 'H3'
              : 'P',
        fontSize: fontSize ? Object.keys(fontSizes).find((key) => fontSizes[key] === fontSize) ?? fontSize : '3',
        canUndo: editor.can().undo(),
        canRedo: editor.can().redo(),
      }
    },
  })

  useEffect(() => {
    if (!editor || editor.isDestroyed || lastValueRef.current === value) return

    const nextValue = value || '<p></p>'
    lastValueRef.current = value
    editor.commands.setContent(nextValue, { emitUpdate: false })
  }, [editor, value])

  const chain = () => editor?.chain().focus()

  return (
    // Cancel label activation so clicks inside the editor never trigger a toolbar button when it is wrapped in a <label>.
    <div
      className="mt-1 rounded-xl border border-slate-200 bg-white focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20"
      onClick={(event) => event.preventDefault()}
    >
      <div
        className="flex flex-wrap items-center gap-1 rounded-t-xl border-b border-slate-200 bg-slate-50 p-2 md:sticky md:top-[72px] md:z-20"
        role="toolbar"
        aria-label="أدوات تنسيق النص"
      >
        <ToolbarButton label="تراجع" onClick={() => chain()?.undo().run()} disabled={!state?.canUndo}>
          <Icon><path d="M9 14 4 9l5-5" /><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" /></Icon>
        </ToolbarButton>
        <ToolbarButton label="إعادة" onClick={() => chain()?.redo().run()} disabled={!state?.canRedo}>
          <Icon><path d="m15 14 5-5-5-5" /><path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13" /></Icon>
        </ToolbarButton>
        <Divider />
        <select
          className={selectClass}
          value={state?.blockType ?? 'P'}
          aria-label="نمط الفقرة"
          onChange={(event) => {
            const blockType = event.target.value
            if (blockType === 'H1') chain()?.setHeading({ level: 1 }).run()
            if (blockType === 'H2') chain()?.setHeading({ level: 2 }).run()
            if (blockType === 'H3') chain()?.setHeading({ level: 3 }).run()
            if (blockType === 'P') chain()?.setParagraph().run()
          }}
        >
          <option value="P">نص عادي</option>
          <option value="H1" hidden>عنوان رئيسي</option>
          <option value="H2">عنوان كبير</option>
          <option value="H3">عنوان فرعي</option>
        </select>
        <select
          className={selectClass}
          value={state?.fontSize ?? '3'}
          aria-label="حجم الخط"
          onChange={(event) => {
            const fontSize = fontSizes[event.target.value]
            if (event.target.value === '3') chain()?.unsetFontSize().run()
            else if (fontSize) chain()?.setFontSize(fontSize).run()
          }}
        >
          <option value="2">خط صغير</option>
          <option value="3">خط عادي</option>
          <option value="4">خط كبير</option>
          <option value="5">كبير جدًا</option>
          {state && !(state.fontSize in fontSizes) && <option value={state.fontSize}>{state.fontSize}</option>}
        </select>
        <Divider />
        <ToolbarButton label="غامق" onClick={() => chain()?.toggleBold().run()} active={state?.bold ?? false}>
          <span className="font-bold">B</span>
        </ToolbarButton>
        <ToolbarButton label="مائل" onClick={() => chain()?.toggleItalic().run()} active={state?.italic ?? false}>
          <span className="font-serif italic">I</span>
        </ToolbarButton>
        <ToolbarButton label="تسطير" onClick={() => chain()?.toggleUnderline().run()} active={state?.underline ?? false}>
          <span className="underline">U</span>
        </ToolbarButton>
        <ToolbarButton label="يتوسطه خط" onClick={() => chain()?.toggleStrike().run()} active={state?.strike ?? false}>
          <span className="line-through">S</span>
        </ToolbarButton>
        <Divider />
        {alignments.map(({ value: alignment, label }) => (
          <ToolbarButton
            key={alignment}
            label={label}
            onClick={() => chain()?.setTextAlign(alignment).run()}
            active={state?.textAlign === alignment}
          >
            {alignIcons[alignment]}
          </ToolbarButton>
        ))}
        <Divider />
        <ToolbarButton label="قائمة نقطية" onClick={() => chain()?.toggleBulletList().run()} active={state?.bulletList ?? false}>
          <Icon><path d="M9 6h11M9 12h11M9 18h11" /><circle cx="4.5" cy="6" r="1" fill="currentColor" /><circle cx="4.5" cy="12" r="1" fill="currentColor" /><circle cx="4.5" cy="18" r="1" fill="currentColor" /></Icon>
        </ToolbarButton>
        <ToolbarButton label="قائمة مرقمة" onClick={() => chain()?.toggleOrderedList().run()} active={state?.orderedList ?? false}>
          <Icon><path d="M10 6h10M10 12h10M10 18h10" /><path d="M4 4h1v4M4 8h2" /><path d="M4 14h2l-2 3h2" /></Icon>
        </ToolbarButton>
        <Divider />
        <ToolbarButton label="مسح التنسيق" onClick={() => chain()?.unsetAllMarks().clearNodes().unsetTextAlign().run()}>
          <Icon><path d="M4 7V5h12v2" /><path d="M10 5 7 19" /><path d="m15 14 5 5M20 14l-5 5" /></Icon>
        </ToolbarButton>
      </div>
      <EditorContent editor={editor} />
    </div>
  )
}
