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

    await user.selectOptions(screen.getByLabelText('النظام'), 'نظام إدارة السفن')
    await user.selectOptions(screen.getByLabelText('القسم'), 'سيناريوهات طلبات التوكيل الملاحي')
    await user.selectOptions(screen.getByLabelText('الفئة'), 'طلب التراكي')
    await user.type(screen.getByLabelText('عنوان السيناريو'), 'عنوان جديد')
    await user.type(screen.getByLabelText(/خطوات الاختبار/), 'خطوة 1{Enter}خطوة 2')
    await user.type(screen.getByLabelText(/النتائج المتوقعة/), 'نتيجة 1')
    await user.click(screen.getByRole('button', { name: 'إضافة السيناريو' }))

    expect(onSave).toHaveBeenCalledWith(
      {
        module: 'نظام إدارة السفن',
        section: 'سيناريوهات طلبات التوكيل الملاحي',
        category: 'طلب التراكي',
        source_number: 1,
        title: 'عنوان جديد',
        description: '',
        steps: ['خطوة 1', 'خطوة 2'],
        expected: ['نتيجة 1'],
      },
      undefined,
    )
  }, 10000)

  it('loads catalog values for editing an existing scenario', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn().mockResolvedValue(true)
    render(<ScenarioCatalogPage scenarios={[scenario]} busyAction="" onSave={onSave} />)

    await user.click(screen.getByRole('button', { name: /استلام الطلب/ }))

    expect(screen.getByLabelText('النظام')).toHaveValue(scenario.module)
    expect(screen.getByLabelText('القسم')).toHaveValue(scenario.section)
    expect(screen.getByLabelText('الفئة')).toHaveValue(scenario.category)
    expect(screen.getByLabelText('عنوان السيناريو')).toHaveValue(scenario.title)
    expect(screen.getByLabelText(/خطوات الاختبار/)).toHaveValue('الخطوة الأولى')
    expect(screen.getByText('معرّف السيناريو: t1 · ترتيب المصدر: 1')).toBeInTheDocument()
  })

  it('includes unknown existing values so legacy scenarios remain editable', async () => {
    const user = userEvent.setup()
    const legacyScenario = { ...scenario, module: 'نظام قديم', section: 'قسم قديم', category: 'فئة قديمة' }
    render(<ScenarioCatalogPage scenarios={[legacyScenario]} busyAction="" onSave={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: /استلام الطلب/ }))

    expect(screen.getByLabelText('النظام')).toHaveValue('نظام قديم')
    expect(screen.getByLabelText('القسم')).toHaveValue('قسم قديم')
    expect(screen.getByLabelText('الفئة')).toHaveValue('فئة قديمة')
  })
})
