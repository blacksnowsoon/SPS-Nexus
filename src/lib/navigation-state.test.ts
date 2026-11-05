import { beforeEach, describe, expect, it } from 'vitest'
import { readNavigationState, saveNavigationState } from './navigation-state'

describe('navigation state', () => {
  beforeEach(() => sessionStorage.clear())

  it('defaults to the overview page when nothing is saved', () => {
    expect(readNavigationState()).toEqual({ page: 'overview', roundId: '', scenarioId: '' })
  })

  it('restores the saved page, round, and scenario for the current tab', () => {
    saveNavigationState({ page: 'scenarios', roundId: 'round-1', scenarioId: 'scenario-1' })
    expect(readNavigationState()).toEqual({ page: 'scenarios', roundId: 'round-1', scenarioId: 'scenario-1' })
  })

  it('ignores corrupted or unknown saved values', () => {
    sessionStorage.setItem('sps_navigation', '{"page":"admin-hack","roundId":5}')
    expect(readNavigationState()).toEqual({ page: 'overview', roundId: '', scenarioId: '' })
    sessionStorage.setItem('sps_navigation', 'not json')
    expect(readNavigationState()).toEqual({ page: 'overview', roundId: '', scenarioId: '' })
  })
})
