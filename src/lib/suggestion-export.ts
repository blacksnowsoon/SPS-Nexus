import { sanitizeRichText, isHttpUrl } from './rich-text'
import type { TestSuggestion } from '../types'

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

function safeFileName(value: string): string {
  return value.replace(/[<>:"/\\|?*]/g, '-').replace(/\p{Cc}/gu, '-').trim() || 'suggestion'
}

function formatUpdatedAt(suggestion: TestSuggestion): string {
  const updatedAt = new Date(suggestion.updated_at || suggestion.created_at)
  const validDate = Number.isNaN(updatedAt.getTime()) ? new Date(suggestion.created_at) : updatedAt

  if (Number.isNaN(validDate.getTime())) return 'غير متاح'
  return new Intl.DateTimeFormat('ar-EG', { dateStyle: 'medium', timeStyle: 'short' }).format(validDate)
}

export function exportSuggestionToPdf(
  suggestion: TestSuggestion,
  exportedAt = new Date(),
): boolean {
  const printWindow = window.open('', '_blank')
  if (!printWindow) return false

  const exportDate = new Intl.DateTimeFormat('ar-EG', { dateStyle: 'medium' }).format(exportedAt)
  const exportDateForFile = exportedAt.toISOString().slice(0, 10)
  const title = `${suggestion.title} - ${exportDateForFile}`
  const sharedDocument = suggestion.shared_document_url && isHttpUrl(suggestion.shared_document_url)
    ? `<p class="shared-document"><a href="${escapeHtml(suggestion.shared_document_url)}">${escapeHtml(suggestion.shared_document_url)}</a></p>`
    : ''
  let printStarted = false
  const startPrint = () => {
    if (printStarted || printWindow.closed || printWindow.document.readyState !== 'complete') return
    printStarted = true
    printWindow.focus()
    printWindow.print()
  }

  printWindow.addEventListener('load', () => {
    printWindow.setTimeout(startPrint, 250)
  }, { once: true })

  printWindow.document.open()
  printWindow.document.write(`<!doctype html>
    <html lang="ar" dir="rtl">
      <head>
        <meta charset="utf-8">
        <title>${escapeHtml(title)}</title>
        <style>
          * { box-sizing: border-box; }
          body { color: #1d2939; font-family: Arial, sans-serif; font-size: 13px; line-height: 1.8; margin: 0; }
          header { border-bottom: 2px solid #2563eb; margin-bottom: 24px; padding-bottom: 16px; }
          .author, .updated, .exported { color: #667085; font-size: 11px; margin: 0 0 4px; }
          h1 { font-size: 22px; line-height: 1.5; margin: 12px 0 0; }
          .description { overflow-wrap: anywhere; }
          .description h1, .description h2, .description h3 { line-height: 1.5; }
          .description img, .description video { max-width: 100%; }
          .description ol, .description ul { padding-right: 24px; }
          .shared-document { border-top: 1px solid #e4e7ec; margin-top: 24px; padding-top: 12px; overflow-wrap: anywhere; }
          a { color: #175cd3; }
          @page {
            size: A4;
            margin: 18mm 18mm 22mm;
            @bottom-center {
              color: #667085;
              content: "صفحة " counter(page) " من " counter(pages);
              font-family: Arial, sans-serif;
              font-size: 10px;
            }
          }
          @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            header, h1, h2, h3 { break-after: avoid; }
          }
        </style>
      </head>
      <body>
        <header>
          <p class="author">اسم المستخدم: ${escapeHtml(suggestion.author_name || 'مختبِر')}</p>
          <p class="updated">تاريخ التحديث: ${escapeHtml(formatUpdatedAt(suggestion))}</p>
          <p class="exported">تاريخ التصدير: ${escapeHtml(exportDate)}</p>
          <h1>${escapeHtml(suggestion.title)}</h1>
        </header>
        <main class="description">${sanitizeRichText(suggestion.description)}</main>
        ${sharedDocument}
      </body>
    </html>`)
  printWindow.document.close()
  printWindow.document.title = safeFileName(title)
  printWindow.setTimeout(startPrint, 500)
  return true
}
