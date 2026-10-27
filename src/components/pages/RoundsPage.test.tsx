import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Round } from '../../types'
import { RoundsPage } from './RoundsPage'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

const activeRound: Round = {
  id: 'round-1',
  project_id: 'project-1',
  name: 'جولة نشطة',
  description: 'وصف الجولة',
  status: 'active',
  created_at: '2026-10-26T10:00:00Z',
}

function renderRoundsPage(onUpdateRound = vi.fn().mockResolvedValue(true), onDeleteRound = vi.fn()) {
  return render(
    <RoundsPage
      rounds={[activeRound]}
      selectedRoundId={activeRound.id}
      isAdmin
      roundName=""
      roundDescription=""
      formError=""
      busyAction=""
      onRoundName={vi.fn()}
      onRoundDescription={vi.fn()}
      onCreateRound={vi.fn()}
      onSelectRound={vi.fn()}
      onUpdateStatus={vi.fn()}
      onUpdateRound={onUpdateRound}
      onDeleteRound={onDeleteRound}
      scenarioCatalog={[]}
      includeAllScenarios
      onIncludeAllScenarios={vi.fn()}
      selectedScenarioIds={[]}
      onSelectedScenarioIds={vi.fn()}
      scenarioPickerSearch=""
      onScenarioPickerSearch={vi.fn()}
    />,
  )
}

describe('RoundsPage', () => {
  it('lets admins edit an active round', async () => {
    const user = userEvent.setup()
    const onUpdateRound = vi.fn().mockResolvedValue(true)
    renderRoundsPage(onUpdateRound)

    await user.click(screen.getByRole('button', { name: 'تعديل' }))
    await user.clear(screen.getByRole('textbox', { name: 'اسم الجولة' }))
    await user.type(screen.getByRole('textbox', { name: 'اسم الجولة' }), 'جولة محدثة')
    await user.click(screen.getByRole('button', { name: 'حفظ' }))

    expect(onUpdateRound).toHaveBeenCalledWith(activeRound, 'جولة محدثة', 'وصف الجولة')
  })

  it('asks before deleting an active round and only deletes after confirmation', async () => {
    const user = userEvent.setup()
    const onDeleteRound = vi.fn()
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    renderRoundsPage(undefined, onDeleteRound)

    await user.click(screen.getByRole('button', { name: 'حذف' }))
    expect(confirm).toHaveBeenCalledWith(expect.stringContaining(activeRound.name))
    expect(onDeleteRound).not.toHaveBeenCalled()

    confirm.mockReturnValue(true)
    await user.click(screen.getByRole('button', { name: 'حذف' }))
    expect(onDeleteRound).toHaveBeenCalledWith(activeRound)
  })
})
