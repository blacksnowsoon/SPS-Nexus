import { describe, expect, it } from 'vitest'
import { hasRichTextContent, isHttpUrl, normalizePastedHtml, sanitizeRichText } from './rich-text'

describe('rich text helpers', () => {
  it('keeps inline formatting from pasted Google Docs content and drops its wrapper and colors', () => {
    expect(
      normalizePastedHtml(
        '<meta charset="utf-8"><b style="font-weight:normal;" id="docs-internal-guid-1"><p dir="ltr" style="text-align: center"><span style="font-weight:700;color:#ff0000">Bold</span><span style="font-style:italic;text-decoration:underline">Styled</span></p></b>',
      ),
    ).toBe('<p style="text-align: center"><span><strong>Bold</strong></span><span><u><em>Styled</em></u></span></p>')
  })

  it('removes Word list markers and unsafe markup from pasted content', () => {
    expect(
      normalizePastedHtml(
        '<p class="MsoListParagraph"><span style="mso-list:Ignore">·<span>&nbsp;</span></span>Item</p><script>alert(1)</script><img src=x onerror="alert(1)">',
      ),
    ).toBe('<p>Item</p>')
  })

  it('rebuilds nested bullet and numbered lists pasted from Word', () => {
    const html = [
      "<p class=MsoListParagraphCxSpFirst style='mso-list:l0 level1 lfo1'><span style='font-family:Symbol'><span style='mso-list:Ignore'>·<span>&nbsp;&nbsp;</span></span></span>First</p>",
      "<p class=MsoListParagraphCxSpMiddle style='mso-list:l0 level2 lfo1'><span style='mso-list:Ignore'>o<span>&nbsp;</span></span>Nested</p>",
      "<p class=MsoListParagraphCxSpLast style='mso-list:l0 level1 lfo1'><span style='mso-list:Ignore'>·<span>&nbsp;</span></span>Second</p>",
      '<p class=MsoNormal>Between</p>',
      "<p style='mso-list:l1 level1 lfo2'><span style='mso-list:Ignore'>3.<span>&nbsp;</span></span>Third</p>",
      "<p style='mso-list:l1 level2 lfo2'><span style='mso-list:Ignore'>a.<span>&nbsp;</span></span>Sub</p>",
    ].join('')

    expect(normalizePastedHtml(html)).toBe(
      '<ul><li><p>First</p><ul><li><p>Nested</p></li></ul></li><li><p>Second</p></li></ul><p>Between</p><ol start="3"><li><p>Third</p><ol type="a"><li><p>Sub</p></li></ol></li></ol>',
    )
  })

  it('nests Google Docs sub-lists and keeps pasted font sizes', () => {
    expect(
      normalizePastedHtml(
        '<ul><li style="list-style-type:disc"><p dir="ltr"><span style="font-size:11pt">Parent</span></p></li><ul><li><p><span style="font-size:14pt">Child</span></p></li></ul></ul><p style="font-size:18pt">Block</p>',
      ),
    ).toBe(
      '<ul><li><p><span style="font-size: 15px">Parent</span></p><ul><li><p><span style="font-size: 19px">Child</span></p></li></ul></li></ul><p style="font-size: 24px"><span style="font-size: 24px">Block</span></p>',
    )
  })

  it('keeps ordered list numbering and reasonable font sizes only', () => {
    expect(
      sanitizeRichText('<ol start="4" type="i" onclick="x"><li>Item</li></ol><span style="font-size: 15px">A</span><span style="font-size: 200px">B</span>'),
    ).toBe('<ol start="4" type="i"><li>Item</li></ol><span style="font-size: 15px">A</span><span>B</span>')
  })

  it('leaves content copied from the editor itself unchanged', () => {
    const html = '<ul data-pm-slice="3 3 []"><li><p>Item</p></li></ul>'
    expect(normalizePastedHtml(html)).toBe(html)
  })

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
