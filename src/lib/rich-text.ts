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
          : child.style.fontSize
        if (fontSize && /^(10|13|16|18|24|32|48)px$/.test(fontSize)) {
          styles.push(`font-size: ${fontSize}`)
        }

        for (const attribute of Array.from(child.attributes)) child.removeAttribute(attribute.name)
        if (styles.length) child.setAttribute('style', styles.join('; '))
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
