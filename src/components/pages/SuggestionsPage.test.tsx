import { cleanup, render, screen } from '@testing-library/react'
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
  status: 'sent',
  author_name: 'مختبر SPS',
  avatar_url: null,
}

describe('SuggestionsPage', () => {
  afterEach(() => cleanup())

  it('displays suggestion cards in a two-column grid with safe rich text and shared links', () => {
    const { container } = render(<SuggestionsPage suggestions={[suggestion, { ...suggestion, id: 'suggestion-2' }]} loading={false} />)

    expect(container.querySelector('.md\\:grid-cols-2')).toBeInTheDocument()
    expect(screen.getAllByRole('article')).toHaveLength(2)
    expect(screen.getAllByText('مختبر SPS')).toHaveLength(2)
    expect(screen.getAllByText('المستخدمون')).toHaveLength(2)
    expect(screen.getAllByText('فكرة مفيدة')).toHaveLength(2)
    expect(container.querySelector('script')).not.toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: /مستند مشترك/ })).toHaveLength(2)
  })
})
