import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SuggestionForm, type SuggestionFormValues } from './SuggestionForm'
import type { SavedTestSuggestion } from '../../types'

const sentSuggestion: SavedTestSuggestion = {
  id: 'sent-1',
  module: 'المستخدمون',
  title: 'اقتراح محفوظ',
  description: '<p>الوصف الأصلي</p>',
  shared_document_url: null,
  created_by: 'tester-1',
  created_at: '2026-11-03T10:00:00.000Z',
  status: 'sent',
}

const paste = (target: HTMLElement, data: Record<string, string>) => {
  const event = new Event('paste', { bubbles: true, cancelable: true })
  Object.defineProperty(event, 'clipboardData', {
    value: { types: Object.keys(data), getData: (type: string) => data[type] ?? '' },
  })
  fireEvent(target, event)
}

const findDescriptionEditor = () =>
  screen.findByRole('textbox', { name: 'وصف الاقتراح' }, { timeout: 20_000 })

describe('SuggestionForm', () => {
  beforeEach(() => localStorage.clear())
  afterEach(() => cleanup())

  it('keeps pasted description text when clicking inside the editor', async () => {
    render(<SuggestionForm modules={['المستخدمون']} savedSuggestions={[]} busyAction="" onSave={vi.fn()} onSend={vi.fn()} />)

    const descriptionEditor = await findDescriptionEditor()
    paste(descriptionEditor, { 'text/html': '<p>Pasted text</p>', 'text/plain': 'Pasted text' })
    await waitFor(() => expect(descriptionEditor).toHaveTextContent('Pasted text'))
    fireEvent.click(descriptionEditor)

    expect(descriptionEditor).toHaveTextContent('Pasted text')
  }, 20_000)

  it('restores an unsaved draft after remounting and clears it once saved and sent', async () => {
    const user = userEvent.setup()
    const draftKey = 'sps_suggestion_draft:tester-1'
    const props = {
      modules: ['المستخدمون'],
      savedSuggestions: [],
      busyAction: '',
      onSave: vi.fn<(values: SuggestionFormValues, id: string | null) => Promise<string | null>>().mockResolvedValue('saved-1'),
      onSend: vi.fn<(id: string) => Promise<boolean>>().mockResolvedValue(true),
      userId: 'tester-1',
    }
    const { unmount } = render(<SuggestionForm {...props} />)

    await user.selectOptions(screen.getByRole('combobox', { name: 'الوحدة' }), 'المستخدمون')
    await user.type(screen.getByRole('textbox', { name: 'عنوان الاقتراح' }), 'مسودة غير محفوظة')
    expect(localStorage.getItem(draftKey)).toContain('مسودة غير محفوظة')
    unmount()

    render(<SuggestionForm {...props} />)
    expect(screen.getByRole('textbox', { name: 'عنوان الاقتراح' })).toHaveValue('مسودة غير محفوظة')
    expect(screen.getByRole('combobox', { name: 'الوحدة' })).toHaveValue('المستخدمون')

    const descriptionEditor = await findDescriptionEditor()
    descriptionEditor.innerHTML = '<p>Description</p>'
    fireEvent.input(descriptionEditor)
    await waitFor(() => expect(localStorage.getItem(draftKey)).toContain('Description'))

    await user.click(screen.getByRole('button', { name: 'حفظ المسودة' }))
    expect(props.onSave).toHaveBeenCalled()
    await waitFor(() => expect(localStorage.getItem(draftKey)).toBeNull())

    await user.type(screen.getByRole('textbox', { name: 'عنوان الاقتراح' }), '!')
    expect(localStorage.getItem(draftKey)).not.toBeNull()
    await user.type(screen.getByRole('textbox', { name: 'عنوان الاقتراح' }), '{Backspace}')
    await user.click(screen.getByRole('button', { name: 'إرسال الاقتراح' }))
    expect(props.onSend).toHaveBeenCalledWith('saved-1')
    expect(localStorage.getItem(draftKey)).toBeNull()
    expect(screen.getByRole('textbox', { name: 'عنوان الاقتراح' })).toHaveValue('')
  }, 20_000)

  it('submits the selected module, title, rich description, and optional link', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn<(values: SuggestionFormValues, id: string | null) => Promise<string | null>>().mockResolvedValue('saved-1')
    const onSend = vi.fn<(id: string) => Promise<boolean>>().mockResolvedValue(true)
    render(<SuggestionForm modules={['المستخدمون']} savedSuggestions={[]} busyAction="" onSave={onSave} onSend={onSend} />)

    const saveButton = screen.getByRole('button', { name: 'حفظ المسودة' })
    const sendButton = screen.getByRole('button', { name: 'إرسال الاقتراح' })
    const descriptionEditor = await findDescriptionEditor()
    expect(saveButton).toBeDisabled()
    expect(sendButton).toBeDisabled()
    expect(descriptionEditor).toHaveClass('resize-y', 'min-h-52')
    expect(descriptionEditor.innerHTML).toBe('<p><br class="ProseMirror-trailingBreak"></p>')
    await user.selectOptions(screen.getByRole('combobox', { name: 'الوحدة' }), 'المستخدمون')
    await user.type(screen.getByRole('textbox', { name: 'عنوان الاقتراح' }), 'تحسين التحقق')
    descriptionEditor.innerHTML = '<p>Add a new test case</p>'
    fireEvent.input(descriptionEditor)
    await user.type(screen.getByRole('textbox', { name: /رابط مستند مشترك/ }), 'https://example.com/doc')
    expect(saveButton).toBeEnabled()
    expect(sendButton).toBeDisabled()
    await user.click(saveButton)

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      module: 'المستخدمون',
      title: 'تحسين التحقق',
      description: expect.stringContaining('Add a new test case'),
      sharedDocumentUrl: 'https://example.com/doc',
    }), null)
    expect(sendButton).toBeEnabled()
    expect(saveButton).toBeDisabled()
    await user.click(sendButton)
    expect(onSend).toHaveBeenCalledWith('saved-1')
  }, 15_000)

  it('rejects invalid external document links', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn<(values: SuggestionFormValues, id: string | null) => Promise<string | null>>().mockResolvedValue('saved-1')
    const onSend = vi.fn<(id: string) => Promise<boolean>>().mockResolvedValue(true)
    render(<SuggestionForm modules={['المستخدمون']} savedSuggestions={[]} busyAction="" onSave={onSave} onSend={onSend} />)

    await user.selectOptions(screen.getByRole('combobox', { name: 'الوحدة' }), 'المستخدمون')
    await user.type(screen.getByRole('textbox', { name: 'عنوان الاقتراح' }), 'تحسين التحقق')
    const descriptionEditor = await findDescriptionEditor()
    descriptionEditor.innerHTML = '<p>Description</p>'
    fireEvent.input(descriptionEditor)
    await user.type(screen.getByRole('textbox', { name: /رابط مستند مشترك/ }), 'ftp://example.com/doc')
    await user.click(screen.getByRole('button', { name: 'حفظ المسودة' }))

    expect(onSave).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toHaveTextContent('رابط مشاركة صالحًا')
  })

  it('marks sent suggestions and requires saving edits before they can be sent again', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn<(values: SuggestionFormValues, id: string | null) => Promise<string | null>>().mockResolvedValue('sent-1')
    const onSend = vi.fn<(id: string) => Promise<boolean>>().mockResolvedValue(true)
    render(
      <SuggestionForm
        modules={['المستخدمون']}
        savedSuggestions={[sentSuggestion]}
        busyAction=""
        onSave={onSave}
        onSend={onSend}
      />,
    )

    expect(screen.getByText('تم الإرسال')).toBeInTheDocument()
    await findDescriptionEditor()
    await user.click(screen.getByRole('button', { name: 'تعديل وإعادة الإرسال' }))
    const title = screen.getByRole('textbox', { name: 'عنوان الاقتراح' })
    await user.clear(title)
    await user.type(title, 'اقتراح محدث')

    const sendButton = screen.getByRole('button', { name: 'إرسال الاقتراح' })
    expect(sendButton).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'حفظ المسودة' }))
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ title: 'اقتراح محدث' }), 'sent-1')
    expect(sendButton).toBeEnabled()
    await user.click(sendButton)
    expect(onSend).toHaveBeenCalledWith('sent-1')
  })
})
