import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { RichTextEditor } from './RichTextEditor'

const paste = (target: HTMLElement, data: Record<string, string>) => {
  const event = new Event('paste', { bubbles: true, cancelable: true })
  Object.defineProperty(event, 'clipboardData', {
    value: { types: Object.keys(data), getData: (type: string) => data[type] ?? '' },
  })
  fireEvent(target, event)
}

describe('RichTextEditor', () => {
  afterEach(() => cleanup())

  it('provides an accessible formatting toolbar that reflects the active formatting', async () => {
    const user = userEvent.setup()
    render(<RichTextEditor value="" onChange={vi.fn()} />)

    expect(screen.getByRole('toolbar', { name: 'أدوات تنسيق النص' })).toBeInTheDocument()
    for (const name of ['تراجع', 'إعادة', 'مائل', 'تسطير', 'يتوسطه خط', 'محاذاة لليمين', 'محاذاة للوسط', 'محاذاة لليسار', 'ضبط النص', 'قائمة نقطية', 'قائمة مرقمة', 'مسح التنسيق']) {
      expect(screen.getByRole('button', { name })).toBeInTheDocument()
    }
    expect(screen.getByRole('button', { name: 'تراجع' })).toBeDisabled()

    const bold = screen.getByRole('button', { name: 'غامق' })
    expect(bold).toHaveAttribute('aria-pressed', 'false')
    await user.click(bold)
    expect(bold).toHaveAttribute('aria-pressed', 'true')
  })

  it('syncs the paragraph style and alignment controls with the loaded content', () => {
    render(<RichTextEditor value='<h2 style="text-align: center">Title</h2>' onChange={vi.fn()} />)

    expect(screen.getByRole('combobox', { name: 'نمط الفقرة' })).toHaveValue('H2')
    expect(screen.getByRole('combobox', { name: 'حجم الخط' })).toHaveValue('3')
    expect(screen.getByRole('button', { name: 'محاذاة للوسط' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('accepts custom accessible labels and placeholders', () => {
    render(<RichTextEditor value="" onChange={vi.fn()} ariaLabel="ملاحظات" placeholder="اكتب ملاحظاتك" />)

    expect(screen.getByRole('textbox', { name: 'ملاحظات' })).toHaveAttribute('data-placeholder', 'اكتب ملاحظاتك')
  })

  it('keeps supported formatting when rich text is pasted and strips unsafe markup', async () => {
    const onChange = vi.fn()
    render(<RichTextEditor value="" onChange={onChange} />)

    paste(screen.getByRole('textbox', { name: 'وصف الاقتراح' }), {
      'text/html': '<b style="font-weight:normal" id="docs-internal-guid-1"><p><span style="font-weight:700;color:red">Bold</span> <span style="font-style:italic">Italic</span></p></b><script>alert(1)</script>',
      'text/plain': 'Bold Italic',
    })

    await waitFor(() => expect(onChange).toHaveBeenCalled())
    const html = onChange.mock.lastCall?.[0] as string
    expect(html).toContain('<strong>Bold</strong>')
    expect(html).toContain('<em>Italic</em>')
    expect(html).not.toMatch(/script|color/)
  })

  it('keeps lists and font sizes pasted from Word', async () => {
    const onChange = vi.fn()
    render(<RichTextEditor value="" onChange={onChange} />)

    paste(screen.getByRole('textbox', { name: 'وصف الاقتراح' }), {
      'text/html': [
        "<p style='mso-list:l0 level1 lfo1'><span style='mso-list:Ignore'>·<span>&nbsp;</span></span><span style='font-size:14pt'>Bullet</span></p>",
        "<p style='mso-list:l0 level2 lfo1'><span style='mso-list:Ignore'>o<span>&nbsp;</span></span>Nested</p>",
        '<p>Gap</p>',
        "<p style='mso-list:l1 level1 lfo2'><span style='mso-list:Ignore'>2.<span>&nbsp;</span></span>Numbered</p>",
      ].join(''),
      'text/plain': 'Bullet\nNested\nGap\nNumbered',
    })

    await waitFor(() => expect(onChange).toHaveBeenCalled())
    const html = onChange.mock.lastCall?.[0] as string
    expect(html).toMatch(/<ul><li><p><span style="font-size: ?19px;?">Bullet<\/span><\/p><ul><li><p>Nested<\/p><\/li><\/ul><\/li><\/ul>/)
    expect(html).toContain('<ol start="2"><li><p>Numbered</p></li></ol>')
  })

  it('shows pasted font sizes that are not in the preset list', () => {
    render(<RichTextEditor value='<p><span style="font-size: 15px">Text</span></p>' onChange={vi.fn()} />)

    expect(screen.getByRole('combobox', { name: 'حجم الخط' })).toHaveValue('15px')
  })

  it('lets the user resize the editor without a maximum height', () => {
    render(<RichTextEditor value="" onChange={vi.fn()} />)

    const editor = screen.getByRole('textbox', { name: 'وصف الاقتراح' })
    expect(editor).toHaveClass('resize-y')
    expect(editor.className).not.toMatch(/max-h/)
  })

  it('splits pasted plain text into paragraphs', async () => {
    const onChange = vi.fn()
    render(<RichTextEditor value="" onChange={onChange} />)

    paste(screen.getByRole('textbox', { name: 'وصف الاقتراح' }), { 'text/plain': 'Line one\nLine two' })

    await waitFor(() => expect(onChange).toHaveBeenCalled())
    expect(onChange.mock.lastCall?.[0]).toBe('<p>Line one</p><p>Line two</p>')
  })
})
