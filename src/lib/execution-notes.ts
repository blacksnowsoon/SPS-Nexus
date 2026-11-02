export interface ExecutionNotesDraftKey {
  roundId: string
  scenarioId: string
  userId: string
}

function getStorageKey({ roundId, scenarioId, userId }: ExecutionNotesDraftKey) {
  return `sps_execution_notes:${userId}:${roundId}:${scenarioId}`
}

export function getExecutionNotesDraft(key: ExecutionNotesDraftKey) {
  return window.localStorage.getItem(getStorageKey(key))
}

export function saveExecutionNotesDraft(key: ExecutionNotesDraftKey, notes: string) {
  window.localStorage.setItem(getStorageKey(key), notes)
}

export function clearExecutionNotesDraft(key: ExecutionNotesDraftKey) {
  window.localStorage.removeItem(getStorageKey(key))
}
