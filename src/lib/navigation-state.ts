import type { Page } from '../components/constants'

export interface NavigationState {
  page: Page
  roundId: string
  scenarioId: string
}

const storageKey = 'sps_navigation'
const pages: Page[] = ['overview', 'scenarios', 'suggestions', 'issues', 'passed-scenarios', 'rounds', 'scenario-catalog']

export function readNavigationState(): NavigationState {
  try {
    const saved = JSON.parse(window.sessionStorage.getItem(storageKey) ?? 'null') as Partial<NavigationState> | null
    return {
      page: pages.includes(saved?.page as Page) ? (saved?.page as Page) : 'overview',
      roundId: typeof saved?.roundId === 'string' ? saved.roundId : '',
      scenarioId: typeof saved?.scenarioId === 'string' ? saved.scenarioId : '',
    }
  } catch {
    return { page: 'overview', roundId: '', scenarioId: '' }
  }
}

export function saveNavigationState(state: NavigationState): void {
  try {
    window.sessionStorage.setItem(storageKey, JSON.stringify(state))
  } catch {
    // Storage can be unavailable (e.g. private mode quotas); navigation still works in memory.
  }
}
