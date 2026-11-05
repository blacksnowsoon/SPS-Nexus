import { beforeEach, describe, expect, it } from 'vitest'
import { clearSuggestionDraft, readSuggestionDraft, saveSuggestionDraft, type SuggestionDraft } from './suggestion-draft'

const draft: SuggestionDraft = {
  values: { module: 'المستخدمون', title: 'عنوان', description: '<p>وصف</p>', sharedDocumentUrl: '' },
  savedValues: { module: '', title: '', description: '', sharedDocumentUrl: '' },
  editingId: null,
  editingStatus: 'draft',
}

describe('suggestion drafts', () => {
  beforeEach(() => localStorage.clear())

  it('saves, restores, and clears a draft per user', () => {
    saveSuggestionDraft('user-1', draft)
    expect(readSuggestionDraft('user-1')).toEqual(draft)
    expect(readSuggestionDraft('user-2')).toBeNull()
    clearSuggestionDraft('user-1')
    expect(readSuggestionDraft('user-1')).toBeNull()
  })

  it('ignores corrupted drafts', () => {
    localStorage.setItem('sps_suggestion_draft:user-1', 'not json')
    expect(readSuggestionDraft('user-1')).toBeNull()
    localStorage.setItem('sps_suggestion_draft:user-1', '{"values":{"title":5}}')
    expect(readSuggestionDraft('user-1')).toBeNull()
  })
})
