import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { SuggestionsPage } from './SuggestionsPage'
import type { TestSuggestion } from '../../types'

const suggestion: TestSuggestion = {
  id: 'suggestion-1',
  module: 'المستخدمون',
  title: 'إضافة تحقق إضافي',
  description: '<p style="text-align: center">فكرة <script>alert(1)</script> مفيدة</p>',
  shared_document_url: 'https://example.com/shared',
  created_by: 'tester-1',
  created_at: '2026-11-03T10:00:00.000Z',
  updated_at: '2026-11-03T10:00:00.000Z',
  status: 'sent',
  author_name: 'مختبر SPS',
  avatar_url: null,
}

describe('SuggestionsPage', () => {
  afterEach(() => cleanup())

  it('shows collapsed suggestion cards in a two-column grid with their header details', () => {
    const { container } = render(<SuggestionsPage suggestions={[suggestion, { ...suggestion, id: 'suggestion-2' }]} loading={false} />)

    expect(container.querySelector('.md\\:grid-cols-2')).toBeInTheDocument()
    expect(screen.getAllByRole('article')).toHaveLength(2)
    expect(screen.getAllByText('مختبر SPS')).toHaveLength(2)
    expect(screen.getAllByText('المستخدمون')).toHaveLength(2)
    expect(screen.getAllByText('إضافة تحقق إضافي')).toHaveLength(2)
    for (const header of screen.getAllByRole('button', { expanded: false })) {
      expect(header).toHaveAttribute('aria-expanded', 'false')
    }
    expect(screen.queryByText('فكرة مفيدة')).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /مستند مشترك/ })).not.toBeInTheDocument()
  })

  it('expands and collapses a card when its header is clicked, showing safe rich text and links', async () => {
    const user = userEvent.setup()
    const { container } = render(<SuggestionsPage suggestions={[suggestion, { ...suggestion, id: 'suggestion-2' }]} loading={false} />)

    const [firstHeader] = screen.getAllByRole('button', { name: /إضافة تحقق إضافي/ })
    await user.click(firstHeader)

    expect(firstHeader).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getAllByText('فكرة مفيدة')).toHaveLength(1)
    expect(screen.getAllByRole('link', { name: /مستند مشترك/ })).toHaveLength(1)
    expect(container.querySelector('script')).not.toBeInTheDocument()

    await user.click(firstHeader)
    expect(firstHeader).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByText('فكرة مفيدة')).not.toBeInTheDocument()
  })

  it('offers a PDF export action for each suggestion card', () => {
    render(<SuggestionsPage suggestions={[suggestion, { ...suggestion, id: 'suggestion-2' }]} loading={false} />)

    expect(screen.getAllByRole('button', { name: 'تصدير PDF' })).toHaveLength(2)
  })
})
