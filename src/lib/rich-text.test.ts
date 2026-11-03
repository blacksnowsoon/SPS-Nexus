import { describe, expect, it } from 'vitest'
import { hasRichTextContent, isHttpUrl, sanitizeRichText } from './rich-text'

describe('rich text helpers', () => {
  it('keeps supported formatting while removing unsafe markup and attributes', () => {
    expect(
      sanitizeRichText(
        '<p onclick="alert(1)" style="text-align: center; color: red"><strong>Useful</strong><img src=x onerror="alert(1)"></p><script>alert(1)</script>',
      ),
    ).toBe('<p style="text-align: center"><strong>Useful</strong></p>')
  })

  it('converts editor font sizes to a constrained style', () => {
    expect(sanitizeRichText('<font size="5">Large</font>')).toBe(
      '<span style="font-size: 24px">Large</span>',
    )
  })

  it('detects empty rich text and accepts only HTTP(S) document links', () => {
    expect(hasRichTextContent('<p><br></p>')).toBe(false)
    expect(hasRichTextContent('<p>Suggestion</p>')).toBe(true)
    expect(isHttpUrl('https://example.com/doc')).toBe(true)
    expect(isHttpUrl('javascript:alert(1)')).toBe(false)
    expect(isHttpUrl('/relative/path')).toBe(false)
  })
})
