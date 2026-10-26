import { formatDate, workflowLabels } from '../components/constants'
import type {
  IssueExecutionNote,
  IssueReporter,
  RoundScenario,
  RoundWorkflow,
  ScenarioIssue,
} from '../types'

export function buildIssueExportRows(
  issues: ScenarioIssue[],
  workflows: RoundWorkflow[],
  scenarios: RoundScenario[],
  reporters: IssueReporter[],
  executionNotes: IssueExecutionNote[],
) {
  return issues.map((issue) => {
    const workflow = workflows.find((item) => item.scenario_id === issue.scenario_id)
    const scenario = scenarios.find((item) => item.scenario_id === issue.scenario_id)
    const reporter = reporters.find((item) => item.id === issue.reported_by)
    const executionNote = executionNotes.find(
      (item) => item.scenario_id === issue.scenario_id && item.user_id === issue.reported_by,
    )
    
    return {
      'رقم السيناريو': scenario?.source_number ?? '',
      السيناريو: scenario?.title ?? issue.scenario_id,
      النظام: scenario?.module ?? '',
      القسم: scenario?.section ?? '',
      الحالة: workflow ? workflowLabels[workflow.status] : '',
      'ملخص المشكلة': workflow?.issue_summary ?? '',
      'ملاحظات التنفيذ': executionNote?.notes ?? '',
      'اسم المبلّغ': reporter?.display_name ?? 'مستخدم',
      'تاريخ البلاغ': formatDate(issue.created_at),
    }
  })
}

function safeFileName(value: string): string {
  return value.replace(/[<>:"/\\|?*]/g, '-').replace(/\p{Cc}/gu, '-').trim() || 'round'
}

export async function exportIssuesToExcel(
  issues: ScenarioIssue[],
  workflows: RoundWorkflow[],
  scenarios: RoundScenario[],
  reporters: IssueReporter[],
  executionNotes: IssueExecutionNote[],
  roundName: string,
): Promise<void> {
  const { default: writeExcelFile } = await import('write-excel-file/browser')
  const rows = buildIssueExportRows(issues, workflows, scenarios, reporters, executionNotes)
  const headers = Object.keys(rows[0] ?? {})
  const sheetData = [headers, ...rows.map((row) => headers.map((header) => row[header as keyof typeof row]))]
  const columns = headers.map(() => ({ width: 22 }))
  const file = await writeExcelFile(sheetData, { sheet: 'البلاغات', columns, rightToLeft: true }).toBlob()
  const url = URL.createObjectURL(file)
  const link = document.createElement('a')
  link.href = url
  link.download = `${safeFileName(roundName)}-issues.xlsx`
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

export function exportIssuesToPdf(
  issues: ScenarioIssue[],
  workflows: RoundWorkflow[],
  scenarios: RoundScenario[],
  reporters: IssueReporter[],
  executionNotes: IssueExecutionNote[],
  roundName: string,
): boolean {
  const printWindow = window.open('', '_blank')
  if (!printWindow) return false

  const rows = buildIssueExportRows(issues, workflows, scenarios, reporters, executionNotes)
  const headers = Object.keys(rows[0] ?? {})
  const table = [
    `<thead><tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join('')}</tr></thead>`,
    `<tbody>${rows
      .map(
        (row) =>
          `<tr>${headers
            .map((header) => `<td>${escapeHtml(String(row[header as keyof typeof row] ?? ''))}</td>`)
            .join('')}</tr>`,
      )
      .join('')}</tbody>`,
  ].join('')
  const title = `بلاغات ${roundName}`

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
          table { border-collapse: collapse; width: 100%; font-size: 11px; }
          th, td { border: 1px solid #d0d5dd; padding: 8px; text-align: right; vertical-align: top; }
          th { background: #f2f4f7; }
          @media print { body { padding: 0; } tr { break-inside: avoid; } }
        </style>
      </head>
      <body>
        <h1>${escapeHtml(title)}</h1>
        <p>عدد البلاغات: ${rows.length} · ${escapeHtml(new Intl.DateTimeFormat('ar-EG').format(new Date()))}</p>
        <table>${table}</table>
        <script>window.addEventListener('load', () => window.print())</script>
      </body>
    </html>`)
  printWindow.document.close()
  return true
}
