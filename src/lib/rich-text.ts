const allowedTags = new Set([
  'P',
  'DIV',
  'BR',
  'H1',
  'H2',
  'H3',
  'OL',
  'UL',
  'LI',
  'STRONG',
  'B',
  'EM',
  'I',
  'U',
  'S',
  'SPAN',
  'FONT',
])

const discardedTags = new Set(['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'SVG', 'MATH'])
const fontSizes: Record<string, string> = {
  '1': '10px',
  '2': '13px',
  '3': '16px',
  '4': '18px',
  '5': '24px',
  '6': '32px',
  '7': '48px',
}
const fontSizeUnits: Record<string, number> = { px: 1, pt: 4 / 3, rem: 16 }
const orderedListTypes = new Set(['a', 'A', 'i', 'I'])

export function normalizeFontSize(value: string): string | null {
  const match = /^(\d+(?:\.\d+)?)(px|pt|rem)$/.exec(value.trim())
  if (!match) return null
  const size = Math.round(Number(match[1]) * fontSizeUnits[match[2]])
  return size >= 8 && size <= 72 ? `${size}px` : null
}

export function sanitizeRichText(html: string): string {
  const document = new DOMParser().parseFromString(html, 'text/html')

  const cleanNode = (node: Node): void => {
    for (const child of Array.from(node.childNodes)) {
      if (child instanceof HTMLElement) {
        if (discardedTags.has(child.tagName)) {
          child.remove()
          continue
        }

        cleanNode(child)
        if (!allowedTags.has(child.tagName)) {
          child.replaceWith(...Array.from(child.childNodes))
          continue
        }

        const styles: string[] = []
        const textAlign = child.style.textAlign
        if (['left', 'center', 'right', 'justify'].includes(textAlign)) {
          styles.push(`text-align: ${textAlign}`)
        }
        const fontSize = child.tagName === 'FONT'
          ? fontSizes[child.getAttribute('size') ?? '']
          : normalizeFontSize(child.style.fontSize)
        if (fontSize) styles.push(`font-size: ${fontSize}`)
        const listStart = child.tagName === 'OL' ? Number(child.getAttribute('start')) : 0
        const listType = child.tagName === 'OL' ? child.getAttribute('type') ?? '' : ''

        for (const attribute of Array.from(child.attributes)) child.removeAttribute(attribute.name)
        if (styles.length) child.setAttribute('style', styles.join('; '))
        if (Number.isInteger(listStart) && listStart > 1) child.setAttribute('start', String(listStart))
        if (orderedListTypes.has(listType)) child.setAttribute('type', listType)
        if (child.tagName === 'FONT') {
          const span = document.createElement('span')
          span.innerHTML = child.innerHTML
          if (styles.length) span.setAttribute('style', styles.join('; '))
          child.replaceWith(span)
        }
      } else if (child.nodeType !== Node.TEXT_NODE && child.nodeType !== Node.COMMENT_NODE) {
        child.remove()
      }
    }
  }

  cleanNode(document.body)
  return document.body.innerHTML
}

const wrapChildren = (element: HTMLElement, tagName: string): HTMLElement => {
  const wrapper = element.ownerDocument.createElement(tagName)
  wrapper.append(...Array.from(element.childNodes))
  element.append(wrapper)
  return wrapper
}

const isWordListMarker = (element: Element) => /mso-list:\s*ignore/i.test(element.getAttribute('style') ?? '')

function getListMarker(marker: string): { ordered: boolean; type?: string; start?: number } {
  const token = /^\(?(\d+(?:\.\d+)*|[a-zA-Z]+)[.)]$/.exec(marker)?.[1]
  if (!token) return { ordered: false }
  if (/^[\d.]+$/.test(token)) return { ordered: true, start: Number(token.split('.').pop()) }
  if (/^[ivxlcdm]+$/.test(token)) return { ordered: true, type: 'i' }
  if (/^[IVXLCDM]+$/.test(token)) return { ordered: true, type: 'I' }
  if (token.length === 1) {
    const isLower = token === token.toLowerCase()
    return { ordered: true, type: isLower ? 'a' : 'A', start: token.toLowerCase().charCodeAt(0) - 96 }
  }
  return { ordered: false }
}

// Word pastes list items as flat paragraphs (style="mso-list:l0 level2 ...") with a typed marker; rebuild real nested lists.
function convertWordLists(document: Document): void {
  let lists: HTMLElement[] = []
  for (const paragraph of Array.from(document.body.querySelectorAll<HTMLElement>('p, h1, h2, h3, h4, h5, h6'))) {
    const level = Number(/mso-list:\s*l\d+\s+level(\d+)/i.exec(paragraph.getAttribute('style') ?? '')?.[1] ?? 0)
    if (!level) continue

    const markerElement = Array.from(paragraph.querySelectorAll('[style]')).find(isWordListMarker)
    const { ordered, type, start } = getListMarker((markerElement?.textContent ?? '').replace(/[\s\u00a0]/g, ''))
    let emptyParent = markerElement?.parentElement
    markerElement?.remove()
    while (emptyParent && emptyParent !== paragraph && !emptyParent.textContent) {
      const next = emptyParent.parentElement
      emptyParent.remove()
      emptyParent = next
    }

    if (paragraph.previousElementSibling !== lists[0]) lists = []
    const depth = Math.min(level, lists.length + 1)
    lists.length = depth
    let list = lists[depth - 1]
    if (!list || list.tagName !== (ordered ? 'OL' : 'UL')) {
      list = document.createElement(ordered ? 'ol' : 'ul')
      if (type) list.setAttribute('type', type)
      if (start && start > 1) list.setAttribute('start', String(start))
      const parentList = lists[depth - 2]
      if (parentList) (parentList.lastElementChild ?? parentList).append(list)
      else paragraph.before(list)
      lists[depth - 1] = list
    }

    const item = document.createElement('li')
    list.append(item)
    item.append(paragraph)
  }
}

export function normalizePastedHtml(html: string): string {
  if (html.includes('data-pm-slice')) return html

  const document = new DOMParser().parseFromString(html, 'text/html')
  convertWordLists(document)

  // Google Docs and some sites put nested lists directly inside the parent list; move them into the previous item.
  for (const list of Array.from(document.body.querySelectorAll('ul > ul, ul > ol, ol > ul, ol > ol'))) {
    if (list.previousElementSibling?.tagName === 'LI') list.previousElementSibling.append(list)
  }

  for (const element of Array.from(document.body.querySelectorAll<HTMLElement>('*'))) {
    if (!element.isConnected) continue
    if (isWordListMarker(element)) {
      element.remove()
      continue
    }

    const { style } = element
    const fontWeight = style.fontWeight
    if ((element.tagName === 'B' || element.tagName === 'STRONG') && /^(normal|[1-5]00)$/.test(fontWeight)) {
      element.replaceWith(...Array.from(element.childNodes))
      continue
    }

    const fontSize = normalizeFontSize(style.fontSize)
    if (fontSize && element.tagName !== 'SPAN' && !element.querySelector('p, div, h1, h2, h3, h4, h5, h6, ul, ol, li, table')) {
      wrapChildren(element, 'span').style.fontSize = fontSize
    }

    const decoration = `${style.getPropertyValue('text-decoration')} ${style.getPropertyValue('text-decoration-line')}`
    if (/^(bold|bolder|[6-9]00)$/.test(fontWeight)) wrapChildren(element, 'strong')
    if (style.fontStyle === 'italic' || style.fontStyle === 'oblique') wrapChildren(element, 'em')
    if (decoration.includes('underline')) wrapChildren(element, 'u')
    if (decoration.includes('line-through')) wrapChildren(element, 's')
  }

  return sanitizeRichText(document.body.innerHTML)
}

export function hasRichTextContent(html: string): boolean {
  const document = new DOMParser().parseFromString(sanitizeRichText(html), 'text/html')
  return Boolean(document.body.textContent?.trim())
}

export function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:'
  } catch {
    return false
  }
}
