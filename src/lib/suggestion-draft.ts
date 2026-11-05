import type { SuggestionFormValues } from '../components/pages/SuggestionForm'

export interface SuggestionDraft {
  values: SuggestionFormValues
  savedValues: SuggestionFormValues
  editingId: string | null
  editingStatus: 'draft' | 'sent'
}

const valueKeys: (keyof SuggestionFormValues)[] = ['module', 'title', 'description', 'sharedDocumentUrl']

function getStorageKey(userId: string) {
  return `sps_suggestion_draft:${userId}`
}

function isFormValues(value: unknown): value is SuggestionFormValues {
  return typeof value === 'object' && value !== null
    && valueKeys.every((key) => typeof (value as Record<string, unknown>)[key] === 'string')
}

export function readSuggestionDraft(userId: string): SuggestionDraft | null {
  try {
    const draft = JSON.parse(window.localStorage.getItem(getStorageKey(userId)) ?? 'null') as Partial<SuggestionDraft> | null
    if (!draft || !isFormValues(draft.values) || !isFormValues(draft.savedValues)) return null
    return {
      values: draft.values,
      savedValues: draft.savedValues,
      editingId: typeof draft.editingId === 'string' ? draft.editingId : null,
      editingStatus: draft.editingStatus === 'sent' ? 'sent' : 'draft',
    }
  } catch {
    return null
  }
}

export function saveSuggestionDraft(userId: string, draft: SuggestionDraft): void {
  try {
    window.localStorage.setItem(getStorageKey(userId), JSON.stringify(draft))
  } catch {
    // Storage can be full or unavailable; the form keeps working in memory.
  }
}

export function clearSuggestionDraft(userId: string): void {
  window.localStorage.removeItem(getStorageKey(userId))
}
