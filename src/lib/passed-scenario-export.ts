import { formatDate } from '../components/constants'
import type { IssueReporter, RoundScenario, ScenarioExecution } from '../types'

export function buildPassedScenarioExportRows(
  scenarios: RoundScenario[],
  executions: ScenarioExecution[],
  reporters: IssueReporter[],
) {
  return scenarios.flatMap((scenario) => {
    const passedExecutions = executions.filter(
      (execution) => execution.scenario_id === scenario.scenario_id && execution.status === 'passed',
    )
    return passedExecutions.map((execution) => {
      const reporter = reporters.find((item) => item.id === execution.user_id)
      return {
        'رقم السيناريو': scenario.source_number,
        السيناريو: scenario.title,
        النظام: scenario.module,
        القسم: scenario.section + (scenario.category ? ` / ${scenario.category}` : ''),
        الوصف: scenario.description,
        'خطوات الاختبار': scenario.steps.join('\n'),
        'النتائج المتوقعة': scenario.expected.join('\n'),
        'مرات النجاح': passedExecutions.length,
        المختبِر: reporter?.display_name ?? 'مستخدم',
        'رابط صورة المختبِر': reporter?.avatar_url ?? '',
        'تاريخ النجاح': formatDate(execution.created_at),
        'ملاحظات التنفيذ': execution.notes,
      }
    })
  })
}

function safeFileName(value: string): string {
  return value.replace(/[<>:"/\\|?*]/g, '-').replace(/\p{Cc}/gu, '-').trim() || 'round'
}

export async function exportPassedScenariosToExcel(
  scenarios: RoundScenario[],
  executions: ScenarioExecution[],
  reporters: IssueReporter[],
  roundName: string,
): Promise<void> {
  const { default: writeExcelFile } = await import('write-excel-file/browser')
  const rows = buildPassedScenarioExportRows(scenarios, executions, reporters)
  const headers = Object.keys(rows[0] ?? {})
  const sheetData = [headers, ...rows.map((row) => headers.map((header) => row[header as keyof typeof row]))]
  const file = await writeExcelFile(
    sheetData,
    { sheet: 'السيناريوهات الناجحة', columns: headers.map(() => ({ width: 24 })), rightToLeft: true },
  ).toBlob()
  const url = URL.createObjectURL(file)
  const link = document.createElement('a')
  link.href = url
  link.download = `${safeFileName(roundName)}-passed-scenarios.xlsx`
  document.body.append(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    }
    return entities[character]
  })
}

export function exportPassedScenariosToPdf(
  scenarios: RoundScenario[],
  executions: ScenarioExecution[],
  reporters: IssueReporter[],
  roundName: string,
): boolean {
  const printWindow = window.open('', '_blank')
  if (!printWindow) return false

  const rows = buildPassedScenarioExportRows(scenarios, executions, reporters)
  const headers = Object.keys(rows[0] ?? {})
  const imageHeader = 'رابط صورة المختبِر'
  const table = [
    `<thead><tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join('')}</tr></thead>`,
    `<tbody>${rows
      .map((row) => `<tr>${headers
        .map((header) => {
          const value = String(row[header as keyof typeof row] ?? '')
          if (header === imageHeader && value) {
            try {
              const avatarUrl = new URL(value)
              if (avatarUrl.protocol === 'https:') {
                return `<td><img src="${escapeHtml(avatarUrl.href)}" alt="" style="width:32px;height:32px;border-radius:50%;object-fit:cover"></td>`
              }
            } catch {
              return '<td></td>'
            }
          }
          return `<td>${escapeHtml(value)}</td>`
        })
        .join('')}</tr>`)
      .join('')}</tbody>`,
  ].join('')
  const title = `السيناريوهات الناجحة ${roundName}`

  printWindow.document.open()
  printWindow.document.write(`<!doctype html>
    <html lang="ar" dir="rtl">
      <head>
        <meta charset="utf-8">
        <title>${escapeHtml(title)}</title>
        <style>
          body { font-family: Arial, sans-serif; color: #1d2939; padding: 24px; }
          h1 { font-size: 20px; margin: 0 0 8px; }
          p { color: #667085; margin: 0 0 20px; }
          table { border-collapse: collapse; table-layout: fixed; width: 100%; font-size: 11px; }
          th, td { border: 1px solid #d0d5dd; padding: 6px; text-align: right; vertical-align: top; overflow-wrap: anywhere; white-space: pre-wrap; }
          th { background: #f2f4f7; }
          td:nth-child(6), td:nth-child(7), td:nth-child(12) { min-width: 120px; }
          @page { size: landscape; }
          @media print { body { padding: 0; } tr { break-inside: avoid; } }
        </style>
      </head>
      <body>
        <h1>${escapeHtml(title)}</h1>
        <p>عدد السيناريوهات: ${rows.length} · ${escapeHtml(new Intl.DateTimeFormat('ar-EG').format(new Date()))}</p>
        <table>${table}</table>
        <script>window.addEventListener('load', () => window.print())</script>
      </body>
    </html>`)
  printWindow.document.close()
  return true
}
