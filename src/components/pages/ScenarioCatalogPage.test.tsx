import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ScenarioCatalogItem } from '../../types'
import { ScenarioCatalogPage } from './ScenarioCatalogPage'

afterEach(cleanup)

const scenario: ScenarioCatalogItem = {
  id: 't1',
  source_order: 1,
  module: 'نظام إدارة السفن',
  section: 'طلبات التوكيل',
  category: 'طلب التراكي',
  source_number: 1,
  title: 'استلام الطلب',
  description: 'وصف أولي',
  steps: ['الخطوة الأولى'],
  expected: ['النتيجة الأولى'],
  is_builtin: true,
}

describe('ScenarioCatalogPage', () => {
  it('creates a scenario using the catalog fields without exposing generated identifiers', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn().mockResolvedValue(true)
    render(<ScenarioCatalogPage scenarios={[]} busyAction="" onSave={onSave} />)

    await user.type(screen.getByLabelText('النظام'), 'نظام جديد')
    await user.type(screen.getByLabelText('القسم'), 'قسم جديد')
    await user.type(screen.getByLabelText('الفئة'), 'فئة')
    await user.type(screen.getByLabelText('عنوان السيناريو'), 'عنوان جديد')
    await user.type(screen.getByLabelText(/خطوات الاختبار/), 'خطوة 1{Enter}خطوة 2')
    await user.type(screen.getByLabelText(/النتائج المتوقعة/), 'نتيجة 1')
    await user.click(screen.getByRole('button', { name: 'إضافة السيناريو' }))

    expect(onSave).toHaveBeenCalledWith(
      {
        module: 'نظام جديد',
        section: 'قسم جديد',
        category: 'فئة',
        source_number: 1,
        title: 'عنوان جديد',
        description: '',
        steps: ['خطوة 1', 'خطوة 2'],
        expected: ['نتيجة 1'],
      },
      undefined,
    )
  })

  it('loads catalog values for editing an existing scenario', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn().mockResolvedValue(true)
    render(<ScenarioCatalogPage scenarios={[scenario]} busyAction="" onSave={onSave} />)

    await user.click(screen.getByRole('button', { name: /استلام الطلب/ }))

    expect(screen.getByLabelText('النظام')).toHaveValue(scenario.module)
    expect(screen.getByLabelText('عنوان السيناريو')).toHaveValue(scenario.title)
    expect(screen.getByLabelText(/خطوات الاختبار/)).toHaveValue('الخطوة الأولى')
    expect(screen.getByText('معرّف السيناريو: t1 · ترتيب المصدر: 1')).toBeInTheDocument()
  })
})
